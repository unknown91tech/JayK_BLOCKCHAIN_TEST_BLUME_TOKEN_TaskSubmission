// File: test/BlumeStakingHub.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BlumeStakingHub", function () {
    let BlumeStakingHubFactory, BlumeStakingHub, BlumeToken, token, factory, hub;
  let owner, user1, user2, feeCollector;
  const initialSupply = ethers.utils.parseEther("1000000");
  const rewardRate = 500; // 5% annual reward rate
  const protocolFee = 200; // 2% protocol fee

  beforeEach(async function () {
    [owner, user1, user2, feeCollector] = await ethers.getSigners();
    
    // Deploy BLX token
    BlumeToken = await ethers.getContractFactory("BlumeToken");
    token = await BlumeToken.deploy(initialSupply);
    
    // Deploy factory
    BlumeStakingHubFactory = await ethers.getContractFactory("BlumeStakingHubFactory");
    factory = await BlumeStakingHubFactory.deploy();
    
    // Deploy hub through factory
    await factory.deployStakingHub(
      token.address,
      rewardRate,
      protocolFee,
      feeCollector.address,
      "Test Staking Hub",
      "A test staking hub for BLX tokens"
    );
    
    // Get hub address
    const hubInfo = await factory.stakingHubs(0);
    
    // Get hub contract instance
    BlumeStakingHub = await ethers.getContractFactory("BlumeStakingHub");
    hub = await BlumeStakingHub.attach(hubInfo.hubAddress);
    
    // Give users some tokens
    await token.transfer(user1.address, ethers.utils.parseEther("10000"));
    await token.transfer(user2.address, ethers.utils.parseEther("10000"));
    
    // Exclude hub from token limits explicitly
    await token.setExcludedFromLimits(hub.address, true);
  });

  describe("Security checks", function() {
    it("Should protect against reentrancy attacks", async function() {
      // Deploy attacker contract
      const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await ReentrancyAttacker.deploy(hub.address, token.address);
      
      // Fund attacker contract
      const attackAmount = ethers.utils.parseEther("1000");
      await token.transfer(attacker.address, attackAmount);
      
      // Stake through attacker contract
      await attacker.stake(attackAmount, 0);
      
      // Verify initial stake
      const initialStake = await hub.userStakes(attacker.address);
      expect(initialStake.amount).to.equal(attackAmount);
      
      // Attempt reentrancy attack
      await expect(attacker.attack())
        .to.be.revertedWith("ReentrancyGuard: reentrant call");
    });

    it("Should allow normal operations after failed attack", async function() {
      // Deploy attacker contract
      const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
      const attacker = await ReentrancyAttacker.deploy(hub.address, token.address);
      
      // Fund attacker contract
      const attackAmount = ethers.utils.parseEther("1000");
      await token.transfer(attacker.address, attackAmount);
      
      // Stake through attacker contract
      await attacker.stake(attackAmount, 0);
      
      // Attempt attack (should fail)
      await expect(attacker.attack()).to.be.reverted;
      
      // Get stBLX token instance
      const stBLXTokenAddress = await hub.stBLXToken();
      const stBLXToken = await ethers.getContractAt("IERC20", stBLXTokenAddress);
      
      // Get attacker's stBLX balance
      const attackerStBLXBalance = await stBLXToken.balanceOf(attacker.address);
      
      // Connect attacker contract to stBLX token
      const attackerSigner = await ethers.getImpersonatedSigner(attacker.address);
      await stBLXToken.connect(attackerSigner).approve(hub.address, attackerStBLXBalance);
      
      // Perform normal unstake
      await expect(hub.connect(attackerSigner).unstake(attackerStBLXBalance))
        .to.not.be.reverted;
      
      // Verify unstake was successful
      const finalStake = await hub.userStakes(attacker.address);
      expect(finalStake.amount).to.equal(0);
    });
  });
    

  describe("Deployment", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await hub.blxToken()).to.equal(token.address);
      expect(await hub.rewardRate()).to.equal(rewardRate);
      expect(await hub.protocolFee()).to.equal(protocolFee);
      expect(await hub.feeCollector()).to.equal(feeCollector.address);
      
      // Check stBLX token was deployed
      const stBLXAddress = await hub.stBLXToken();
      expect(stBLXAddress).to.not.equal(ethers.constants.AddressZero);
      
      // Check exchange rate initialized to 1:1
      expect(await hub.exchangeRate()).to.equal(ethers.utils.parseEther("1"));
    });
  });

  describe("Staking", function () {
    it("Should allow staking with a lock period", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // Approve tokens to hub
      await token.connect(user1).approve(hub.address, stakeAmount);
      
      // Stake with 30-day lock (tier 0)
      await hub.connect(user1).stake(stakeAmount, 0);
      
      // Check user stake info
      const stakeInfo = await hub.userStakes(user1.address);
      expect(stakeInfo.amount).to.equal(stakeAmount);
      expect(stakeInfo.tierIndex).to.equal(0);
      
      // Check total staked
      expect(await hub.totalStaked()).to.equal(stakeAmount);
      
      // Check stBLX tokens minted
      const stBLXToken = await ethers.getContractAt("StakedBlumeToken", await hub.stBLXToken());
      const stBLXBalance = await stBLXToken.balanceOf(user1.address);
      expect(stBLXBalance).to.equal(stakeAmount); // Initially 1:1 ratio
    });
    
    it("Should respect lock periods when unstaking", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // Approve tokens to hub
      await token.connect(user1).approve(hub.address, stakeAmount);
      
      // Stake with 30-day lock (tier 0)
      await hub.connect(user1).stake(stakeAmount, 0);
      
      // Get stBLX token
      const stBLXToken = await ethers.getContractAt("StakedBlumeToken", await hub.stBLXToken());
      const stBLXBalance = await stBLXToken.balanceOf(user1.address);
      
      // Try to unstake immediately (should fail or apply penalty)
      await stBLXToken.connect(user1).approve(hub.address, stBLXBalance);
      
      // Get lock tier info to calculate expected penalty
      const lockTier = await hub.lockTiers(0);
      const earlyWithdrawalFee = lockTier.earlyWithdrawalFee;
      
      // Unstake
      const balanceBefore = await token.balanceOf(user1.address);
      await hub.connect(user1).unstake(stBLXBalance);
      const balanceAfter = await token.balanceOf(user1.address);
      
      // Calculate expected amount received
      const expectedPenalty = stakeAmount.mul(earlyWithdrawalFee).div(10000);
      const expectedReceived = stakeAmount.sub(expectedPenalty);
      
      // Check penalty was applied
      expect(balanceAfter.sub(balanceBefore)).to.equal(expectedReceived);
      
      // Check fee collector received penalty
      const feeCollectorBalance = await token.balanceOf(feeCollector.address);
      expect(feeCollectorBalance).to.equal(expectedPenalty);
    });

    
    it("Should allow unstaking without penalty after lock period", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // Approve tokens to hub
      await token.connect(user1).approve(hub.address, stakeAmount);
      
      // Stake with 30-day lock (tier 0)
      await hub.connect(user1).stake(stakeAmount, 0);
      
      // Get stBLX token
      const stBLXToken = await ethers.getContractAt("StakedBlumeToken", await hub.stBLXToken());
      const stBLXBalance = await stBLXToken.balanceOf(user1.address);
      
      // Fast forward past lock period (30 days)
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine");
      
      // Approve stBLX tokens
      await stBLXToken.connect(user1).approve(hub.address, stBLXBalance);
      
      // Unstake
      const balanceBefore = await token.balanceOf(user1.address);
      await hub.connect(user1).unstake(stBLXBalance);
      const balanceAfter = await token.balanceOf(user1.address);
      
      // Check user received full amount (plus any rewards)
      // In this case, we should receive at least our initial stake
      expect(balanceAfter.sub(balanceBefore)).to.be.gte(stakeAmount);
    });
  });

  describe("Rewards", function () {
    it("Should accrue rewards over time", async function () {
      const stakeAmount = ethers.utils.parseEther("1000");
      
      // Approve tokens to hub
      await token.connect(user1).approve(hub.address, stakeAmount);
      
      // Stake with 365-day lock (tier 3 - highest reward multiplier)
      await hub.connect(user1).stake(stakeAmount, 3);
      
      // Fast forward 30 days
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // Check pending rewards
      const pendingRewards = await hub.getPendingRewards(user1.address);
      
      // Calculate expected rewards
      // For a 5% annual rate with 2x multiplier (tier 3) over 30 days:
      // 1000 * 0.05 * 2 * (30/365) = 8.22 tokens approximately
      const expectedRewards = stakeAmount
        .mul(rewardRate)
        .mul(2) // 2x multiplier for 365-day lock (tier 3)
        .mul(30)
        .div(365)
        .div(10000);
      
      // Should be close to expected (allowing for slight timestamp variations)
      expect(pendingRewards).to.be.closeTo(expectedRewards, ethers.utils.parseEther("0.1"));
      
      // Claim rewards
      const balanceBefore = await token.balanceOf(user1.address);
      await hub.connect(user1).claimRewards();
      const balanceAfter = await token.balanceOf(user1.address);
      
      // Check received amount (minus protocol fee)
      const protocolFeeAmount = pendingRewards.mul(protocolFee).div(10000);
      const expectedReceived = pendingRewards.sub(protocolFeeAmount);
      
      expect(balanceAfter.sub(balanceBefore)).to.be.closeTo(expectedReceived, ethers.utils.parseEther("0.1"));
    });
  });

  describe("Exchange rate", function () {
    it("Should update exchange rate as rewards accrue", async function () {
        const stakeAmount = ethers.utils.parseEther("1000");
        
        // Approve tokens to hub
        await token.connect(user1).approve(hub.address, stakeAmount);
        
        // Stake with 30-day lock
        await hub.connect(user1).stake(stakeAmount, 0);
        
        const initialExchangeRate = await hub.exchangeRate();
        
        // Fast forward 90 days
        await ethers.provider.send("evm_increaseTime", [90 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        
        // Trigger exchange rate update using public function instead of internal _updateRewards
        await hub.connect(user1).updateRewardsAndExchangeRate();
        
        const newExchangeRate = await hub.exchangeRate();
        
        // Exchange rate should have increased
        expect(newExchangeRate).to.be.gt(initialExchangeRate);
        
        // Test conversion functions
        const blxAmount = ethers.utils.parseEther("100");
        const stBLXAmount = await hub.getStBLXForBLX(blxAmount);
        const convertedBLXAmount = await hub.getBLXForStBLX(stBLXAmount);
        
        // Should get back our original amount (within rounding)
        expect(convertedBLXAmount).to.be.closeTo(blxAmount, ethers.utils.parseEther("0.0001"));
      });
  });

  describe("Factory control", function () {
    it("Should allow factory to update hub status", async function () {
      expect((await factory.stakingHubs(0)).isActive).to.be.true;
      
      // Deactivate hub
      await factory.updateHubStatus(hub.address, false);
      

        expect((await factory.stakingHubs(0)).isActive).to.be.false;
            
        // Check if hub appears in active hubs list
        const activeHubs = await factory.getActiveStakingHubs();
        expect(activeHubs.length).to.equal(0);

        // Reactivate hub
        await factory.updateHubStatus(hub.address, true);

        // Check active hubs again
        const updatedActiveHubs = await factory.getActiveStakingHubs();
        expect(updatedActiveHubs.length).to.equal(1);
        });
        });


        describe("Security checks", function() {

        it("Should enforce proper access control", async function() {
        // Try to update protocol fee as non-admin
        await expect(
        hub.connect(user1).setProtocolFee(100)
        ).to.be.reverted;

        // Try to add a new lock tier as non-admin
        await expect(
        hub.connect(user1).addLockTier(60 * 24 * 60 * 60, 15000, 2000)
        ).to.be.reverted;

        // Admin should be able to perform these actions
        await hub.setProtocolFee(100);
        expect(await hub.protocolFee()).to.equal(100);

        await hub.addLockTier(60 * 24 * 60 * 60, 15000, 2000);
        // Check new tier was added
        const tierCount = await hub.lockTiers(4); // Should be 5th tier (index 4)
        expect(tierCount.duration).to.equal(60 * 24 * 60 * 60);
        });
        });
        });