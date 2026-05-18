// Loads packages/backend/.env so BUYER_PRIVATE_KEY etc. can come from there
// instead of being passed inline every time.
import 'dotenv/config';

/**
 * One-off bootstrap: makes a real USDC deposit through PolyPay's CDP bazaar
 * endpoint so Coinbase CDP indexes the route in agentic.market.
 *
 * Usage:
 *   BUYER_PRIVATE_KEY=0x... \
 *   MULTISIG_ADDRESS=0x... \
 *   BACKEND_URL=https://api.polypay.app \
 *   CHAIN_ID=84532 \
 *   AMOUNT_USDC=0.01 \
 *   yarn ts-node scripts/bazaar-bootstrap.ts
 *
 * Chains:
 *   84532 = Base Sepolia (use this first to verify the flow with free USDC)
 *   8453  = Base mainnet (run after Sepolia is confirmed)
 *
 * The bootstrap buyer wallet must hold USDC on the target chain. CDP indexing
 * happens ~10 min after a successful settlement; check the catalog via:
 *   curl https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources
 */
import axios from 'axios';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  toHex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

const NETWORK_LABEL: Record<number, string> = {
  8453: 'base',
  84532: 'base-sepolia',
};

const USDC_NAME_VERSION_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'version', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
] as const;

async function main(): Promise<void> {
  const privateKey = process.env.BUYER_PRIVATE_KEY as `0x${string}`;
  const multisig = process.env.MULTISIG_ADDRESS as `0x${string}`;
  const backendUrl = (process.env.BACKEND_URL ?? '').replace(/\/$/, '');
  const chainId = Number(process.env.CHAIN_ID ?? '84532');
  const amountUsdc = process.env.AMOUNT_USDC ?? '0.01';

  if (!privateKey || !multisig || !backendUrl) {
    throw new Error(
      'Missing required env: BUYER_PRIVATE_KEY, MULTISIG_ADDRESS, BACKEND_URL',
    );
  }
  const usdc = USDC_ADDRESSES[chainId];
  if (!usdc) throw new Error(`USDC address not configured for chain ${chainId}`);

  const chain = chainId === 8453 ? base : baseSepolia;
  const publicClient = createPublicClient({ chain, transport: http() });
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({ account, chain, transport: http() });

  console.log(`Bootstrap from ${account.address} → multisig ${multisig}`);
  console.log(`Chain ${chainId} (${NETWORK_LABEL[chainId]}), amount ${amountUsdc} USDC`);

  const [domainName, domainVersion] = await Promise.all([
    publicClient.readContract({ address: usdc, abi: USDC_NAME_VERSION_ABI, functionName: 'name' }),
    publicClient.readContract({ address: usdc, abi: USDC_NAME_VERSION_ABI, functionName: 'version' }),
  ]);

  const value = parseUnits(amountUsdc, 6);
  const now = Math.floor(Date.now() / 1000);
  const validAfter = 0n;
  const validBefore = BigInt(now + 600);
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(32)));

  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: domainName,
      version: domainVersion,
      chainId,
      verifyingContract: usdc,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: account.address,
      to: multisig,
      value,
      validAfter,
      validBefore,
      nonce: nonce as `0x${string}`,
    },
  });

  const xPaymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: NETWORK_LABEL[chainId],
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: multisig,
        value: value.toString(),
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };
  const header = Buffer.from(JSON.stringify(xPaymentPayload)).toString('base64');

  const url = `${backendUrl}/api/x402/bazaar/deposit/${multisig}`;
  console.log(`POST ${url}`);

  const res = await axios.post(url, { memo: 'bazaar-bootstrap' }, {
    headers: { 'X-PAYMENT': header, 'Content-Type': 'application/json' },
    validateStatus: () => true,
  });
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(res.data, null, 2));
  if (res.status >= 400) process.exit(1);

  console.log('\nDone. Wait ~10 min then check:');
  console.log('  curl https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
