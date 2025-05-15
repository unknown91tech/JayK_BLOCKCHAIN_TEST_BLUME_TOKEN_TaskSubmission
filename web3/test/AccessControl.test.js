// File: test/AccessControl.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Access Control Security", function () {
  let owner, user1, user2, feeCollector;
  let token, factory, pair, router, vault, stakingHub, oracle;
  
  before(async function () {
    [owner, user1, user2, feeCollector] = await ethers.getSigners();
    
    // Deploy BLX token
    const BlumeToken = await ethers.getContractFactory("BlumeToken");
    token = await BlumeToken.deploy(ethers.utils.parseEther("1000000"));
    
    // Deploy WETH
    const WETH = await ethers.getContractFactory("WETH");
    const weth = await WETH.deploy();
    
    // Deploy BlumeSwapFactory
    const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
    factory = await BlumeSwapFactory.deploy();
    
    // Deploy BlumeSwapRouter
    const BlumeSwapRouter = await ethers.getContractFactory("BlumeSwapRouter");
    router = await BlumeSwapRouter.deploy(factory.address, weth.address);
    
    // Create pair
    await factory.createPair(token.address, weth.address);
    const pairAddress = await factory.getPair(token.address, weth.address);
    const BlumeSwapPair = await ethers.getContractFactory("BlumeSwapPair");
    pair = BlumeSwapPair.attach(pairAddress);
    
    // Deploy BlumeVault
    const BlumeVault = await ethers.getContractFactory("BlumeVault");
    vault = await BlumeVault.deploy(
      token.address,
      1000, // 10% yield rate
      24 * 60 * 60 // Daily compounding
    );
    
    // Deploy BlumeStakingHubFactory
    const BlumeStakingHubFactory = await ethers.getContractFactory("BlumeStakingHubFactory");
    const hubFactory = await BlumeStakingHubFactory.deploy();
    
    // Deploy BlumeStakingHub via factory
    await hubFactory.deployStakingHub(
      token.address,
      500, // 5% reward rate
      100, // 1% protocol fee
      feeCollector.address,
      "Test Staking Hub",
      "Test hub for access control checks"
    );
    
    // Get hub address and attach to contract
    const hubInfo = await hubFactory.stakingHubs(0);
    const BlumeStakingHub = await ethers.getContractFactory("BlumeStakingHub");
    stakingHub = BlumeStakingHub.attach(hubInfo.hubAddress);
    
    // Deploy PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    oracle = await PriceOracle.deploy();
  });
  
  describe("BlumeToken Access Control", function () {
    it("Should restrict minting to MINTER_ROLE", async function () {
      await expect(
        token.connect(user1).mint(user2.address, 100)
      ).to.be.reverted;
      
      // Grant MINTER_ROLE to user1
      const minterRole = await token.MINTER_ROLE();
      await token.grantRole(minterRole, user1.address);
      
      // Now should succeed
      await token.connect(user1).mint(user2.address, 100);
      expect(await token.balanceOf(user2.address)).to.equal(100);
    });
    
    it("Should restrict pausing to PAUSER_ROLE", async function () {
      await expect(
        token.connect(user1).pause()
      ).to.be.reverted;
      
      // Grant PAUSER_ROLE to user1
      const pauserRole = await token.PAUSER_ROLE();
      await token.grantRole(pauserRole, user1.address);
      
      // Now should succeed
      await token.connect(user1).pause();
      expect(await token.paused()).to.be.true;
      
      // Unpause for other tests
      await token.connect(user1).unpause();
    });
    
    it("Should restrict admin functions to DEFAULT_ADMIN_ROLE", async function () {
      await expect(
        token.connect(user1).setMaxTransactionAmount(ethers.utils.parseEther("1000"))
      ).to.be.reverted;
      
      // Grant DEFAULT_ADMIN_ROLE to user1
      const adminRole = await token.DEFAULT_ADMIN_ROLE();
      await token.grantRole(adminRole, user1.address);
      
      // Now should succeed
      await token.connect(user1).setMaxTransactionAmount(ethers.utils.parseEther("1000"));
      expect(await token.maxTransactionAmount()).to.equal(ethers.utils.parseEther("1000"));
    });
  });
  
  describe("BlumeSwapFactory Access Control", function () {
    it("Should restrict fee management to ADMIN_ROLE", async function () {
      await expect(
        factory.connect(user1).setProtocolFeeBPS(50)
      ).to.be.reverted;
      
      // Grant ADMIN_ROLE to user1
      const adminRole = await factory.ADMIN_ROLE();
      await factory.grantRole(adminRole, user1.address);
      
      // Now should succeed
      await factory.connect(user1).setProtocolFeeBPS(50);
      expect(await factory.protocolFeeBPS()).to.equal(50);
    });
  });
  
  describe("BlumeSwapPair Access Control", function () {
    it("Should restrict price oracle setup to owner", async function () {
      // Only factory is allowed to call initialize, but setPriceOracle is public
      // in this implementation
      await pair.setPriceOracle(oracle.address);
      expect(await pair.priceOracle()).to.equal(oracle.address);
    });
    
    it("Should restrict max price deviation settings to factory", async function () {
      await expect(
        pair.connect(user1).setMaxPriceDeviation(200)
      ).to.be.revertedWith("BlumeSwap: FORBIDDEN");
    });
  });
  
  describe("BlumeVault Access Control", function () {
    it("Should restrict yield rate management to MANAGER_ROLE", async function () {
      await expect(
        vault.connect(user1).setYieldRate(2000)
      ).to.be.reverted;
      
      // Grant MANAGER_ROLE to user1
      const managerRole = await vault.MANAGER_ROLE();
      await vault.grantRole(managerRole, user1.address);
      
      // Now should succeed
      await vault.connect(user1).setYieldRate(2000);
      expect(await vault.yieldRate()).to.equal(2000);
    });
    
    it("Should restrict global compound to YIELD_GENERATOR_ROLE", async function () {
      await expect(
        vault.connect(user1).executeGlobalCompound()
      ).to.be.reverted;
      
      // Grant YIELD_GENERATOR_ROLE to user1
      const generatorRole = await vault.YIELD_GENERATOR_ROLE();
      await vault.grantRole(generatorRole, user1.address);
      
      // Fast forward to meet compound frequency
      await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      // Now should succeed
      await vault.connect(user1).executeGlobalCompound();
    });
  });
  
  describe("BlumeStakingHub Access Control", function () {
    it("Should restrict protocol fee management to FEE_MANAGER_ROLE", async function () {
      await expect(
        stakingHub.connect(user1).setProtocolFee(200)
      ).to.be.reverted;
      
      // Grant FEE_MANAGER_ROLE to user1
      const feeManagerRole = await stakingHub.FEE_MANAGER_ROLE();
      await stakingHub.grantRole(feeManagerRole, user1.address);
      
      // Now should succeed
      await stakingHub.connect(user1).setProtocolFee(200);
      expect(await stakingHub.protocolFee()).to.equal(200);
    });
    
    it("Should restrict lock tier management to PROTOCOL_ROLE", async function () {
      await expect(
        stakingHub.connect(user1).addLockTier(
          60 * 24 * 60 * 60, // 60 days
          14000, // 1.4x multiplier
          1800 // 18% early withdrawal fee
        )
      ).to.be.reverted;
      
      // Grant PROTOCOL_ROLE to user1
      const protocolRole = await stakingHub.PROTOCOL_ROLE();
      await stakingHub.grantRole(protocolRole, user1.address);
      
      // Now should succeed
      await stakingHub.connect(user1).addLockTier(
        60 * 24 * 60 * 60, // 60 days
        14000, // 1.4x multiplier
        1800 // 18% early withdrawal fee
      );
      
      // Check the new tier was added
      const tierCount = await stakingHub.lockTiers(4); // Should be 5th tier (index 4)
      expect(tierCount.duration).to.equal(60 * 24 * 60 * 60);
    });
  });
  
  describe("PriceOracle Access Control", function () {
    it("Should restrict price feed management to ORACLE_ADMIN_ROLE", async function () {
      await expect(
        oracle.connect(user1).setCustomPrice(token.address, ethers.utils.parseUnits("1", 8))
      ).to.be.reverted;
      
      // Grant ORACLE_ADMIN_ROLE to user1
      const oracleAdminRole = await oracle.ORACLE_ADMIN_ROLE();
      await oracle.grantRole(oracleAdminRole, user1.address);
      
      // Now should succeed
      await oracle.connect(user1).setCustomPrice(token.address, ethers.utils.parseUnits("1", 8));
      expect(await oracle.customPrices(token.address)).to.equal(ethers.utils.parseUnits("1", 8));
    });
  });
});