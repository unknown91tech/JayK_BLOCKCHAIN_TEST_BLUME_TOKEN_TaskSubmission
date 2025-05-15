// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// describe("BlumeToken", function () {
//   let BlumeToken;
//   let blumeToken;
//   let owner;
//   let addr1;
//   let addr2;
//   let addrs;
//   let initialSupply = ethers.utils.parseEther("100000000"); // 100 million tokens

//   beforeEach(async function () {
//     // Get the contract factory and signers
//     BlumeToken = await ethers.getContractFactory("BlumeToken");
//     [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

//     // Deploy the contract
//     blumeToken = await BlumeToken.deploy(initialSupply);
//     await blumeToken.deployed();
//   });

//   describe("Deployment", function () {
//     it("Should set the right owner (admin role)", async function () {
//       expect(await blumeToken.hasRole(await blumeToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(true);
//     });

//     it("Should assign the total supply of tokens to the owner", async function () {
//       const ownerBalance = await blumeToken.balanceOf(owner.address);
//       expect(await blumeToken.totalSupply()).to.equal(ownerBalance);
//     });

//     it("Should set the correct token name and symbol", async function () {
//       expect(await blumeToken.name()).to.equal("BLUME TOKEN");
//       expect(await blumeToken.symbol()).to.equal("BLX");
//     });
//   });

//   describe("Basic Token Operations", function () {
//     it("Should transfer tokens between accounts", async function () {
//       // Transfer 100 tokens from owner to addr1
//       const transferAmount = ethers.utils.parseEther("100");
//       await blumeToken.transfer(addr1.address, transferAmount);
      
//       const addr1Balance = await blumeToken.balanceOf(addr1.address);
//       expect(addr1Balance).to.equal(transferAmount);

//       // Transfer 50 tokens from addr1 to addr2
//       const secondTransferAmount = ethers.utils.parseEther("50");
//       await blumeToken.connect(addr1).transfer(addr2.address, secondTransferAmount);
      
//       const addr2Balance = await blumeToken.balanceOf(addr2.address);
//       expect(addr2Balance).to.equal(secondTransferAmount);
//     });

//     it("Should fail if sender doesn't have enough tokens", async function () {
//       const initialOwnerBalance = await blumeToken.balanceOf(owner.address);
      
//       // Try to send tokens that addr1 doesn't have
//       await expect(
//         blumeToken.connect(addr1).transfer(owner.address, 1)
//       ).to.be.reverted; // Using simple .to.be.reverted without specifying message
      
//       // Owner balance shouldn't have changed
//       expect(await blumeToken.balanceOf(owner.address)).to.equal(initialOwnerBalance);
//     });
//   });

//   describe("Anti-Whale Mechanisms", function () {
//     it("Should not allow transfers exceeding max transaction amount", async function () {
//       // Owner gives addr1 enough tokens to test
//       await blumeToken.transfer(addr1.address, ethers.utils.parseEther("20000000"));
      
//       // Address 1 tries to transfer more than the max transaction limit (10%)
//       const excessiveAmount = ethers.utils.parseEther("11000000"); // 11% of total supply
//       await expect(
//         blumeToken.connect(addr1).transfer(addr2.address, excessiveAmount)
//       ).to.be.revertedWith("Transfer amount exceeds the maximum allowed");
//     });

//     it("Should not allow a wallet to hold more than max wallet balance", async function () {
//       // First give tokens to addr1 (who is not excluded by default)
//       const totalAmount = ethers.utils.parseEther("11000000"); // More than needed
//       await blumeToken.transfer(addr1.address, totalAmount);
      
//       // First give addr2 almost the max amount
//       const nearMaxAmount = ethers.utils.parseEther("9000000"); // 9% of supply
//       await blumeToken.connect(addr1).transfer(addr2.address, nearMaxAmount);
      
//       // Then try to send more to push it over the limit
//       const smallAmount = ethers.utils.parseEther("2000000"); // Another 2%
      
//       // Using addr1 (not excluded) to send the transfer
//       await expect(
//         blumeToken.connect(addr1).transfer(addr2.address, smallAmount)
//       ).to.be.reverted;
      
//       // Verify the balance didn't change
//       expect(await blumeToken.balanceOf(addr2.address)).to.equal(nearMaxAmount);
//     });
//   });

//   describe("Role Management", function () {
//     it("Should allow minting only by accounts with MINTER_ROLE", async function () {
//       const mintAmount = ethers.utils.parseEther("1000");
      
//       // Owner has minter role
//       await blumeToken.mint(addr1.address, mintAmount);
//       expect(await blumeToken.balanceOf(addr1.address)).to.equal(mintAmount);
      
//       // addr1 doesn't have minter role
//       await expect(
//         blumeToken.connect(addr1).mint(addr2.address, mintAmount)
//       ).to.be.revertedWith("AccessControlUnauthorizedAccount");
//     });

//     it("Should allow pausing only by accounts with PAUSER_ROLE", async function () {
//       // Owner has pauser role
//       await blumeToken.pause();
//       expect(await blumeToken.paused()).to.equal(true);
      
//       // Unpause for later tests
//       await blumeToken.unpause();
      
//       // addr1 doesn't have pauser role
//       await expect(
//         blumeToken.connect(addr1).pause()
//       ).to.be.revertedWith("AccessControlUnauthorizedAccount");
//     });
//   });

//   describe("Anti-Bot Mechanism", function () {
//     it("Should enforce cooldown between transactions", async function () {
//       // Set a cooldown for testing purposes (60 seconds)
//       await blumeToken.setCooldownTime(60);
      
//       // Transfer some tokens to addr1
//       const transferAmount = ethers.utils.parseEther("1000");
//       await blumeToken.transfer(addr1.address, transferAmount);
      
//       // Verify the transfer worked
//       expect(await blumeToken.balanceOf(addr1.address)).to.equal(transferAmount);
      
//       // Try to transfer immediately again from the same account
//       // This should fail due to cooldown period
//       await expect(
//         blumeToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("10"))
//       ).to.be.revertedWith("Cooldown period not yet elapsed");
      
//       // Verify addr2 received nothing
//       expect(await blumeToken.balanceOf(addr2.address)).to.equal(0);
      
//       // Fast forward time by 61 seconds
//       await ethers.provider.send("evm_increaseTime", [61]);
//       await ethers.provider.send("evm_mine");
      
//       // Now the transfer should succeed after cooldown period
//       await blumeToken.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("10"));
      
//       // Verify the second transfer worked
//       expect(await blumeToken.balanceOf(addr2.address)).to.equal(ethers.utils.parseEther("10"));
//     });
//   });

//   describe("Burning", function () {
//     it("Should allow token holders to burn their tokens", async function () {
//       // Transfer tokens to addr1
//       const transferAmount = ethers.utils.parseEther("1000");
//       await blumeToken.transfer(addr1.address, transferAmount);
      
//       // Addr1 burns half of their tokens
//       const burnAmount = ethers.utils.parseEther("500");
//       await blumeToken.connect(addr1).burn(burnAmount);
      
//       // Check the balance
//       expect(await blumeToken.balanceOf(addr1.address)).to.equal(transferAmount.sub(burnAmount));
      
//       // Check the total supply has decreased
//       expect(await blumeToken.totalSupply()).to.equal(initialSupply.sub(burnAmount));
//     });
//   });
// });




// File: test/BlumeToken.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlumeToken", function () {
  let BlumeToken;
  let token;
  let owner;
  let addr1;
  let addr2;
  let addrs;
  const initialSupply = ethers.utils.parseEther("1000000"); // 1 million tokens

  beforeEach(async function () {
    BlumeToken = await ethers.getContractFactory("BlumeToken");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    token = await BlumeToken.deploy(initialSupply);
    await token.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), owner.address)).to.equal(true);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(await token.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Transactions", function () {
    it("Should transfer tokens between accounts", async function () {
      await token.transfer(addr1.address, 50);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(50);

      await token.connect(addr1).transfer(addr2.address, 20);
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(20);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);

      await expect(
        token.connect(addr1).transfer(owner.address, 1)
      ).to.be.reverted;

      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance);
    });
  });

  describe("Anti-whale mechanisms", function () {
    it("Should enforce max transaction amount", async function () {
      const maxAmount = ethers.utils.parseEther("100");
      await token.setMaxTransactionAmount(maxAmount);

      // Send tokens to addr1 to test from a non-excluded account
      await token.transfer(addr1.address, ethers.utils.parseEther("200"));

      // Over limit
      await expect(
        token.connect(addr1).transfer(addr2.address, maxAmount.add(1))
      ).to.be.revertedWith("Transfer amount exceeds the maximum allowed");

      // Within limit
      await token.connect(addr1).transfer(addr2.address, maxAmount);
      expect(await token.balanceOf(addr2.address)).to.equal(maxAmount);
    });

    it("Should enforce max wallet balance", async function () {
      const maxBalance = ethers.utils.parseEther("150");
      await token.setMaxWalletBalance(maxBalance);
      await token.setCooldownTime(60); // required since cooldown will interfere
    
      await token.transfer(addr1.address, ethers.utils.parseEther("200"));
    
      // First transfer: 100 tokens
      await token.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("100"));
    
      // Wait for cooldown
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
    
      // Second transfer: 51 (should exceed max wallet)
      await expect(
        token.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("51"))
      ).to.be.revertedWith("Recipient balance would exceed the maximum allowed");
    
      // Wait again to allow next transfer
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
    
      // This should succeed and hit the exact max wallet balance
      await token.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("50"));
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.utils.parseEther("150"));
    });
    

    it("Should enforce cooldown period", async function () {
      await token.setCooldownTime(60);
    
      await token.transfer(addr1.address, ethers.utils.parseEther("200"));
    
      // First transfer should work
      await token.connect(addr1).transfer(addr2.address, ethers.utils.parseEther("10"));
    
      // Immediate second transfer should fail
      await expect(
        token.connect(addr1).transfer(owner.address, ethers.utils.parseEther("10"))
      ).to.be.revertedWith("Cooldown period not yet elapsed");
    
      // Wait for cooldown
      await ethers.provider.send("evm_increaseTime", [61]);
      await ethers.provider.send("evm_mine");
    
      // Now transfer should succeed
      await token.connect(addr1).transfer(owner.address, ethers.utils.parseEther("10"));
    });
    
  });

  describe("Role-based access control", function () {
    it("Only admin can mint new tokens", async function () {
      await token.mint(addr1.address, 100);
      expect(await token.balanceOf(addr1.address)).to.equal(100);

      await expect(
        token.connect(addr1).mint(addr2.address, 100)
      ).to.be.reverted;
    });

    it("Only admin can change limits", async function () {
      await expect(
        token.connect(addr1).setMaxTransactionAmount(ethers.utils.parseEther("10"))
      ).to.be.reverted;

      await expect(
        token.connect(addr1).setMaxWalletBalance(ethers.utils.parseEther("10"))
      ).to.be.reverted;

      await expect(
        token.connect(addr1).setCooldownTime(30)
      ).to.be.reverted;
    });
  });

  describe("Pausing functionality", function () {
    it("Should pause and unpause transfers", async function () {
      await token.pause();

      await expect(
        token.transfer(addr1.address, 100)
      ).to.be.revertedWith("EnforcedPause");

      await token.unpause();

      await token.transfer(addr1.address, 100);
      expect(await token.balanceOf(addr1.address)).to.equal(100);
    });

    it("Only authorized roles can pause/unpause", async function () {
      await expect(
        token.connect(addr1).pause()
      ).to.be.reverted;

      await expect(
        token.connect(addr1).unpause()
      ).to.be.reverted;
    });
  });
});
