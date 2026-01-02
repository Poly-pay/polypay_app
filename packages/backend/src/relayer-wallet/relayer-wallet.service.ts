import { Injectable, Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  http,
  decodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { horizenTestnet } from '@polypay/shared';
import {
  METAMULTISIG_ABI,
  METAMULTISIG_BYTECODE,
  METAMULTISIG_CONSTANTS,
} from '@polypay/shared';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '@/config/config.keys';

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);
  private account;
  private publicClient;
  private walletClient;

  constructor(private readonly configService: ConfigService) {
    const privateKey = this.configService.get<string>(
      CONFIG_KEYS.RELAYER_WALLET_KEY,
    ) as `0x${string}`;

    if (!privateKey) {
      throw new Error('RELAYER_WALLET_KEY is not set');
    }

    this.account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: horizenTestnet,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: horizenTestnet,
      transport: http(),
    });

    this.logger.log(
      `Relayer initialized with address: ${this.account.address}`,
    );
  }

  /**
   * Deploy MetaMultiSigWallet contract
   */
  async deployWallet(
    commitments: string[],
    threshold: number,
  ): Promise<{ address: string; txHash: string }> {
    const commitmentsBigInt = commitments.map((c) => BigInt(c));

    // Deploy contract
    const txHash = await this.walletClient.deployContract({
      abi: METAMULTISIG_ABI,
      bytecode: METAMULTISIG_BYTECODE,
      args: [
        METAMULTISIG_CONSTANTS.zkVerifyAddress,
        METAMULTISIG_CONSTANTS.vkHash,
        BigInt(METAMULTISIG_CONSTANTS.chainId),
        commitmentsBigInt,
        BigInt(threshold),
      ],
      account: this.account,
      chain: horizenTestnet,
    });

    this.logger.log(`Deploy tx sent: ${txHash}`);

    // Wait for receipt
    const receipt = await this.waitForReceiptWithRetry(txHash);

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
    walletAddress: string,
    nonce: number,
    to: string,
    value: string,
    data: string,
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
    // 1. Check wallet ETH balance
    const balance = await this.publicClient.getBalance({
      address: walletAddress as `0x${string}`,
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
          const zeroAddress = '0x0000000000000000000000000000000000000000';

          for (let i = 0; i < amounts.length; i++) {
            const tokenAddr = tokenAddresses[i].toLowerCase();
            if (tokenAddr === zeroAddress) {
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
        `Insufficient wallet ETH balance. Required: ${requiredBalance.toString()} wei, Available: ${balance.toString()} wei`,
      );
    }

    this.logger.log(
      `ETH balance check passed. Balance: ${balance}, Required: ${requiredBalance}`,
    );

    // Check ERC20 balances
    for (const [tokenAddress, requiredAmount] of Object.entries(
      erc20Requirements,
    )) {
      const tokenBalance = await this.publicClient.readContract({
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
        args: [walletAddress as `0x${string}`],
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
    const gasEstimate = await this.publicClient.estimateContractGas({
      address: walletAddress as `0x${string}`,
      abi: METAMULTISIG_ABI,
      functionName: 'execute',
      args,
      account: this.account,
    });

    this.logger.log(`Gas estimate for execute: ${gasEstimate}`);

    // 4. Execute
    const txHash = await this.walletClient.writeContract({
      address: walletAddress as `0x${string}`,
      abi: METAMULTISIG_ABI,
      functionName: 'execute',
      args,
      account: this.account,
      chain: horizenTestnet,
      gas: gasEstimate + 50000n,
    });

    this.logger.log(`Execute tx sent: ${txHash}`);

    // 5. Wait for receipt and verify status
    const receipt = await this.waitForReceiptWithRetry(txHash);

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted on-chain. TxHash: ${txHash}`);
    }

    this.logger.log(
      `Transaction confirmed. Status: ${receipt.status}, Block: ${receipt.blockNumber}`,
    );

    return { txHash };
  }

  private async waitForReceiptWithRetry(
    txHash: `0x${string}`,
    maxRetries: number = 5,
  ): Promise<any> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const receipt = await this.publicClient.waitForTransactionReceipt({
          hash: txHash,
        });
        return receipt;
      } catch (error: any) {
        lastError = error;

        // Check if retryable error
        const isRetryable =
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNREFUSED' ||
          error.message?.includes('timeout') ||
          error.message?.includes('network') ||
          error.message?.includes('connection');

        if (!isRetryable || attempt === maxRetries) {
          this.logger.error(
            `waitForReceipt failed after ${attempt} attempts: ${error.message}`,
          );
          throw error;
        }

        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        this.logger.warn(
          `waitForReceipt attempt ${attempt} failed, retrying in ${delay}ms: ${error.code || error.message}`,
        );
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
