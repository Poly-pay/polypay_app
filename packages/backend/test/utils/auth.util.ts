import * as request from 'supertest';
import { API_ENDPOINTS } from '@polypay/shared';
import { getHttpServer } from '../setup';
import { generateTestAuthProof } from './proof.util';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login user with ZK proof and get JWT tokens
 */
export async function loginUser(
  secret: bigint,
  commitment: string,
): Promise<AuthTokens> {
  const server = getHttpServer();

  // Generate auth proof
  const authProof = await generateTestAuthProof(secret);

  // Call login endpoint
  const response = await request(server)
    .post(API_ENDPOINTS.auth.login)
    .send({
      commitment,
      proof: authProof.proof,
      publicInputs: authProof.publicInputs,
    })
    .expect(201);

  return {
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

/**
 * Get Authorization header object
 */
export function getAuthHeader(accessToken: string): { Authorization: string } {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}
