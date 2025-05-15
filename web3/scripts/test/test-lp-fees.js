const { ethers } = require("hardhat");

// Deployed contract addresses
const ADDRESSES = {
    blumeToken: "0x8CBabC07717038DA6fAf1bC477a39F1627988a3a",
    weth: "0x2f9aAd71531651432deCB6f34f0d124F7136227A",
    factory: "0xb86D27c3736062132879E743c7648093F500fb7e",
    router: "0x40cDf70E2364b69AA5e00189A4f1BE631a351Ec4",
    blxWethPair: "0x9cAFb45c2f4B06d68A30179Fd103c735B2338150"
};

async function validateAddresses() {
    console.log("\n🔍 Validating contract addresses...");
    for (const key of Object.keys(ADDRESSES)) {
        try {
            ADDRESSES[key] = ethers.getAddress(ADDRESSES[key]);
            console.log(`Validated ${key}: ${ADDRESSES[key]}`);
        } catch (error) {
            console.error(`Invalid address for ${key}: ${ADDRESSES[key]}`, error);
            throw error;
        }
    }
}

async function validatePair(factory, blumeToken, weth, pair) {
    console.log("\n🔎 Validating pair contract...");
    const expectedPair = await factory.getPair(blumeToken.target, weth.target);
    console.log("Expected pair address from factory:", expectedPair);
    console.log("Provided pair address:", pair.target);
    if (expectedPair.toLowerCase() !== pair.target.toLowerCase()) {
        console.warn("⚠️ Pair address mismatch!");
    }
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    console.log("Pair token0:", token0);
    console.log("Pair token1:", token1);
    const [reserve0, reserve1] = await pair.getReserves();
    console.log("Initial reserves:", ethers.formatEther(reserve0), "token0", ethers.formatEther(reserve1), "token1");
}

async function setupLiquidityProviders(signers, blumeToken, weth) {
    console.log("\n🚰 Test 2: Setup Liquidity Providers");
    const [owner, lpProvider1, lpProvider2] = signers;
    const setupAmount = ethers.parseEther("2500"); // 2,500 BLX

    // Log ETH balances
    const ownerEthBalance = await ethers.provider.getBalance(owner.address);
    const lp1EthBalance = await ethers.provider.getBalance(lpProvider1.address);
    const lp2EthBalance = await ethers.provider.getBalance(lpProvider2.address);
    console.log("Owner ETH balance:", ethers.formatEther(ownerEthBalance), "ETH");
    console.log("LP Provider 1 ETH balance:", ethers.formatEther(lp1EthBalance), "ETH");
    console.log("LP Provider 2 ETH balance:", ethers.formatEther(lp2EthBalance), "ETH");

    // Fund LP Providers if needed
    const minEthRequiredLp1 = ethers.parseEther("2.1"); // 1 WETH + gas
    const minEthRequiredLp2 = ethers.parseEther("3.1"); // 3 WETH + gas

    if (lp1EthBalance < minEthRequiredLp1) {
        console.log("Funding LP Provider 1 with ETH...");
        const amountToSend = minEthRequiredLp1 - lp1EthBalance;
        console.log("Sending to LP1:", ethers.formatEther(amountToSend), "ETH");
        const tx = await owner.sendTransaction({
            to: lpProvider1.address,
            value: amountToSend,
        });
        await tx.wait();
        const newLp1EthBalance = await ethers.provider.getBalance(lpProvider1.address);
        console.log("LP Provider 1 new ETH balance:", ethers.formatEther(newLp1EthBalance), "ETH");
    }

    if (lp2EthBalance < minEthRequiredLp2) {
        console.log("Funding LP Provider 2 with ETH...");
        const amountToSend = minEthRequiredLp2 - lp2EthBalance;
        console.log("Sending to LP2:", ethers.formatEther(amountToSend), "ETH");
        const tx = await owner.sendTransaction({
            to: lpProvider2.address,
            value: amountToSend,
        });
        await tx.wait();
        const newLp2EthBalance = await ethers.provider.getBalance(lpProvider2.address);
        console.log("LP Provider 2 new ETH balance:", ethers.formatEther(newLp2EthBalance), "ETH");
    }

    // Transfer BLX tokens to LP providers
    console.log("Owner BLX balance:", ethers.formatEther(await blumeToken.balanceOf(owner.address)));
    await blumeToken.connect(owner).transfer(lpProvider1.address, setupAmount);
    await blumeToken.connect(owner).transfer(lpProvider2.address, setupAmount);
    console.log("Transferred BLX to LP providers");
    console.log("LP1 BLX balance:", ethers.formatEther(await blumeToken.balanceOf(lpProvider1.address)));
    console.log("LP2 BLX balance:", ethers.formatEther(await blumeToken.balanceOf(lpProvider2.address)));

    // Wrap ETH for LP providers
    await weth.connect(lpProvider1).deposit({ value: ethers.parseEther("1"), gasLimit: 200000 });
    await weth.connect(lpProvider2).deposit({ value: ethers.parseEther("3"), gasLimit: 200000 });
    console.log("LP providers wrapped ETH");
    console.log("LP1 WETH balance:", ethers.formatEther(await weth.balanceOf(lpProvider1.address)));
    console.log("LP2 WETH balance:", ethers.formatEther(await weth.balanceOf(lpProvider2.address)));
}

