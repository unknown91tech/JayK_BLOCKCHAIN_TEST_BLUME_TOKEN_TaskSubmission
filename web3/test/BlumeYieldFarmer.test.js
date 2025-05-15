const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlumeYieldFarmer", function () {
  let BlumeToken, BlumeVault, BlumeSwapFactory, BlumeSwapRouter, WETH, BlumeYieldFarmer;
  let token, weth, factory, router, vault, lpToken, yieldFarmer;
  let owner, user1, user2, strategy;
  
  const initialSupply = ethers.utils.parseEther("1000000");
  const yieldRate = 1000;
  const harvestInterval = 24 * 60 * 60;
  
  beforeEach(async function () {
    [owner, user1, user2, strategy] = await ethers.getSigners();
    BlumeToken = await ethers.getContractFactory("BlumeToken");
    BlumeVault = await ethers.getContractFactory("BlumeVault");
    WETH = await ethers.getContractFactory("WETH");
    BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
    BlumeSwapRouter = await ethers.getContractFactory("BlumeSwapRouter");
    BlumeYieldFarmer = await ethers.getContractFactory("BlumeYieldFarmer");

    token = await BlumeToken.deploy(initialSupply);
    await token.deployed();
    try { await token.setCooldownTime(0); } catch (e) {}

    weth = await WETH.deploy();
    await weth.deployed();
    await weth.deposit({ value: ethers.utils.parseEther("100") });

    factory = await BlumeSwapFactory.deploy();
    await factory.deployed();

    router = await BlumeSwapRouter.deploy(factory.address, weth.address);
    await router.deployed();

    await factory.createPair(token.address, weth.address);
    const pairAddress = await factory.getPair(token.address, weth.address);
    const BlumeSwapPair = await ethers.getContractFactory("BlumeSwapPair");
    lpToken = await BlumeSwapPair.attach(pairAddress);

    vault = await BlumeVault.deploy(token.address, yieldRate, harvestInterval);
    await vault.deployed();

    yieldFarmer = await BlumeYieldFarmer.deploy(
      token.address, vault.address, router.address, pairAddress, weth.address
    );
    await yieldFarmer.deployed();

    await token.approve(router.address, ethers.utils.parseEther("10000"));
    await weth.approve(router.address, ethers.utils.parseEther("10"));
    await router.addLiquidity(
      token.address,
      weth.address,
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("10"),
      0, 0,
      owner.address,
      (await ethers.provider.getBlock("latest")).timestamp + 3600
    );

    await token.transfer(user1.address, ethers.utils.parseEther("100000"));
    await token.transfer(user2.address, ethers.utils.parseEther("100000"));

    try {
      await token.setExcludedFromLimits(user1.address, true);
      await token.setExcludedFromLimits(user2.address, true);
      await token.setExcludedFromLimits(yieldFarmer.address, true);
      await token.setExcludedFromLimits(vault.address, true);
    } catch (e) {}

    const yieldGeneratorRole = await vault.YIELD_GENERATOR_ROLE();
    try {
      await vault.grantRole(yieldGeneratorRole, yieldFarmer.address);
    } catch (e) {}

    const strategyManagerRole = await yieldFarmer.STRATEGY_MANAGER_ROLE();
    await yieldFarmer.grantRole(strategyManagerRole, strategy.address);

    const harvesterRole = await yieldFarmer.HARVESTER_ROLE();
    await yieldFarmer.grantRole(harvesterRole, strategy.address);

    await owner.sendTransaction({
      to: yieldFarmer.address,
      value: ethers.utils.parseEther("1")
    });
  });

  describe("Deployment", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await yieldFarmer.blxToken()).to.equal(token.address);
      expect(await yieldFarmer.vault()).to.equal(vault.address);
      expect(await yieldFarmer.router()).to.equal(router.address);
      expect(await yieldFarmer.lpToken()).to.equal(lpToken.address);
      expect(await yieldFarmer.WETH()).to.equal(weth.address);
    });

    it("Should set up roles correctly", async function () {
      const adminRole = await yieldFarmer.DEFAULT_ADMIN_ROLE();
      const strategyManagerRole = await yieldFarmer.STRATEGY_MANAGER_ROLE();
      const harvesterRole = await yieldFarmer.HARVESTER_ROLE();

      expect(await yieldFarmer.hasRole(adminRole, owner.address)).to.be.true;
      expect(await yieldFarmer.hasRole(strategyManagerRole, owner.address)).to.be.true;
      expect(await yieldFarmer.hasRole(harvesterRole, owner.address)).to.be.true;
      expect(await yieldFarmer.hasRole(strategyManagerRole, strategy.address)).to.be.true;
      expect(await yieldFarmer.hasRole(harvesterRole, strategy.address)).to.be.true;
    });
  });

  describe("Harvesting", function () {
    it("Should respect harvest interval", async function () {
      await ethers.provider.send("evm_increaseTime", [harvestInterval + 1]);
      await ethers.provider.send("evm_mine");
      await yieldFarmer.connect(strategy).harvest();

      await expect(
        yieldFarmer.connect(strategy).harvest()
      ).to.be.revertedWith("BlumeYieldFarmer: Too early to harvest");

      await ethers.provider.send("evm_increaseTime", [harvestInterval + 1]);
      await ethers.provider.send("evm_mine");
      await yieldFarmer.connect(strategy).harvest();
    });

    it("Should restrict harvesting to authorized accounts", async function () {
      await ethers.provider.send("evm_increaseTime", [harvestInterval + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        yieldFarmer.connect(user1).harvest()
      ).to.be.reverted;

      await yieldFarmer.connect(strategy).harvest();
    });
  });

  describe("User Position Management", function () {
    beforeEach(async function () {
      const depositAmount = ethers.utils.parseEther("1000");
      await token.connect(user1).approve(yieldFarmer.address, depositAmount);
      await yieldFarmer.connect(user1).deposit(depositAmount);
    });

    it("Should return correct user position details", async function () {
      const position = await yieldFarmer.getUserPosition(user1.address);
      expect(position.totalDeposited).to.equal(ethers.utils.parseEther("1000"));
      expect(position.vaultAmount).to.be.gt(0);
      expect(position.lpAmount).to.be.gt(0);
      expect(position.pendingRewards).to.be.gte(0);
      expect(position.effectiveAPY).to.be.gte(0);
    });

    it("Should return zero for users with no position", async function () {
      const position = await yieldFarmer.getUserPosition(user2.address);
      expect(position.totalDeposited).to.equal(0);
      expect(position.vaultAmount).to.equal(0);
      expect(position.lpAmount).to.equal(0);
      expect(position.pendingRewards).to.equal(0);
      expect(position.effectiveAPY).to.equal(0);
    });
  });

  describe("Strategy Management", function () {
    it("Should allow updating strategy parameters", async function () {
      await yieldFarmer.connect(strategy).updateStrategy(
        8000, 2000, 30 * 24 * 60 * 60, 12 * 60 * 60, 500
      );
      expect(await yieldFarmer.vaultAllocation()).to.equal(8000);
      expect(await yieldFarmer.lpAllocation()).to.equal(2000);
    });

    it("Should restrict strategy updates to authorized accounts", async function () {
      await expect(
        yieldFarmer.connect(user1).updateStrategy(8000, 2000, 30 * 24 * 60 * 60, 12 * 60 * 60, 500)
      ).to.be.reverted;
    });

    it("Should validate strategy parameters", async function () {
      await expect(
        yieldFarmer.connect(strategy).updateStrategy(7000, 2000, 30 * 24 * 60 * 60, 12 * 60 * 60, 500)
      ).to.be.revertedWith("BlumeYieldFarmer: Allocations must sum to 10000");

      await expect(
        yieldFarmer.connect(strategy).updateStrategy(8000, 2000, 30 * 24 * 60 * 60, 12 * 60 * 60, 1500)
      ).to.be.revertedWith("BlumeYieldFarmer: Slippage too high");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero deposits", async function () {
      await expect(
        yieldFarmer.connect(user1).deposit(0)
      ).to.be.revertedWith("BlumeYieldFarmer: Zero deposit");
    });
  });
});
