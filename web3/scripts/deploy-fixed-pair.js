const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Fixed BlumeSwapPair Contract...");
    console.log("=".repeat(50));

    // Get current deployment info
    const networkConfig = {
        BlumeToken: "0x3787831C45898677A07426b51EA3053c8DB32Dd4",
        WETH: "0x2f9aAd71531651432deCB6f34f0d124F7136227A",
        BlumeSwapFactory: "0xD4F55d0Ad19c3BE0A7D5EE7e0512a00129Cd73c9",
        PriceOracle: "0xb185335531Fd45Ca58E693a9ADebE0c00c074f72",
        CurrentPair: "0x7aB182A1a90bcDb426BD3284bCF45641a254590e"
    };

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Get contract instances
    const BlumeSwapFactory = await ethers.getContractAt("BlumeSwapFactory", networkConfig.BlumeSwapFactory);
    const PriceOracle = await ethers.getContractAt("PriceOracle", networkConfig.PriceOracle);

    console.log("\n1️⃣ Deploying new BlumeSwapPair contract...");
    
    // Deploy the new pair contract
    const FixedBlumeSwapPair = await ethers.getContractFactory("BlumeSwapPair");
    const newPair = await FixedBlumeSwapPair.deploy();
    await newPair.waitForDeployment();
    
    const newPairAddress = await newPair.getAddress();
    console.log("✅ New BlumeSwapPair deployed at:", newPairAddress);

    console.log("\n2️⃣ Initializing the new pair contract...");
    
    // Initialize the pair
    await newPair.initialize(networkConfig.BlumeToken, networkConfig.WETH);
    console.log("✅ Pair initialized with tokens");

    console.log("\n3️⃣ Setting up price oracle...");
    
    // Set price oracle
    await newPair.setPriceOracle(networkConfig.PriceOracle);
    console.log("✅ Price oracle set");

    console.log("\n4️⃣ Setting max price deviation to 50% for testing...");
    
    // Try to set max price deviation
    try {
        await newPair.setMaxPriceDeviation(5000); // 50%
        console.log("✅ Max price deviation set to 50%");
    } catch (error) {
        console.log("⚠️ Could not set max price deviation:", error.message);
    }

    console.log("\n5️⃣ Updating factory mapping...");
    
    // Check if factory has method to update pair mapping
    try {
        // This assumes the factory has a method to update existing pairs
        // You might need to check your factory contract for the exact method name
        await BlumeSwapFactory.updatePair(networkConfig.BlumeToken, networkConfig.WETH, newPairAddress);
        console.log("✅ Factory mapping updated");
    } catch (error) {
        console.log("⚠️ Could not update factory mapping:", error.message);
        console.log("💡 You might need to update router to use the new pair address directly");
    }

    console.log("\n✅ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("📋 Updated Configuration:");
    console.log(`Old BLX_WETH_Pair: ${networkConfig.CurrentPair}`);
    console.log(`New BLX_WETH_Pair: ${newPairAddress}`);
    console.log("\n🔧 Next Steps:");
    console.log("1. Update your test script with the new pair address");
    console.log("2. Update your configuration file");
    console.log("3. Run the tests to verify the fix");

    // Verification
    console.log("\n🔍 Verifying deployment...");
    const token0 = await newPair.token0();
    const token1 = await newPair.token1();
    const oracle = await newPair.priceOracle();
    const maxDeviation = await newPair.maxPriceDeviation();
    
    console.log("Token0:", token0);
    console.log("Token1:", token1);
    console.log("Oracle:", oracle);
    console.log("Max Deviation:", maxDeviation + "bp");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });