import { Injectable, Logger } from '@nestjs/common';
import {
  createWalletClient,
  createPublicClient,
  http,
  getContract,
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
    // Format proofs for contract
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

    // Estimate gas
    const gasEstimate = await this.publicClient.estimateContractGas({
      address: walletAddress as `0x${string}`,
      abi: METAMULTISIG_ABI,
      functionName: 'execute',
      args,
      account: this.account,
    });

    this.logger.log(`Gas estimate for execute: ${gasEstimate}`);

    // Execute
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

    // Wait for receipt
    await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  }
}
