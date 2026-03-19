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
) {
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.transactions.reserveNonce}`,
      { accountAddress },
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
  try {
    const response = await axios.post(
      `${BASE_URL}${API_ENDPOINTS.transactions.execute(Number(txId))}`,
      undefined,
      { headers: authHeaders(accessToken) },
    );

    return response.data as { txHash: string };
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('stagingExecuteTransaction error', {
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    throw error;
  }
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
