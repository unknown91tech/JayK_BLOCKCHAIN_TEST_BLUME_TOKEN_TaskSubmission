// File: test/BlumeSwapRouter.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlumeSwapRouter", function () {
  let owner, user1, user2;
  let BlumeToken, WETH, BlumeSwapFactory, BlumeSwapRouter;
  let token, weth, factory, router;
  const initialSupply = ethers.utils.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy tokens
    BlumeToken = await ethers.getContractFactory("BlumeToken");
    WETH = await ethers.getContractFactory("WETH");
    
    token = await BlumeToken.deploy(initialSupply);
    weth = await WETH.deploy();
    
    // Deploy factory
    BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
    factory = await BlumeSwapFactory.deploy();
    
    // Deploy router
    BlumeSwapRouter = await ethers.getContractFactory("BlumeSwapRouter");
    router = await BlumeSwapRouter.deploy(factory.address, weth.address);
    
    // Distribute tokens
    await token.transfer(user1.address, ethers.utils.parseEther("10000"));
    await token.transfer(user2.address, ethers.utils.parseEther("10000"));
  });

  describe("Liquidity", function () {
    it("Should add liquidity and create pair", async function () {
      const tokenAmount = ethers.utils.parseEther("1000");
      const ethAmount = ethers.utils.parseEther("10");
      
      // Approve tokens to router
      await token.connect(user1).approve(router.address, tokenAmount);
      
      // Add liquidity with ETH
      await router.connect(user1).addLiquidityETH(
        token.address,
        tokenAmount,
        tokenAmount, // min token
        ethAmount,   // min ETH
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600,
        { value: ethAmount }
      );
      
      // Check pair was created
      const pairAddress = await factory.getPair(token.address, weth.address);
      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);
      
      // Check LP tokens were minted
      const pair = await ethers.getContractAt("BlumeSwapPair", pairAddress);
      const lpBalance = await pair.balanceOf(user1.address);
      expect(lpBalance).to.be.gt(0);
    });
    
    it("Should remove liquidity and receive tokens back", async function () {
      // First add liquidity
      const tokenAmount = ethers.utils.parseEther("1000");
      const ethAmount = ethers.utils.parseEther("10");
      
      await token.connect(user1).approve(router.address, tokenAmount);
      await router.connect(user1).addLiquidityETH(
        token.address,
        tokenAmount,
        tokenAmount,
        ethAmount,
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600,
        { value: ethAmount }
      );
      
      // Get LP balance
      const pairAddress = await factory.getPair(token.address, weth.address);
      const pair = await ethers.getContractAt("BlumeSwapPair", pairAddress);
      const lpBalance = await pair.balanceOf(user1.address);
      
      // Approve LP tokens to router
      await pair.connect(user1).approve(router.address, lpBalance);
      
      // Get token balance before removing liquidity
      const tokenBalanceBefore = await token.balanceOf(user1.address);
      const ethBalanceBefore = await ethers.provider.getBalance(user1.address);
      
      // Remove liquidity
      const tx = await router.connect(user1).removeLiquidityETH(
        token.address,
        lpBalance,
        0, // min token
        0, // min ETH
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600
      );
      
      // Calculate gas cost
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed.mul(tx.gasPrice);
      
      // Get token balance after removing liquidity
      const tokenBalanceAfter = await token.balanceOf(user1.address);
      const ethBalanceAfter = await ethers.provider.getBalance(user1.address);
      
      // Check received correct amounts
      expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore);
      expect(ethBalanceAfter.add(gasCost)).to.be.gt(ethBalanceBefore);
      
      // Check LP balance is zero
      expect(await pair.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Swapping", function () {
    beforeEach(async function () {
      // Add initial liquidity
      const tokenAmount = ethers.utils.parseEther("10000");
      const ethAmount = ethers.utils.parseEther("100");
      
      await token.approve(router.address, tokenAmount);
      await router.addLiquidityETH(
        token.address,
        tokenAmount,
        tokenAmount,
        ethAmount,
        owner.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600,
        { value: ethAmount }
      );
    });
    
    it("Should swap tokens for exact ETH", async function () {
      const ethOut = ethers.utils.parseEther("1");
      const maxTokensIn = ethers.utils.parseEther("1000");
      
      // Approve tokens to router
      await token.connect(user1).approve(router.address, maxTokensIn);
      
      // Get ETH balance before swap
      const ethBalanceBefore = await ethers.provider.getBalance(user1.address);
      
      // Swap tokens for exact ETH
      const tx = await router.connect(user1).swapTokensForExactETH(
        ethOut,
        maxTokensIn,
        [token.address, weth.address],
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600
      );
      
      // Calculate gas cost
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed.mul(tx.gasPrice);
      
      // Get ETH balance after swap
      const ethBalanceAfter = await ethers.provider.getBalance(user1.address);
      
      // Check received correct amount
      expect(ethBalanceAfter.add(gasCost).sub(ethBalanceBefore)).to.equal(ethOut);
    });
    
    it("Should swap exact tokens for ETH", async function () {
      const tokenIn = ethers.utils.parseEther("100");
      const minEthOut = ethers.utils.parseEther("0.5");
      
      // Approve tokens to router
      await token.connect(user1).approve(router.address, tokenIn);
      
      // Get ETH balance before swap
      const ethBalanceBefore = await ethers.provider.getBalance(user1.address);
      
      // Swap exact tokens for ETH
      const tx = await router.connect(user1).swapExactTokensForETH(
        tokenIn,
        minEthOut,
        [token.address, weth.address],
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600
      );
      
      // Calculate gas cost
      const receipt = await tx.wait();
      const gasCost = receipt.gasUsed.mul(tx.gasPrice);
      
      // Get ETH balance after swap
      const ethBalanceAfter = await ethers.provider.getBalance(user1.address);
      
      // Check received ethers
      expect(ethBalanceAfter.add(gasCost)).to.be.gt(ethBalanceBefore);
    });
    
    it("Should swap exact ETH for tokens", async function () {
      const ethIn = ethers.utils.parseEther("1");
      const minTokensOut = ethers.utils.parseEther("50");
      
      // Get token balance before swap
      const tokenBalanceBefore = await token.balanceOf(user1.address);
      
      // Swap exact ETH for tokens
      await router.connect(user1).swapExactETHForTokens(
        minTokensOut,
        [weth.address, token.address],
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600,
        { value: ethIn }
      );
      
      // Get token balance after swap
      const tokenBalanceAfter = await token.balanceOf(user1.address);
      
      // Check received tokens
      expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.be.gte(minTokensOut);
    });
    
    it("Should swap ETH for exact tokens", async function () {
      const tokensOut = ethers.utils.parseEther("100");
      const maxEthIn = ethers.utils.parseEther("2");
      
      // Get token balance before swap
      const tokenBalanceBefore = await token.balanceOf(user1.address);
      
      // Swap ETH for exact tokens
      await router.connect(user1).swapETHForExactTokens(
        tokensOut,
        [weth.address, token.address],
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600,
        { value: maxEthIn }
      );
      
      // Get token balance after swap
      const tokenBalanceAfter = await token.balanceOf(user1.address);
      
      // Check received exact amount of tokens
      expect(tokenBalanceAfter.sub(tokenBalanceBefore)).to.equal(tokensOut);
    });
  });

  describe("Path-based swaps", function () {
    let token2;
    
    beforeEach(async function () {
      // Deploy another token
      token2 = await BlumeToken.deploy(initialSupply);
      
      // Add liquidity for both pairs
      const tokenAmount = ethers.utils.parseEther("10000");
      const ethAmount = ethers.utils.parseEther("100");
      const token2Amount = ethers.utils.parseEther("20000");
      
      // Add token/ETH pair
      await token.approve(router.address, tokenAmount);
      await router.addLiquidityETH(
        token.address,
        tokenAmount,
        tokenAmount,
        ethAmount,
        owner.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600,
        { value: ethAmount }
      );
      
      // Add token2/ETH pair
      await token2.approve(router.address, token2Amount);
      await router.addLiquidityETH(
        token2.address,
        token2Amount,
        token2Amount,
        ethAmount,
        owner.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600,
        { value: ethAmount }
      );
      
      // Give user1 some token
      await token.transfer(user1.address, ethers.utils.parseEther("1000"));
    });
    
    it("Should swap through a path of 3 tokens", async function () {
      const tokenIn = ethers.utils.parseEther("100");
      const minToken2Out = ethers.utils.parseEther("50");
      
      // Approve tokens to router
      await token.connect(user1).approve(router.address, tokenIn);
      
      // Get token2 balance before swap
      const token2BalanceBefore = await token2.balanceOf(user1.address);
      
      // Swap through a path: token -> weth -> token2
      await router.connect(user1).swapExactTokensForTokens(
        tokenIn,
        minToken2Out,
        [token.address, weth.address, token2.address],
        user1.address,
        (await ethers.provider.getBlock("latest")).timestamp + 3600
      );
      
      // Get token2 balance after swap
      const token2BalanceAfter = await token2.balanceOf(user1.address);
      
      // Check received token2
      expect(token2BalanceAfter.sub(token2BalanceBefore)).to.be.gte(minToken2Out);
    });
  });

  describe("Deadline checks", function () {
    it("Should revert if deadline has passed", async function () {
      const tokenAmount = ethers.utils.parseEther("1000");
      const ethAmount = ethers.utils.parseEther("10");
      
      // Get past timestamp
      const pastDeadline = (await ethers.provider.getBlock("latest")).timestamp - 1;
      
      // Approve tokens to router
      await token.connect(user1).approve(router.address, tokenAmount);
      
      // Try to add liquidity with expired deadline
      await expect(
        router.connect(user1).addLiquidityETH(
          token.address,
          tokenAmount,
          tokenAmount,
          ethAmount,
          user1.address,
          pastDeadline,
          { value: ethAmount }
        )
      ).to.be.revertedWith("BlumeSwapRouter: EXPIRED");
    });
  });
});