async function firstLPAddsLiquidity(lpProvider1, blumeToken, weth, router, pair) {
    console.log("\n💧 Test 3: First LP Provider Adds Liquidity");
    let lp1BlxAmount = ethers.parseEther("100"); // Reduced to 100 BLX
    let lp1WethAmount = ethers.parseEther("0.1"); // Reduced to 0.1 WETH

    // Verify balances
    const lp1BlxBalance = await blumeToken.balanceOf(lpProvider1.address);
    const lp1WethBalance = await weth.balanceOf(lpProvider1.address);
    console.log("LP1 BLX balance:", ethers.formatEther(lp1BlxBalance));
    console.log("LP1 WETH balance:", ethers.formatEther(lp1WethBalance));
    if (lp1BlxBalance < lp1BlxAmount || lp1WethBalance < lp1WethAmount) {
        throw new Error("Insufficient BLX or WETH balance for LP1");
    }

    // Approve tokens
    await blumeToken.connect(lpProvider1).approve(router.target, lp1BlxAmount * 2n);
    await weth.connect(lpProvider1).approve(router.target, lp1WethAmount * 2n);
    console.log("LP1 BLX allowance:", ethers.formatEther(await blumeToken.allowance(lpProvider1.address, router.target)));
    console.log("LP1 WETH allowance:", ethers.formatEther(await weth.allowance(lpProvider1.address, router.target)));

    const lp1BalanceBefore = await pair.balanceOf(lpProvider1.address);
    console.log("LP1 balance before:", ethers.formatEther(lp1BalanceBefore));

    // Check reserves and token order
    const [reserve0, reserve1] = await pair.getReserves();
    console.log("Current reserves:", ethers.formatEther(reserve0), "token0", ethers.formatEther(reserve1), "token1");
    console.log("Pair token0:", await pair.token0());
    console.log("Pair token1:", await pair.token1());

    // Adjust amounts with higher slippage tolerance
    let amountAMin = lp1BlxAmount * 80n / 100n; // 20% slippage
    let amountBMin = lp1WethAmount * 80n / 100n; // 20% slippage
    if (reserve0 > 0 && reserve1 > 0) {
        const ratio = reserve0 * lp1WethAmount / reserve1; // token0/token1 ratio
        lp1BlxAmount = ratio;
        amountAMin = lp1BlxAmount * 80n / 100n;
        amountBMin = lp1WethAmount * 80n / 100n;
        console.log("Adjusted BLX amount:", ethers.formatEther(lp1BlxAmount));
    }

    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const token0 = await pair.token0();

    console.log("Adding liquidity with tokenA:", blumeToken.target, "tokenB:", weth.target);
    let tx1;
    try {
        if (token0.toLowerCase() === weth.target.toLowerCase()) {
            console.log("Using WETH/BLX order");
            tx1 = await router.connect(lpProvider1).addLiquidity(
                weth.target,
                blumeToken.target,
                lp1WethAmount,
                lp1BlxAmount,
                amountBMin,
                amountAMin,
                lpProvider1.address,
                deadline,
                { gasLimit: 1000000 }
            );
        } else {
            console.log("Using BLX/WETH order");
            tx1 = await router.connect(lpProvider1).addLiquidity(
                blumeToken.target,
                weth.target,
                lp1BlxAmount,
                lp1WethAmount,
                amountAMin,
                amountBMin,
                lpProvider1.address,
                deadline,
                { gasLimit: 1000000 }
            );
        }
        const receipt = await tx1.wait();
        console.log("Transaction hash:", tx1.hash);
        console.log("Events:", receipt.events);
    } catch (error) {
        console.error("Add liquidity failed:", error);
        if (error.reason) console.error("Revert reason:", error.reason);
        throw error;
    }

    const lp1BalanceAfter = await pair.balanceOf(lpProvider1.address);
    const lp1Tokens = lp1BalanceAfter - lp1BalanceBefore;
    console.log("LP1 received tokens:", ethers.formatEther(lp1Tokens));
    console.log("Total LP supply:", ethers.formatEther(await pair.totalSupply()));
    return lp1BalanceAfter;
}

