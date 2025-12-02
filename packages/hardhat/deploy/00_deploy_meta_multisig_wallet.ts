import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys a "MetaMultiSigWallet" contract
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployMetaMultiSigWallet: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
    On localhost, the deployer account is the one that comes with Hardhat, which is already funded.

    When deploying to live networks (e.g `yarn deploy --network sepolia`), the deployer account
    should have sufficient balance to pay for the gas fees for contract creation.

    You can generate a random account with `yarn generate` which will fill DEPLOYER_PRIVATE_KEY
    with a random private key in the .env file (then used on hardhat.config.ts)
    You can run the `yarn account` command to check your balance in every network.
  */
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  //   const poseidon2 = await deploy("Poseidon2Yul", {
  //   from: deployer,
  //   log: true,
  //   autoMine: true,
  // });
  // address poseidon2 on sepolia = 0x2Ca9484Ed2E7d391B92498Ca64F31a6438Ff30C0
  // address metamultisigwallet on sepolia = 0xa9c95A08850d294017902160d3047149A03984fC

  await deploy("MetaMultiSigWallet", {
    from: deployer,
    args: [
      // poseidon2.address,
      "0x2Ca9484Ed2E7d391B92498Ca64F31a6438Ff30C0", //poseidon2 address
      "0xEA0A0f1EfB1088F4ff0Def03741Cb2C64F89361E", // zkVerify contract address
      "0x56ac9c928c844eb6a9929df13ecd2d4aa4b7e06a864279a1e027e1727767ef5c", //vkhash
      // 31337, //chainId localhost
      11155111, //chainId
      [BigInt("18929556660797840564915493238049038928575445774436881641290216620298297649029")], //list commitments
      1 //signatures required
    ],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
  });

  // Get the deployed contract
  // const metaMultiSigWallet = await hre.ethers.getContract("MetaMultiSigWallet", deployer);
};

export default deployMetaMultiSigWallet;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags MetaMultiSigWallet
deployMetaMultiSigWallet.tags = ["MetaMultiSigWallet"];
