// File: test/MathSafety.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Mathematical Safety", function () {
  let owner, user1;
  let token, vault;
  
  before(async function () {
    [owner, user1] = await ethers.getSigners();
    
    // Deploy BLX token
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    token = await BlumeToken.deploy(ethers.utils.parseEther("1000000"));
    
    // Deploy BlumeVault
    const BlumeVault = await ethers.getContractFactory("BlumeVault");
    vault = await BlumeVault.deploy(
      token.address,
      1000, // 10% yield rate
      24 * 60 * 60 // Daily compounding
    );
    
    // Transfer tokens to user1
    await token.transfer(user1.address, ethers.utils.parseEther("10000"));
    // Exclude user1 and vault from limits to allow the large transfer test
    await token.setExcludedFromLimits(user1.address, true);
    await token.setExcludedFromLimits(vault.address, true);
  });
  
  describe("Token Transfers", function () {
    it("Should prevent integer overflow in transfers", async function () {
      const maxUint256 = ethers.constants.MaxUint256;
      
      // Try to transfer more than total supply
      await expect(
        token.connect(user1).transfer(owner.address, maxUint256)
      ).to.be.reverted;
    });
  });
  
  describe("BlumeVault Calculations", function () {
    it("Should safely calculate rewards with large amounts", async function () {
      const largeAmount = ethers.utils.parseEther("1000000000"); // 1 billion tokens
      
      // Approve tokens
      await token.mint(user1.address, largeAmount);
      await token.connect(user1).approve(vault.address, largeAmount);
      
      // Deposit large amount
      await vault.connect(user1).deposit(largeAmount, await vault.LOCK_365_DAYS());
      
      // Fast forward 365 days
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // Calculate pending rewards
      const pendingRewards = await vault.calculatePendingRewards(user1.address);
      
      // Should be a large number but not overflow
      expect(pendingRewards).to.be.gt(0);
      
      // Try to compound the rewards (should not overflow)
      await vault.connect(user1).compoundRewards();
      
      // Check user deposit amount increased
      const userDeposit = await vault.userDeposits(user1.address);
      expect(userDeposit.amount).to.be.gt(largeAmount);
    });
  });
  
  describe("BlumeSwapPair Calculations", function () {
    it("Should prevent overflow in swap calculations", async function () {
      // Deploy tokens for test
      const TokenA = await ethers.getContractFactory("BlumeToken");
      const TokenB = await ethers.getContractFactory("BlumeToken");
      
      const tokenA = await TokenA.deploy(ethers.utils.parseEther("1000000"));
      const tokenB = await TokenB.deploy(ethers.utils.parseEther("1000000"));
      
      // Deploy factory and create pair
      const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
      const factory = await BlumeSwapFactory.deploy();
      
      await factory.createPair(tokenA.address, tokenB.address);
      const pairAddress = await factory.getPair(tokenA.address, tokenB.address);
      
      // Get pair contract
      const BlumeSwapPair = await ethers.getContractFactory("BlumeSwapPair");
      const pair = BlumeSwapPair.attach(pairAddress);
      
      // Add initial liquidity
      const amountA = ethers.utils.parseEther("1000");
      const amountB = ethers.utils.parseEther("1000");
      
      await tokenA.transfer(pair.address, amountA);
      await tokenB.transfer(pair.address, amountB);
      
      await pair.mint(owner.address);
      
      // Try to swap with very large number
      const maxAmount = ethers.constants.MaxUint256;
      
      // This should fail, but not with overflow error
      await expect(
        pair.swap(0, maxAmount, user1.address, [])
      ).to.be.revertedWith("BlumeSwap: INSUFFICIENT_LIQUIDITY");
    });
  });
});