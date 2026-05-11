import { UMBRA_ETH_PLACEHOLDER, ZERO_ADDRESS, getUmbraAddresses, isStealthSupportedChain } from "@polypay/shared";
import { type Address, type Hex, encodeFunctionData } from "viem";

// Single entry in UmbraBatchSend.batchSend. Matches the on-chain tuple layout.
export interface StealthBatchEntry {
  receiver: Address;
  tokenAddr: Address;
  amount: bigint;
  pkx: Hex; // 32 bytes
  ciphertext: Hex; // 32 bytes
}

// UmbraBatchSend reverts with NotSorted() unless entries are ordered by
// (tokenAddr, receiver) ascending. We sort on the client so we never hit it.
export function sortStealthEntries(entries: StealthBatchEntry[]): StealthBatchEntry[] {
  return [...entries].sort((a, b) => {
    const tokenCompare = a.tokenAddr.toLowerCase().localeCompare(b.tokenAddr.toLowerCase());
    if (tokenCompare !== 0) return tokenCompare;
    return a.receiver.toLowerCase().localeCompare(b.receiver.toLowerCase());
  });
}

const UMBRA_BATCH_SEND_ABI = [
  {
    name: "batchSend",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "_tollCommitment", type: "uint256" },
      {
        name: "_data",
        type: "tuple[]",
        components: [
          { name: "receiver", type: "address" },
          { name: "tokenAddr", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "pkx", type: "bytes32" },
          { name: "ciphertext", type: "bytes32" },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export interface BuiltStealthCall {
  to: Address;
  value: bigint;
  data: Hex;
}

// Convert PolyPay's "ZERO_ADDRESS means native ETH" convention to Umbra's
// own placeholder. Token addresses are unchanged otherwise.
export function toUmbraTokenAddress(tokenAddress: string): Address {
  if (tokenAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return UMBRA_ETH_PLACEHOLDER as Address;
  }
  return tokenAddress as Address;
}

export function buildStealthBatchCall(chainId: number, toll: bigint, entries: StealthBatchEntry[]): BuiltStealthCall {
  if (!isStealthSupportedChain(chainId)) {
    throw new Error(`Stealth not supported on chain ${chainId}`);
  }
  if (entries.length === 0) {
    throw new Error("buildStealthBatchCall: empty entries");
  }

  const sorted = sortStealthEntries(entries);

  // Sum native ETH needed: toll + sum(amount) for ETH entries.
  let ethTotal = toll;
  for (const entry of sorted) {
    if (entry.tokenAddr.toLowerCase() === UMBRA_ETH_PLACEHOLDER.toLowerCase()) {
      ethTotal += entry.amount;
    }
  }

  const data = encodeFunctionData({
    abi: UMBRA_BATCH_SEND_ABI,
    functionName: "batchSend",
    args: [toll, sorted],
  });

  const { batchSend } = getUmbraAddresses(chainId);
  return {
    to: batchSend as Address,
    value: ethTotal,
    data,
  };
}
