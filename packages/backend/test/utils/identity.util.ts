import { createTestSigner, TestSigner } from './signer.util';
import { generateCommitment, generateSecret } from './proof.util';
import { type TestUser } from '../fixtures/test-users';

export interface TestIdentity {
  signer: TestSigner;
  secret: bigint;
  commitment: string;
  signerDto: {
    commitment: string;
    name: string;
  };
}

export async function createTestIdentity(
  getUser: () => TestUser,
  name: string,
): Promise<TestIdentity> {
  const signer = createTestSigner(getUser());
  const secret = await generateSecret(signer);
  const commitmentBigInt = await generateCommitment(secret);
  const commitment = commitmentBigInt.toString();

  return {
    signer,
    secret,
    commitment,
    signerDto: {
      commitment,
      name,
    },
  };
}
