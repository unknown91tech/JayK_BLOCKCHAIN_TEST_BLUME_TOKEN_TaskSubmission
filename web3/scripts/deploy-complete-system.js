const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying complete Blume DeFi ecosystem...");
  
  // Get deployment accounts
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // ===== STEP 1: DEPLOY BLUME TOKEN (BLX) =====
  
  console.log("\n===== DEPLOYING BLUME TOKEN (BLX) =====");
  
  let blxToken;
  // Check if we want to use existing token
  const existingBLXAddress = process.env.BLX_TOKEN_ADDRESS || "0x3787831C45898677A07426b51EA3053c8DB32Dd4";
  
  if (existingBLXAddress) {
    console.log("Using existing BLX token at:", existingBLXAddress);
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    blxToken = await BlumeToken.attach(existingBLXAddress);
  } else {
    // Deploy a new BLX token
    const initialSupply = ethers.utils.parseEther("100000000"); // 100 million tokens
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    blxToken = await BlumeToken.deploy(initialSupply);
    await blxToken.deployed();
    console.log("BLUME TOKEN (BLX) deployed to:", blxToken.address);
  }
  
  // ===== STEP 2: DEPLOY BLUMESWAP LIQUIDITY POOL CONTRACTS =====
  
  console.log("\n===== DEPLOYING BLUMESWAP LIQUIDITY POOL CONTRACTS =====");
  
  // Use existing WETH
  console.log("Using existing WETH...");
  const wethAddress = "0x2f9aAd71531651432deCB6f34f0d124F7136227A";
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.attach(wethAddress);
  console.log("Using WETH at:", weth.address);
  
  // Deploy the factory
  console.log("Deploying BlumeSwapFactory...");
  const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
  const factory = await BlumeSwapFactory.deploy();
  await factory.deployed();
  console.log("BlumeSwapFactory deployed to:", factory.address);
  
  // Deploy the router
  console.log("Deploying BlumeSwapRouter...");
  const BlumeSwapRouter = await ethers.getContractFactory("BlumeSwapRouter");
  const router = await BlumeSwapRouter.deploy(factory.address, weth.address);
  await router.deployed();
  console.log("BlumeSwapRouter deployed to:", router.address);
  
  // Deploy the price oracle
  console.log("Deploying PriceOracle...");
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.deployed();
  console.log("PriceOracle deployed to:", oracle.address);
  
  // Create a BLX/ETH pair
  console.log("Creating BLX/ETH pair...");
  const createPairTx = await factory.createPair(blxToken.address, weth.address);
  await createPairTx.wait();
  
  // Get the pair address
  const pairAddress = await factory.getPair(blxToken.address, weth.address);
  console.log("BLX/ETH pair created at:", pairAddress);
  
  // Set the price oracle for the pair
  const pair = await ethers.getContractAt("BlumeSwapPair", pairAddress);
  const setOracleTx = await pair.setPriceOracle(oracle.address);
  await setOracleTx.wait();
  console.log("Price oracle set for the pair.");
  
  // If in a test environment, we might want to add initial liquidity
  if (process.env.ADD_INITIAL_LIQUIDITY === "true") {
    console.log("Adding initial liquidity...");
    
    // Approve tokens
    const liquidity = ethers.utils.parseEther("10000"); // 10,000 BLX
    const ethAmount = ethers.utils.parseEther("10"); // 10 ETH
    
    await blxToken.approve(router.address, liquidity);
    
    // Add liquidity
    await router.addLiquidityETH(
      blxToken.address,
      liquidity,
      liquidity, // min amount
      ethAmount, // min ETH
      deployer.address, // LP tokens recipient
      Math.floor(Date.now() / 1000) + 3600, // deadline: 1 hour
      { value: ethAmount }
    );
    
    console.log("Initial liquidity added!");
  }
  
  // ===== STEP 3: DEPLOY BLUME VAULT SYSTEM =====
  
  console.log("\n===== DEPLOYING BLUME VAULT SYSTEM =====");
  
  // Deploy BlumeVault
  console.log("Deploying BlumeVault...");
  const BlumeVault = await ethers.getContractFactory("BlumeVault");
  const initialYieldRate = 1000; // 10% annual yield (in basis points)
  const compoundFrequency = 86400; // Daily compounding (in seconds)
  
  const blumeVault = await BlumeVault.deploy(
    blxToken.address,
    initialYieldRate,
    compoundFrequency
  );
  await blumeVault.deployed();
  console.log("BlumeVault deployed to:", blumeVault.address);
  
  // Deploy BlumeStaking
  console.log("Deploying BlumeStaking...");
  const BlumeStaking = await ethers.getContractFactory("BlumeStaking");
  const rewardRate = ethers.utils.parseEther("0.0001"); // Rewards per second
  
  const blumeStaking = await BlumeStaking.deploy(
    blxToken.address,
    rewardRate
  );
  await blumeStaking.deployed();
  console.log("BlumeStaking deployed to:", blumeStaking.address);
  
  // Deploy BlumeYieldFarmer
  console.log("Deploying BlumeYieldFarmer...");
  const BlumeYieldFarmer = await ethers.getContractFactory("BlumeYieldFarmer");
  const blumeYieldFarmer = await BlumeYieldFarmer.deploy(
    blxToken.address,
    blumeVault.address,
    router.address,
    pairAddress, // Using the BLX/ETH pair we created earlier
    weth.address
  );
  await blumeYieldFarmer.deployed();
  console.log("BlumeYieldFarmer deployed to:", blumeYieldFarmer.address);
  
  // Deploy BlumeVaultController
  console.log("Deploying BlumeVaultController...");
  const BlumeVaultController = await ethers.getContractFactory("BlumeVaultController");
  const autoCompoundFrequency = 86400; // Daily auto-compounding (in seconds)
  
  const blumeVaultController = await BlumeVaultController.deploy(
    blxToken.address,
    autoCompoundFrequency
  );
  await blumeVaultController.deployed();
  console.log("BlumeVaultController deployed to:", blumeVaultController.address);
  
  // Add vault to controller
  console.log("Adding vault to controller...");
  const tx = await blumeVaultController.addVault(
    blumeVault.address,
    "BLX Standard Vault",
    "Standard vault with 10% APY and compounding rewards",
    initialYieldRate
  );
  await tx.wait();
  console.log("Vault added to controller");
  
  // ===== STEP 4: SETUP ROLES AND PERMISSIONS =====
  
  console.log("\n===== SETTING UP ROLES AND PERMISSIONS =====");
  
  // Grant YIELD_GENERATOR_ROLE on vault to controller
  const YIELD_GENERATOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("YIELD_GENERATOR_ROLE"));
  let tx1 = await blumeVault.grantRole(YIELD_GENERATOR_ROLE, blumeVaultController.address);
  await tx1.wait();
  console.log("Granted YIELD_GENERATOR_ROLE to controller");
  
  // Grant MINTER_ROLE on token to controller for yield generation
  const MINTER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  let tx2 = await blxToken.grantRole(MINTER_ROLE, blumeVaultController.address);
  await tx2.wait();
  console.log("Granted MINTER_ROLE to controller");
  
  // Set BlumeYieldFarmer to be excluded from token limits
  console.log("Excluding contracts from token limits...");
  await blxToken.setExcludedFromLimits(blumeYieldFarmer.address, true);
  await blxToken.setExcludedFromLimits(blumeVault.address, true);
  await blxToken.setExcludedFromLimits(blumeStaking.address, true);
  await blxToken.setExcludedFromLimits(blumeVaultController.address, true);
  console.log("Contracts excluded from token limits");
  
  // ===== STEP 5: FINAL OUTPUT =====
  
  console.log("\n===== DEPLOYMENT COMPLETE =====");
  console.log("Deployed Contract Addresses:");
  console.log({
    blxToken: blxToken.address,
    weth: weth.address,
    factory: factory.address,
    router: router.address,
    oracle: oracle.address,
    blxEthPair: pairAddress,
    blumeVault: blumeVault.address,
    blumeStaking: blumeStaking.address,
    blumeYieldFarmer: blumeYieldFarmer.address,
    blumeVaultController: blumeVaultController.address
  });
  
  // Save these addresses for future reference
  console.log("\nCopy these environment variables for future deployments:");
  console.log(`BLX_TOKEN_ADDRESS=${blxToken.address}`);
  console.log(`WETH_ADDRESS=${weth.address}`);
  console.log(`BLUME_SWAP_FACTORY_ADDRESS=${factory.address}`);
  console.log(`BLUME_SWAP_ROUTER_ADDRESS=${router.address}`);
  console.log(`BLUME_SWAP_LP_TOKEN_ADDRESS=${pairAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });