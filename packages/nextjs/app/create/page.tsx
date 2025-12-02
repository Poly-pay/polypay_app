"use client";

import { type FC, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UltraPlonkBackend } from "@aztec/bb.js";
import { Noir, abi } from "@noir-lang/noir_js";
import { useIsMounted, useLocalStorage } from "usehooks-ts";
import { Address, parseEther } from "viem";
import { useChainId, useWalletClient } from "wagmi";
import { AddressInput, EtherInput, InputBase } from "~~/components/scaffold-eth";
import { useDeployedContractInfo, useScaffoldContract, useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getPoolServerUrl } from "~~/utils/getPoolServerUrl";
import { DEFAULT_TX_DATA, METHODS, Method, PredefinedTxData } from "~~/utils/methods";
import {
  buildMerkleTree,
  getMerklePath,
  getPublicKeyXY,
  hexToByteArray,
  poseidon2HashAutoPadding3,
} from "~~/utils/multisig";
import { notification } from "~~/utils/scaffold-eth";

export type TransactionData = {
  chainId: number;
  address: Address;
  nonce: bigint;
  to: string;
  amount: string;
  data: `0x${string}`;
  hash: `0x${string}`;
  signatures: `0x${string}`[];
  signers: Address[];
  validSignatures?: { signer: Address; signature: Address }[];
  requiredApprovals: bigint;
};

const CreatePage: FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { targetNetwork } = useTargetNetwork();

  const [loading, setLoading] = useState(false);
  const [stateZkProof, setStateZkProof] = useState<string>("");

  const poolServerUrl = getPoolServerUrl(targetNetwork.id);

  const [ethValue, setEthValue] = useState("");
  const { data: contractInfo } = useDeployedContractInfo({ contractName: "MetaMultiSigWallet" });

  const [predefinedTxData, setPredefinedTxData] = useLocalStorage<PredefinedTxData>("predefined-tx-data", {
    methodName: "transferFunds",
    signer: "",
    newSignaturesNumber: "",
    amount: "0",
  });

  const { data: nonce } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "nonce",
  });

  const { data: signaturesRequired } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "signaturesRequired",
  });

  const { data: merkleRoot } = useScaffoldReadContract({
    contractName: "MetaMultiSigWallet",
    functionName: "merkleRoot",
  });

  const txTo = predefinedTxData.methodName === "transferFunds" ? predefinedTxData.signer : contractInfo?.address;

  const { data: metaMultiSigWallet } = useScaffoldContract({
    contractName: "MetaMultiSigWallet",
    walletClient,
  });

  const handleCreate = async () => {
    setLoading(true);
    try {
      if (!walletClient) {
        console.log("No wallet client!");
        return;
      }

      // ============ 1. Calculate txHash ============
      const currentNonce = nonce as bigint;
      const txHash = (await metaMultiSigWallet?.read.getTransactionHash([
        currentNonce,
        String(txTo),
        BigInt(predefinedTxData.amount as string),
        predefinedTxData.callData as `0x${string}`,
      ])) as `0x${string}`;

      // ============ 2. Sign txHash ============
      const signature = await walletClient.signMessage({
        message: { raw: txHash },
      });
      const { pubKeyX, pubKeyY } = await getPublicKeyXY(signature, txHash);

      // ============ 3. Get secret and calculate valuess ============
      const secret = localStorage.getItem("secret");
      if (!secret) {
        notification.error("No secret found in localStorage");
        setLoading(false);
        return;
      }
      const txHashBytes = hexToByteArray(txHash);
      const sigBytes = hexToByteArray(signature).slice(0, 64); // drop v byte
      const txHashCommitment = await poseidon2HashAutoPadding3([BigInt(txHash)]);
      const nullifier = await poseidon2HashAutoPadding3([BigInt(secret), BigInt(txHash)]);

      // ============ 4. Get merkle data ============
      const commitments = await metaMultiSigWallet?.read.getCommitments();
      const tree = await buildMerkleTree(commitments ?? []);

      // Find leaf index of signer
      const myCommitment = localStorage.getItem("commitment");
      if (!myCommitment) {
        notification.error("No commitment found in localStorage");
        setLoading(false);
        return;
      }
      const leafIndex = (commitments ?? []).findIndex(c => BigInt(c) === BigInt(myCommitment));

      if (leafIndex === -1) {
        notification.error("You are not a signer");
        return;
      }

      const merklePath = getMerklePath(tree, leafIndex);

      // ============ 5. Create ZK proof ============
      const input = {
        // Private inputs
        signature: sigBytes,
        pub_key_x: pubKeyX,
        pub_key_y: pubKeyY,
        secret: secret,
        leaf_index: leafIndex,
        merkle_path: merklePath.map(p => p.toString()),
        tx_hash_bytes: txHashBytes,
        // Public inputs
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
      const vk = await plonk.getVerificationKey();

      // ============ 6. Submit to zkVerify ============
      console.log("call relayer...");
      setStateZkProof("Submitting proof to relayer...");
      const res = await fetch("/api/relayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof: proof,
          publicInputs: publicInputs,
          vk: Buffer.from(vk).toString("base64"),
        }),
      });
      const zkVerifyData = await res.json();
      console.log("zkVerify response:", zkVerifyData);

      // ============ 7. Call contract proposeTx ============
      const zkProof = {
        nullifier: nullifier,
        aggregationId: BigInt(zkVerifyData.aggregationId),
        domainId: 0n,
        zkMerklePath: zkVerifyData.aggregationDetails.merkleProof as `0x${string}`[],
        leafCount: BigInt(zkVerifyData.aggregationDetails.numberOfLeaves),
        index: BigInt(zkVerifyData.aggregationDetails.leafIndex),
      };

      const tx = await metaMultiSigWallet?.write.proposeTx([
        txTo as `0x${string}`,
        BigInt(predefinedTxData.amount as string),
        predefinedTxData.callData as `0x${string}`,
        zkProof,
      ]);

      console.log("Propose tx:", tx);
      notification.success("Transaction proposed successfully!");

      setPredefinedTxData(DEFAULT_TX_DATA);
      setTimeout(() => {
        router.push("/pool");
      }, 777);
    } catch (e) {
      notification.error("Error while proposing transaction");
      console.error(e);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (predefinedTxData && !predefinedTxData.callData && predefinedTxData.methodName !== "transferFunds") {
      setPredefinedTxData({
        ...predefinedTxData,
        methodName: "transferFunds",
        callData: "",
      });
    }
  }, [predefinedTxData, setPredefinedTxData]);

  return isMounted() ? (
    <div className="flex flex-col flex-1 items-center my-20 gap-8">
      <div className="flex items-center flex-col flex-grow w-full max-w-lg">
        <div className="flex flex-col bg-base-100 shadow-lg shadow-secondary border-8 border-secondary rounded-xl w-full p-6">
          <div>
            <label className="label">
              <span className="label-text">Nonce</span>
            </label>
            <InputBase
              disabled
              value={nonce !== undefined ? `# ${nonce}` : "Loading..."}
              placeholder={"Loading..."}
              onChange={() => {
                null;
              }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="mt-6 w-full">
              <label className="label">
                <span className="label-text">Select method</span>
              </label>
              <select
                className="select select-bordered select-sm w-full bg-base-200 text-accent font-medium"
                value={predefinedTxData.methodName}
                onChange={e =>
                  setPredefinedTxData({
                    ...predefinedTxData,
                    methodName: e.target.value as Method,
                    callData: "" as `0x${string}`,
                  })
                }
              >
                {METHODS.map(method => (
                  <option key={method} value={method} disabled={method !== "transferFunds"}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <AddressInput
              placeholder={predefinedTxData.methodName === "transferFunds" ? "Recipient address" : "Signer address"}
              value={predefinedTxData.signer}
              onChange={signer => setPredefinedTxData({ ...predefinedTxData, signer: signer })}
            />

            {predefinedTxData.methodName === "transferFunds" && (
              <EtherInput
                value={ethValue}
                onChange={val => {
                  setPredefinedTxData({ ...predefinedTxData, amount: String(parseEther(val)) });
                  setEthValue(val);
                }}
              />
            )}

            <InputBase
              value={predefinedTxData.callData || ""}
              placeholder={"Calldata"}
              onChange={() => {
                null;
              }}
              disabled
            />

            <button className="btn btn-secondary btn-sm" disabled={!walletClient || loading} onClick={handleCreate}>
              {loading ? stateZkProof || "Loading..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
};

export default CreatePage;
