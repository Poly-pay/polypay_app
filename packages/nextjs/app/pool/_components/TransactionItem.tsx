import { type FC, useEffect, useMemo, useState } from "react";
import { Address } from "../../../components/scaffold-eth";
import { PendingTransaction } from "../page";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { Abi, DecodeFunctionDataReturnType, decodeFunctionData, formatEther } from "viem";
import { useWalletClient } from "wagmi";
import { Commitment } from "~~/components/scaffold-eth/Address/CommitmentAddress";
import {
  useDeployedContractInfo,
  useScaffoldContract,
  useScaffoldReadContract,
  useTransactor,
} from "~~/hooks/scaffold-eth";
import { buildMerkleTree, getMerklePath, getPublicKeyXY, hexToByteArray, poseidonHash2 } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";

type TransactionItemProps = {
  tx: PendingTransaction;
  signaturesRequired: bigint;
};

export const TransactionItem: FC<TransactionItemProps> = ({ tx, signaturesRequired }) => {
  const [signing, setSigning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stateZkProof, setStateZkProof] = useState<string>("");

  const [hasSigned, setHasSigned] = useState(false);

  const { data: walletClient } = useWalletClient();
  const transactor = useTransactor();

  const { data: contractInfo } = useDeployedContractInfo({ contractName: "MetaMultiSigWallet" });

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
    walletClient,
  });

  const { data: merkleRoot } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "merkleRoot",
  });

  // Decode function data for display
  const txnData =
    contractInfo?.abi && tx.data && tx.data !== "0x"
      ? decodeFunctionData({ abi: contractInfo.abi as Abi, data: tx.data })
      : ({} as DecodeFunctionDataReturnType);

  const hasEnoughSignatures = tx.validSignatures >= signaturesRequired;
  const canExecute = hasEnoughSignatures && !tx.executed;

  useEffect(() => {
    const checkHasSigned = async () => {
      if (!walletClient || !metaMultiSigWallet) {
        return;
      }

      try {
        // 1. Get secret
        const secret = localStorage.getItem("secret");
        if (!secret) {
          notification.error("No secret found in localStorage");
          return;
        }

        // 2. Get txHash
        const txHash = (await metaMultiSigWallet.read.getTransactionHash([
          tx.txId,
          tx.to,
          tx.value,
          tx.data,
        ])) as `0x${string}`;

        // 3. Compute nullifier
        const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

        // 4. Check on contract
        const used = await metaMultiSigWallet.read.usedNullifiers([nullifier]);
        setHasSigned(used as boolean);
      } catch (e) {
        console.error("Error checking signature:", e);
      }
    };

    checkHasSigned();
  }, [walletClient, metaMultiSigWallet, tx.txId]);

  // ============ Sign Transaction ============
  const handleSign = async () => {
    try {
      if (!walletClient || !metaMultiSigWallet) {
        notification.error("Wallet not connected");
        return;
      }

      setSigning(true);

      // 1. Get txHash
      const txHash = (await metaMultiSigWallet.read.getTransactionHash([
        tx.txId,
        tx.to,
        tx.value,
        tx.data,
      ])) as `0x${string}`;

      // 2. Sign txHash
      const signature = await walletClient.signMessage({
        message: { raw: txHash },
      });
      const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

      // 3. Get secret and compute values
      const secret = localStorage.getItem("secret");
      if (!secret) {
        notification.error("No secret found in localStorage");
        setSigning(false);
        return;
      }
      const txHashBytes = hexToByteArray(txHash);
      const sigBytes = hexToByteArray(signature).slice(0, 64);
      const txHashCommitment = await poseidonHash2(BigInt(txHash), 1n);
      const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));
      // 4. Get merkle data
      const commitments = await metaMultiSigWallet.read.getCommitments();
      const tree = await buildMerkleTree(commitments ?? []);

      const myCommitment = localStorage.getItem("commitment");
      if (!myCommitment) {
        notification.error("No commitment found in localStorage");
        setSigning(false);
        return;
      }
      const leafIndex = (commitments ?? []).findIndex(c => BigInt(c) === BigInt(myCommitment));

      if (leafIndex === -1) {
        notification.error("You are not a signer");
        return;
      }

      const merklePath = getMerklePath(tree, leafIndex);

      // 5. Generate ZK proof
      const input = {
        signature: sigBytes,
        pub_key_x: pubKeyX,
        pub_key_y: pubKeyY,
        secret: secret,
        leaf_index: leafIndex,
        merkle_path: merklePath.map(p => p.toString()),
        tx_hash_bytes: txHashBytes,
        tx_hash_commitment: txHashCommitment.toString(),
        merkle_root: merkleRoot?.toString() ?? "",
        nullifier: nullifier.toString(),
      };

      console.log("Generating proof...");
      setStateZkProof("Generating proof...");
      const circuit_json = await fetch("/circuit/target/circuit.json");
      const noir_data = await circuit_json.json();
      const { bytecode, abi } = noir_data;

      const noir = new Noir({ bytecode, abi } as any);
      const execResult = await noir.execute(input);

      const plonk = new UltraPlonkBackend(bytecode, { threads: 2 });
      const { proof, publicInputs } = await plonk.generateProof(execResult.witness);
      console.log("submit to relayer");

      // 6. Submit to zkVerify
      console.log("call relayer...");
      setStateZkProof("Submitting proof to relayer...");
      const res = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: proof,
          publicInputs: publicInputs,
          vk: Buffer.from(await plonk.getVerificationKey()).toString("base64"),
        }),
      });
      const zkVerifyData = await res.json();

      if (!zkVerifyData.aggregationId) {
        notification.error("zkVerify failed");
        return;
      }

      // 7. Submit signature to contract
      const zkProof = {
        nullifier: nullifier,
        aggregationId: BigInt(zkVerifyData.aggregationId),
        domainId: 0n,
        zkMerklePath: zkVerifyData.aggregationDetails.merkleProof as `0x${string}`[],
        leafCount: BigInt(zkVerifyData.aggregationDetails.numberOfLeaves),
        index: BigInt(zkVerifyData.aggregationDetails.leafIndex),
      };

      // wait 30s to make sure proof have on others chains
      console.log("Waiting 30s for the transaction to be processed...");
      await new Promise(resolve => setTimeout(resolve, 60000));

      const gasEstimate = await metaMultiSigWallet?.estimateGas.submitSignature([tx.txId, zkProof]);
      console.log("Gas estimate:", gasEstimate);

      await transactor(() =>
        metaMultiSigWallet.write.submitSignature([tx.txId, zkProof], {
          gas: gasEstimate ? gasEstimate + 10000n : undefined,
        }),
      );

      notification.success("Signature submitted!");
    } catch (e) {
      notification.error("Error signing transaction");
      console.error(e);
    } finally {
      setSigning(false);
    }
  };

  // ============ Execute Transaction ============
  const handleExecute = async () => {
    try {
      if (!metaMultiSigWallet) {
        notification.error("Contract not loaded");
        return;
      }

      setExecuting(true);

      await transactor(() => metaMultiSigWallet.write.executeTransaction([tx.txId]));

      notification.success("Transaction executed!");
    } catch (e) {
      notification.error("Error executing transaction");
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const signState = useMemo(() => {
    if (signing && stateZkProof === "") return "Signing...";
    if (signing && stateZkProof) return stateZkProof;
    if (hasSigned) return "Signed";
    return "Sign";
  }, [signing, stateZkProof, hasSigned]);

  return (
    <>
      {/* Modal */}
      <input type="checkbox" id={`label-${tx.txId}`} className="modal-toggle" />
      <div className="modal" role="dialog">
        <div className="modal-box">
          <div className="flex flex-col">
            <div className="flex gap-2">
              <div className="font-bold">Function:</div>
              {txnData.functionName || "transferFunds"}
            </div>
            <div className="flex flex-col gap-2 mt-6">
              {txnData.args ? (
                <>
                  <h4 className="font-bold">Arguments</h4>
                  <div className="flex gap-4">
                    Arg 0: <Commitment commitment={String(txnData.args?.[0])} />
                  </div>
                  <div>Arg 1: {String(txnData.args?.[1])}</div>
                </>
              ) : (
                <>
                  <div className="flex gap-4">
                    To: <Address address={tx.to} />
                  </div>
                  <div>Amount: {formatEther(tx.value)} Ξ</div>
                </>
              )}
            </div>
            <div className="modal-action">
              <label htmlFor={`label-${tx.txId}`} className="btn btn-sm">
                Close
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Row */}
      <div className="flex flex-col pb-2 border-b border-secondary last:border-b-0">
        <div className="flex gap-4 justify-between items-center">
          <div className="font-bold">#{tx.txId.toString()}</div>

          <Address address={tx.to} />

          <div>{formatEther(tx.value)} Ξ</div>

          <span>
            {tx.validSignatures.toString()}/
            {tx.executed ? tx.requiredApprovalsWhenExecuted.toString() : signaturesRequired.toString()}
          </span>

          <div className="action-btn flex gap-2">
            {tx.executed ? (
              <div className="font-bold text-green-400">Executed</div>
            ) : (
              <>
                <button className="btn btn-xs btn-primary" disabled={signing || hasSigned} onClick={handleSign}>
                  {signState}
                </button>

                <button
                  className="btn btn-xs btn-secondary"
                  disabled={!canExecute || executing}
                  onClick={handleExecute}
                >
                  {executing ? "Executing..." : "Execute"}
                </button>
              </>
            )}

            <label htmlFor={`label-${tx.txId}`} className="btn btn-primary btn-xs">
              ...
            </label>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs gap-4 mt-2">
          <div>Function: {txnData.functionName || "transferFunds"}</div>
          <div className="flex gap-1 items-center">
            Addressed To: <Commitment commitment={txnData.args?.[0] ? String(txnData.args?.[0]) : tx.to} />
          </div>
        </div>
      </div>
    </>
  );
};
