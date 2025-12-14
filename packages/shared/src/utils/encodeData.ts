import { encodeFunctionData, type Hex } from "viem";

/**
 * Encode addSigner function call
 */
export function encodeAddSigner(commitment: string, newThreshold: number): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "addSigner",
        type: "function",
        inputs: [
          { name: "newCommitment", type: "uint256" },
          { name: "newSigRequired", type: "uint256" },
        ],
      },
    ],
    functionName: "addSigner",
    args: [BigInt(commitment), BigInt(newThreshold)],
  });
}

/**
 * Encode removeSigner function call
 */
export function encodeRemoveSigner(
  commitment: string,
  newThreshold: number,
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "removeSigner",
        type: "function",
        inputs: [
          { name: "commitment", type: "uint256" },
          { name: "newSigRequired", type: "uint256" },
        ],
      },
    ],
    functionName: "removeSigner",
    args: [BigInt(commitment), BigInt(newThreshold)],
  });
}

/**
 * Encode updateSignaturesRequired function call
 */
export function encodeUpdateThreshold(newThreshold: number): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "updateSignaturesRequired",
        type: "function",
        inputs: [{ name: "newSigRequired", type: "uint256" }],
      },
    ],
    functionName: "updateSignaturesRequired",
    args: [BigInt(newThreshold)],
  });
}

/**
 * Encode batchTransfer function call
 */
export function encodeBatchTransfer(
  recipients: string[],
  amounts: bigint[],
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "batchTransfer",
        type: "function",
        inputs: [
          { name: "recipients", type: "address[]" },
          { name: "amounts", type: "uint256[]" },
        ],
      },
    ],
    functionName: "batchTransfer",
    args: [recipients as `0x${string}`[], amounts],
  });
}
