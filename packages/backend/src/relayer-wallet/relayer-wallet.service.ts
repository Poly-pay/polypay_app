import { Injectable, Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  http,
  decodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import {
  METAMULTISIG_ABI,
  METAMULTISIG_BYTECODE,
  METAMULTISIG_CONSTANTS,
} from '@/common/contracts/MetaMultiSigWallet';

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);
  private account;
  private publicClient;
  private walletClient;

  constructor() {
    const privateKey = process.env.RELAYER_WALLET_KEY as `0x${string}`;

    if (!privateKey) {
      throw new Error('RELAYER_WALLET_KEY is not set');
    }

    this.account = privateKeyToAccount(privateKey);

    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: sepolia,
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
      chain: sepolia,
    });

    this.logger.log(`Deploy tx sent: ${txHash}`);

    // Wait for receipt
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

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
    to: string,
    value: string,
    data: string,
    zkProofs: {
      nullifier: string;
      aggregationId: string;
      domainId: number;
      zkMerklePath: string[];
      leafCount: number;
      index: number;
    }[],
  ): Promise<{ txHash: string }> {
    // 1. Check wallet balance
    const balance = await this.publicClient.getBalance({
      address: walletAddress as `0x${string}`,
    });

    // Calculate required balance
    let requiredBalance = BigInt(value);

    // If data contains batchTransfer, parse and calculate total
    if (data && data !== '0x') {
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
          this.logger.log(
            `Batch transfer detected. Total amount: ${batchTotal}`,
          );
        }
      } catch (e) {
        // Not a batchTransfer call, ignore
        this.logger.debug(
          'Data is not batchTransfer, skipping batch balance check',
        );
      }
    }

    // Check balance
    if (requiredBalance > 0n && balance < requiredBalance) {
      throw new Error(
        `Insufficient wallet balance. Required: ${requiredBalance.toString()} wei, Available: ${balance.toString()} wei`,
      );
    }

    this.logger.log(
      `Wallet balance check passed. Balance: ${balance}, Required: ${requiredBalance}`,
    );

    // 2. Format proofs for contract
    const formattedProofs = zkProofs.map((proof) => ({
      nullifier: BigInt(proof.nullifier),
      aggregationId: BigInt(proof.aggregationId),
      domainId: BigInt(proof.domainId),
      zkMerklePath: proof.zkMerklePath as `0x${string}`[],
      leafCount: BigInt(proof.leafCount),
      index: BigInt(proof.index),
    }));

    const args = [
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
      chain: sepolia,
      gas: gasEstimate + 50000n,
    });

    this.logger.log(`Execute tx sent: ${txHash}`);

    // 5. Wait for receipt and verify status
    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted on-chain. TxHash: ${txHash}`);
    }

    this.logger.log(
      `Transaction confirmed. Status: ${receipt.status}, Block: ${receipt.blockNumber}`,
    );

    return { txHash };
  }
}
