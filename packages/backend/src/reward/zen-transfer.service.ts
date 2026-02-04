import { Injectable, Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  isAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChain, NetworkType } from '@polypay/shared';
import { ConfigService } from '@nestjs/config';
import { CONFIG_KEYS } from '@/config/config.keys';
import { waitForReceiptWithRetry, sleep } from '@/common/utils/retry';
import { ZEN_TOKEN_ADDRESS, ZEN_DECIMALS } from '@/common/constants';

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const MAX_SEND_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

@Injectable()
export class ZenTransferService {
  private readonly logger = new Logger(ZenTransferService.name);
  private account;
  private publicClient;
  private walletClient;
  private chain;
  private zenTokenAddress: `0x${string}`;

  constructor(private readonly configService: ConfigService) {
    const privateKey = this.configService.get<string>(
      CONFIG_KEYS.REWARD_WALLET_KEY,
    ) as `0x${string}`;

    if (!privateKey) {
      this.logger.warn(
        'REWARD_WALLET_KEY is not set - ZEN transfers will fail',
      );
      return;
    }

    // Get network config from env
    const network = (this.configService.get<string>(CONFIG_KEYS.APP_NETWORK) ||
      'testnet') as NetworkType;
    this.chain = getChain(network);
    this.zenTokenAddress = ZEN_TOKEN_ADDRESS[network] as `0x${string}`;

    this.account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(),
    });

    this.logger.log(
      `ZenTransferService initialized. Wallet: ${this.account.address}, Network: ${network}, ZEN Token: ${this.zenTokenAddress}`,
    );
  }

  /**
   * Get reward wallet address
   */
  getWalletAddress(): string {
    if (!this.account) {
      throw new Error('Reward wallet not initialized');
    }
    return this.account.address;
  }

  /**
   * Get ZEN balance of reward wallet
   */
  async getBalance(): Promise<number> {
    if (!this.publicClient || !this.account) {
      throw new Error('Reward wallet not initialized');
    }

    const balanceWei = await this.publicClient.readContract({
      address: this.zenTokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [this.account.address],
    });

    return parseFloat(formatUnits(balanceWei, ZEN_DECIMALS));
  }

  /**
   * Send ZEN to an address with retry logic
   * @param toAddress - Recipient address
   * @param amountZen - Amount in ZEN (not wei)
   * @returns Transaction hash
   */
  async sendZen(toAddress: string, amountZen: number): Promise<string> {
    // Validate wallet initialized
    if (!this.walletClient || !this.publicClient || !this.account) {
      throw new Error('Reward wallet not initialized');
    }

    // Validate address
    if (!isAddress(toAddress)) {
      throw new Error(`Invalid recipient address: ${toAddress}`);
    }

    // Convert to wei
    const amountWei = parseUnits(amountZen.toFixed(18), ZEN_DECIMALS);

    // Check balance
    const balance = await this.getBalance();
    if (balance < amountZen) {
      throw new Error(
        `Insufficient ZEN balance. Required: ${amountZen}, Available: ${balance}`,
      );
    }

    this.logger.log(
      `Sending ${amountZen} ZEN to ${toAddress}. Balance: ${balance}`,
    );

    // Retry loop for sending transaction
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_SEND_RETRIES; attempt++) {
      try {
        // Estimate gas
        const gasEstimate = await this.publicClient.estimateContractGas({
          address: this.zenTokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [toAddress as `0x${string}`, amountWei],
          account: this.account,
        });

        this.logger.log(`Gas estimate: ${gasEstimate} (attempt ${attempt})`);

        // Send transaction
        const txHash = await this.walletClient.writeContract({
          address: this.zenTokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [toAddress as `0x${string}`, amountWei],
          account: this.account,
          chain: this.chain,
          gas: gasEstimate + 10000n, // Add buffer
        });

        this.logger.log(`Transaction sent: ${txHash} (attempt ${attempt})`);

        // Wait for receipt
        const receipt = await waitForReceiptWithRetry(
          this.publicClient,
          txHash,
        );

        if (receipt.status === 'reverted') {
          throw new Error(`Transaction reverted on-chain. TxHash: ${txHash}`);
        }

        this.logger.log(
          `ZEN transfer confirmed. TxHash: ${txHash}, Block: ${receipt.blockNumber}`,
        );

        return txHash;
      } catch (error: any) {
        lastError = error;

        this.logger.error(
          `sendZen attempt ${attempt} failed: ${error.message}`,
        );

        if (attempt < MAX_SEND_RETRIES) {
          this.logger.warn(`Retrying in ${RETRY_DELAY_MS}ms...`);
          await sleep(RETRY_DELAY_MS);
        }
      }
    }

    throw new Error(
      `Failed to send ZEN after ${MAX_SEND_RETRIES} attempts: ${lastError?.message}`,
    );
  }
}
