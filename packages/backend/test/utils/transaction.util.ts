import * as request from 'supertest';
import { type Hex } from 'viem';
import {
  API_ENDPOINTS,
  CreateAccountDto,
  TxType,
} from '@polypay/shared';
import { parseTokenAmount } from '@polypay/shared';
import { getHttpServer } from '../setup';
import { getAuthHeader } from './auth.util';
import { createTestPublicClient, getTransactionHash } from './contract.util';
import { generateTestProof } from './proof.util';
import { type TestIdentity } from './identity.util';
import { type TestSigner } from './signer.util';
import { waitForReceiptWithRetry } from '@/common/utils/retry';

export interface CreateTransactionPayload {
  nonce: number;
  type: TxType;
  accountAddress: `0x${string}`;
  to: `0x${string}`;
  value: string;
  threshold: number;
  creatorCommitment: string;
  proof: number[];
  publicInputs: string[];
  nullifier: string;
  /** For TxType.BATCH: IDs from apiCreateBatchItem (order = execution order) */
  batchItemIds?: string[];
}

export interface ApproveTransactionPayload {
  voterCommitment: string;
  proof: number[];
  publicInputs: string[];
  nullifier: string;
}

export interface ParsedTokenAmount {
  amountString: string;
  amountBigInt: bigint;
}

export async function apiCreateAccount(
  accessToken: string,
  dto: CreateAccountDto,
) {
  const server = getHttpServer();

  const response = await request(server)
    .post(API_ENDPOINTS.accounts.base)
    .set(getAuthHeader(accessToken))
    .send(dto)
    .expect(201);

  return response.body as { address: `0x${string}` };
}

export async function apiReserveNonce(
  accessToken: string,
  accountAddress: `0x${string}`,
) {
  const server = getHttpServer();

  const response = await request(server)
    .post(API_ENDPOINTS.transactions.reserveNonce)
    .set(getAuthHeader(accessToken))
    .send({ accountAddress })
    .expect(201);

  return response.body as { nonce: number };
}

export async function apiCreateTransaction(
  accessToken: string,
  payload: CreateTransactionPayload,
) {
  const server = getHttpServer();

  const response = await request(server)
    .post(API_ENDPOINTS.transactions.base)
    .set(getAuthHeader(accessToken))
    .send(payload)
    .expect(201);

  return response.body as { txId: string };
}

export async function apiApproveTransaction(
  accessToken: string,
  txId: string,
  payload: ApproveTransactionPayload,
) {
  const server = getHttpServer();

  await request(server)
    .post(API_ENDPOINTS.transactions.approve(Number(txId)))
    .set(getAuthHeader(accessToken))
    .send(payload)
    .expect(201);
}

export async function apiExecuteTransaction(
  accessToken: string,
  txId: string,
) {
  const server = getHttpServer();

  const response = await request(server)
    .post(API_ENDPOINTS.transactions.execute(Number(txId)))
    .set(getAuthHeader(accessToken))
    .expect(201);

  return response.body as { txHash: string };
}

export async function apiGetTransaction(accessToken: string, txId: string) {
  const server = getHttpServer();

  const response = await request(server)
    .get(API_ENDPOINTS.transactions.byTxId(Number(txId)))
    .set(getAuthHeader(accessToken))
    .expect(200);

  return response.body;
}

export interface CreateBatchItemPayload {
  recipient: string;
  amount: string;
  tokenAddress?: string | null;
}

export async function apiCreateBatchItem(
  accessToken: string,
  payload: CreateBatchItemPayload,
) {
  const server = getHttpServer();

  const response = await request(server)
    .post(API_ENDPOINTS.batchItems.base)
    .set(getAuthHeader(accessToken))
    .send(payload)
    .expect(201);

  return response.body as { id: string };
}

export async function generateVotePayload(
  identity: TestIdentity,
  accountAddress: `0x${string}`,
  nonce: bigint,
  to: `0x${string}`,
  value: bigint,
  callData: Hex = '0x',
): Promise<ApproveTransactionPayload> {
  const txHash = await getTransactionHash(
    accountAddress,
    nonce,
    to,
    value,
    callData,
  );

  const proof = await generateTestProof(identity.signer, identity.secret, txHash);

  return {
    voterCommitment: identity.commitment,
    proof: proof.proof,
    publicInputs: proof.publicInputs,
    nullifier: proof.nullifier,
  };
}

/**
 * Convert human-readable token amount to smallest unit (string + bigint)
 * using shared parseTokenAmount helper.
 */
export function toTokenAmount(
  humanAmount: string,
  decimals: number,
): ParsedTokenAmount {
  const amountString = parseTokenAmount(humanAmount, decimals);
  return {
    amountString,
    amountBigInt: BigInt(amountString),
  };
}

/**
 * Transfer ERC20 tokens from a test signer to a recipient address.
 * Uses standard ERC20 transfer(address,uint256) and waits for confirmation.
 */
export async function transferErc20FromSigner(
  signer: TestSigner,
  tokenAddress: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
): Promise<Hex> {
  const hash = await signer.walletClient.writeContract({
    account: signer.account,
    address: tokenAddress,
    abi: [
      {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'success', internalType: 'bool' as const }],
      },
    ],
    functionName: 'transfer',
    args: [to, amount],
  } as any);

  const publicClient = createTestPublicClient();
  await waitForReceiptWithRetry(publicClient as any, hash);

  return hash as Hex;
}

/**
 * Read ERC20 token balance for an address.
 */
export async function getErc20Balance(
  accountAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
): Promise<bigint> {
  const publicClient = createTestPublicClient();

  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
      },
    ],
    functionName: 'balanceOf',
    args: [accountAddress],
  });

  return balance as bigint;
}