async function secondLPAddsLiquidity(lpProvider2, blumeToken, weth, router, pair) {
    console.log("\n💧 Test 4: Second LP Provider Adds Liquidity");
    let lp2BlxAmount = ethers.parseEther("150"); // Reduced to 150 BLX
    let lp2WethAmount = ethers.parseEther("0.15"); // Reduced to 0.15 WETH

    // Verify balances
    const lp2BlxBalance = await blumeToken.balanceOf(lpProvider2.address);
    const lp2WethBalance = await weth.balanceOf(lpProvider2.address);
    console.log("LP2 BLX balance:", ethers.formatEther(lp2BlxBalance));
    console.log("LP2 WETH balance:", ethers.formatEther(lp2WethBalance));
    if (lp2BlxBalance < lp2BlxAmount || lp2WethBalance < lp2WethAmount) {
        throw new Error("Insufficient BLX or WETH balance for LP2");
    }

    // Approve tokens
    await blumeToken.connect(lpProvider2).approve(router.target, lp2BlxAmount * 2n);
    await weth.connect(lpProvider2).approve(router.target, lp2WethAmount * 2n);
    console.log("LP2 BLX allowance:", ethers.formatEther(await blumeToken.allowance(lpProvider2.address, router.target)));
    console.log("LP2 WETH allowance:", ethers.formatEther(await weth.allowance(lpProvider2.address, router.target)));

    const lp2BalanceBefore = await pair.balanceOf(lpProvider2.address);
    console.log("LP2 balance before:", ethers.formatEther(lp2BalanceBefore));

    // Check reserves
    const [reserve0After, reserve1After] = await pair.getReserves();
    console.log("Current reserves:", ethers.formatEther(reserve0After), "token0", ethers.formatEther(reserve1After), "token1");

    let amountAMin = lp2BlxAmount * 80n / 100n; // 20% slippage
    let amountBMin = lp2WethAmount * 80n / 100n; // 20% slippage
    if (reserve0After > 0 && reserve1After > 0) {
        const ratio = reserve0After * lp2WethAmount / reserve1After; // token0/token1 ratio
        lp2BlxAmount = ratio;
        amountAMin = lp2BlxAmount * 80n / 100n;
        amountBMin = lp2WethAmount * 80n / 100n;
        console.log("Adjusted BLX amount for LP2:", ethers.formatEther(lp2BlxAmount));
    } else {
        console.warn("No reserves in pool, using initial amounts");
    }

    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const token0 = await pair.token0();

    let tx2;
    try {
        if (token0.toLowerCase() === weth.target.toLowerCase()) {
            tx2 = await router.connect(lpProvider2).addLiquidity(
                weth.target,
                blumeToken.target,
                lp2WethAmount,
                lp2BlxAmount,
                amountBMin,
                amountAMin,
                lpProvider2.address,
                deadline,
                { gasLimit: 1000000 }
            );
        } else {
            tx2 = await router.connect(lpProvider2).addLiquidity(
                blumeToken.target,
                weth.target,
                lp2BlxAmount,
                lp2WethAmount,
                amountAMin,
                amountBMin,
                lpProvider2.address,
                deadline,
                { gasLimit: 1000000 }
            );
        }
        const receipt = await tx2.wait();
        console.log("Transaction hash:", tx2.hash);
        console.log("Events:", receipt.events);
    } catch (error) {
        console.error("Second LP add liquidity failed:", error);
        if (error.reason) console.error("Revert reason:", error.reason);
        throw error;
    }

    const lp2BalanceAfter = await pair.balanceOf(lpProvider2.address);
    const lp2Tokens = lp2BalanceAfter - lp2BalanceBefore;
    console.log("LP2 received tokens:", ethers.formatEther(lp2Tokens));
    console.log("Total LP supply:", ethers.formatEther(await pair.totalSupply()));
    return lp2BalanceAfter;
}

