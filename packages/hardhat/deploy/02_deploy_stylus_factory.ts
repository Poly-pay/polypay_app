import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys MetaMultiSigWalletStylusFactory on the target chain.
 *
 * The Stylus implementation is deployed separately via `cargo stylus deploy`
 * (see packages/stylus/README.md). Pass its address through the
 * STYLUS_IMPL_ADDRESS env var, e.g.:
 *
 *   STYLUS_IMPL_ADDRESS=0x... yarn deploy --tags StylusFactory --network arbitrumSepolia
 *
 * Idempotent via hardhat-deploy's `deterministicDeployment` flag-free default
 * (re-runs return the existing deployment).
 */
const deployStylusFactory: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const implAddress = process.env.STYLUS_IMPL_ADDRESS;
  if (!implAddress) {
    throw new Error(
      "STYLUS_IMPL_ADDRESS is not set. Deploy the Stylus contract first with `cargo stylus deploy` " +
        "in packages/stylus and pass its address via STYLUS_IMPL_ADDRESS.",
    );
  }

  const result = await deploy("MetaMultiSigWalletStylusFactory", {
    from: deployer,
    args: [implAddress],
    log: true,
    autoMine: true,
  });

  console.log(`MetaMultiSigWalletStylusFactory at: ${result.address}`);
  console.log(`Implementation: ${implAddress}`);
};

export default deployStylusFactory;

deployStylusFactory.tags = ["StylusFactory"];
