import {
  API_ENDPOINTS,
  type X402DepositRequest,
  type X402DepositResponse,
  type X402DiscoveryResponse,
} from "@polypay/shared";
import axios from "axios";
import { API_BASE_URL } from "~~/constants";

const x402Client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export function encodeXPaymentHeader(payload: object): string {
  return btoa(JSON.stringify(payload));
}

export const x402Api = {
  discovery: async (multisigAddress: string): Promise<X402DiscoveryResponse> => {
    const res = await x402Client.get(API_ENDPOINTS.x402.deposit(multisigAddress), {
      validateStatus: status => status === 402,
    });
    if (res.status !== 402) {
      throw new Error(`Expected HTTP 402 from discovery, got ${res.status}`);
    }
    return res.data as X402DiscoveryResponse;
  },

  deposit: async (
    multisigAddress: string,
    xPaymentBase64: string,
    body: X402DepositRequest = {},
  ): Promise<X402DepositResponse> => {
    const { data } = await x402Client.post<X402DepositResponse>(API_ENDPOINTS.x402.deposit(multisigAddress), body, {
      headers: { "X-PAYMENT": xPaymentBase64 },
    });
    return data;
  },
};