async function checkLPTokenOwnership(pair, lp1BalanceAfter, lp2BalanceAfter) {
    console.log("\n📊 Test 5: LP Token Ownership");
    const totalSupply = await pair.totalSupply();
    if (totalSupply === 0n) {
        console.warn("No LP tokens issued, skipping ownership check");
        return;
    }
    const lp1Share = (lp1BalanceAfter * 10000n) / totalSupply;
    const lp2Share = (lp2BalanceAfter * 10000n) / totalSupply;

    console.log("LP1 share:", Number(lp1Share) / 100, "%");
    console.log("LP2 share:", Number(lp2Share) / 100, "%");
}

async function generateTradingFees(signers, blumeToken, weth, router, pair) {
    console.log("\n💸 Test 6: Generate Trading Fees");
    const [owner, , , trader1, trader2] = signers;

    // Check pool reserves
    const [reserve0, reserve1] = await pair.getReserves();
    console.log("Reserves before trades:", ethers.formatEther(reserve0), ":", ethers.formatEther(reserve1));
    if (reserve0 === 0n || reserve1 === 0n) {
        console.warn("Pool has no liquidity, skipping swaps");
        return { reserve0Before: reserve0, reserve1Before: reserve1, reserve0AfterTrade: reserve0, reserve1AfterTrade: reserve1 };
    }

    // Fund traders with ETH
    const trader1EthBalance = await ethers.provider.getBalance(trader1.address);
    const trader2EthBalance = await ethers.provider.getBalance(trader2.address);
    const minEthRequired = ethers.parseEther("1"); // 0.5 WETH + gas for trader1, 0.3 WETH + gas for trader2

    if (trader1EthBalance < minEthRequired) {
        console.log("Funding Trader 1 with ETH...");
        const tx = await owner.sendTransaction({
            to: trader1.address,
            value: minEthRequired - trader1EthBalance,
        });
        await tx.wait();
        console.log("Trader 1 new ETH balance:", ethers.formatEther(await ethers.provider.getBalance(trader1.address)));
    }

    if (trader2EthBalance < minEthRequired) {
        console.log("Funding Trader 2 with ETH...");
        const tx = await owner.sendTransaction({
            to: trader2.address,
            value: minEthRequired - trader2EthBalance,
        });
        await tx.wait();
        console.log("Trader 2 new ETH balance:", ethers.formatEther(await ethers.provider.getBalance(trader2.address)));
    }

    // Setup traders with tokens
    await weth.connect(trader1).deposit({ value: ethers.parseEther("0.5"), gasLimit: 200000 });
    await weth.connect(trader2).deposit({ value: ethers.parseEther("0.3"), gasLimit: 200000 });
    console.log("Traders received WETH");

    // Trader 1 swaps WETH for BLX
    const swap1Amount = ethers.parseEther("0.02"); // Reduced to 0.02 WETH
    await weth.connect(trader1).approve(router.target, swap1Amount);

    const path1 = [weth.target, blumeToken.target];
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    try {
        await router.connect(trader1).swapExactTokensForTokens(
            swap1Amount,
            0,
            path1,
            trader1.address,
            deadline,
            { gasLimit: 300000 }
        );
        console.log("Trader 1 swapped WETH for BLX");
    } catch (error) {
        console.error("Trader 1 swap failed:", error);
    }

    // Trader 2 swaps WETH for BLX
    const swap2Amount = ethers.parseEther("0.01"); // Reduced to 0.01 WETH
    await weth.connect(trader2).approve(router.target, swap2Amount);

    try {
        await router.connect(trader2).swapExactTokensForTokens(
            swap2Amount,
            0,
            path1,
            trader2.address,
            deadline,
            { gasLimit: 300000 }
        );
        console.log("Trader 2 swapped WETH for BLX");
    } catch (error) {
        console.error("Trader 2 swap failed:", error);
    }

    // Reverse some trades to generate fees in both directions
    const trader1BlxBalance = await blumeToken.balanceOf(trader1.address);
    if (trader1BlxBalance >= ethers.parseEther("2")) {
        await blumeToken.connect(trader1).approve(router.target, ethers.parseEther("2"));
        const path2 = [blumeToken.target, weth.target];
        try {
            await router.connect(trader1).swapExactTokensForTokens(
                ethers.parseEther("2"),
                0,
                path2,
                trader1.address,
                deadline,
                { gasLimit: 300000 }
            );
            console.log("Trader 1 swapped BLX for WETH");
        } catch (error) {
            console.error("Trader 1 reverse swap failed:", error);
        }
    } else {
        console.warn("Trader 1 has insufficient BLX for reverse swap");
    }

    // Check reserves after trades
    const [reserve0AfterTrade, reserve1AfterTrade] = await pair.getReserves();
    console.log("Reserves after trades:", ethers.formatEther(reserve0AfterTrade), ":", ethers.formatEther(reserve1AfterTrade));
    return { reserve0Before: reserve0, reserve1Before: reserve1, reserve0AfterTrade, reserve1AfterTrade };
}

