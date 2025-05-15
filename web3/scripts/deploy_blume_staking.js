const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Blume Staking ecosystem contracts...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  const feeCollector = deployer; // Use deployer as fee collector for simplicity
  
  console.log("Deploying with account:", deployer.address);

  // Deploy BLX Token
  let blxToken;
  try {
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    const initialSupply = ethers.utils.parseEther("1000000000"); // 1 billion BLX
    blxToken = await BlumeToken.deploy(initialSupply);
    await blxToken.deployed();
    console.log("BlumeToken deployed to:", blxToken.address);
  } catch (error) {
    console.error("Error deploying BlumeToken:", error);
    process.exit(1);
  }

  // Deploy WETH
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  await weth.deployed();
  console.log("WETH deployed to:", weth.address);

  // Deploy Price Oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.deployed();
  console.log("PriceOracle deployed to:", priceOracle.address);

  // Deploy BlumeSwap Factory
  const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
  const blumeSwapFactory = await BlumeSwapFactory.deploy();
  await blumeSwapFactory.deployed();
  console.log("BlumeSwapFactory deployed to:", blumeSwapFactory.address);

  // Deploy BlumeSwap Router
  const BlumeSwapRouter = await ethers.getContractFactory("BlumeSwapRouter");
  const blumeSwapRouter = await BlumeSwapRouter.deploy(
    blumeSwapFactory.address,
    weth.address
  );
  await blumeSwapRouter.deployed();
  console.log("BlumeSwapRouter deployed to:", blumeSwapRouter.address);

  // Deploy Blume Vault
  const BlumeVault = await ethers.getContractFactory("BlumeVault");
  const yieldRate = 500; // 5% APY
  const compoundFrequency = 86400; // 1 day
  const blumeVault = await BlumeVault.deploy(
    blxToken.address,
    yieldRate,
    compoundFrequency
  );
  await blumeVault.deployed();
  console.log("BlumeVault deployed to:", blumeVault.address);

  // Deploy Blume Vault Controller
  const BlumeVaultController = await ethers.getContractFactory("BlumeVaultController");
  const autoCompoundFrequency = 604800; // 1 week
  const blumeVaultController = await BlumeVaultController.deploy(
    blxToken.address,
    autoCompoundFrequency
  );
  await blumeVaultController.deployed();
  console.log("BlumeVaultController deployed to:", blumeVaultController.address);

  // Deploy Blume Staking
  const BlumeStaking = await ethers.getContractFactory("BlumeStaking");
  const stakingRewardRate = 600; // 6% APY
  const blumeStaking = await BlumeStaking.deploy(
    blxToken.address,
    stakingRewardRate
  );
  await blumeStaking.deployed();
  console.log("BlumeStaking deployed to:", blumeStaking.address);

  // Deploy Blume Staking Hub Factory
  const BlumeStakingHubFactory = await ethers.getContractFactory("BlumeStakingHubFactory");
  const blumeStakingHubFactory = await BlumeStakingHubFactory.deploy();
  await blumeStakingHubFactory.deployed();
  console.log("BlumeStakingHubFactory deployed to:", blumeStakingHubFactory.address);

  // Define protocol fee for staking hub
  const protocolFee = 500; // 5% fee
  
  // Deploy a Blume Staking Hub directly
  console.log("Deploying BlumeStakingHub directly...");
  const BlumeStakingHub = await ethers.getContractFactory("BlumeStakingHub");
  const stakingHub = await BlumeStakingHub.deploy(
    blxToken.address,
    stakingRewardRate,
    protocolFee,
    feeCollector.address
  );
  await stakingHub.deployed();
  const stakingHubAddress = stakingHub.address;
  console.log("BlumeStakingHub deployed to:", stakingHubAddress);

  // Get the stBLX token address
  const stBLXAddress = await stakingHub.stBLXToken();
  console.log("StakedBlumeToken (stBLX) deployed to:", stBLXAddress);

  // Create a BLX/stBLX pair
  await blumeSwapFactory.createPair(blxToken.address, stBLXAddress);
  const pairAddress = await blumeSwapFactory.getPair(blxToken.address, stBLXAddress);
  console.log("BLX/stBLX pair created at:", pairAddress);

  // Deploy Blume DeFi Integration contract
  const BlumeStakingDeFiIntegration = await ethers.getContractFactory("BlumeStakingDeFiIntegration");
  const defiIntegration = await BlumeStakingDeFiIntegration.deploy(
    stBLXAddress,
    blxToken.address,
    blumeSwapRouter.address,
    pairAddress
  );
  await defiIntegration.deployed();
  console.log("BlumeStakingDeFiIntegration deployed to:", defiIntegration.address);

  // Setup permissions
  // Grant MINTER_ROLE to Vault Controller
  const minterRole = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  await blxToken.grantRole(minterRole, blumeVaultController.address);
  console.log("Granted MINTER_ROLE to VaultController");

  // Add the vault to the controller
  await blumeVaultController.addVault(
    blumeVault.address,
    "Main Yield Vault",
    "Primary vault for BLX yield generation",
    yieldRate
  );
  console.log("Added BlumeVault to VaultController");

  // Setup custom price for BLX in the oracle (1 BLX = $1.00, stored with 8 decimals)
  await priceOracle.setCustomPrice(blxToken.address, 100000000);
  console.log("Set BLX price in PriceOracle");

  // Setup custom price for stBLX in the oracle (1 stBLX = $1.01, slightly higher to reflect earned interest)
  await priceOracle.setCustomPrice(stBLXAddress, 101000000);
  console.log("Set stBLX price in PriceOracle");

  // Transfer BLX to users for testing
  const userAmount = ethers.utils.parseEther("1000000"); // 1 million BLX each
  await blxToken.transfer(user1.address, userAmount);
  await blxToken.transfer(user2.address, userAmount);
  console.log("Transferred BLX to test users");

  console.log("Deployment complete!");
  
  // Return all deployed contract addresses for testing
  return {
    blxToken: blxToken.address,
    weth: weth.address,
    priceOracle: priceOracle.address,
    blumeSwapFactory: blumeSwapFactory.address,
    blumeSwapRouter: blumeSwapRouter.address,
    blumeVault: blumeVault.address,
    blumeVaultController: blumeVaultController.address,
    blumeStaking: blumeStaking.address,
    blumeStakingHubFactory: blumeStakingHubFactory.address,
    blumeStakingHub: stakingHubAddress,
    stBLXToken: stBLXAddress,
    blxStBLXPair: pairAddress,
    defiIntegration: defiIntegration.address
  };
}

// Run the deployment
main()
  .then((deployedContracts) => {
    console.log("Deployed contracts:", deployedContracts);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });