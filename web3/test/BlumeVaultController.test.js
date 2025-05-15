// File: test/BlumeVaultController.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlumeVaultController", function () {
  let BlumeToken, BlumeVault, BlumeVaultController;
  let token, vault1, vault2, controller;
  let owner, user1, user2, feeCollector, keeper;
  
  const initialSupply = ethers.utils.parseEther("1000000"); // 1 million tokens
  const yieldRate = 500; // 5% APY
  const compoundFrequency = 24 * 60 * 60; // Daily compounding
  const autoCompoundFrequency = 12 * 60 * 60; // 12-hour auto-compound
  
  beforeEach(async function () {
    [owner, user1, user2, feeCollector, keeper] = await ethers.getSigners();
    
    // Deploy tokens and contracts
    BlumeToken = await ethers.getContractFactory("BlumeToken");
    BlumeVault = await ethers.getContractFactory("BlumeVault");
    BlumeVaultController = await ethers.getContractFactory("BlumeVaultController");
    
    // Deploy BLX token
    token = await BlumeToken.deploy(initialSupply);
    await token.deployed();
    
    // Deploy controller
    controller = await BlumeVaultController.deploy(
      token.address,
      autoCompoundFrequency
    );
    await controller.deployed();
    
    // Deploy vaults
    vault1 = await BlumeVault.deploy(
      token.address,
      yieldRate,
      compoundFrequency
    );
    await vault1.deployed();
    
    vault2 = await BlumeVault.deploy(
      token.address,
      yieldRate * 2, // 10% APY for second vault
      compoundFrequency
    );
    await vault2.deployed();
    
    // Give tokens to users
    await token.transfer(user1.address, ethers.utils.parseEther("10000"));
    await token.transfer(user2.address, ethers.utils.parseEther("10000"));
    
    // Make token a BlumeToken with minting capability and grant minter role to controller
    const minterRole = await token.MINTER_ROLE();
    await token.grantRole(minterRole, controller.address);
    
    // Grant keeper role to keeper address
    const keeperRole = await controller.KEEPER_ROLE();
    await controller.grantRole(keeperRole, keeper.address);
    
    // Exclude vaults from token limits to avoid issues in tests
    try {
      await token.setExcludedFromLimits(vault1.address, true);
      await token.setExcludedFromLimits(vault2.address, true);
      await token.setExcludedFromLimits(controller.address, true);
    } catch (e) {
      // If function not available on test token, ignore
    }
    
    // Grant necessary roles to controller in vaults
    const vaultYieldGeneratorRole = await vault1.YIELD_GENERATOR_ROLE();
    await vault1.grantRole(vaultYieldGeneratorRole, controller.address);
    await vault2.grantRole(vaultYieldGeneratorRole, controller.address);
  });
  
  describe("Deployment", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await controller.blxToken()).to.equal(token.address);
      expect(await controller.autoCompoundFrequency()).to.equal(autoCompoundFrequency);
      expect(await controller.lastGlobalCompoundTime()).to.be.gt(0);
      expect(await controller.totalYieldGenerated()).to.equal(0);
    });
    
    it("Should set up roles correctly", async function () {
      const adminRole = await controller.DEFAULT_ADMIN_ROLE();
      const vaultManagerRole = await controller.VAULT_MANAGER_ROLE();
      const yieldGeneratorRole = await controller.YIELD_GENERATOR_ROLE();
      const keeperRole = await controller.KEEPER_ROLE();
      
      expect(await controller.hasRole(adminRole, owner.address)).to.be.true;
      expect(await controller.hasRole(vaultManagerRole, owner.address)).to.be.true;
      expect(await controller.hasRole(yieldGeneratorRole, owner.address)).to.be.true;
      expect(await controller.hasRole(keeperRole, owner.address)).to.be.true;
      expect(await controller.hasRole(keeperRole, keeper.address)).to.be.true;
    });
  });
  
  describe("Vault Management", function () {
    it("Should add vaults correctly", async function () {
      // Add vault1
      await controller.addVault(
        vault1.address,
        "Blume Vault 1",
        "Standard yield vault",
        yieldRate
      );
      
      // Check vault was added
      const vaults = await controller.getAllVaults();
      expect(vaults.length).to.equal(1);
      expect(vaults[0].hubAddress).to.equal(vault1.address);
      expect(vaults[0].name).to.equal("Blume Vault 1");
      expect(vaults[0].description).to.equal("Standard yield vault");
      expect(vaults[0].isActive).to.be.true;
      expect(vaults[0].rewardRate).to.equal(yieldRate);
      
      // Add vault2
      await controller.addVault(
        vault2.address,
        "Blume Vault 2",
        "High yield vault",
        yieldRate * 2
      );
      
      // Check both vaults exist
      const allVaults = await controller.getAllVaults();
      expect(allVaults.length).to.equal(2);
    });
    
    it("Should prevent adding the same vault twice", async function () {
      // Add vault1
      await controller.addVault(
        vault1.address,
        "Blume Vault 1",
        "Standard yield vault",
        yieldRate
      );
      
      // Try to add vault1 again (should revert)
      await expect(
        controller.addVault(
          vault1.address,
          "Blume Vault 1 Again",
          "Should fail",
          yieldRate
        )
      ).to.be.revertedWith("BlumeVaultController: Vault already exists");
    });
    
    it("Should update vault status correctly", async function () {
      // Add vault1
      await controller.addVault(
        vault1.address,
        "Blume Vault 1",
        "Standard yield vault",
        yieldRate
      );
      
      // Update status to inactive
      await controller.updateVaultStatus(vault1.address, false);
      
      // Check vault status
      const vaults = await controller.getAllVaults();
      expect(vaults[0].isActive).to.be.false;
      
      // Get active vaults (should be empty)
      const activeVaults = await controller.getActiveVaults();
      expect(activeVaults.length).to.equal(0);
      
      // Update back to active
      await controller.updateVaultStatus(vault1.address, true);
      
      // Check active vaults again
      const updatedActiveVaults = await controller.getActiveVaults();
      expect(updatedActiveVaults.length).to.equal(1);
    });
    
    it("Should update vault reward rate correctly", async function () {
      // Add vault1
      await controller.addVault(
        vault1.address,
        "Blume Vault 1",
        "Standard yield vault",
        yieldRate
      );
      
      // Update reward rate
      const newRate = 800; // 8% APY
      await controller.updateVaultRewardRate(vault1.address, newRate);
      
      // Check vault reward rate
      const vaults = await controller.getAllVaults();
      expect(vaults[0].rewardRate).to.equal(newRate);
    });
    
    it("Should reject operations on non-existent vaults", async function () {
      // Try to update status of non-existent vault
      await expect(
        controller.updateVaultStatus(vault1.address, false)
      ).to.be.revertedWith("BlumeVaultController: Vault does not exist");
      
      // Try to update reward rate of non-existent vault
      await expect(
        controller.updateVaultRewardRate(vault1.address, 800)
      ).to.be.revertedWith("BlumeVaultController: Vault does not exist");
      
      // Try to generate yield for non-existent vault
      await expect(
        controller.generateYield(vault1.address)
      ).to.be.revertedWith("BlumeVaultController: Vault does not exist");
    });
  });
  
  describe("Yield Generation", function () {
    beforeEach(async function () {
      // Add vaults to controller
      await controller.addVault(
        vault1.address,
        "Blume Vault 1",
        "Standard yield vault",
        yieldRate
      );
      
      await controller.addVault(
        vault2.address,
        "Blume Vault 2",
        "High yield vault",
        yieldRate * 2
      );
      
      // Set up deposits in vaults
      await token.connect(user1).approve(vault1.address, ethers.utils.parseEther("1000"));
      await vault1.connect(user1).deposit(ethers.utils.parseEther("1000"), 0); // No lock
      
      await token.connect(user2).approve(vault2.address, ethers.utils.parseEther("2000"));
      await vault2.connect(user2).deposit(ethers.utils.parseEther("2000"), 0); // No lock
    });
    
    it("Should generate yield for a specific vault", async function () {
      // Initial BLX balance in vault
      const initialBalance = await token.balanceOf(vault1.address);
      
      // Generate yield for vault1
      await controller.generateYield(vault1.address);
      
      // Check balance increased
      const finalBalance = await token.balanceOf(vault1.address);
      expect(finalBalance).to.be.gt(initialBalance);
      
      // Check total yield generated
      const totalYield = await controller.totalYieldGenerated();
      expect(totalYield).to.equal(finalBalance.sub(initialBalance));
    });
    
    it("Should execute auto-compound for all active vaults", async function () {
      // Initial balances in vaults
      const initialBalance1 = await token.balanceOf(vault1.address);
      const initialBalance2 = await token.balanceOf(vault2.address);
      
      // Advance time to satisfy auto-compound frequency
      await ethers.provider.send("evm_increaseTime", [autoCompoundFrequency + 1]);
      await ethers.provider.send("evm_mine");
      
      // Execute auto-compound as keeper
      await controller.connect(keeper).executeAutoCompound();
      
      // Check balances increased
      const finalBalance1 = await token.balanceOf(vault1.address);
      const finalBalance2 = await token.balanceOf(vault2.address);
      
      expect(finalBalance1).to.be.gt(initialBalance1);
      expect(finalBalance2).to.be.gt(initialBalance2);
      
      // Check total yield generated
      const totalYield = await controller.totalYieldGenerated();
      expect(totalYield).to.equal(
        finalBalance1.sub(initialBalance1).add(finalBalance2.sub(initialBalance2))
      );
      
      // Check last compound time updated
      const lastCompoundTime = await controller.lastGlobalCompoundTime();
      expect(lastCompoundTime).to.be.closeTo(
        (await ethers.provider.getBlock("latest")).timestamp,
        5 // Allow small difference due to mining
      );
    });
    
    it("Should respect auto-compound frequency", async function () {
      // Execute auto-compound once
      await ethers.provider.send("evm_increaseTime", [autoCompoundFrequency + 1]);
      await ethers.provider.send("evm_mine");
      await controller.connect(keeper).executeAutoCompound();
      
      // Try to execute again too soon (should revert)
      await expect(
        controller.connect(keeper).executeAutoCompound()
      ).to.be.revertedWith("BlumeVaultController: Too early to compound");
      
      // Advance time halfway and check time until next compound
      await ethers.provider.send("evm_increaseTime", [autoCompoundFrequency / 2]);
      await ethers.provider.send("evm_mine");
      
      const timeUntilNext = await controller.timeUntilNextAutoCompound();
      expect(timeUntilNext).to.be.closeTo(
        autoCompoundFrequency / 2,
        5 // Allow small difference due to mining
      );
      
      // Advance time to next interval and execute again (should succeed)
      await ethers.provider.send("evm_increaseTime", [autoCompoundFrequency / 2 + 1]);
      await ethers.provider.send("evm_mine");
      await controller.connect(keeper).executeAutoCompound();
    });
    
    it("Should skip inactive vaults during auto-compound", async function () {
      // Deactivate vault1
      await controller.updateVaultStatus(vault1.address, false);
      
      // Initial balances in vaults
      const initialBalance1 = await token.balanceOf(vault1.address);
      const initialBalance2 = await token.balanceOf(vault2.address);
      
      // Advance time and execute auto-compound
      await ethers.provider.send("evm_increaseTime", [autoCompoundFrequency + 1]);
      await ethers.provider.send("evm_mine");
      await controller.connect(keeper).executeAutoCompound();
      
      // Check only vault2's balance increased
      const finalBalance1 = await token.balanceOf(vault1.address);
      const finalBalance2 = await token.balanceOf(vault2.address);
      
      expect(finalBalance1).to.equal(initialBalance1); // Should remain unchanged
      expect(finalBalance2).to.be.gt(initialBalance2); // Should increase
    });
  });
  
  describe("Access Control", function () {
    beforeEach(async function () {
      // Add vault1 to controller
      await controller.addVault(
        vault1.address,
        "Blume Vault 1",
        "Standard yield vault",
        yieldRate
      );
    });
    
    it("Should restrict vault management to VAULT_MANAGER_ROLE", async function () {
      // Try to add vault as non-manager
      await expect(
        controller.connect(user1).addVault(
          vault2.address,
          "Blume Vault 2",
          "High yield vault",
          yieldRate * 2
        )
      ).to.be.reverted;
      
      // Try to update vault status as non-manager
      await expect(
        controller.connect(user1).updateVaultStatus(vault1.address, false)
      ).to.be.reverted;
      
      // Try to update reward rate as non-manager
      await expect(
        controller.connect(user1).updateVaultRewardRate(vault1.address, 800)
      ).to.be.reverted;
      
      // Grant VAULT_MANAGER_ROLE to user1
      const vaultManagerRole = await controller.VAULT_MANAGER_ROLE();
      await controller.grantRole(vaultManagerRole, user1.address);
      
      // Now should succeed
      await controller.connect(user1).updateVaultStatus(vault1.address, false);
      await controller.connect(user1).updateVaultRewardRate(vault1.address, 800);
    });
    
    it("Should restrict auto-compound execution to KEEPER_ROLE", async function () {
      // Advance time to satisfy auto-compound frequency
      await ethers.provider.send("evm_increaseTime", [autoCompoundFrequency + 1]);
      await ethers.provider.send("evm_mine");
      
      // Try to execute auto-compound as non-keeper
      await expect(
        controller.connect(user1).executeAutoCompound()
      ).to.be.reverted;
      
      // Try as keeper (should succeed)
      await controller.connect(keeper).executeAutoCompound();
    });
    
    it("Should restrict yield generation to YIELD_GENERATOR_ROLE", async function () {
      // Try to generate yield as non-generator
      await expect(
        controller.connect(user1).generateYield(vault1.address)
      ).to.be.reverted;
      
      // Grant YIELD_GENERATOR_ROLE to user1
      const yieldGeneratorRole = await controller.YIELD_GENERATOR_ROLE();
      await controller.grantRole(yieldGeneratorRole, user1.address);
      
      // Now should succeed
      await controller.connect(user1).generateYield(vault1.address);
    });
    
    it("Should restrict auto-compound frequency updates to VAULT_MANAGER_ROLE", async function () {
      // Try to update auto-compound frequency as non-manager
      await expect(
        controller.connect(user1).updateAutoCompoundFrequency(6 * 60 * 60) // 6 hours
      ).to.be.reverted;
      
      // Grant VAULT_MANAGER_ROLE to user1
      const vaultManagerRole = await controller.VAULT_MANAGER_ROLE();
      await controller.grantRole(vaultManagerRole, user1.address);
      
      // Now should succeed
      await controller.connect(user1).updateAutoCompoundFrequency(6 * 60 * 60);
      expect(await controller.autoCompoundFrequency()).to.equal(6 * 60 * 60);
    });
  });
  
  describe("Vault Details", function () {
    beforeEach(async function () {
      // Add vault1 to controller
      await controller.addVault(
        vault1.address,
        "Blume Vault 1",
        "Standard yield vault",
        yieldRate
      );
      
      // Set up deposit in vault
      await token.connect(user1).approve(vault1.address, ethers.utils.parseEther("1000"));
      await vault1.connect(user1).deposit(ethers.utils.parseEther("1000"), 0); // No lock
    });
    
    it("Should retrieve vault details correctly", async function () {
      // Get vault details
      const details = await controller.getVaultDetails(vault1.address);
      
      // Check details
      expect(details.name).to.equal("Blume Vault 1");
      expect(details.description).to.equal("Standard yield vault");
      expect(details.isActive).to.be.true;
      expect(details.rewardRate).to.equal(yieldRate);
      expect(details.tvl).to.equal(ethers.utils.parseEther("1000"));
    });
    
    it("Should reject getting details for non-existent vault", async function () {
      await expect(
        controller.getVaultDetails(vault2.address)
      ).to.be.revertedWith("BlumeVaultController: Vault does not exist");
    });
  });
});