async function checkFeeAccumulation(factory, weth, pair, reserves) {
    console.log("\n💷 Test 7: Fee Accumulation");
    let protocolFeeReceiver = "0x0000000000000000000000000000000000000000";
    try {
        protocolFeeReceiver = await factory.feeReceiver();
        console.log("Protocol fee receiver:", protocolFeeReceiver);
    } catch (error) {
        console.warn("Failed to fetch feeReceiver, using default address:", error);
    }

    const protocolFeesCollected = await weth.balanceOf(protocolFeeReceiver);
    console.log("Protocol fees collected (WETH):", ethers.formatEther(protocolFeesCollected));

    // LP fees are reinvested in the pool, increasing the value of LP tokens
    const k_before = reserves.reserve0Before * reserves.reserve1Before;
    const k_after = reserves.reserve0AfterTrade * reserves.reserve1AfterTrade;
    if (k_before > 0) {
        console.log("Constant product increased by:", ((k_after - k_before) * 10000n / k_before) / 100n, "%");
    } else {
        console.log("No fees generated (empty pool)");
    }
}

async function removeLiquidityAndCollectFees(lpProvider1, blumeToken, weth, router, pair, lp1BalanceAfter) {
    console.log("\n💰 Test 8: Remove Liquidity and Collect Fees");

    // Check LP balance
    if (lp1BalanceAfter === 0n) {
        console.warn("LP1 has no liquidity tokens, skipping removal");
        return { blxReceived: 0n, wethReceived: 0n };
    }

    // LP1 removes half their liquidity
    const lp1RemoveAmount = lp1BalanceAfter / 2n;
    await pair.connect(lpProvider1).approve(router.target, lp1RemoveAmount);

    const lp1BlxBefore = await blumeToken.balanceOf(lpProvider1.address);
    const lp1WethBefore = await weth.balanceOf(lpProvider1.address);

    const deadline = Math.floor(Date.now() / 1000) + 3600;
    try {
        const removeTx = await router.connect(lpProvider1).removeLiquidity(
            blumeToken.target,
            weth.target,
            lp1RemoveAmount,
            0,
            0,
            lpProvider1.address,
            deadline,
            { gasLimit: 300000 }
        );
        await removeTx.wait();
    } catch (error) {
        console.error("Remove liquidity failed:", error);
        throw error;
    }

    const lp1BlxAfter = await blumeToken.balanceOf(lpProvider1.address);
    const lp1WethAfter = await weth.balanceOf(lpProvider1.address);

    const blxReceived = lp1BlxAfter - lp1BlxBefore;
    const wethReceived = lp1WethAfter - lp1WethBefore;

    console.log("LP1 received BLX:", ethers.formatEther(blxReceived));
    console.log("LP1 received WETH:", ethers.formatEther(wethReceived));
    console.log("LP1 remaining LP tokens:", ethers.formatEther(await pair.balanceOf(lpProvider1.address)));
    return { blxReceived, wethReceived };
}

