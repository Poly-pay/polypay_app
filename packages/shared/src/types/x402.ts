/** EIP-3009 TransferWithAuthorization fields + split ECDSA (wallet signing UX). */
export interface Eip3009Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

/** x402 v1 payment payload (decoded from X-PAYMENT base64 JSON). */
export interface X402V1PaymentPayload {
  x402Version: 1;
  scheme: "exact";
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}

/** POST body. Path param carries multisigAddress; body is optional metadata. */
export interface X402DepositRequest {
  memo?: string;
}

export interface X402DepositResponse {
  principalTxHash: string;
  multisigAddress: string;
  depositedAmount: string;
  chainId: number;
  status: "SETTLED" | "FAILED";
  timestamp: string;
}

/** Coinbase / x402 v1 payment requirement item inside 402 `accepts`. */
export interface X402PaymentRequirements {
  scheme: "exact";
  network: string;
  asset: string;
  payTo: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
  // Discovery hints for the various x402 bazaars. Optional; populated only
  // when the route is intended to be indexed.
  outputSchema?: Record<string, unknown>; // PayAI / pay.sh: discoverable flag lives here
  extensions?: Record<string, unknown>; // CDP: declareDiscoveryExtension output
}

export interface X402DiscoveryResponse {
  accepts: X402PaymentRequirements[];
}
