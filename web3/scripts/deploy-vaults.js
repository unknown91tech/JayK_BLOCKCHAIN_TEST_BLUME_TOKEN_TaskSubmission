const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Blume Vault System...");

  // Get the contract factories
  const BlumeToken = await ethers.getContractFactory("BlumeToken");
  const BlumeVault = await ethers.getContractFactory("BlumeVault");
  const BlumeStaking = await ethers.getContractFactory("BlumeStaking");
  const BlumeYieldFarmer = await ethers.getContractFactory("BlumeYieldFarmer");
  const BlumeVaultController = await ethers.getContractFactory("BlumeVaultController");
  
  // Get deployment accounts
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy BlumeToken (BLX) if not already deployed
  // This assumes the token is already deployed, get its address
  const blxTokenAddress = process.env.BLX_TOKEN_ADDRESS || "";
  console.log("Using BlumeToken (BLX) at:", blxTokenAddress);
  
  let blxToken;
  if (!blxTokenAddress) {
    // If no token address provided, deploy a new token
    const initialSupply = ethers.utils.parseEther("100000000"); // 100 million tokens
    blxToken = await BlumeToken.deploy(initialSupply);
    await blxToken.deployed();
    console.log("BlumeToken (BLX) deployed to:", blxToken.address);
  } else {
    // Use existing token
    blxToken = await BlumeToken.attach(blxTokenAddress);
  }

  // Get router and LP token addresses from environment
  const routerAddress = process.env.BLUME_SWAP_ROUTER_ADDRESS || "";
  const lpTokenAddress = process.env.BLUME_SWAP_LP_TOKEN_ADDRESS || "";
  const wethAddress = process.env.WETH_ADDRESS || "";
  
  console.log("Using BlumeSwapRouter at:", routerAddress);
  console.log("Using BLX-ETH LP Token at:", lpTokenAddress);
  console.log("Using WETH at:", wethAddress);

  // Deploy BlumeVault
  console.log("Deploying BlumeVault...");
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
  const rewardRate = ethers.utils.parseEther("0.0001"); // Rewards per second
  
  const blumeStaking = await BlumeStaking.deploy(
    blxToken.address,
    rewardRate
  );
  await blumeStaking.deployed();
  console.log("BlumeStaking deployed to:", blumeStaking.address);

  // Deploy BlumeYieldFarmer (only if router and LP token are available)
  let blumeYieldFarmer;
  if (routerAddress && lpTokenAddress && wethAddress) {
    console.log("Deploying BlumeYieldFarmer...");
    
    blumeYieldFarmer = await BlumeYieldFarmer.deploy(
      blxToken.address,
      blumeVault.address,
      routerAddress,
      lpTokenAddress,
      wethAddress
    );
    await blumeYieldFarmer.deployed();
    console.log("BlumeYieldFarmer deployed to:", blumeYieldFarmer.address);
  } else {
    console.log("Skipping BlumeYieldFarmer deployment - missing dependencies");
  }

  // Deploy BlumeVaultController
  console.log("Deploying BlumeVaultController...");
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

  // Grant roles
  console.log("Setting up roles...");
  
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

  console.log("Deployment complete!");
  console.log({
    blxToken: blxToken.address,
    blumeVault: blumeVault.address,
    blumeStaking: blumeStaking.address,
    blumeYieldFarmer: blumeYieldFarmer ? blumeYieldFarmer.address : "Not deployed",
    blumeVaultController: blumeVaultController.address
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//   λ npx hardhat run scripts/deploy-vaults.js --network hoodi
// Deploying Blume Vault System...
// Deploying contracts with the account: 0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73
// Using BlumeToken (BLX) at: 0x42677aB4B3Dab7897346D645Cc60A0C1d7410166
// Using BlumeSwapRouter at:
// Using BLX-ETH LP Token at:
// Using WETH at:
// Deploying BlumeVault...
// BlumeVault deployed to: 0xe2cA3d1330119EcD244552Fff1b51D42eE49Af9A
// Deploying BlumeStaking...
// BlumeStaking deployed to: 0xd56895f9d75E46b66dB02395128f000e50eC5CAa
// Skipping BlumeYieldFarmer deployment - missing dependencies
// Deploying BlumeVaultController...
// BlumeVaultController deployed to: 0x4692D499C63348C1a5E4287B80da351332C815f4
// Adding vault to controller...
// Vault added to controller
// Setting up roles...
// Granted YIELD_GENERATOR_ROLE to controller
// Granted MINTER_ROLE to controller
// Deployment complete!
// {
//   blxToken: '0x42677aB4B3Dab7897346D645Cc60A0C1d7410166',
//   blumeVault: '0xe2cA3d1330119EcD244552Fff1b51D42eE49Af9A',
//   blumeStaking: '0xd56895f9d75E46b66dB02395128f000e50eC5CAa',
//   blumeYieldFarmer: 'Not deployed',
//   blumeVaultController: '0x4692D499C63348C1a5E4287B80da351332C815f4'
}