import { Injectable, Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  http,
  decodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  ZERO_ADDRESS,
  getChainById,
  getContractConfigByChainId,
} from '@polypay/shared';
import {
  METAMULTISIG_ABI,
  METAMULTISIG_BYTECODE,
  MIXER_ABI,
} from '@polypay/shared';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '@/config/config.keys';
import { waitForReceiptWithRetry } from '@/common/utils/retry';

type RelayerChainClient = {
  chain: any;
  publicClient: any;
  walletClient: any;
  contractConfig: {
    zkVerifyAddress: `0x${string}`;
    vkHash: string;
    poseidonT3Address: `0x${string}` | string;
    mixerAddress: `0x${string}`;
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
    const supportedChainIds = [2651420, 84532, 26514, 8453];

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
   * Deploy MetaMultiSigWallet contract
   */
  async deployAccount(
    commitments: string[],
    threshold: number,
    chainId: number,
  ): Promise<{ address: string; txHash: string }> {
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

    // 4. Execute
    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: METAMULTISIG_ABI,
      functionName: 'execute',
      args,
      account: this.account,
      chain,
      gas: gasEstimate + 50000n,
    });

    this.logger.log(`Execute tx sent: ${txHash}`);

    // 5. Wait for receipt and verify status
    const receipt = await waitForReceiptWithRetry(publicClient, txHash);

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted on-chain. TxHash: ${txHash}`);
    }

    this.logger.log(
      `Transaction confirmed. Status: ${receipt.status}, Block: ${receipt.blockNumber}`,
    );

    return { txHash };
  }

  /**
   * Execute Mixer withdraw on-chain (relayer wallet pays gas)
   */
  async executeMixerWithdraw(
    chainId: number,
    token: string,
    denomination: string,
    recipient: string,
    nullifierHash: string,
    root: string,
    proof: {
      aggregationId: string;
      domainId: number;
      zkMerklePath: string[];
      leafCount: number;
      index: number;
    },
  ): Promise<string> {
    const { walletClient, publicClient, chain, contractConfig } =
      this.getChainClient(chainId);

    const mixerAddress = contractConfig.mixerAddress;
    if (
      !mixerAddress ||
      mixerAddress === '0x0000000000000000000000000000000000000000'
    ) {
      throw new Error(`Mixer not deployed on chainId ${chainId}`);
    }

    const args = [
      token as `0x${string}`,
      BigInt(denomination),
      recipient as `0x${string}`,
      nullifierHash as `0x${string}`,
      root as `0x${string}`,
      {
        aggregationId: BigInt(proof.aggregationId),
        domainId: BigInt(proof.domainId),
        zkMerklePath: proof.zkMerklePath as `0x${string}`[],
        leafCount: BigInt(proof.leafCount),
        index: BigInt(proof.index),
      },
    ] as const;

    const txHash = await walletClient.writeContract({
      address: mixerAddress,
      abi: MIXER_ABI,
      functionName: 'withdraw',
      args,
      account: this.account,
      chain,
    });

    this.logger.log(`Mixer withdraw tx sent: ${txHash}`);

    const receipt = await waitForReceiptWithRetry(publicClient, txHash);

    if (receipt.status === 'reverted') {
      throw new Error(`Mixer withdraw reverted. TxHash: ${txHash}`);
    }

    return txHash;
  }
}
