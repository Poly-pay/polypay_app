import { UMBRA_ETH_PLACEHOLDER, ZERO_ADDRESS, getUmbraAddresses, isStealthSupportedChain } from "@polypay/shared";
import { type Address, type Hex, createPublicClient, encodeFunctionData, http } from "viem";
import { base } from "viem/chains";

// Single entry in UmbraBatchSend.batchSend. Matches the on-chain tuple layout.
export interface StealthBatchEntry {
  receiver: Address;
  tokenAddr: Address;
  amount: bigint;
  pkx: Hex; // 32 bytes
  ciphertext: Hex; // 32 bytes
}

// UmbraBatchSend reverts with NotSorted() if any entry's tokenAddr is less
// than the previous distinct one. The contract only enforces tokenAddr non-
// decreasing — within a token, order is free. We also break ties by receiver
// to keep ordering deterministic across retries.
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

const UMBRA_TOLL_ABI = [
  {
    name: "toll",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// umbra.sendEth/sendToken require _tollCommitment to equal the on-chain toll
// exactly. Toll is 0 on Base today but ScopeLift can flip it on, and a stale
// hardcoded value would brick stealth sends silently. Read it at propose time.
export async function getUmbraToll(chainId: number, rpcUrl: string): Promise<bigint> {
  const { umbra } = getUmbraAddresses(chainId);
  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });
  return (await client.readContract({
    address: umbra as Address,
    abi: UMBRA_TOLL_ABI,
    functionName: "toll",
  })) as bigint;
}

export function buildStealthBatchCall(chainId: number, toll: bigint, entries: StealthBatchEntry[]): BuiltStealthCall {
  if (!isStealthSupportedChain(chainId)) {
    throw new Error(`Stealth not supported on chain ${chainId}`);
  }
  if (entries.length === 0) {
    throw new Error("buildStealthBatchCall: empty entries");
  }

  const sorted = sortStealthEntries(entries);

  // Per UmbraBatchSend source: every entry forwards `_tollCommitment` as ETH
  // to the inner umbra.sendEth/sendToken call, and ETH entries additionally
  // forward their `amount`. The contract enforces that msg.value is consumed
  // exactly (TooMuchEthSent). So msg.value = sum(eth_amounts) + N * toll.
  let ethTotal = BigInt(sorted.length) * toll;
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
