import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { CONFIG_KEYS } from '@/config/config.keys';
import { getChain } from '@polypay/shared';
import { TelegramService } from './telegram.service';

interface ChainCheck {
  name: string;
  chain: any;
  threshold: bigint;
}

@Injectable()
export class BalanceAlertScheduler {
  private readonly logger = new Logger(BalanceAlertScheduler.name);
  private readonly walletAddress: string;
  private readonly chains: ChainCheck[];

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService,
  ) {
    const privateKey = this.configService.get<string>(
      CONFIG_KEYS.RELAYER_WALLET_KEY,
    ) as `0x${string}`;

    if (!privateKey) {
      throw new Error('RELAYER_WALLET_KEY is not set');
    }

    const account = privateKeyToAccount(privateKey);
    this.walletAddress = account.address;

    const network = this.configService.get<string>(CONFIG_KEYS.APP_NETWORK);
    const isMainnet = network === 'mainnet';

    this.chains = [
      {
        name: isMainnet ? 'Horizen Mainnet' : 'Horizen Testnet',
        chain: getChain(network as 'mainnet' | 'testnet'),
        threshold: 100000000000000n, // 0.0001 ETH
      },
      {
        name: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
        chain: isMainnet ? base : baseSepolia,
        threshold: 500000000000000n, // 0.0005 ETH
      },
    ];

    this.logger.log(
      `Balance alert initialized for relayer: ${this.walletAddress}`,
    );
  }

  // 6:00 AM Vietnam (23:00 UTC)
  @Cron('0 23 * * *', { timeZone: 'UTC' })
  async checkBalances() {
    this.logger.log('Running daily relayer balance check');

    const alerts: string[] = [];

    for (const { name, chain, threshold } of this.chains) {
      try {
        const client = createPublicClient({
          chain,
          transport: http(),
        });

        const balance = await client.getBalance({
          address: this.walletAddress as `0x${string}`,
        });

        const balanceFormatted = formatEther(balance);
        const thresholdFormatted = formatEther(threshold);

        if (balance < threshold) {
          this.logger.warn(
            `Low balance on ${name}: ${balanceFormatted} ETH (threshold: ${thresholdFormatted} ETH)`,
          );

          const balanceShort = parseFloat(balanceFormatted).toFixed(6);
          const thresholdShort = parseFloat(thresholdFormatted).toFixed(4);

          alerts.push(
            `🔴 <b>${name}</b>\n` +
              `   <code>${balanceShort} / ${thresholdShort} ETH</code>`,
          );
        } else {
          this.logger.log(`${name} balance OK: ${balanceFormatted} ETH`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to check balance on ${name}: ${error.message}`,
        );
        alerts.push(
          `<b>${name}</b>\nFailed to check balance: ${error.message}`,
        );
      }
    }

    if (alerts.length > 0) {
      const now = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const message =
        `⚠️ <b>PolyPay Relayer — Low Balance</b>\n\n` +
        `🔑 <code>${this.walletAddress}</code>\n\n` +
        alerts.join('\n\n') +
        `\n\n⏰ ${now} (UTC+7)`;

      await this.telegramService.sendMessage(message);
    }
  }
}
