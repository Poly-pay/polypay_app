import { registerAs } from '@nestjs/config';

export default registerAs('relayer', () => ({
  zkVerifyApiKey: process.env.RELAYER_ZKVERIFY_API_KEY,
  walletKey: process.env.RELAYER_WALLET_KEY,
  rewardWalletKey: process.env.REWARD_WALLET_KEY,
  // Compiled Stylus deployment bytecode (hex) for the Arbitrum account contract,
  // produced by `cargo stylus deploy --no-verify --dry-run` / the build output.
  stylusMultisigDeployBytecode: process.env.STYLUS_MULTISIG_DEPLOY_BYTECODE,
  // Optional override for the StylusDeployer address on the target chain.
  stylusDeployerAddress: process.env.STYLUS_DEPLOYER_ADDRESS,
}));
