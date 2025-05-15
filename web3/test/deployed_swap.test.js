// scripts/testSwap.js
const { ethers } = require("hardhat");

async function main() {
  // Connect to the deployed contracts
  const BLX_ADDRESS = "0x3787831C45898677A07426b51EA3053c8DB32Dd4";
  const WETH_ADDRESS = "0x2f9aAd71531651432deCB6f34f0d124F7136227A";
  const ROUTER_ADDRESS = "0x56E525384313947106bd3BF0555d15510C6E0326";
  const PAIR_ADDRESS = "0x7aB182A1a90bcDb426BD3284bCF45641a254590e";

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Connect to contracts
  const blx = await ethers.getContractAt("BlumeToken", BLX_ADDRESS);
  const weth = await ethers.getContractAt("WETH", WETH_ADDRESS);
  const router = await ethers.getContractAt("BlumeSwapRouter", ROUTER_ADDRESS);
  const pair = await ethers.getContractAt("BlumeSwapPair", PAIR_ADDRESS);

  // Check balances before swap
  const blxBalanceBefore = await blx.balanceOf(deployer.address);
  const wethBalanceBefore = await weth.balanceOf(deployer.address);
  
  console.log(`Initial BLX balance: ${ethers.utils.formatEther(blxBalanceBefore)}`);
  console.log(`Initial WETH balance: ${ethers.utils.formatEther(wethBalanceBefore)}`);

  // Check pair reserves
  const reserves = await pair.getReserves();
  console.log(`Pair reserves: ${ethers.utils.formatEther(reserves[0])} token0, ${ethers.utils.formatEther(reserves[1])} token1`);
  
  const token0 = await pair.token0();
  const token1 = await pair.token1();
  console.log(`Token0: ${token0}`);
  console.log(`Token1: ${token1}`);
  
  // Determine which token is BLX and which is WETH in the pair
  const isBLXToken0 = token0.toLowerCase() === BLX_ADDRESS.toLowerCase();
  console.log(`BLX is token0: ${isBLXToken0}`);

  // Amount to swap
  const swapAmount = ethers.utils.parseEther("1"); // 1 BLX
  
  // Approve router to spend tokens
  console.log("Approving router to spend BLX...");
  await blx.approve(ROUTER_ADDRESS, swapAmount);
  console.log("Approval complete");

  // Path for the swap
  const path = [BLX_ADDRESS, WETH_ADDRESS];
  
  // Current timestamp + 20 minutes for deadline
  const deadline = Math.floor(Date.now() / 1000) + 1200;
  
  // Execute the swap
  console.log(`Swapping ${ethers.utils.formatEther(swapAmount)} BLX for WETH...`);
  const tx = await router.swapExactTokensForTokens(
    swapAmount,      // amount in
    0,               // minimum amount out (0 for testing, but should be higher in production)
    path,            // path
    deployer.address, // recipient
    deadline         // deadline
  );
  
  // Wait for the swap transaction to be mined
  const receipt = await tx.wait();
  console.log(`Swap complete! Transaction hash: ${receipt.transactionHash}`);
  
  // Check balances after swap
  const blxBalanceAfter = await blx.balanceOf(deployer.address);
  const wethBalanceAfter = await weth.balanceOf(deployer.address);
  
  console.log(`Final BLX balance: ${ethers.utils.formatEther(blxBalanceAfter)}`);
  console.log(`Final WETH balance: ${ethers.utils.formatEther(wethBalanceAfter)}`);
  
  console.log(`BLX spent: ${ethers.utils.formatEther(blxBalanceBefore.sub(blxBalanceAfter))}`);
  console.log(`WETH received: ${ethers.utils.formatEther(wethBalanceAfter.sub(wethBalanceBefore))}`);
  
  // Check pair reserves after swap
  const reservesAfter = await pair.getReserves();
  console.log(`Pair reserves after swap: ${ethers.utils.formatEther(reservesAfter[0])} token0, ${ethers.utils.formatEther(reservesAfter[1])} token1`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });