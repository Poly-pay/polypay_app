import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { PoseidonT3, proxy } from "poseidon-solidity";

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

  const [signer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;

  // Deploy proxy if not exists
  if ((await provider.getCode(proxy.address)) === "0x") {
    console.log("Deploying proxy...");

    // Fund the keyless account
    const fundTx = await signer.sendTransaction({
      to: proxy.from,
      value: proxy.gas,
    });
    await fundTx.wait();

    // Send presigned transaction
    await provider.broadcastTransaction(proxy.tx);
    console.log(`Proxy deployed to: ${proxy.address}`);
  } else {
    console.log(`Proxy already at: ${proxy.address}`);
  }

  // Deploy PoseidonT3 if not exists
  if ((await provider.getCode(PoseidonT3.address)) === "0x") {
    console.log("Deploying PoseidonT3...");

    const deployTx = await signer.sendTransaction({
      to: proxy.address,
      data: PoseidonT3.data,
    });
    await deployTx.wait();
    console.log(`PoseidonT3 deployed to: ${PoseidonT3.address}`);
  } else {
    console.log(`PoseidonT3 already at: ${PoseidonT3.address}`);
  }

  // address metamultisigwallet on sepolia = 0x931f193FB8bAA1c6Cf96907CF7ff58627Ee23a71
  await deploy("MetaMultiSigWallet", {
    from: deployer,
    args: [
      "0xEA0A0f1EfB1088F4ff0Def03741Cb2C64F89361E", // zkVerify contract address
      "0x104717314e0c94ef15d6992292b713aa2ffc48c74e0c41f7344a611caa606dde", //vkhash
      // 31337, //chainId localhost
      11155111, //chainId
      [BigInt("7777412979265397193925220040726445950599854595059203997869095364409346949110"), BigInt("3893960714193187677642727159938790123674441621624357680276520538080166792249")], //list commitments testnet
      2, //signatures required
    ],
    log: true,
    // autoMine: can be passed to the deploy function to make the deployment process faster on local networks by
    // automatically mining the contract deployment transaction. There is no effect on live networks.
    autoMine: true,
    libraries: {
      PoseidonT3: PoseidonT3.address, // 0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93
    },
  });

  // Get the deployed contract
  // const metaMultiSigWallet = await hre.ethers.getContract("MetaMultiSigWallet", deployer);
};

export default deployMetaMultiSigWallet;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags MetaMultiSigWallet
deployMetaMultiSigWallet.tags = ["MetaMultiSigWallet"];
