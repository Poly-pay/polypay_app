import {
  createWalletClient,
  http,
  type WalletClient,
  type Hex,
} from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { type TestUser } from "../fixtures/test-users";
import { horizenMainnet, horizenTestnet, NetworkValue } from "@polypay/shared";

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
 * @param testUser - Test user with private key
 * @returns TestSigner with walletClient, account and address
 */
export function createTestSigner(testUser: TestUser): TestSigner {
  const account = privateKeyToAccount(testUser.privateKey);
  const network = process.env.NETWORK;

  const walletClient = createWalletClient({
    account,
    chain: network === NetworkValue.mainnet ? horizenMainnet : horizenTestnet,
    transport: http(),
  });

  return {
    walletClient: walletClient as WalletClient,
    account,
    address: account.address,
    privateKey: testUser.privateKey,
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
