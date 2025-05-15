// File: test/GasOptimization.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Optimization", function () {
  let owner, user1;
  let token, factory, router, vault;
  
  before(async function () {
    [owner, user1] = await ethers.getSigners();
    
    // Deploy BLX token
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    token = await BlumeToken.deploy(ethers.utils.parseEther("1000000"));
    
    // Deploy WETH
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    
    // Deploy factory
    const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
    factory = await BlumeSwapFactory.deploy();
    
    // Deploy router
    const BlumeSwapRouter = await ethers.getContractFactory("BlumeSwapRouter");
    router = await BlumeSwapRouter.deploy(factory.address, weth.address);
    
    // Deploy vault
    const BlumeVault = await ethers.getContractFactory("BlumeVault");
    vault = await BlumeVault.deploy(
      token.address,
      1000, // 10% yield rate
      24 * 60 * 60 // Daily compounding
    );
    
    // Transfer tokens to user
    await token.transfer(user1.address, ethers.utils.parseEther("10000"));
  });
  
  describe("Gas usage for common operations", function () {
    it("Measure gas for token transfers", async function () {
      const transferAmount = ethers.utils.parseEther("100");
      
      // Measure gas for a simple transfer
      const tx = await token.connect(user1).transfer(owner.address, transferAmount);
      const receipt = await tx.wait();
      
      console.log(`Gas used for token transfer: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(100000); // Set a reasonable threshold
    });
    
    it("Measure gas for vault deposits", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      
      // Approve tokens
      await token.connect(user1).approve(vault.address, depositAmount);
      
      // Measure gas for deposit
      const tx = await vault.connect(user1).deposit(depositAmount, await vault.NO_LOCK());
      const receipt = await tx.wait();
      
      console.log(`Gas used for vault deposit: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(300000); // Set a reasonable threshold
    });
    
    it("Measure gas for pair creation", async function () {
      // Deploy another token for this test
      const BlumeToken = await ethers.getContractFactory("BlumeToken");
      const tokenB = await BlumeToken.deploy(ethers.utils.parseEther("1000000"));
      
      // Measure gas for pair creation
      const tx = await factory.createPair(token.address, tokenB.address);
      const receipt = await tx.wait();
      
      console.log(`Gas used for pair creation: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(5000000); // Set a reasonable threshold
    });
    
    it("Measure gas for adding liquidity", async function () {
      // Deploy tokens for this test
      const BlumeToken = await ethers.getContractFactory("BlumeToken");
      const tokenB = await BlumeToken.deploy(ethers.utils.parseEther("1000000"));
      
      // Create pair
      await factory.createPair(token.address, tokenB.address);
      
      // Approve tokens
      const tokenAmount = ethers.utils.parseEther("1000");
      await token.approve(router.address, tokenAmount);
      await tokenB.approve(router.address, tokenAmount);
      
      // Measure gas for adding liquidity
      const tx = await router.addLiquidity(
        token.address,
        tokenB.address,
        tokenAmount,
        tokenAmount,
        0, // min A
        0, // min B
        owner.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600
      );
      const receipt = await tx.wait();
      
      console.log(`Gas used for adding liquidity: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(1000000); // Set a reasonable threshold
    });
  });
});