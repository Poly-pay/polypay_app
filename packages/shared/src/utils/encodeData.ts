import { encodeFunctionData, pad, type Hex } from "viem";
import { L1_STANDARD_BRIDGE_ABI, OFT_ABI } from "../contracts/bridge-abi";
import { OP_BRIDGE_MIN_GAS_LIMIT } from "../constants/bridge";

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

// ─── Bridge encode functions ───

/**
 * Encode OP Stack bridgeETHTo call.
 * Used for ETH bridge from Base → Horizen.
 */
export function encodeBridgeETHTo(recipient: string): Hex {
  return encodeFunctionData({
    abi: L1_STANDARD_BRIDGE_ABI,
    functionName: "bridgeETHTo",
    args: [
      recipient as `0x${string}`,
      OP_BRIDGE_MIN_GAS_LIMIT,
      "0x" as Hex,
    ],
  });
}

/**
 * Convert an address to bytes32 (left-padded) for LayerZero.
 */
export function addressToBytes32(addr: string): Hex {
  return pad(addr as `0x${string}`, { size: 32 });
}

/**
 * Encode LayerZero OFT send() call.
 * minAmountLD = amountLD (no slippage, OFT is 1:1).
 */
export function encodeLzSend(
  dstEid: number,
  recipient: string,
  amountLD: bigint,
  nativeFee: bigint,
  refundAddress: string,
): Hex {
  return encodeFunctionData({
    abi: OFT_ABI,
    functionName: "send",
    args: [
      {
        dstEid,
        to: addressToBytes32(recipient),
        amountLD,
        minAmountLD: amountLD,
        extraOptions: "0x" as Hex,
        composeMsg: "0x" as Hex,
        oftCmd: "0x" as Hex,
      },
      {
        nativeFee,
        lzTokenFee: 0n,
      },
      refundAddress as `0x${string}`,
    ],
  });
}

/**
 * Encode approveAndCall on MetaMultiSigWallet.
 * Atomically approves a token and calls a target (e.g. OFT Adapter send).
 */
export function encodeApproveAndCall(
  token: string,
  spender: string,
  approveAmount: bigint,
  callTarget: string,
  callValue: bigint,
  callData: Hex,
): Hex {
  return encodeFunctionData({
    abi: [
      {
        name: "approveAndCall",
        type: "function",
        inputs: [
          { name: "token", type: "address" },
          { name: "spender", type: "address" },
          { name: "approveAmount", type: "uint256" },
          { name: "callTarget", type: "address" },
          { name: "callValue", type: "uint256" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    functionName: "approveAndCall",
    args: [
      token as `0x${string}`,
      spender as `0x${string}`,
      approveAmount,
      callTarget as `0x${string}`,
      callValue,
      callData,
    ],
  });
}
