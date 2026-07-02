import { ethers, network } from "hardhat";

/**
 * Smoke-test the deployed Arc multisig (MetaMultiSigWalletArc).
 *
 * Assumes a 1-of-1 wallet whose sole owner is the deployer (the default from deployArc.ts).
 * It funds the wallet with a little native token, then has the owner sign and `execute` a
 * transfer back out — proving signature verification + execution work end to end.
 *
 *   WALLET_ADDRESS=0x... yarn hardhat run scripts/testArc.ts --network arcTestnet
 */
async function main() {
  const walletAddress = process.env.WALLET_ADDRESS;
  if (!walletAddress) throw new Error("Set WALLET_ADDRESS to the deployed MetaMultiSigWalletArc address");

  const [owner] = await ethers.getSigners();
  const wallet = await ethers.getContractAt("MetaMultiSigWalletArc", walletAddress);

  const fundAmount = ethers.parseEther("0.02");
  const sendAmount = ethers.parseEther("0.01");

  console.log(`Network:  ${network.name}`);
  console.log(`Owner:    ${owner.address}`);
  console.log(`Wallet:   ${walletAddress}`);

  // 1. Fund the wallet with native token so it has something to send.
  console.log(`\nFunding wallet with ${ethers.formatEther(fundAmount)}...`);
  await (await owner.sendTransaction({ to: walletAddress, value: fundAmount })).wait();
  console.log(`Wallet balance: ${ethers.formatEther(await ethers.provider.getBalance(walletAddress))}`);

  // 2. Owner signs the tx hash for nonce 0 and executes a transfer back to the owner.
  //    The contract tracks used nonces via a usedNonces mapping (not an auto-increment
  //    counter), so any nonce not yet consumed works; this smoke test uses 0 for the
  //    first execution on a freshly deployed wallet.
  const nonce = 0;
  const to = owner.address;
  const data = "0x";
  const txHash = await wallet.getTransactionHash(nonce, to, sendAmount, data);
  const signature = await owner.signMessage(ethers.getBytes(txHash)); // EIP-191 personal sign

  console.log(`\nExecuting transfer of ${ethers.formatEther(sendAmount)} back to owner (nonce ${nonce})...`);
  const receipt = await (await wallet.execute(nonce, to, sendAmount, data, [signature])).wait();
  console.log(`execute() ok in tx ${receipt?.hash}`);

  console.log(`\nWallet balance after: ${ethers.formatEther(await ethers.provider.getBalance(walletAddress))}`);
  console.log(`Wallet usedNonces[0] after: ${await wallet.usedNonces(nonce)}`);
  console.log("Multisig execute verified.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
