const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

// Configuration for deployment
const config = {
  initialSupply: ethers.parseEther("1000000000"),  // 100 million BLX
  rewardRate: 500,                                     // 5% annual rate
  protocolFee: 300,                                    // 3% fee
  yieldRate: 800,                                      // 8% annual yield
  compoundFrequency: 86400,                            // 1 day in seconds
  maxPriceDeviation: 300,                              // 3% max price deviation (not used directly now)
  verifyContracts: false                               // Set to true to verify on Etherscan
};

async function main() {
  console.log("Starting deployment to", hre.network.name, "network");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  const deployerBalance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(deployerBalance)} ETH`);
  
  if (deployerBalance < ethers.parseEther("0.1")) {
    console.warn("Warning: Deployer balance may be too low for deployment");
  }

  // Store deployed contract addresses
  const deployed = {};
  
  try {
    // 1. Deploy BlumeToken (BLX)
    console.log("\n1. Deploying BlumeToken...");
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    const blxToken = await BlumeToken.deploy(config.initialSupply);
    deployed.BlumeToken = blxToken.address;
    console.log(`   ✅ BlumeToken deployed to: ${blxToken.address}`);

    // 2. Deploy WETH
    console.log("\n2. Deploying WETH...");
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    deployed.WETH = weth.address;
    console.log(`   ✅ WETH deployed to: ${weth.address}`);

    // 3. Deploy BlumeSwapFactory
    console.log("\n3. Deploying BlumeSwapFactory...");
    const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
    const factory = await BlumeSwapFactory.deploy();
    deployed.BlumeSwapFactory = factory.address;
    console.log(`   ✅ BlumeSwapFactory deployed to: ${factory.address}`);

    // 4. Deploy FixedBlumeSwapRouter
    console.log("\n4. Deploying FixedBlumeSwapRouter...");
    const FixedBlumeSwapRouter = await ethers.getContractFactory("FixedBlumeSwapRouter");
    const router = await FixedBlumeSwapRouter.deploy(factory.address, weth.address);
    deployed.FixedBlumeSwapRouter = router.address;
    console.log(`   ✅ FixedBlumeSwapRouter deployed to: ${router.address}`);

    // 5. Deploy PriceOracle
    console.log("\n5. Deploying PriceOracle...");
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    const priceOracle = await PriceOracle.deploy();
    deployed.PriceOracle = priceOracle.address;
    console.log(`   ✅ PriceOracle deployed to: ${priceOracle.address}`);

    // 6. Deploy BlumeStaking
    console.log("\n6. Deploying BlumeStaking...");
    const BlumeStaking = await ethers.getContractFactory("BlumeStaking");
    const blumeStaking = await BlumeStaking.deploy(blxToken.address, config.rewardRate);
    deployed.BlumeStaking = blumeStaking.address;
    console.log(`   ✅ BlumeStaking deployed to: ${blumeStaking.address}`);

    // 7. Deploy BlumeStakingHub
    console.log("\n7. Deploying BlumeStakingHub...");
    const BlumeStakingHub = await ethers.getContractFactory("BlumeStakingHub");
    const stakingHub = await BlumeStakingHub.deploy(
      blxToken.address,
      config.rewardRate,
      config.protocolFee,
      deployer.address // Fee collector
    );
    deployed.BlumeStakingHub = stakingHub.address;
    console.log(`   ✅ BlumeStakingHub deployed to: ${stakingHub.address}`);

    // Get stBLX token address from the hub
    const stBLXAddress = await stakingHub.stBLXToken();
    deployed.StakedBlumeToken = stBLXAddress;
    console.log(`   ℹ️ StakedBlumeToken deployed at: ${stBLXAddress}`);

    // 8. Deploy BlumeStakingHubFactory
    console.log("\n8. Deploying BlumeStakingHubFactory...");
    const BlumeStakingHubFactory = await ethers.getContractFactory("BlumeStakingHubFactory");
    const hubFactory = await BlumeStakingHubFactory.deploy();
    deployed.BlumeStakingHubFactory = hubFactory.address;
    console.log(`   ✅ BlumeStakingHubFactory deployed to: ${hubFactory.address}`);

    // 9. Deploy BlumeVault
    console.log("\n9. Deploying BlumeVault...");
    const BlumeVault = await ethers.getContractFactory("BlumeVault");
    const vault = await BlumeVault.deploy(
      blxToken.address,
      config.yieldRate,
      config.compoundFrequency
    );
    deployed.BlumeVault = vault.address;
    console.log(`   ✅ BlumeVault deployed to: ${vault.address}`);

    // 10. Deploy BlumeVaultController
    console.log("\n10. Deploying BlumeVaultController...");
    const BlumeVaultController = await ethers.getContractFactory("BlumeVaultController");
    const vaultController = await BlumeVaultController.deploy(
      blxToken.address,
      config.compoundFrequency
    );
    deployed.BlumeVaultController = vaultController.address;
    console.log(`   ✅ BlumeVaultController deployed to: ${vaultController.address}`);

    // 11. Create BLX-WETH pair
    console.log("\n11. Creating BLX-WETH pair...");
    let createPairTx = await factory.createPair(blxToken.address, weth.address);
    await createPairTx.wait();
    const pairAddress = await factory.getPair(blxToken.address, weth.address);
    deployed.BLX_WETH_Pair = pairAddress;
    console.log(`   ✅ BLX-WETH pair created at: ${pairAddress}`);

    // 12. Deploy BlumeStakingDeFiIntegration
    console.log("\n12. Deploying BlumeStakingDeFiIntegration...");
    const BlumeStakingDeFiIntegration = await ethers.getContractFactory("BlumeStakingDeFiIntegration");
    const stakingDeFiIntegration = await BlumeStakingDeFiIntegration.deploy(
      stBLXAddress,              // stBLX token address from hub
      weth.address,              // Use WETH as the pair token
      router.address,
      pairAddress
    );
    deployed.BlumeStakingDeFiIntegration = stakingDeFiIntegration.address;
    console.log(`   ✅ BlumeStakingDeFiIntegration deployed to: ${stakingDeFiIntegration.address}`);

    // 13. Deploy BlumeYieldFarmer
    console.log("\n13. Deploying BlumeYieldFarmer...");
    const BlumeYieldFarmer = await ethers.getContractFactory("BlumeYieldFarmer");
    const yieldFarmer = await BlumeYieldFarmer.deploy(
      blxToken.address,
      vault.address,
      router.address,
      pairAddress,
      weth.address
    );
    deployed.BlumeYieldFarmer = yieldFarmer.address;
    console.log(`   ✅ BlumeYieldFarmer deployed to: ${yieldFarmer.address}`);

    // Setup post-deployment configurations
    console.log("\nSetting up post-deployment configurations...");

    // 1. Set the price oracle for the BLX-WETH pair
    console.log("\n1. Setting price oracle for BLX-WETH pair...");
    const pair = await ethers.getContractAt("BlumeSwapPair", pairAddress);
    try {
      await pair.setPriceOracle(priceOracle.address);
      console.log("   ✅ Price oracle set for BLX-WETH pair");
    } catch (error) {
      console.warn("   ⚠️ Failed to set price oracle: ", error.message);
    }

    // 2. Skip setting max price deviation (would require factory access)
    console.log("\n2. Max price deviation configuration...");
    console.log("   ℹ️ Skipping max price deviation setup (requires factory access)");
    console.log("   ℹ️ Default value of 500 basis points (5%) will be used");

    // 3. Add the vault to the vault controller
    console.log("\n3. Adding vault to vault controller...");
    try {
      await vaultController.addVault(
        vault.address,
        "Blume Main Vault",
        "High yield BLX staking vault",
        config.yieldRate
      );
      console.log("   ✅ Added vault to vault controller");
    } catch (error) {
      console.warn("   ⚠️ Failed to add vault to controller: ", error.message);
    }

    // 4. Whitelist contracts for token limits
    console.log("\n4. Excluding contracts from BLX token limits...");
    try {
      await blxToken.setExcludedFromLimits(stakingHub.address, true);
      await blxToken.setExcludedFromLimits(blumeStaking.address, true);
      await blxToken.setExcludedFromLimits(vault.address, true);
      await blxToken.setExcludedFromLimits(yieldFarmer.address, true);
      console.log("   ✅ Contracts excluded from BLX token limits");
    } catch (error) {
      console.warn("   ⚠️ Failed to exclude contracts from limits: ", error.message);
    }

    // 5. Grant minter role for yield generation
    console.log("\n5. Granting MINTER_ROLE to vault controller...");
    try {
      const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
      await blxToken.grantRole(MINTER_ROLE, vaultController.address);
      console.log("   ✅ Granted MINTER_ROLE to vault controller");
    } catch (error) {
      console.warn("   ⚠️ Failed to grant MINTER_ROLE: ", error.message);
    }

    // 6. Transfer some BLX to various contracts for testing (optional for production)
    if (hre.network.name !== "mainnet") {
      console.log("\n6. Transferring initial BLX for testing (optional)...");
      try {
        const testAmount = ethers.parseEther("1000000");
        await blxToken.transfer(blumeStaking.address, testAmount);
        await blxToken.transfer(stakingHub.address, testAmount);
        await blxToken.transfer(vault.address, testAmount);
        console.log("   ✅ Transferred initial BLX to contracts");
      } catch (error) {
        console.warn("   ⚠️ Failed to transfer test BLX: ", error.message);
      }
    }

    // Success - log deployment summary
    console.log("\n\n=== DEPLOYMENT SUMMARY ===");
    Object.entries(deployed).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });

    // Save deployment data to file
    const deploymentData = {
      network: hre.network.name,
      chainId: hre.network.config.chainId,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: deployed,
      config
    };

    const filename = `deployment-${hre.network.name}-${Math.floor(Date.now() / 1000)}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentData, null, 2));
    console.log(`\nDeployment data saved to ${filename}`);

  } catch (error) {
    console.error("\n\n❌ DEPLOYMENT FAILED");
    console.error(error);
    
    // Still save the partially deployed contracts
    if (Object.keys(deployed).length > 0) {
      const partialDeploymentData = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: deployed,
        config,
        error: error.message,
        incomplete: true
      };
      
      const filename = `partial-deployment-${hre.network.name}-${Math.floor(Date.now() / 1000)}.json`;
      fs.writeFileSync(filename, JSON.stringify(partialDeploymentData, null, 2));
      console.log(`\nPartial deployment data saved to ${filename}`);
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });