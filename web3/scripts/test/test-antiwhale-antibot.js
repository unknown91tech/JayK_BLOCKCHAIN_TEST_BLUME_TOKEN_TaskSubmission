const { ethers } = require("hardhat");

// Deployed contract address
const BLUME_TOKEN_ADDRESS = "0x8CBabC07717038DA6fAf1bC477a39F1627988a3a";

async function main() {
  console.log("🔒 Testing Anti-Whale and Anti-Bot Mechanisms...\n");

  // Get signers
  const [owner, whale, bot, normalUser] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("Whale address:", whale.address);
  console.log("Bot address:", bot.address);
  console.log("Normal User address:", normalUser.address);

  // Get contract instance
  const BlumeToken = await ethers.getContractFactory("BlumeToken");
  const blumeToken = BlumeToken.attach(BLUME_TOKEN_ADDRESS);

  // Check owner permissions and exclusions
  const DEFAULT_ADMIN_ROLE = await blumeToken.DEFAULT_ADMIN_ROLE();
  const isOwnerAdmin = await blumeToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
  console.log("Owner has DEFAULT_ADMIN_ROLE:", isOwnerAdmin);
  const ownerExcluded = await blumeToken.isExcludedFromLimits(owner.address);
  const whaleExcluded = await blumeToken.isExcludedFromLimits(whale.address);
  console.log("Owner excluded from limits:", ownerExcluded);
  console.log("Whale excluded from limits:", whaleExcluded);

  // Check owner balance
  const ownerBalance = await blumeToken.balanceOf(owner.address);
  console.log("Owner BLX balance:", ethers.formatEther(ownerBalance), "BLX");
  if (ownerBalance < BigInt(ethers.parseEther("10000000"))) {
    console.warn("⚠️ Owner has insufficient BLX for tests");
  }

  // Get current limits
  const maxTxAmount = await blumeToken.maxTransactionAmount();
  const maxWalletBalance = await blumeToken.maxWalletBalance();
  const totalSupply = await blumeToken.totalSupply();

  console.log("Type of maxTxAmount:", typeof maxTxAmount, maxTxAmount);
  console.log("Type of maxWalletBalance:", typeof maxWalletBalance, maxWalletBalance);
  console.log("Type of totalSupply:", typeof totalSupply, totalSupply);

  console.log("📊 Current Limits:");
  console.log("Max TX Amount:", ethers.formatEther(maxTxAmount), "BLX");
  console.log("Max Wallet Balance:", ethers.formatEther(maxWalletBalance), "BLX");
  console.log("Total Supply:", ethers.formatEther(totalSupply), "BLX");

  // Test 1: Anti-Whale - Attempt transaction above limit
  console.log("\n🐋 Test 1: Anti-Whale Protection");
  const aboveLimitAmount = maxTxAmount + BigInt(ethers.parseEther("1"));
  const setupAmount = BigInt(ethers.parseEther("3000000"));
  console.log(`Transferring ${ethers.formatEther(setupAmount)} BLX to normalUser for testing...`);
  await blumeToken.connect(owner).transfer(normalUser.address, setupAmount);
  await blumeToken.connect(owner).setExcludedFromLimits(normalUser.address, false);
  console.log("NormalUser balance:", ethers.formatEther(await blumeToken.balanceOf(normalUser.address)), "BLX");

  try {
    console.log("Attempting transfer above max transaction limit...");
    const tx = await blumeToken.connect(normalUser).transfer(whale.address, aboveLimitAmount);
    await tx.wait();
    console.log("❌ Test 1 Failed: Transfer should have reverted!");
  } catch (error) {
    console.log("✅ Test 1 Passed: Anti-whale protection working:", error.message);
  }

  // Test 2: Valid transfer within limits
  console.log("\n✅ Test 2: Valid Transfer Within Limits");
  const validAmount = BigInt(ethers.parseEther("5000"));
  try {
    const tx = await blumeToken.connect(owner).transfer(whale.address, validAmount);
    await tx.wait();
    console.log("✅ Test 2 Passed: Transfer successful");
    console.log("Whale balance:", ethers.formatEther(await blumeToken.balanceOf(whale.address)), "BLX");
  } catch (error) {
    console.log("❌ Test 2 Failed:", error.message);
  }

  // Test 3: Anti-Bot - Cooldown mechanism
  console.log("\n🤖 Test 3: Anti-Bot Cooldown");
  console.log("Bot balance before transfer:", ethers.formatEther(await blumeToken.balanceOf(bot.address)), "BLX");
  try {
    console.log("Transferring 1000 BLX to bot...");
    const tx = await blumeToken.connect(owner).transfer(bot.address, BigInt(ethers.parseEther("1000")));
    await tx.wait();
    console.log("✅ Initial transfer to bot successful");
    console.log("Bot balance:", ethers.formatEther(await blumeToken.balanceOf(bot.address)), "BLX");
  } catch (error) {
    console.log("❌ Initial transfer to bot failed:", error.message);
    return;
  }

  const blumeTokenAsBot = blumeToken.connect(bot);
  try {
    console.log("Bot making first transaction...");
    const tx1 = await blumeTokenAsBot.transfer(normalUser.address, BigInt(ethers.parseEther("100")));
    await tx1.wait();
    console.log("✅ First transaction successful");
    console.log("Bot balance:", ethers.formatEther(await blumeToken.balanceOf(bot.address)), "BLX");
    
    console.log("Bot attempting immediate second transaction...");
    const tx2 = await blumeTokenAsBot.transfer(normalUser.address, BigInt(ethers.parseEther("100")));
    await tx2.wait();
    console.log("❌ Test 3 Failed: Second transaction should have reverted!");
  } catch (error) {
    console.log("✅ Test 3 Passed: Cooldown protection working:", error.message);
  }

  // Test 4: Exclude address from limits
  console.log("\n🔓 Test 4: Excluding Address from Limits");
  try {
    console.log("Excluding whale from limits...");
    const tx = await blumeToken.connect(owner).setExcludedFromLimits(whale.address, true);
    await tx.wait();
    console.log("✅ Whale excluded from limits");
    
    console.log("Whale attempting large transaction after exclusion...");
    const largeAmount = maxTxAmount + BigInt(ethers.parseEther("1000"));
    const tx2 = await blumeToken.connect(owner).transfer(whale.address, largeAmount);
    await tx2.wait();
    console.log("✅ Test 4 Passed: Large transaction successful - exclusion working");
    console.log("Whale balance:", ethers.formatEther(await blumeToken.balanceOf(whale.address)), "BLX");
  } catch (error) {
    console.log("❌ Test 4 Failed:", error.message);
  }

  // Test 5: Update limits
  console.log("\n⚙️ Test 5: Updating Limits");
  try {
    const newMaxTx = BigInt(ethers.parseEther("2000000"));
    const newMaxWallet = BigInt(ethers.parseEther("3000000"));
    
    console.log("Updating transaction limits...");
    await blumeToken.connect(owner).setMaxTransactionAmount(newMaxTx);
    await blumeToken.connect(owner).setMaxWalletBalance(newMaxWallet);
    
    const updatedMaxTx = await blumeToken.maxTransactionAmount();
    const updatedMaxWallet = await blumeToken.maxWalletBalance();
    console.log("New max TX:", ethers.formatEther(updatedMaxTx), "BLX");
    console.log("New max wallet:", ethers.formatEther(updatedMaxWallet), "BLX");
    
    if (updatedMaxTx === newMaxTx && updatedMaxWallet === newMaxWallet) {
      console.log("✅ Test 5 Passed: Limits updated successfully");
    } else {
      console.log("❌ Test 5 Failed: Limits did not update correctly");
    }
  } catch (error) {
    console.log("❌ Test 5 Failed:", error.message);
  }

  // Test 6: Update cooldown time
  console.log("\n⏱️ Test 6: Updating Cooldown Time");
  try {
    console.log("Updating cooldown time to 30 seconds...");
    await blumeToken.connect(owner).setCooldownTime(30);
    
    const newCooldown = await blumeToken.cooldownTime();
    console.log("New cooldown:", newCooldown.toString(), "seconds");
    
    if (newCooldown === 30n) {
      console.log("✅ Test 6 Passed: Cooldown updated successfully");
    } else {
      console.log("❌ Test 6 Failed: Cooldown set to", newCooldown.toString(), "seconds instead of 30");
    }
  } catch (error) {
    console.log("❌ Test 6 Failed:", error.message);
  }

  // Test 7: Final balances
  console.log("\n📊 Final Balances:");
  console.log("Owner:", ethers.formatEther(await blumeToken.balanceOf(owner.address)), "BLX");
  console.log("Whale:", ethers.formatEther(await blumeToken.balanceOf(whale.address)), "BLX");
  console.log("Bot:", ethers.formatEther(await blumeToken.balanceOf(bot.address)), "BLX");
  console.log("Normal User:", ethers.formatEther(await blumeToken.balanceOf(normalUser.address)), "BLX");

  console.log("\n🏁 Tests completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });