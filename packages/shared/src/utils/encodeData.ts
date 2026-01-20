import { encodeFunctionData, type Hex } from "viem";

/**
 * Encode addSigners function call
 */
export function encodeAddSigners(
  commitments: string[],
  newThreshold: number,
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "addSigners",
        type: "function",
        inputs: [
          { name: "newCommitments", type: "uint256[]" },
          { name: "newSigRequired", type: "uint256" },
        ],
      },
    ],
    functionName: "addSigners",
    args: [commitments.map((c) => BigInt(c)), BigInt(newThreshold)],
  });
}

/**
 * Encode removeSigners function call
 */
export function encodeRemoveSigners(
  commitments: string[],
  newThreshold: number,
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "removeSigners",
        type: "function",
        inputs: [
          { name: "commitmentsToRemove", type: "uint256[]" },
          { name: "newSigRequired", type: "uint256" },
        ],
      },
    ],
    functionName: "removeSigners",
    args: [commitments.map((c) => BigInt(c)), BigInt(newThreshold)],
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
