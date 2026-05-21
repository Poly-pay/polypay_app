import axios from 'axios';
import { API_ENDPOINTS, CreateAccountDto, TxType } from '@polypay/shared';
import type {
  CreateTransactionPayload,
  ApproveTransactionPayload,
  CreateBatchItemPayload,
} from './transaction.util';
import type { AuthTokens } from './auth.util';
import { generateTestAuthProof } from './proof.util';

const BASE_URL =
  process.env.STAGING_API_BASE_URL || 'https://api.testnet.polypay.pro';

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function stagingLogin(
  secret: bigint,
  commitment: string,
): Promise<AuthTokens> {
  const authProof = await generateTestAuthProof(secret);

  const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.auth.login}`, {
    commitment,
    proof: authProof.proof,
    publicInputs: authProof.publicInputs,
  });

  return {
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  };
}

export async function stagingCreateAccount(
  accessToken: string,
  dto: CreateAccountDto,
) {
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.accounts.base}`,
      dto,
      { headers: authHeaders(accessToken) },
    );

    return response.data as { address: `0x${string}` };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('stagingCreateAccount error', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
}

export async function stagingCreateBatchItem(
  accessToken: string,
  payload: CreateBatchItemPayload,
) {
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.batchItems.base}`,
      payload,
      { headers: authHeaders(accessToken) },
    );

    return response.data as { id: string };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('stagingCreateBatchItem error', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
}

export async function stagingReserveNonce(
  accessToken: string,
  accountAddress: `0x${string}`,
  chainId: number,
) {
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.transactions.reserveNonce}`,
      { accountAddress, chainId },
      { headers: authHeaders(accessToken) },
    );

    return response.data as { nonce: number };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('stagingReserveNonce error', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
}

export async function stagingCreateTransaction(
  accessToken: string,
  payload: CreateTransactionPayload,
) {
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.transactions.base}`,
      payload,
      { headers: authHeaders(accessToken) },
    );

    return response.data as { txId: string };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('stagingCreateTransaction error', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
}

export async function stagingApproveTransaction(
  accessToken: string,
  txId: string,
  payload: ApproveTransactionPayload,
) {
  try {
    await axios.post(
      `${BASE_URL}${API_ENDPOINTS.transactions.approve(Number(txId))}`,
      payload,
      { headers: authHeaders(accessToken) },
    );
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('stagingApproveTransaction error', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
}

export async function stagingExecuteTransaction(
  accessToken: string,
  txId: string,
) {
  // Execute waits for on-chain receipt + zkVerify aggregation, which on a
  // slow testnet can run several minutes. Most managed hosts (Cloudflare,
  // Vercel, ALB) reset idle inbound connections somewhere between 60-300s
  // regardless of how long the server keeps working. So we treat the
  // initial POST as fire-and-forget: swallow socket hang-ups / undefined
  // responses, then poll the transaction's status until EXECUTED or FAILED.
  // The executor persists txHash to DB right after on-chain submission,
  // so the poll can hand it back without a fresh server response.
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.transactions.execute(Number(txId))}`,
      undefined,
      {
        headers: authHeaders(accessToken),
        timeout: 10 * 60_000,
      },
    );
    if (response.data?.txHash) {
      return response.data as { txHash: string };
    }
  } catch (error: any) {
    const isSocketHangUp =
      error?.code === 'ECONNRESET' ||
      error?.message?.includes('socket hang up') ||
      (axios.isAxiosError(error) && error.response === undefined);

    if (!isSocketHangUp) {
      if (axios.isAxiosError(error)) {
        console.error('stagingExecuteTransaction error', {
          status: error.response?.status,
          data: error.response?.data,
        });
      }
      throw error;
    }

    console.warn(
      `stagingExecuteTransaction: initial POST hung up, falling back to polling for txId=${txId}`,
    );
  }

  // Poll until status finalizes.
  const POLL_INTERVAL_MS = 5_000;
  const POLL_TIMEOUT_MS = 10 * 60_000;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const tx = await stagingGetTransaction(accessToken, txId);
    if (tx?.status === 'EXECUTED' && tx?.txHash) {
      return { txHash: tx.txHash };
    }
    if (tx?.status === 'FAILED') {
      throw new Error(
        `stagingExecuteTransaction: txId ${txId} ended in FAILED status`,
      );
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(
    `stagingExecuteTransaction: timed out waiting for txId ${txId} to EXECUTE`,
  );
}

export async function stagingGetTransaction(accessToken: string, txId: string) {
  try {
    const response = await axios.get(
      `${BASE_URL}${API_ENDPOINTS.transactions.byTxId(Number(txId))}`,
      { headers: authHeaders(accessToken) },
    );

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('stagingGetTransaction error', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
}
