const { ethers } = require("hardhat");

// Deployed contract address
const BLUME_TOKEN_ADDRESS = "0x8CBabC07717038DA6fAf1bC477a39F1627988a3a";

async function main() {
    console.log("🔐 Testing Role Management and Access Control...\n");

    // Get signers
    const signers = await ethers.getSigners();
    if (signers.length < 5) throw new Error("Not enough signers available");
    const [owner, admin, minter, pauser, user] = signers;
    console.log("Signers:", {
        owner: owner.address,
        admin: admin.address,
        minter: minter.address,
        pauser: pauser.address,
        user: user.address,
    });

    // Get contract instance
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    const blumeToken = BlumeToken.attach(BLUME_TOKEN_ADDRESS);
    console.log("Contract address:", blumeToken.address);

    // Define roles
    const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

    console.log("📋 Role Definitions:", { DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE });

    // Test 1: Initial Role Check
    console.log("\n🔍 Test 1: Initial Role Check");
    console.log("Owner roles:", {
        admin: await blumeToken.hasRole(DEFAULT_ADMIN_ROLE, owner.address),
        minter: await blumeToken.hasRole(MINTER_ROLE, owner.address),
        pauser: await blumeToken.hasRole(PAUSER_ROLE, owner.address),
    });

    // Test 2: Granting Roles
    console.log("\n👥 Test 2: Granting Roles");
    for (const [role, account, roleName] of [
        [DEFAULT_ADMIN_ROLE, admin, "admin"],
        [MINTER_ROLE, minter, "minter"],
        [PAUSER_ROLE, pauser, "pauser"],
    ]) {
        try {
            console.log(`Granting ${roleName} role to ${account.address}...`);
            const tx = await blumeToken.grantRole(role, account.address);
            await tx.wait();
            console.log(`✅ ${roleName} role granted`);
        } catch (error) {
            console.log(`❌ ${roleName} role grant failed:`, error.reason || error.message);
        }
    }

    //  // Test 3: Verify Role Assignments
    console.log("\n✅ Test 3: Verify Role Assignments");
    console.log("Role assignments:", {
        admin: await blumeToken.hasRole(DEFAULT_ADMIN_ROLE, admin.address),
        minter: await blumeToken.hasRole(MINTER_ROLE, minter.address),
        pauser: await blumeToken.hasRole(PAUSER_ROLE, pauser.address),
    });

    // Test 4: Minting with Minter Role
    console.log("\n🎯 Test 4: Minting with Minter Role");
    try {
        const blumeTokenAsMinter = blumeToken.connect(minter);
        const mintAmount = ethers.parseEther("10000");
        console.log(`Minter minting 10,000 BLX to ${user.address}...`);
        const tx = await blumeTokenAsMinter.mint(user.address, mintAmount);
        await tx.wait();
        console.log("✅ Minting successful");
        console.log("User balance:", ethers.formatEther(await blumeToken.balanceOf(user.address)), "BLX");
    } catch (error) {
        console.log("❌ Minting failed:", error.reason || error.message);
    }

    // Test 5: Attempt Minting without Minter Role
    console.log("\n❌ Test 5: Attempt Minting without Minter Role");
    try {
        const blumeTokenAsUser = blumeToken.connect(user);
        console.log("User attempting to mint (should fail)...");
        await blumeTokenAsUser.mint(user.address, ethers.parseEther("1000"));
        console.log("❌ This should have failed!");
    } catch (error) {
        console.log("✅ Minting correctly denied:", error.reason || error.message);
    }

    // Test 6: Pausing with Pauser Role
    console.log("\n⏸️ Test 6: Pausing with Pauser Role");
    try {
        const blumeTokenAsPauser = blumeToken.connect(pauser);
        console.log("Pauser pausing the contract...");
        if (!(await blumeToken.paused())) {
            const tx = await blumeTokenAsPauser.pause();
            await tx.wait();
            console.log("✅ Contract paused successfully");
            console.log("Contract paused:", await blumeToken.paused());
        } else {
            console.log("Contract already paused");
        }
    } catch (error) {
        console.log("❌ Pausing failed:", error.reason || error.message);
    }

    // Test 7: Transfer While Paused
    console.log("\n🚫 Test 7: Transfer While Paused");
    try {
        const blumeTokenAsOwner = blumeToken.connect(owner);
        console.log("Attempting transfer while paused...");
        await blumeTokenAsOwner.transfer(user.address, ethers.parseEther("100"));
        console.log("❌ This should have failed!");
    } catch (error) {
        console.log("✅ Transfer correctly denied while paused:", error.reason || error.message);
    }

    // Test 8: Unpausing Contract
    console.log("\n▶️ Test 8: Unpausing Contract");
    try {
        const blumeTokenAsPauser = blumeToken.connect(pauser);
        console.log("Pauser unpausing the contract...");
        if (await blumeToken.paused()) {
            const tx = await blumeTokenAsPauser.unpause();
            await tx.wait();
            console.log("✅ Contract unpaused successfully");
            console.log("Contract paused:", await blumeToken.paused());
        } else {
            console.log("Contract already unpaused");
        }
    } catch (error) {
        console.log("❌ Unpausing failed:", error.reason || error.message);
    }

    // Test 9: Transfer After Unpause
    console.log("\n✅ Test 9: Transfer After Unpause");
    try {
        const blumeTokenAsOwner = blumeToken.connect(owner);
        console.log("Attempting transfer after unpause...");
        const tx = await blumeTokenAsOwner.transfer(user.address, ethers.parseEther("100"));
        await tx.wait();
        console.log("✅ Transfer successful after unpause");
        console.log("User balance:", ethers.formatEther(await blumeToken.balanceOf(user.address)), "BLX");
    } catch (error) {
        console.log("❌ Transfer failed:", error.reason || error.message);
    }

    // Test 10: Revoking Roles
    console.log("\n🚫 Test 10: Revoking Roles");
    try {
        console.log("Revoking minter role from minter account...");
        const tx = await blumeToken.revokeRole(MINTER_ROLE, minter.address);
        await tx.wait();
        console.log("✅ Minter role revoked");
        console.log("Minter still has minter role:", await blumeToken.hasRole(MINTER_ROLE, minter.address));
    } catch (error) {
        console.log("❌ Role revocation failed:", error.reason || error.message);
    }

    // Test 11: Attempt Minting After Role Revocation
    console.log("\n❌ Test 11: Attempt Minting After Role Revocation");
    try {
        const blumeTokenAsMinter = blumeToken.connect(minter);
        console.log("Former minter attempting to mint (should fail)...");
        await blumeTokenAsMinter.mint(user.address, ethers.parseEther("1000"));
        console.log("❌ This should have failed!");
    } catch (error) {
        console.log("✅ Minting correctly denied after role revocation:", error.reason || error.message);
    }

    // Test 12: Admin Functions
    console.log("\n⚙️ Test 12: Admin Functions");
    try {
        const blumeTokenAsAdmin = blumeToken.connect(admin);
        console.log("Admin updating max transaction amount...");
        const tx = await blumeTokenAsAdmin.setMaxTransactionAmount(ethers.parseEther("2000000"));
        await tx.wait();
        console.log("✅ Admin function successful");
        console.log("New max transaction amount:", ethers.formatEther(await blumeToken.maxTransactionAmount()), "BLX");
    } catch (error) {
        console.log("❌ Admin function failed:", error.reason || error.message);
    }

    // Test 13: Role Admin Check
    console.log("\n👑 Test 13: Role Admin Check");
    console.log("Admin of MINTER_ROLE:", await blumeToken.getRoleAdmin(MINTER_ROLE));
    console.log("Admin of PAUSER_ROLE:", await blumeToken.getRoleAdmin(PAUSER_ROLE));

    console.log("\n✅ Role management tests completed!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });