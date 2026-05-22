import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { PoseidonT3, proxy } from "poseidon-solidity";

/**
 * Deploys the PoseidonT3 hashing library to its deterministic address
 * (0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93) via the CREATE2 proxy.
 *
 * The Stylus MetaMultiSigWallet on Arbitrum STATICCALLs this contract by address,
 * so it must exist on the target chain. Idempotent: skips anything already deployed.
 *
 * Run only this (without deploying the Solidity multisig):
 *   yarn deploy --tags PoseidonT3 --network arbitrumSepolia
 */
const deployPoseidonT3: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const [signer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;

  // 1. Deploy the deterministic CREATE2 proxy if it's not already on this chain.
  if ((await provider.getCode(proxy.address)) === "0x") {
    console.log("Deploying CREATE2 proxy...");
    const fundTx = await signer.sendTransaction({ to: proxy.from, value: proxy.gas });
    await fundTx.wait();
    await provider.broadcastTransaction(proxy.tx);
    console.log(`Proxy deployed to: ${proxy.address}`);
  } else {
    console.log(`Proxy already at: ${proxy.address}`);
  }

  // 2. Deploy PoseidonT3 via the proxy (CREATE2 -> deterministic address).
  if ((await provider.getCode(PoseidonT3.address)) === "0x") {
    console.log("Deploying PoseidonT3...");
    const tx = await signer.sendTransaction({ to: proxy.address, data: PoseidonT3.data });
    await tx.wait();
    console.log(`PoseidonT3 deployed to: ${PoseidonT3.address}`);
  } else {
    console.log(`PoseidonT3 already at: ${PoseidonT3.address}`);
  }
};

export default deployPoseidonT3;

deployPoseidonT3.tags = ["PoseidonT3"];
