import { Injectable, Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  http,
  decodeFunctionData,
  defineChain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  ZERO_ADDRESS,
  getChainById,
  getContractConfigByChainId,
  isStylusChain,
  getStylusFactoryAddress,
  METAMULTISIG_STYLUS_FACTORY_ABI,
  ARC_TESTNET_CHAIN_ID,
  META_MULTISIG_ARC_ABI,
  META_MULTISIG_ARC_BYTECODE,
} from '@polypay/shared';
import { METAMULTISIG_ABI, METAMULTISIG_BYTECODE } from '@polypay/shared';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '@/config/config.keys';
import { waitForReceiptWithRetry } from '@/common/utils/retry';
import { SUPPORTED_CHAIN_IDS } from '@/common/constants/campaign';
import { GAS_BUFFER_EXECUTE } from '@/common/constants/timing';
import { recoverArcSigner } from '@/arc/arc-transaction/signature.util';

// Arc testnet has no zkVerify deployment (it's "ecdsa", not "zk" - see
// getChainType in @polypay/shared), so it is intentionally excluded from
// SUPPORTED_CHAIN_IDS / clientsByChainId below. Defined locally until a
// shared chain object exists (the frontend defines its own equivalent via
// viem's defineChain in scaffold.config.ts).
const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USD Coin', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
});

type RelayerChainClient = {
  chain: any;
  publicClient: any;
  walletClient: any;
  contractConfig: {
    zkVerifyAddress: `0x${string}`;
    vkHash: string;
    poseidonT3Address: `0x${string}` | string;
  };
};

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);
  private readonly account;
  private readonly clientsByChainId = new Map<number, RelayerChainClient>();

  constructor(private readonly configService: ConfigService) {
    const privateKey = this.configService.get<string>(
      CONFIG_KEYS.RELAYER_WALLET_KEY,
    ) as `0x${string}`;

    if (!privateKey) {
      throw new Error('RELAYER_WALLET_KEY is not set');
    }

    this.account = privateKeyToAccount(privateKey);

    // Initialize clients for all supported chains
    const supportedChainIds = SUPPORTED_CHAIN_IDS;

    for (const chainId of supportedChainIds) {
      const chain = getChainById(chainId);
      const contractConfig = getContractConfigByChainId(chainId);

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const walletClient = createWalletClient({
        account: this.account,
        chain,
        transport: http(),
      });

      this.clientsByChainId.set(chainId, {
        chain,
        publicClient,
        walletClient,
        contractConfig,
      });
    }

    this.logger.log(
      `Relayer initialized with address: ${this.account.address} for chains: ${Array.from(
        this.clientsByChainId.keys(),
      ).join(', ')}`,
    );
  }

  private getChainClient(chainId: number): RelayerChainClient {
    const client = this.clientsByChainId.get(chainId);
    if (!client) {
      throw new Error(`Relayer: unsupported chainId ${chainId}`);
    }
    return client;
  }

  /**
   * Deploy MetaMultiSigWalletArc for an Arc account. Owners are plain ECDSA
   * addresses (no ZK commitments/proof verifier), so this is a sibling of
   * deployAccount rather than a branch inside it - same viem client/account
   * construction, different ABI/bytecode/args and no cached per-chain client
   * (Arc is not in SUPPORTED_CHAIN_IDS / clientsByChainId).
   */
  async deployArcAccount(
    owners: string[],
    threshold: number,
    chainId: number,
  ): Promise<string> {
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      throw new Error(`Relayer: unsupported Arc chainId ${chainId}`);
    }

    // Typed `any` like RelayerChainClient above: with a concrete chain type,
    // viem's deployContract overload resolution gets confused by EIP-4844
    // fields and demands a `kzg` param that doesn't apply here.
    const chain: any = arcTestnet;

    const publicClient: any = createPublicClient({
      chain,
      transport: http(),
    });

    const walletClient: any = createWalletClient({
      account: this.account,
      chain,
      transport: http(),
    });

    const hash = await walletClient.deployContract({
      abi: META_MULTISIG_ARC_ABI,
      bytecode: META_MULTISIG_ARC_BYTECODE as `0x${string}`,
      args: [BigInt(chainId), owners as `0x${string}`[], BigInt(threshold)],
      account: this.account,
      chain,
    });

    this.logger.log(
      `Arc deploy tx sent on chain ${chainId} for relayer ${this.account.address}: ${hash}`,
    );

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (!receipt.contractAddress) {
      throw new Error('Arc wallet deploy: no contractAddress in receipt');
    }

    this.logger.log(`Arc wallet deployed at: ${receipt.contractAddress}`);

    return receipt.contractAddress;
  }

  /**
   * Execute a transaction on MetaMultiSigWalletArc once enough owner
   * signatures have been collected. Sibling of deployArcAccount: same
   * ad-hoc client construction (Arc is not in clientsByChainId), different
   * ABI call. The contract requires signatures strictly ascending by
   * recovered signer address, so they are sorted here before submission.
   */
  async executeArcTransaction(
    walletAddress: string,
    nonce: number,
    to: string,
    value: bigint,
    data: string,
    signatures: string[],
    chainId: number,
  ): Promise<string> {
    if (chainId !== ARC_TESTNET_CHAIN_ID) {
      throw new Error(`Relayer: unsupported Arc chainId ${chainId}`);
    }

    const chain: any = arcTestnet;

    const publicClient: any = createPublicClient({
      chain,
      transport: http(),
    });

    const walletClient: any = createWalletClient({
      account: this.account,
      chain,
      transport: http(),
    });

    const withAddr = await Promise.all(
      signatures.map(async (s) => ({
        s,
        a: (
          await recoverArcSigner(
            walletAddress,
            chainId,
            nonce,
            to,
            value,
            data,
            s,
          )
        ).toLowerCase(),
      })),
    );
    withAddr.sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : 0));

    const hash = await walletClient.writeContract({
      address: walletAddress as `0x${string}`,
      abi: META_MULTISIG_ARC_ABI,
      functionName: 'execute',
      args: [
        BigInt(nonce),
        to as `0x${string}`,
        value,
        data as `0x${string}`,
        withAddr.map((x) => x.s as `0x${string}`),
      ],
      account: this.account,
      chain,
    });

    this.logger.log(`Arc execute tx sent on chain ${chainId}: ${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'reverted') {
      throw new Error(`Arc transaction reverted on-chain. TxHash: ${hash}`);
    }

    return receipt.transactionHash;
  }

  /**
   * Deploy MetaMultiSigWallet contract
   */
  async deployAccount(
    commitments: string[],
    threshold: number,
    chainId: number,
  ): Promise<{ address: string; txHash: string }> {
    // Stylus chains (Arbitrum) deploy the Rust/WASM port via StylusDeployer.
    if (isStylusChain(chainId)) {
      return this.deployStylusAccount(commitments, threshold, chainId);
    }

    const { chain, walletClient, publicClient, contractConfig } =
      this.getChainClient(chainId);

    const commitmentsBigInt = commitments.map((c) => BigInt(c));

    // Deploy contract
    const txHash = await walletClient.deployContract({
      abi: METAMULTISIG_ABI,
      bytecode: METAMULTISIG_BYTECODE,
      args: [
        contractConfig.zkVerifyAddress,
        contractConfig.vkHash,
        BigInt(chain.id),
        commitmentsBigInt,
        BigInt(threshold),
      ],
      account: this.account,
      chain,
    });

    this.logger.log(
      `Deploy tx sent on chain ${chainId} for relayer ${this.account.address}: ${txHash}`,
    );

    // Wait for receipt
    const receipt = await waitForReceiptWithRetry(publicClient, txHash);

    if (!receipt.contractAddress) {
      throw new Error('Contract deployment failed - no address returned');
    }

    this.logger.log(`Wallet deployed at: ${receipt.contractAddress}`);

    return {
      address: receipt.contractAddress,
      txHash,
    };
  }

  /**
   * Deploy a per-account MetaMultiSigWallet on an Arbitrum Stylus chain via an
   * EIP-1167 minimal proxy in front of the shared Stylus impl.
   *
   * Why the proxy: deploying a full Stylus contract (with its activation fee)
   * per account would be far more expensive than a tiny EVM proxy. The factory
   * clones a ~52-byte proxy whose fallback delegatecalls into the shared impl,
   * then atomically calls `init(...)` on the clone in the same tx so we never
   * expose a half-initialized wallet.
   */
  private async deployStylusAccount(
    commitments: string[],
    threshold: number,
    chainId: number,
  ): Promise<{ address: string; txHash: string }> {
    const { chain, walletClient, publicClient, contractConfig } =
      this.getChainClient(chainId);

    const factoryAddress = getStylusFactoryAddress(chainId);

    const commitmentsBigInt = commitments.map((c) => BigInt(c));

    // Simulate first to capture the proxy address returned by `createWallet`.
    const { result: deployedAddress, request } =
      await publicClient.simulateContract({
        address: factoryAddress,
        abi: METAMULTISIG_STYLUS_FACTORY_ABI,
        functionName: 'createWallet',
        args: [
          contractConfig.zkVerifyAddress,
          contractConfig.vkHash as `0x${string}`,
          contractConfig.poseidonT3Address as `0x${string}`,
          BigInt(chain.id),
          commitmentsBigInt,
          BigInt(threshold),
        ],
        account: this.account,
        chain,
      });

    const txHash = await walletClient.writeContract(request);
    this.logger.log(
      `Stylus factory createWallet tx sent on chain ${chainId}: ${txHash}`,
    );

    const receipt = await waitForReceiptWithRetry(publicClient, txHash);
    if (receipt.status === 'reverted') {
      throw new Error(`Stylus deployment reverted. TxHash: ${txHash}`);
    }

    // Normalize to lowercase to match the EVM deploy path (viem returns
    // receipt.contractAddress lowercased) and the address lookups in x402
    // (assertAccount lowercases) and the rest of the system. simulateContract
    // ABI-decodes the returned address to EIP-55 checksum, so without this the
    // account would be stored checksummed and lowercasing lookups would 404.
    const address = (deployedAddress as string).toLowerCase();
    this.logger.log(`Stylus wallet (proxy) deployed at: ${address}`);

    return { address, txHash };
  }

  /**
   * Execute transaction on MetaMultiSigWallet
   */
  async executeTransaction(
    accountAddress: string,
    nonce: number,
    to: string,
    value: string,
    data: string,
    chainId: number,
    zkProofs: {
      commitment: string;
      nullifier: string;
      aggregationId: string;
      domainId: number;
      zkMerklePath: string[];
      leafCount: number;
      index: number;
    }[],
    onTxSubmitted?: (txHash: string) => Promise<void>,
  ): Promise<{ txHash: string }> {
    const { publicClient, walletClient, chain } = this.getChainClient(chainId);

    // 1. Check account ETH balance
    const balance = await publicClient.getBalance({
      address: accountAddress as `0x${string}`,
    });

    // Calculate required ETH balance
    let requiredBalance = BigInt(value);

    // Track ERC20 requirements: { tokenAddress: amount }
    const erc20Requirements: Record<string, bigint> = {};

    if (value === '0' && data && data !== '0x') {
      // Try decode single ERC20 transfer
      try {
        const decoded = decodeFunctionData({
          abi: [
            {
              name: 'transfer',
              type: 'function',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
            },
          ],
          data: data as `0x${string}`,
        });

        if (decoded.functionName === 'transfer') {
          const tokenAddress = to.toLowerCase();
          const amount = decoded.args[1] as bigint;
          erc20Requirements[tokenAddress] =
            (erc20Requirements[tokenAddress] || 0n) + amount;
          this.logger.log(
            `ERC20 transfer detected. Token: ${tokenAddress}, Amount: ${amount}`,
          );
        }
      } catch (e) {
        // Not an ERC20 transfer, continue
      }

      // Try decode batchTransfer (ETH only)
      try {
        const decoded = decodeFunctionData({
          abi: [
            {
              name: 'batchTransfer',
              type: 'function',
              inputs: [
                { name: 'recipients', type: 'address[]' },
                { name: 'amounts', type: 'uint256[]' },
              ],
              outputs: [],
            },
          ],
          data: data as `0x${string}`,
        });

        if (decoded.functionName === 'batchTransfer') {
          const amounts = decoded.args[1] as bigint[];
          const batchTotal = amounts.reduce((sum, amount) => sum + amount, 0n);
          requiredBalance = requiredBalance + batchTotal;
          this.logger.log(`Batch transfer detected. ETH total: ${batchTotal}`);
        }
      } catch (e) {
        // Not a batchTransfer call, continue
      }

      // Try decode batchTransferMulti (mixed ETH + ERC20)
      try {
        const decoded = decodeFunctionData({
          abi: [
            {
              name: 'batchTransferMulti',
              type: 'function',
              inputs: [
                { name: 'recipients', type: 'address[]' },
                { name: 'amounts', type: 'uint256[]' },
                { name: 'tokenAddresses', type: 'address[]' },
              ],
              outputs: [],
            },
          ],
          data: data as `0x${string}`,
        });

        if (decoded.functionName === 'batchTransferMulti') {
          const amounts = decoded.args[1] as bigint[];
          const tokenAddresses = decoded.args[2] as string[];

          for (let i = 0; i < amounts.length; i++) {
            const tokenAddr = tokenAddresses[i].toLowerCase();
            if (tokenAddr === ZERO_ADDRESS) {
              // Native ETH
              requiredBalance = requiredBalance + amounts[i];
            } else {
              // ERC20
              erc20Requirements[tokenAddr] =
                (erc20Requirements[tokenAddr] || 0n) + amounts[i];
            }
          }

          this.logger.log(
            `BatchTransferMulti detected. ETH required: ${requiredBalance}, ERC20 tokens: ${Object.keys(erc20Requirements).length}`,
          );
        }
      } catch (e) {
        // Not a batchTransferMulti call, continue
      }
    }

    // Check ETH balance
    if (requiredBalance > 0n && balance < requiredBalance) {
      throw new Error(
        `Insufficient account ETH balance. Required: ${requiredBalance.toString()} wei, Available: ${balance.toString()} wei`,
      );
    }

    this.logger.log(
      `ETH balance check passed. Balance: ${balance}, Required: ${requiredBalance}`,
    );

    // Check ERC20 balances
    for (const [tokenAddress, requiredAmount] of Object.entries(
      erc20Requirements,
    )) {
      const tokenBalance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
          },
        ],
        functionName: 'balanceOf',
        args: [accountAddress as `0x${string}`],
      });

      if (tokenBalance < requiredAmount) {
        throw new Error(
          `Insufficient ERC20 balance. Token: ${tokenAddress}, Required: ${requiredAmount.toString()}, Available: ${tokenBalance.toString()}`,
        );
      }

      this.logger.log(
        `ERC20 balance check passed. Token: ${tokenAddress}, Balance: ${tokenBalance}, Required: ${requiredAmount}`,
      );
    }

    // 2. Format proofs for contract
    const formattedProofs = zkProofs.map((proof) => ({
      commitment: BigInt(proof.commitment),
      nullifier: BigInt(proof.nullifier),
      aggregationId: BigInt(proof.aggregationId),
      domainId: BigInt(proof.domainId),
      zkMerklePath: proof.zkMerklePath as `0x${string}`[],
      leafCount: BigInt(proof.leafCount),
      index: BigInt(proof.index),
    }));

    const args = [
      BigInt(nonce),
      to as `0x${string}`,
      BigInt(value),
      data as `0x${string}`,
      formattedProofs,
    ] as const;

    // 3. Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: accountAddress as `0x${string}`,
      abi: METAMULTISIG_ABI,
      functionName: 'execute',
      args,
      account: this.account,
    });

    this.logger.log(`Gas estimate for execute: ${gasEstimate}`);

    // 4. Submit transaction to chain
    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: METAMULTISIG_ABI,
      functionName: 'execute',
      args,
      account: this.account,
      chain,
      gas: gasEstimate + GAS_BUFFER_EXECUTE,
    });

    this.logger.log(`Execute tx sent: ${txHash}`);

    // 5. Notify caller of txHash before waiting for receipt
    //    (caller should persist txHash to DB at this point)
    if (onTxSubmitted) {
      await onTxSubmitted(txHash);
    }

    // 6. Wait for receipt and verify status
    const receipt = await waitForReceiptWithRetry(publicClient, txHash);

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted on-chain. TxHash: ${txHash}`);
    }

    this.logger.log(
      `Transaction confirmed. Status: ${receipt.status}, Block: ${receipt.blockNumber}`,
    );

    return { txHash };
  }
}
