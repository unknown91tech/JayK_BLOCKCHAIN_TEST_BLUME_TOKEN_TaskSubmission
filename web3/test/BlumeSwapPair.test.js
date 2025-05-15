// File: test/BlumeSwapPair.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlumeSwapPair", function () {
  let owner, user1, user2;
  let BlumeToken, WETH, BlumeSwapFactory, BlumeSwapPair;
  let token0, token1, factory, pair;
  const initialSupply = ethers.utils.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy tokens
    BlumeToken = await ethers.getContractFactory("BlumeToken");
    WETH = await ethers.getContractFactory("WETH");
    
    token0 = await BlumeToken.deploy(initialSupply);
    token1 = await WETH.deploy();
    
    // Fund WETH by depositing ETH
    await token1.deposit({ value: ethers.utils.parseEther("1000") });
    
    // Deploy factory
    BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
    factory = await BlumeSwapFactory.deploy();
    
    // Create pair through factory
    await factory.createPair(token0.address, token1.address);
    const pairAddress = await factory.getPair(token0.address, token1.address);
    
    // Get pair contract instance
    BlumeSwapPair = await ethers.getContractFactory("BlumeSwapPair");
    pair = BlumeSwapPair.attach(pairAddress);
  });

  describe("Initialization", function () {
    it("Should initialize with correct tokens", async function () {
      // Make sure tokens are ordered correctly
      let actualToken0 = await pair.token0();
      let actualToken1 = await pair.token1();
      
      // Just check that both tokens are part of the pair
      expect([actualToken0, actualToken1]).to.include(token0.address);
      expect([actualToken0, actualToken1]).to.include(token1.address);
      expect(await pair.factory()).to.equal(factory.address);
    });
  });

  describe("Liquidity provision", function () {
    it("Should allow adding liquidity and mint LP tokens", async function () {
      // Approve tokens
      const token0Amount = ethers.utils.parseEther("10");
      const token1Amount = ethers.utils.parseEther("10");
      
      await token0.approve(pair.address, token0Amount);
      await token1.approve(pair.address, token1Amount);
      
      // Transfer tokens to pair
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);
      
      // Call mint
      await pair.mint(owner.address);
      
      // Check LP tokens minted
      const lpBalance = await pair.balanceOf(owner.address);
      expect(lpBalance).to.be.gt(0);
      
      // Check reserves updated
      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0.add(reserve1)).to.equal(token0Amount.add(token1Amount));
    });
    
    it("Should allow removing liquidity", async function () {
      // First add liquidity
      const token0Amount = ethers.utils.parseEther("10");
      const token1Amount = ethers.utils.parseEther("10");
      
      await token0.approve(pair.address, token0Amount);
      await token1.approve(pair.address, token1Amount);
      
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);
      
      await pair.mint(owner.address);
      
      // Get LP tokens balance
      const lpBalance = await pair.balanceOf(owner.address);
      
      // Transfer LP tokens to pair for burning
      await pair.transfer(pair.address, lpBalance);
      
      // Get token balances before burn
      const token0BalanceBefore = await token0.balanceOf(owner.address);
      const token1BalanceBefore = await token1.balanceOf(owner.address);
      
      // Burn LP tokens
      await pair.burn(owner.address);
      
      // Check token balances after burn
      const token0BalanceAfter = await token0.balanceOf(owner.address);
      const token1BalanceAfter = await token1.balanceOf(owner.address);
      
      expect(token0BalanceAfter).to.be.gt(token0BalanceBefore);
      expect(token1BalanceAfter).to.be.gt(token1BalanceBefore);
    });
  });

  describe("Swapping", function () {
    beforeEach(async function () {
      // Add initial liquidity
      const token0Amount = ethers.utils.parseEther("100");
      const token1Amount = ethers.utils.parseEther("100");
      
      await token0.approve(pair.address, token0Amount);
      await token1.approve(pair.address, token1Amount);
      
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);
      
      await pair.mint(owner.address);
    });
    
    it("Should allow swapping token0 for token1", async function () {
      // Get actual tokens in the right order
      const actualToken0 = await pair.token0();
      const actualToken1 = await pair.token1();
      
      // Find which of our tokens is token0 in the pair
      const isToken0 = token0.address === actualToken0;
      const swapToken = isToken0 ? token0 : token1;
      const receiveToken = isToken0 ? token1 : token0;
      
      // Get user token balances before swap
      const receiveTokenBalanceBefore = await receiveToken.balanceOf(user1.address);
      
      // Transfer token0 to pair for swap
      const swapAmount = ethers.utils.parseEther("1");
      await swapToken.transfer(pair.address, swapAmount);
      
      // Calculate expected output amount
      const [reserve0, reserve1] = await pair.getReserves();
      
      // Calculate swap amount with fee
      const amountInWithFee = swapAmount.mul(997);
      const numerator = amountInWithFee.mul(isToken0 ? reserve1 : reserve0);
      const denominator = (isToken0 ? reserve0 : reserve1).mul(1000).add(amountInWithFee);
      const expectedOutput = numerator.div(denominator);
      
      // Execute swap
      if (isToken0) {
        await pair.swap(0, expectedOutput, user1.address, []);
      } else {
        await pair.swap(expectedOutput, 0, user1.address, []);
      }
      
      // Check user received tokens
      const receiveTokenBalanceAfter = await receiveToken.balanceOf(user1.address);
      expect(receiveTokenBalanceAfter.sub(receiveTokenBalanceBefore)).to.equal(expectedOutput);
    });
    
    it("Should revert if K invariant is violated", async function () {
      // Get actual tokens in the right order
      const actualToken0 = await pair.token0();
      const isToken0 = token0.address === actualToken0;
      const swapToken = isToken0 ? token0 : token1;
      
      // Try to extract more tokens than the constant product formula allows
      const swapAmount = ethers.utils.parseEther("1");
      await swapToken.transfer(pair.address, swapAmount);
      
      const [reserve0, reserve1] = await pair.getReserves();
      
      // Calculate legitimate output amount and try to get more
      const amountInWithFee = swapAmount.mul(997);
      const numerator = amountInWithFee.mul(isToken0 ? reserve1 : reserve0);
      const denominator = (isToken0 ? reserve0 : reserve1).mul(1000).add(amountInWithFee);
      const correctOutput = numerator.div(denominator);
      const maliciousOutput = correctOutput.add(ethers.utils.parseEther("0.1"));
      
      if (isToken0) {
        await expect(
          pair.swap(0, maliciousOutput, user1.address, [])
        ).to.be.revertedWith("BlumeSwap: K");
      } else {
        await expect(
          pair.swap(maliciousOutput, 0, user1.address, [])
        ).to.be.revertedWith("BlumeSwap: K");
      }
    });
    
    it("Should charge protocol fee on swaps", async function () {
      // Set protocol fee (use a smaller fee to avoid overflow)
      await factory.setProtocolFeeBPS(5); // 0.05% protocol fee
      await factory.setFeeReceiver(user2.address);
      
      // Get actual tokens in the right order
      const actualToken0 = await pair.token0();
      const isToken0 = token0.address === actualToken0;
      const swapToken = isToken0 ? token0 : token1;
      
      // Transfer token to pair for swap
      const swapAmount = ethers.utils.parseEther("10");
      await swapToken.transfer(pair.address, swapAmount);
      
      // Calculate expected protocol fee
      const protocolFee = swapAmount.mul(5).div(10000);
      
      // Get fee receiver balance before swap
      const receiverBalanceBefore = await swapToken.balanceOf(user2.address);
      
      // Calculate output amount and execute swap
      const [reserve0, reserve1] = await pair.getReserves();
      const amountInWithFee = swapAmount.mul(997);
      const numerator = amountInWithFee.mul(isToken0 ? reserve1 : reserve0);
      const denominator = (isToken0 ? reserve0 : reserve1).mul(1000).add(amountInWithFee);
      const expectedOutput = numerator.div(denominator);
      
      if (isToken0) {
        await pair.swap(0, expectedOutput, user1.address, []);
      } else {
        await pair.swap(expectedOutput, 0, user1.address, []);
      }
      
      // Check fee receiver got fees
      const receiverBalanceAfter = await swapToken.balanceOf(user2.address);
      expect(receiverBalanceAfter.sub(receiverBalanceBefore)).to.be.closeTo(protocolFee, ethers.utils.parseEther("0.001"));
    });
  });

  describe("Price oracle integration", function () {
    it("Should verify price against oracle when set", async function () {
      // Deploy price oracle
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      const oracle = await PriceOracle.deploy();
      
      // Set oracle on pair
      await pair.setPriceOracle(oracle.address);
      
      // Get tokens in the right order
      const actualToken0 = await pair.token0();
      const actualToken1 = await pair.token1();
      
      // Mock set custom prices in the oracle
      await oracle.setCustomPrice(actualToken0, ethers.utils.parseUnits("1", 8));  // $1.00 with 8 decimals
      await oracle.setCustomPrice(actualToken1, ethers.utils.parseUnits("2", 8));  // $2.00 with 8 decimals
      
      // Add liquidity with correct ratio (1:2)
      const token0Amount = ethers.utils.parseEther("10");
      const token1Amount = ethers.utils.parseEther("5");  // 1:2 ratio
      
      await token0.approve(pair.address, token0Amount);
      await token1.approve(pair.address, token1Amount);
      
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);
      
      // This should succeed because it matches the oracle's pricing within 5%
      await pair.mint(owner.address);
      
      // Now try with incorrect ratio (1:4) to trigger the revert
      await token0.approve(pair.address, token0Amount);
      await token1.approve(pair.address, ethers.utils.parseEther("20")); // Incorrect ratio: 1:4 instead of 1:2
      
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, ethers.utils.parseEther("20"));
      
      // This should fail because it deviates too much from the oracle's pricing
      await expect(pair.mint(owner.address))
        .to.be.revertedWith("BlumeSwap: PRICE_OUTSIDE_BOUNDS");
    });
  });
});