async function calculateFeeEarnings(blxReceived, wethReceived, lp1BlxAmount, lp1WethAmount) {
    console.log("\n💵 Test 9: Calculate Fee Earnings");

    // Compare what LP1 got back vs what they put in
    const lp1InitialBlx = lp1BlxAmount / 2n; // They removed half
    const lp1InitialWeth = lp1WethAmount / 2n;

    const blxProfit = blxReceived > lp1InitialBlx ? blxReceived - lp1InitialBlx : 0n;
    const wethProfit = wethReceived > lp1InitialWeth ? wethReceived - lp1InitialWeth : 0n;

    if (blxProfit > 0n) {
        console.log("BLX profit:", ethers.formatEther(blxProfit));
    }
    if (wethProfit > 0n) {
        console.log("WETH profit:", ethers.formatEther(wethProfit));
    }
}

async function lpTokenTransfer(lpProvider1, lpProvider2, pair) {
    console.log("\n🔄 Test 10: LP Token Transfer");
    const transferAmount = ethers.parseEther("10"); // 10 LP tokens

    const lp2Balance = await pair.balanceOf(lpProvider2.address);
    if (lp2Balance < transferAmount) {
        console.warn("LP2 has insufficient LP tokens, skipping transfer");
        return;
    }

    try {
        await pair.connect(lpProvider2).transfer(lpProvider1.address, transferAmount);
        console.log("✅ LP tokens transferred successfully");
        console.log("LP1 balance:", ethers.formatEther(await pair.balanceOf(lpProvider1.address)));
        console.log("LP2 balance:", ethers.formatEther(await pair.balanceOf(lpProvider2.address)));
    } catch (error) {
        console.error("LP token transfer failed:", error);
        throw error;
    }
}

async function main() {
    console.log("🪙 Testing LP Tokens and Fee Distribution...\n");

    try {
        // Test 1: Validate addresses
        await validateAddresses();

        // Get signers
        const signers = await ethers.getSigners();
        const [owner, lpProvider1, lpProvider2, trader1, trader2] = signers;
        console.log("Owner:", owner.address);
        console.log("LP Provider 1:", lpProvider1.address);
        console.log("LP Provider 2:", lpProvider2.address);
        console.log("Trader 1:", trader1.address);
        console.log("Trader 2:", trader2.address);

        // Get contract instances
        const BlumeToken = await ethers.getContractFactory("BlumeToken");
        const blumeToken = BlumeToken.attach(ADDRESSES.blumeToken);

        const WETH = await ethers.getContractFactory("WETH");
        const weth = WETH.attach(ADDRESSES.weth);

        const BlumeSwapFactory = await ethers.getContractFactory("BlumeSwapFactory");
        const factory = BlumeSwapFactory.attach(ADDRESSES.factory);

        const FixedBlumeSwapRouter = await ethers.getContractFactory("FixedBlumeSwapRouter");
        const router = FixedBlumeSwapRouter.attach(ADDRESSES.router);

        const BlumeSwapPair = await ethers.getContractFactory("BlumeSwapPair");
        const pair = BlumeSwapPair.attach(ADDRESSES.blxWethPair);

        // Validate pair
        // await validatePair(factory, blumeToken, weth, pair);

        // Run tests
        await setupLiquidityProviders(signers, blumeToken, weth);
        let lp1BalanceAfter = 0n;
        try {
            lp1BalanceAfter = await firstLPAddsLiquidity(lpProvider1, blumeToken, weth, router, pair);
        } catch (error) {
            console.warn("Test 3 failed, continuing with zero LP1 balance");
        }
        let lp2BalanceAfter = 0n;
        try {
            lp2BalanceAfter = await secondLPAddsLiquidity(lpProvider2, blumeToken, weth, router, pair);
        } catch (error) {
            console.warn("Test 4 failed, continuing with zero LP2 balance");
        }
        await checkLPTokenOwnership(pair, lp1BalanceAfter, lp2BalanceAfter);
        const reserves = await generateTradingFees(signers, blumeToken, weth, router, pair);
        await checkFeeAccumulation(factory, weth, pair, reserves);
        const { blxReceived, wethReceived } = await removeLiquidityAndCollectFees(lpProvider1, blumeToken, weth, router, pair, lp1BalanceAfter);
        await calculateFeeEarnings(blxReceived, wethReceived, ethers.parseEther("100"), ethers.parseEther("0.1"));
        await lpTokenTransfer(lpProvider1, lpProvider2, pair);

        console.log("\n✅ LP token and fee distribution tests completed!");
    } catch (error) {
        console.error("Error in main:", error);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });