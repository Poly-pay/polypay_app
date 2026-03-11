import * as request from 'supertest';
import { type Hex } from 'viem';
import {
  API_ENDPOINTS,
  CreateAccountDto,
  TxType,
} from '@polypay/shared';
import { getHttpServer } from '../setup';
import { getAuthHeader } from './auth.util';
import { getTransactionHash } from './contract.util';
import { generateTestProof } from './proof.util';
import { type TestIdentity } from './identity.util';

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
}

export interface ApproveTransactionPayload {
  voterCommitment: string;
  proof: number[];
  publicInputs: string[];
  nullifier: string;
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

