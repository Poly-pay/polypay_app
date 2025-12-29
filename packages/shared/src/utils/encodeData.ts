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
  newThreshold: number
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

export function encodeERC20Transfer(to: string, amount: bigint): string {
  return encodeFunctionData({
    abi: [
      {
        name: "transfer",
        type: "function",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
    functionName: "transfer",
    args: [to as `0x${string}`, amount],
  });
}

/**
 * Encode batchTransfer without erc20 function call
 */
export function encodeBatchTransfer(
  recipients: string[],
  amounts: bigint[]
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

/**
 * Encode batchTransferMulti with erc20 function call
 */
export function encodeBatchTransferMulti(
  recipients: string[],
  amounts: bigint[],
  tokenAddresses: string[],
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "batchTransferMulti",
        type: "function",
        inputs: [
          { name: "recipients", type: "address[]" },
          { name: "amounts", type: "uint256[]" },
          { name: "tokenAddresses", type: "address[]" },
        ],
      },
    ],
    functionName: "batchTransferMulti",
    args: [
      recipients as `0x${string}`[],
      amounts,
      tokenAddresses as `0x${string}`[],
    ],
  });
}
