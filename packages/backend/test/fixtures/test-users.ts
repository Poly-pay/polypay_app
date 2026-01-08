/**
 * Test accounts configuration
 * Private keys are loaded from environment variables (secrets)
 */

export interface TestUser {
  privateKey: `0x${string}`;
  name: string;
}

/**
 * Get test signer A
 * @throws Error if TEST_SIGNER_A_KEY is not set
 */
export function getSignerA(): TestUser {
  const privateKey = process.env.TEST_SIGNER_A_KEY;
  if (!privateKey) {
    throw new Error("TEST_SIGNER_A_KEY environment variable is not set");
  }
  return {
    privateKey: privateKey as `0x${string}`,
    name: "Signer A",
  };
}

/**
 * Get test signer B
 * @throws Error if TEST_SIGNER_B_KEY is not set
 */
export function getSignerB(): TestUser {
  const privateKey = process.env.TEST_SIGNER_B_KEY;
  if (!privateKey) {
    throw new Error("TEST_SIGNER_B_KEY environment variable is not set");
  }
  return {
    privateKey: privateKey as `0x${string}`,
    name: "Signer B",
  };
}
