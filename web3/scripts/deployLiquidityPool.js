const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying BlumeSwap liquidity pool contracts...");
  
  // Deploy WETH first
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  await weth.deployed();
  console.log("WETH deployed to:", weth.address);
  
  // Deploy the factory
  const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
  const factory = await BlumeSwapFactory.deploy();
  await factory.deployed();
  console.log("BlumeSwapFactory deployed to:", factory.address);
  
  // Deploy the router
  const FixedBlumeSwapRouter = await ethers.getContractFactory("FixedBlumeSwapRouter");
  const router = await FixedBlumeSwapRouter.deploy(factory.address, weth.address);
  await router.deployed();
  console.log("FixedBlumeSwapRouter deployed to:", router.address);
  
  // Deploy the price oracle
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy();
  await oracle.deployed();
  console.log("PriceOracle deployed to:", oracle.address);
  
  // Get the existing BLX token or deploy a new one if needed
  let blxToken;
  try {
    const existingBLXAddress = process.env.BLX_TOKEN_ADDRESS;
    if (existingBLXAddress) {
      const BlumeToken = await ethers.getContractFactory("BlumeToken");
      blxToken = await BlumeToken.attach(existingBLXAddress);
      console.log("Using existing BLX token at:", existingBLXAddress);
    } else {
      // Deploy a new BLX token if address not provided
      const initialSupply = ethers.utils.parseEther("100000000"); // 100 million tokens
      const BlumeToken = await ethers.getContractFactory("BlumeToken");
      blxToken = await BlumeToken.deploy(initialSupply);
      await blxToken.deployed();
      console.log("Deployed new BLX token to:", blxToken.address);
    }
  } catch (error) {
    console.error("Error with BLX token:", error);
    return;
  }
  
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
      (await ethers.getSigners())[0].address, // LP tokens recipient
      Math.floor(Date.now() / 1000) + 3600, // deadline: 1 hour
      { value: ethAmount }
    );
    
    console.log("Initial liquidity added!");
  }
  
  console.log("BlumeSwap liquidity pool deployment completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });