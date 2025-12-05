import { type FC, useEffect, useMemo, useState } from "react";
import { Address } from "../../../components/scaffold-eth";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { Abi, DecodeFunctionDataReturnType, decodeFunctionData, formatEther } from "viem";
import { useWalletClient } from "wagmi";
import { Commitment } from "~~/components/scaffold-eth/Address/CommitmentAddress";
import { SignTxDto, useGetProofsForExecution, useMarkExecuted, useSignTx } from "~~/hooks/api/useMultisig";
import { Transaction } from "~~/hooks/api/useTransaction";
import {
  useDeployedContractInfo,
  useScaffoldContract,
  useScaffoldReadContract,
  useTransactor,
} from "~~/hooks/scaffold-eth";
import { buildMerkleTree, getMerklePath, getPublicKeyXY, hexToByteArray, poseidonHash2 } from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";

type TransactionItemProps = {
  tx: Transaction;
  signaturesRequired: bigint;
};

export const TransactionItem: FC<TransactionItemProps> = ({ tx, signaturesRequired }) => {
  const [signing, setSigning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [stateZkProof, setStateZkProof] = useState<string>("");

  const [hasSigned, setHasSigned] = useState(false);

  const signTx = useSignTx();
  const markExecuted = useMarkExecuted();
  const { data: proofsData } = useGetProofsForExecution(tx?.txId);
  // console.log("🚀 ~ TransactionItem ~ proofsData:", proofsData);

  const { data: walletClient } = useWalletClient();

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
    contractInfo?.abi && tx.callData && tx.callData !== "0x"
      ? decodeFunctionData({ abi: contractInfo.abi as Abi, data: tx.callData as `0x${string}` })
      : ({} as DecodeFunctionDataReturnType);

  const hasEnoughSignatures = tx?.signatureCount ?? 0n >= signaturesRequired;
  const canExecute = hasEnoughSignatures && !tx.executedAt;

  useEffect(() => {
    const checkHasSigned = async () => {
      if (!walletClient || !metaMultiSigWallet) {
        console.log("wallet client");
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
          BigInt(tx?.txId),
          tx.to as `0x${string}`,
          BigInt(tx?.value),
          tx?.callData as `0x${string}`,
        ])) as `0x${string}`;

        // 3. Compute nullifier
        const nullifier = await poseidonHash2(BigInt(secret), BigInt(txHash));

        // 4. Check on contract
        const used = tx.proofJobs?.some(pj => BigInt(pj.nullifier) === nullifier);
        setHasSigned(used as boolean);
      } catch (e) {
        console.error("Error checking signature:", e);
      }
    };
    checkHasSigned();
  }, [tx.txId, walletClient]);

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
        BigInt(tx?.txId),
        tx.to as `0x${string}`,
        BigInt(tx?.value),
        tx?.callData as `0x${string}`,
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

      const signData: SignTxDto = {
        txId: Number(tx?.txId),
        proof: Array.from(proof),
        publicInputs,
        nullifier: nullifier.toString(),
      };
      // Submit propose transaction with proof to backend
      console.log("Submitting propose transaction...");
      setStateZkProof("Propose tx to backend...");
      await signTx.mutateAsync(signData);

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
      // const zkProof = {
      //   nullifier: BigInt(tx?.proofJobs?.[0]?.nullifier || 0),
      //   aggregationId: BigInt(tx?.proofJobs?.[0]?.aggregationId ?? 0),
      //   domainId: 0n,
      //   zkMerklePath: tx?.proofJobs?.[0]?.merkleProof as `0x${string}`[],
      //   leafCount: BigInt(tx?.proofJobs?.[0]?.leafCount ?? 0),
      //   index: BigInt(tx?.proofJobs?.[0]?.leafIndex ?? 0),
      // };
      // Format proofs for smart contract
      const zkProofs = tx?.proofJobs?.map(p => ({
        nullifier: BigInt(p.nullifier),
        aggregationId: BigInt(p.aggregationId ?? 0),
        domainId: 0n,
        zkMerklePath: p.merkleProof as `0x${string}`[],
        leafCount: BigInt(p.leafCount ?? 0),
        index: BigInt(p.leafIndex ?? 0),
      }));
      console.log("🚀 ~ handleExecute ~ tx?.proofJobs:", tx?.proofJobs)
      console.log("🚀 ~ handleExecute ~ zkProofs:", zkProofs);
      console.log("🚀 ~ handleExecute ~ tx.to:", tx.to)
      console.log("🚀 ~ handleExecute ~ BigInt(tx.value):", BigInt(tx.value))
      console.log("🚀 ~ handleExecute ~ tx.callData:", tx.callData)

      const gasEstimate = await metaMultiSigWallet?.estimateGas.execute([
        tx.to as `0x${string}`,
        BigInt(tx.value),
        tx.callData as `0x${string}`,
        zkProofs || [],
      ]);
      console.log("Gas estimate:", gasEstimate);

      const result = await metaMultiSigWallet.write.execute([
        tx.to as `0x${string}`,
        BigInt(tx.value),
        tx.callData as `0x${string}`,
        zkProofs || [],
      ]);

      console.log("🚀 ~ handleExecute ~ result:", result);
      if (result) {
        await markExecuted.mutateAsync(Number(tx?.txId));
      }
      console.log("Execute transaction result:", result);
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
                  <div>Amount: {formatEther(BigInt(tx?.value))} Ξ</div>
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

          <div>{formatEther(BigInt(tx?.value))} Ξ</div>

          <span>
            {tx?.signatureCount?.toString()}/
            {tx?.executedAt ? tx?.signaturesRequired.toString() : signaturesRequired.toString()}
          </span>

          <div className="action-btn flex gap-2">
            {tx?.executedAt ? (
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
