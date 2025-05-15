const { ethers } = require("hardhat");

// Deployed contract address
const BLUME_TOKEN_ADDRESS = "0x8CBabC07717038DA6fAf1bC477a39F1627988a3a";

// Private key for user2
const USER2_PRIVATE_KEY = "your_private_key";

async function main() {
    console.log("🚀 Testing Blume Token Contract...\n");

    // Get signers
    const signers = await ethers.getSigners();
    if (signers.length < 1) {
        throw new Error("No signers available. Check network configuration.");
    }

    // Assign owner and user1 as the same (first signer)
    const owner = signers[0];
    const user1 = owner; // Same as owner

    // Create user2 wallet from private key
    const user2 = new ethers.Wallet(USER2_PRIVATE_KEY, ethers.provider);

    console.log("Owner address (same as user1):", owner.address);
    console.log("User2 address:", user2.address);

    // Get contract instance
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    const blumeToken = BlumeToken.attach(BLUME_TOKEN_ADDRESS);

    console.log("\n📋 Contract Info:");
    console.log("Token name:", await blumeToken.name());
    console.log("Token symbol:", await blumeToken.symbol());
    console.log("Token decimals:", await blumeToken.decimals());
    console.log("Total supply:", ethers.formatEther(await blumeToken.totalSupply()), "BLX");

    // Test 1: Check initial owner balance
    console.log("\n🔍 Test 1: Initial Balances");
    const ownerBalance = await blumeToken.balanceOf(owner.address);
    console.log("Owner balance:", ethers.formatEther(ownerBalance), "BLX");

    // Test 2: Check transaction limits
    console.log("\n🔍 Test 2: Transaction Limits");
    const maxTxAmount = await blumeToken.maxTransactionAmount();
    const maxWalletBalance = await blumeToken.maxWalletBalance();
    console.log("Max transaction amount:", ethers.formatEther(maxTxAmount), "BLX");
    console.log("Max wallet balance:", ethers.formatEther(maxWalletBalance), "BLX");

    // Test 3: Check cooldown time
    console.log("\n🔍 Test 3: Cooldown Time");
    const cooldownTime = await blumeToken.cooldownTime();
    console.log("Cooldown time:", cooldownTime.toString(), "seconds");

    // Test 4: Transfer tokens (respecting limits)
    console.log("\n🔍 Test 4: Token Transfer");
    const transferAmount = ethers.parseEther("1000"); // 1000 BLX
    
    try {
        console.log("Transferring 1000 BLX to user2...");
        await blumeToken.connect(owner).transfer(user2.address, transferAmount);
        console.log("✅ Transfer successful");
        
        const user2Balance = await blumeToken.balanceOf(user2.address);
        console.log("User2 balance after transfer:", ethers.formatEther(user2Balance), "BLX");
    } catch (error) {
        console.log("❌ Transfer failed:", error.message);
    }

    // Test 5: Test cooldown mechanism
    console.log("\n🔍 Test 5: Cooldown Mechanism");
    try {
        // Try immediate second transfer
        console.log("Attempting immediate second transfer...");
        await blumeToken.connect(owner).transfer(user2.address, ethers.parseEther("100"));
        console.log("✅ Second transfer successful (owner excluded from limits)");
    } catch (error) {
        console.log("❌ Second transfer failed due to cooldown:", error.message);
    }

    // Test 6: Test with user2 (non-excluded address)
    console.log("\n🔍 Test 6: User Transfer with Cooldown");
    try {
        // Connect as user2
        const blumeTokenAsUser2 = blumeToken.connect(user2);
        
        console.log("User2 transferring 100 BLX to owner...");
        await blumeTokenAsUser2.transfer(owner.address, ethers.parseEther("100"));
        console.log("✅ First user transfer successful");
        
        // Try immediate second transfer
        console.log("User2 attempting immediate second transfer...");
        await blumeTokenAsUser2.transfer(owner.address, ethers.parseEther("50"));
        console.log("❌ This should have failed due to cooldown");
    } catch (error) {
        console.log("✅ Second transfer correctly failed due to cooldown:", error.message);
    }

    // Test 7: Check balances after transfers
    console.log("\n🔍 Test 7: Final Balances");
    console.log("Owner balance:", ethers.formatEther(await blumeToken.balanceOf(owner.address)), "BLX");
    console.log("User2 balance:", ethers.formatEther(await blumeToken.balanceOf(user2.address)), "BLX");

    // Test 8: Check if addresses are excluded from limits
    console.log("\n🔍 Test 8: Exclusion Status");
    console.log("Owner excluded from limits:", await blumeToken.isExcludedFromLimits(owner.address));
    console.log("User2 excluded from limits:", await blumeToken.isExcludedFromLimits(user2.address));

    // Test 9: Role management (if owner)
    console.log("\n🔍 Test 9: Role Management");
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    
    console.log("Owner has admin role:", await blumeToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address));
    console.log("Owner has minter role:", await blumeToken.hasRole(MINTER_ROLE, owner.address));

    // Test 10: Mint tokens (if has minter role)
    console.log("\n🔍 Test 10: Minting Tokens to User2");
    try {
        const mintAmount = ethers.parseEther("10000000000000");
        console.log("Minting 1000 BLX to user2...");
        await blumeToken.connect(owner).mint(user2.address, mintAmount);
        console.log("✅ Minting successful");
        console.log("User2 balance after mint:", ethers.formatEther(await blumeToken.balanceOf(user2.address)), "BLX");
    } catch (error) {
        console.log("❌ Minting failed:", error.message);   
    }

    // Test 11: Mint tokens to owner
    console.log("\n🔍 Test 11: Minting Tokens to Owner");
    try {
        const mintAmountOwner = ethers.parseEther("5000000000000"); // 5000 BLX
        console.log("Minting 5000 BLX to owner...");
        await blumeToken.connect(owner).mint(owner.address, mintAmountOwner);
        console.log("✅ Minting to owner successful");
        console.log("Owner balance after mint:", ethers.formatEther(await blumeToken.balanceOf(owner.address)), "BLX");
    } catch (error) {
        console.log("❌ Minting to owner failed:", error.message);
    }

    console.log("\n✅ All tests completed!");
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });