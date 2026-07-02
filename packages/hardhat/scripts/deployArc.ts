import { ethers, network } from "hardhat";

/**
 * Standalone deploy for the Arc multisig (MetaMultiSigWalletArc).
 *
 * This is intentionally NOT a hardhat-deploy script: `yarn deploy` would also run the
 * ZK wallet + Poseidon deployers, which cannot work on Arc (no zkVerify contract there).
 * Run this directly instead:
 *
 *   yarn hardhat run scripts/deployArc.ts --network arcTestnet
 *
 * Requirements:
 *   - __RUNTIME_DEPLOYER_PRIVATE_KEY set to a funded Arc testnet account
 *     (gas is paid in USDC; get testnet USDC from https://faucet.circle.com).
 *
 * Optional env:
 *   - ARC_OWNERS          comma-separated owner addresses (default: the deployer)
 *   - ARC_SIGS_REQUIRED   threshold (default: min(2, owners.length))
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number(network.config.chainId ?? (await ethers.provider.getNetwork()).chainId);

  const owners = (process.env.ARC_OWNERS ?? deployer.address)
    .split(",")
    .map(a => a.trim())
    .filter(a => a.length > 0);

  const sigsRequired = process.env.ARC_SIGS_REQUIRED
    ? Number(process.env.ARC_SIGS_REQUIRED)
    : Math.min(2, owners.length);

  console.log(`Network:      ${network.name} (chainId ${chainId})`);
  console.log(`Deployer:     ${deployer.address}`);
  console.log(`Balance:      ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} (native gas token)`);
  console.log(`Owners:       ${owners.join(", ")}`);
  console.log(`Threshold:    ${sigsRequired}-of-${owners.length}`);

  const factory = await ethers.getContractFactory("MetaMultiSigWalletArc");
  const wallet = await factory.deploy(chainId, owners, sigsRequired);
  await wallet.waitForDeployment();

  const address = await wallet.getAddress();
  console.log(`\nMetaMultiSigWalletArc deployed to: ${address}`);
  if (chainId === 5042002) {
    console.log(`Explorer: https://testnet.arcscan.app/address/${address}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
