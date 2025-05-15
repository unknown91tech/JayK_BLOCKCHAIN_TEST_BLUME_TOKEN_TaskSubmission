const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying BLUME TOKEN (BLX)...");
  
  // Initial supply: 100 million tokens with 18 decimals
  const initialSupply = ethers.utils.parseEther("100000000"); // 100 million tokens
  
  // Get the contract factory
  const BlumeToken = await ethers.getContractFactory("BlumeToken");
  
  // Deploy the contract with the initial supply
  const blumeToken = await BlumeToken.deploy(initialSupply);
  
  // Wait for deployment to finish
  await blumeToken.deployed();
  
  console.log("BLUME TOKEN (BLX) deployed to:", blumeToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//   λ npx hardhat run scripts/deploy.js --network hoodi
// Deploying BLUME TOKEN (BLX)...
// BLUME TOKEN (BLX) deployed to: 0x42677aB4B3Dab7897346D645Cc60A0C1d7410166