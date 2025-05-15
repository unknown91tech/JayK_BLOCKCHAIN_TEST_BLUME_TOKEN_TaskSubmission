// File: test/PriceOracle.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceOracle", function () {
  let PriceOracle, MockPriceFeed;
  let oracle, mockPriceFeed;
  let owner, user1, user2, admin;
  let token1, token2;
  
  beforeEach(async function () {
    [owner, user1, user2, admin] = await ethers.getSigners();
    
    // Deploy mock tokens for testing
    const MockToken = await ethers.getContractFactory("BlumeToken");
    token1 = await MockToken.deploy(ethers.utils.parseEther("1000000"));
    token2 = await MockToken.deploy(ethers.utils.parseEther("1000000"));
    await token1.deployed();
    await token2.deployed();
    
    // Deploy mock price feed
    MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy();
    await mockPriceFeed.deployed();
    
    // Set up mock price feed to return valid data
    await mockPriceFeed.setLatestRoundData(
      1, // roundId
      ethers.utils.parseUnits("2000", 8), // price $2000 with 8 decimals
      Math.floor(Date.now() / 1000), // startedAt
      Math.floor(Date.now() / 1000), // updatedAt
      1 // answeredInRound
    );
    
    // Deploy price oracle
    PriceOracle = await ethers.getContractFactory("PriceOracle");
    oracle = await PriceOracle.deploy();
    await oracle.deployed();
    
    // Grant ORACLE_ADMIN_ROLE to admin
    const adminRole = await oracle.ORACLE_ADMIN_ROLE();
    await oracle.grantRole(adminRole, admin.address);
  });
  
  describe("Deployment", function () {
    it("Should set up roles correctly", async function () {
      const adminRole = await oracle.DEFAULT_ADMIN_ROLE();
      const oracleAdminRole = await oracle.ORACLE_ADMIN_ROLE();
      
      expect(await oracle.hasRole(adminRole, owner.address)).to.be.true;
      expect(await oracle.hasRole(oracleAdminRole, owner.address)).to.be.true;
      expect(await oracle.hasRole(oracleAdminRole, admin.address)).to.be.true;
    });
    
    it("Should initialize with no price feeds", async function () {
      // Check no price feeds are set
      expect(await oracle.priceFeeds(token1.address)).to.equal(ethers.constants.AddressZero);
      expect(await oracle.priceFeeds(token2.address)).to.equal(ethers.constants.AddressZero);
      
      // Check no custom prices are set
      expect(await oracle.customPrices(token1.address)).to.equal(0);
      expect(await oracle.customPrices(token2.address)).to.equal(0);
    });
  });
  
  describe("Price Feed Management", function () {
    it("Should set price feed", async function () {
      await oracle.connect(admin).setPriceFeed(token1.address, mockPriceFeed.address);
      
      expect(await oracle.priceFeeds(token1.address)).to.equal(mockPriceFeed.address);
    });
    
    it("Should validate price feed before setting", async function () {
      // Set up invalid mock price feed with zero price
      const invalidPriceFeed = await MockPriceFeed.deploy();
      await invalidPriceFeed.setLatestRoundData(
        1, // roundId
        0, // price 0 (invalid)
        Math.floor(Date.now() / 1000), // startedAt
        Math.floor(Date.now() / 1000), // updatedAt
        1 // answeredInRound
      );
      
      // Try to set invalid price feed (should revert)
      await expect(
        oracle.connect(admin).setPriceFeed(token1.address, invalidPriceFeed.address)
      ).to.be.revertedWith("PriceOracle: ZERO_PRICE");
      
      // Set up another invalid mock price feed with timestamp 0
      const invalidPriceFeed2 = await MockPriceFeed.deploy();
      await invalidPriceFeed2.setLatestRoundData(
        1, // roundId
        ethers.utils.parseUnits("2000", 8), // price
        0, // startedAt 0
        0, // updatedAt 0 (invalid)
        1 // answeredInRound
      );
      
      // Try to set invalid price feed (should revert)
      await expect(
        oracle.connect(admin).setPriceFeed(token1.address, invalidPriceFeed2.address)
      ).to.be.revertedWith("PriceOracle: INVALID_TIMESTAMP");
    });
    
    it("Should restrict price feed management to ORACLE_ADMIN_ROLE", async function () {
      // Try to set price feed as non-admin
      await expect(
        oracle.connect(user1).setPriceFeed(token1.address, mockPriceFeed.address)
      ).to.be.reverted;
      
      // Set price feed as admin (should succeed)
      await oracle.connect(admin).setPriceFeed(token1.address, mockPriceFeed.address);
    });
    
    it("Should validate token address when setting price feed", async function () {
      // Try to set price feed for zero address (should revert)
      await expect(
        oracle.connect(admin).setPriceFeed(ethers.constants.AddressZero, mockPriceFeed.address)
      ).to.be.revertedWith("PriceOracle: ZERO_TOKEN_ADDRESS");
    });
    
    it("Should validate price feed address when setting", async function () {
      // Try to set zero address as price feed (should revert)
      await expect(
        oracle.connect(admin).setPriceFeed(token1.address, ethers.constants.AddressZero)
      ).to.be.revertedWith("PriceOracle: ZERO_FEED_ADDRESS");
    });
  });
  
  describe("Custom Price Management", function () {
    it("Should set custom price", async function () {
      const price = ethers.utils.parseUnits("1", 8); // $1.00 with 8 decimals
      
      await oracle.connect(admin).setCustomPrice(token1.address, price);
      
      expect(await oracle.customPrices(token1.address)).to.equal(price);
      expect(await oracle.lastCustomPriceUpdate(token1.address)).to.be.closeTo(
        (await ethers.provider.getBlock("latest")).timestamp,
        5 // Allow small difference due to mining
      );
    });
    
    it("Should restrict custom price management to ORACLE_ADMIN_ROLE", async function () {
      const price = ethers.utils.parseUnits("1", 8); // $1.00 with 8 decimals
      
      // Try to set custom price as non-admin
      await expect(
        oracle.connect(user1).setCustomPrice(token1.address, price)
      ).to.be.reverted;
      
      // Set custom price as admin (should succeed)
      await oracle.connect(admin).setCustomPrice(token1.address, price);
    });
    
    it("Should validate token address when setting custom price", async function () {
      const price = ethers.utils.parseUnits("1", 8); // $1.00 with 8 decimals
      
      // Try to set custom price for zero address (should revert)
      await expect(
        oracle.connect(admin).setCustomPrice(ethers.constants.AddressZero, price)
      ).to.be.revertedWith("PriceOracle: ZERO_TOKEN_ADDRESS");
    });
    
    it("Should validate price value when setting custom price", async function () {
      // Try to set zero price (should revert)
      await expect(
        oracle.connect(admin).setCustomPrice(token1.address, 0)
      ).to.be.revertedWith("PriceOracle: ZERO_PRICE");
    });
  });
  
  describe("Price Retrieval", function () {
    it("Should get price from price feed", async function () {
      // Set price feed
      await oracle.connect(admin).setPriceFeed(token1.address, mockPriceFeed.address);
      
      // Get price
      const price = await oracle.getPrice(token1.address);
      
      // Should match price feed value
      expect(price).to.equal(ethers.utils.parseUnits("2000", 8));
    });
    
    it("Should get price from custom price if no feed", async function () {
      // Set custom price
      const customPrice = ethers.utils.parseUnits("1", 8); // $1.00 with 8 decimals
      await oracle.connect(admin).setCustomPrice(token1.address, customPrice);
      
      // Get price
      const price = await oracle.getPrice(token1.address);
      
      // Should match custom price
      expect(price).to.equal(customPrice);
    });
    
    it("Should fail if no price feed or custom price", async function () {
      // Try to get price without any price source (should revert)
      await expect(
        oracle.getPrice(token1.address)
      ).to.be.revertedWith("PriceOracle: PRICE_NOT_AVAILABLE");
    });
    
    it("Should validate token address when getting price", async function () {
      // Try to get price for zero address (should revert)
      await expect(
        oracle.getPrice(ethers.constants.AddressZero)
      ).to.be.revertedWith("PriceOracle: ZERO_TOKEN_ADDRESS");
    });
    
    it("Should check price feed staleness", async function () {
      // Set up stale price feed
      const stalePriceFeed = await MockPriceFeed.deploy();
      
      // Set timestamp to 24 hours + 1 second ago (just over the staleness threshold)
      const staleTimestamp = Math.floor(Date.now() / 1000) - (24 * 60 * 60 + 1);
      
      await stalePriceFeed.setLatestRoundData(
        1, // roundId
        ethers.utils.parseUnits("2000", 8), // price
        staleTimestamp, // startedAt
        staleTimestamp, // updatedAt
        1 // answeredInRound
      );
      
      // Set stale price feed
      await oracle.connect(admin).setPriceFeed(token1.address, stalePriceFeed.address);
      
      // Try to get price (should revert due to staleness)
      await expect(
        oracle.getPrice(token1.address)
      ).to.be.revertedWith("PriceOracle: STALE_PRICE");
    });
    
    it("Should check custom price staleness", async function () {
      // Set custom price
      const customPrice = ethers.utils.parseUnits("1", 8); // $1.00 with 8 decimals
      await oracle.connect(admin).setCustomPrice(token1.address, customPrice);
      
      // Fast forward time beyond staleness threshold
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]); // 24 hours + 1 second
      await ethers.provider.send("evm_mine");
      
      // Try to get price (should revert due to staleness)
      await expect(
        oracle.getPrice(token1.address)
      ).to.be.revertedWith("PriceOracle: STALE_CUSTOM_PRICE");
    });
    
    it("Should check for negative prices", async function () {
      // Set up price feed with negative price
      const negativePriceFeed = await MockPriceFeed.deploy();
      await negativePriceFeed.setLatestRoundData(
        1, // roundId
        -100000000, // -$1.00 with 8 decimals
        Math.floor(Date.now() / 1000), // startedAt
        Math.floor(Date.now() / 1000), // updatedAt
        1 // answeredInRound
      );
      
      // Try to set negative price feed - should revert with NEGATIVE_PRICE error
      await expect(
        oracle.connect(admin).setPriceFeed(token1.address, negativePriceFeed.address)
      ).to.be.revertedWith("PriceOracle: NEGATIVE_PRICE");
      
      // Verify the error message constant
      const expectedErrorMsg = "PriceOracle: NEGATIVE_PRICE";
      expect(await oracle.getNegativePriceErrorMessage()).to.equal(expectedErrorMsg);
    });
    
    it("Should prioritize price feed over custom price", async function () {
      // This is a bit tricky because of the staleness check in the contract
      // We need to use evm_setNextBlockTimestamp to control the block timestamp
      
      // Get current block timestamp
      const blockNumBefore = await ethers.provider.getBlockNumber();
      const blockBefore = await ethers.provider.getBlock(blockNumBefore);
      const currentTimestamp = blockBefore.timestamp;
      
      // First set custom price with current timestamp
      const customPrice = ethers.utils.parseUnits("1", 8); // $1.00 with 8 decimals
      await oracle.connect(admin).setCustomPrice(token1.address, customPrice);
      
      // Now deploy a fresh price feed and set it with a timestamp in the future
      const freshPriceFeed = await MockPriceFeed.deploy();
      
      // Set up a timestamp that won't be stale
      const updatedTimestamp = currentTimestamp + 60; // 60 seconds in the future
      
      // Set the next block timestamp to be after our updateTimestamp
      await ethers.provider.send("evm_setNextBlockTimestamp", [updatedTimestamp + 10]);
      
      await freshPriceFeed.setLatestRoundData(
        1, // roundId
        ethers.utils.parseUnits("2000", 8), // $2000 with 8 decimals
        updatedTimestamp, // startedAt
        updatedTimestamp, // updatedAt
        1 // answeredInRound
      );
      
      // Set price feed
      await oracle.connect(admin).setPriceFeed(token1.address, freshPriceFeed.address);
      
      // Get price - should use price feed value instead of custom
      const price = await oracle.getPrice(token1.address);
      
      // Should use price feed (2000)
      expect(price).to.equal(ethers.utils.parseUnits("2000", 8));
    });
  });
});
// Mock implementation of price feed for testing
const MockPriceFeedFactory = async () => {
  const factory = await ethers.getContractFactory("MockPriceFeed");
  return await factory.deploy();
};

// Contract deployment for testing
async function deployMockPriceFeed() {
  const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
  const mockPriceFeed = await MockPriceFeed.deploy();
  return mockPriceFeed;
}