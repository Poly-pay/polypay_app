import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { PoseidonT3, proxy } from "poseidon-solidity";
import { solidityPackedKeccak256 } from "ethers";
import { ZEN_TOKEN, USDC_TOKEN, getContractConfigByChainId } from "@polypay/shared";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const DENOMINATIONS = {
  ETH: [
    BigInt("10000000000000000"), // 0.01 ether
    BigInt("100000000000000000"), // 0.1 ether
    BigInt("1000000000000000000"), // 1 ether
  ],
  ZEN: [
    BigInt("1000000000000000000"), // 1
    BigInt("5000000000000000000"), // 5
    BigInt("10000000000000000000"), // 10
    BigInt("100000000000000000000"), // 100
    BigInt("1000000000000000000000"), // 1000
  ],
  USDC: [
    BigInt("1000000"), // 1 (6 decimals)
    BigInt("5000000"), // 5
    BigInt("10000000"), // 10
    BigInt("100000000"), // 100
    BigInt("1000000000"), // 1000
  ],
};

function buildAllowedPoolIds(zenAddress: string, usdcAddress: string): string[] {
  const poolIds: string[] = [];
  for (const denom of DENOMINATIONS.ETH) {
    poolIds.push(
      solidityPackedKeccak256(["address", "uint256"], [ZERO_ADDRESS, denom]),
    );
  }
  for (const denom of DENOMINATIONS.ZEN) {
    poolIds.push(
      solidityPackedKeccak256(["address", "uint256"], [zenAddress, denom]),
    );
  }
  for (const denom of DENOMINATIONS.USDC) {
    poolIds.push(
      solidityPackedKeccak256(["address", "uint256"], [usdcAddress, denom]),
    );
  }
  return poolIds;
}

// Map Hardhat network names → shared chainIds used in @polypay/shared configs.
const NETWORK_CHAIN_ID: Record<string, number> = {
  horizenTestnet: 2651420,
  baseSepolia: 84532,
};

const deployMixer: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const [signer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;
  const networkName = hre.network.name;

  const chainId = NETWORK_CHAIN_ID[networkName];
  if (!chainId) {
    console.log(`Skipping Mixer deploy for network ${networkName}`);
    return;
  }

  const sharedConfig = getContractConfigByChainId(chainId);

  const zkVerify = sharedConfig.zkVerifyAddress;
  const vkHash = sharedConfig.mixerVkHash;

  const zenAddress = ZEN_TOKEN.addresses[chainId];
  const usdcAddress = USDC_TOKEN.addresses[chainId];

  if ((await provider.getCode(proxy.address)) === "0x") {
    const fundTx = await signer.sendTransaction({
      to: proxy.from,
      value: proxy.gas,
    });
    await fundTx.wait();
    await provider.broadcastTransaction(proxy.tx);
    console.log(`Proxy deployed to: ${proxy.address}`);
  }

  if ((await provider.getCode(PoseidonT3.address)) === "0x") {
    const deployTx = await signer.sendTransaction({
      to: proxy.address,
      data: PoseidonT3.data,
    });
    await deployTx.wait();
    console.log(`PoseidonT3 deployed to: ${PoseidonT3.address}`);
  }

  const allowedPoolIds = buildAllowedPoolIds(zenAddress, usdcAddress);

  await deploy("Mixer", {
    from: deployer,
    args: [zkVerify, vkHash, allowedPoolIds],
    log: true,
    autoMine: true,
    libraries: {
      PoseidonT3: PoseidonT3.address,
    },
  });
};

export default deployMixer;
deployMixer.tags = ["Mixer"];
