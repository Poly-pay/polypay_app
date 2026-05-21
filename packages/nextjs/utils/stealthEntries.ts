import { type StealthBatchEntry, toUmbraTokenAddress } from "./stealth";
import { isStealthSupportedChain } from "@polypay/shared";
import { KeyPair, RandomNumber, Umbra } from "@umbracash/umbra-js";
import { providers } from "ethers";
import type { Address, Hex } from "viem";

// The Umbra SDK constructor eagerly builds an internal fallback provider
// from `process.env.BASE_RPC_URL`. Without this, in the browser it resolves
// to literal "undefined" and spams 404s. The fallback is only used by
// withdraw flows we never trigger, but silencing the noise keeps dev logs
// clean. Setting at module load is fine — the SDK reads it lazily at
// constructor time.
if (typeof process !== "undefined" && process.env && !process.env.BASE_RPC_URL) {
  (process.env as Record<string, string>).BASE_RPC_URL = "https://base-rpc.publicnode.com";
}

export interface StealthRecipientInput {
  recipient: string; // wallet address of recipient (NOT stealth)
  tokenAddress: string; // PolyPay convention (ZERO_ADDRESS for ETH)
  amount: bigint;
}

interface DerivedStealthOutput {
  entry: StealthBatchEntry;
  stealthAddress: Address;
}

// For each (recipient wallet, amount, token), this:
//  1. Looks up the recipient's meta-address on the Umbra StealthKeyRegistry.
//  2. Generates fresh ephemeral entropy.
//  3. Derives a one-time stealth address from the recipient's spending key.
//  4. Encrypts the entropy with the recipient's viewing key so they can scan.
//
// Result is a list of UmbraBatchSend entries ready to be encoded into a
// single multisig.execute call.
export async function deriveStealthEntries(
  chainId: number,
  rpcUrl: string,
  inputs: StealthRecipientInput[],
): Promise<DerivedStealthOutput[]> {
  if (!isStealthSupportedChain(chainId)) {
    throw new Error(`Stealth not supported on chain ${chainId}`);
  }
  if (inputs.length === 0) return [];

  const provider = new providers.JsonRpcProvider(rpcUrl, chainId);
  const umbra = new Umbra(provider, chainId);

  const outputs: DerivedStealthOutput[] = [];

  for (const input of inputs) {
    // Pull recipient's registered keys. The SDK throws if unregistered —
    // callers should pre-check via /api/stealth/status before reaching here.
    const recipientId = input.recipient;
    const stealthMeta = await (
      umbra as unknown as {
        prepareSend: (recipientId: string) => Promise<{
          stealthKeyPair: KeyPair;
          pubKeyXCoordinate: Hex;
          encrypted: { ciphertext: Hex };
          randomNumber: RandomNumber;
        }>;
      }
    ).prepareSend(recipientId);

    const entry: StealthBatchEntry = {
      receiver: stealthMeta.stealthKeyPair.address as Address,
      tokenAddr: toUmbraTokenAddress(input.tokenAddress),
      amount: input.amount,
      pkx: stealthMeta.pubKeyXCoordinate,
      ciphertext: stealthMeta.encrypted.ciphertext,
    };

    outputs.push({ entry, stealthAddress: entry.receiver });
  }

  return outputs;
}
