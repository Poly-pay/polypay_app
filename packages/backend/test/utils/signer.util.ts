import {
  createWalletClient,
  http,
  type WalletClient,
  type Hex,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { type TestAccount } from "../fixtures/test-accounts";
import { horizenTestnet } from "@polypay/shared";

/**
 * Test signer with wallet client and account info
 */
export interface TestSigner {
  walletClient: WalletClient;
  account: PrivateKeyAccount;
  address: `0x${string}`;
  privateKey: `0x${string}`;
}

/**
 * Create a test signer from private key
 * @param testAccount - Test account with private key
 * @returns TestSigner with walletClient, account and address
 */
export function createTestSigner(testAccount: TestAccount): TestSigner {
  const account = privateKeyToAccount(testAccount.privateKey);

  const walletClient = createWalletClient({
    account,
    chain: horizenTestnet,
    transport: http(),
  });

  return {
    walletClient: walletClient as WalletClient,
    account,
    address: account.address,
    privateKey: testAccount.privateKey,
  };
}

/**
 * Sign a message with test signer (local signing, no RPC call)
 * @param signer - Test signer
 * @param message - Message to sign (string or raw bytes as Hex)
 * @returns Signature as Hex
 */
export async function signMessage(
  signer: TestSigner,
  message: string | { raw: Hex }
): Promise<Hex> {
  // Use account.signMessage for local signing (no RPC call)
  const signature = await signer.account.signMessage({
    message,
  });
  return signature;
}

/**
 * Sign raw bytes with test signer (local signing, no RPC call)
 * @param signer - Test signer
 * @param rawBytes - Raw bytes as Hex
 * @returns Signature as Hex
 */
export async function signRawMessage(
  signer: TestSigner,
  rawBytes: Hex
): Promise<Hex> {
  const signature = await signer.account.signMessage({
    message: { raw: rawBytes },
  });
  return signature;
}
