import type { Eip3009Authorization, X402V1PaymentPayload } from "@polypay/shared";
import type { WalletClient } from "viem";
import { parseSignature } from "viem";

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

export async function signEip3009Authorization(params: {
  walletClient: WalletClient;
  account: `0x${string}`;
  usdcContract: `0x${string}`;
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  validitySeconds?: number;
  /** EIP-712 domain `name` of the USDC contract (e.g. "USD Coin" mainnet, "USDC" Sepolia). */
  domainName: string;
  /** EIP-712 domain `version` of the USDC contract (usually "2"). */
  domainVersion: string;
}): Promise<Eip3009Authorization> {
  const validitySeconds = params.validitySeconds ?? 300;
  const now = Math.floor(Date.now() / 1000);
  const validAfter = 0;
  const validBefore = now + validitySeconds;
  const nonce = randomBytes32();

  const sig = await params.walletClient.signTypedData({
    account: params.account,
    domain: {
      name: params.domainName,
      version: params.domainVersion,
      chainId: params.chainId,
      verifyingContract: params.usdcContract,
    },
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: {
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    },
  });

  const { v, r, s } = parseSignature(sig);

  return {
    from: params.from,
    to: params.to,
    value: params.value.toString(),
    validAfter,
    validBefore,
    nonce,
    v: Number(v),
    r,
    s,
  };
}

/** Build x402 v1 `X-PAYMENT` JSON (base64-encode before sending). */
export function buildX402V1PaymentPayload(
  facilitatorNetwork: string,
  auth: Eip3009Authorization,
): X402V1PaymentPayload {
  const vHex = auth.v.toString(16).padStart(2, "0");
  const signature = `0x${auth.r.slice(2)}${auth.s.slice(2)}${vHex}` as `0x${string}`;
  return {
    x402Version: 1,
    scheme: "exact",
    network: facilitatorNetwork,
    payload: {
      signature,
      authorization: {
        from: auth.from,
        to: auth.to,
        value: auth.value,
        validAfter: String(auth.validAfter),
        validBefore: String(auth.validBefore),
        nonce: auth.nonce,
      },
    },
  };
}

function randomBytes32(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map(b => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}
