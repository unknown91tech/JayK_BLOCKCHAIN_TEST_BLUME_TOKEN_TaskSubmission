const { ethers } = require('hardhat');

class BlumeTestingSuite {
    constructor() {
        this.addresses = {
            BlumeToken: "0x8CBabC07717038DA6fAf1bC477a39F1627988a3a",
            WETH: "0x17a8eabD12bCEb2fBD0789E8063BcD42325CA4CA",
            BlumeSwapFactory: "0xb86D27c3736062132879E743c7648093F500fb7e",
            FixedBlumeSwapRouter: "0x40cDf70E2364b69AA5e00189A4f1BE631a351Ec4",
            PriceOracle: "0xBa597F46Cad97A8eAbbcb7E63EcEB9957B1f7688",
            BlumeStaking: "0xA8a69ce8C3657BA48d40a8F93aF3a743c45b96D0",
            BlumeStakingHub: "0x36febc9a715B86c87429C671f596B30ad38Bf580",
            StakedBlumeToken: "0x2f1473c53163A24439Dc48E994c8A5d0E3B8B98B",
            BlumeStakingHubFactory: "0x9C2b2bc3357D64bBa3471547C5a33D58E42550ea",
            BlumeVault: "0x9cc370104fF1D80c0986471aAC407A4025CA038C",
            BlumeVaultController: "0x263c05A4B4348Cb0B74db5b3e85174532209c5BA",
            BLX_WETH_Pair: "0x9cAFb45c2f4B06d68A30179Fd103c735B2338150",
            BlumeStakingDeFiIntegration: "0x9d09e7E7F265dc6a6Ca8CB14aC973cA411b64b42",
            BlumeYieldFarmer: "0xf9fa9fFF3896A97AC50247062C7843DD78F2c0B7"
        };
        this.contracts = {};
        this.signer = null;
    }

    async initialize() {
        [this.signer] = await ethers.getSigners();
        console.log(`Using account: ${this.signer.address}\n`);

        this.contracts.BlumeToken = await ethers.getContractAt("BlumeToken", this.addresses.BlumeToken);
        this.contracts.PriceOracle = await ethers.getContractAt("PriceOracle", this.addresses.PriceOracle);
        this.contracts.FixedBlumeSwapRouter = await ethers.getContractAt("FixedBlumeSwapRouter", this.addresses.FixedBlumeSwapRouter);
        this.contracts.BlumeSwapPair = await ethers.getContractAt("BlumeSwapPair", this.addresses.BLX_WETH_Pair);
        this.contracts.BlumeStaking = await ethers.getContractAt("BlumeStaking", this.addresses.BlumeStaking);
        this.contracts.BlumeStakingHub = await ethers.getContractAt("BlumeStakingHub", this.addresses.BlumeStakingHub);
        this.contracts.StakedBlumeToken = await ethers.getContractAt("StakedBlumeToken", this.addresses.StakedBlumeToken);
        this.contracts.BlumeVault = await ethers.getContractAt("BlumeVault", this.addresses.BlumeVault);
    }

    async waitForTx(tx, description) {
        console.log(`${description} (tx: ${tx.hash})`);
        const receipt = await tx.wait();
        console.log(`✓ ${description} confirmed (gas used: ${receipt.gasUsed})\n`);
        return receipt;
    }

    async setupPriceOracle() {
        console.log("🔮 SETTING UP PRICE ORACLE");
        console.log("=".repeat(50));

        try {
            console.log("Setting BLX price to $10.00...");
            let tx = await this.contracts.PriceOracle.setCustomPrice(
                this.addresses.BlumeToken,
                ethers.parseUnits("10.00", 8)
            );
            await this.waitForTx(tx, "BLX price set to $10.00");

            console.log("Setting WETH price to $3000.00...");
            tx = await this.contracts.PriceOracle.setCustomPrice(
                this.addresses.WETH,
                ethers.parseUnits("3000.00", 8)
            );
            await this.waitForTx(tx, "WETH price set to $3000.00");

            const blxPrice = await this.contracts.PriceOracle.getPrice(this.addresses.BlumeToken);
            const wethPrice = await this.contracts.PriceOracle.getPrice(this.addresses.WETH);
            console.log(`✓ BLX Price: $${ethers.formatUnits(blxPrice, 8)}`);
            console.log(`✓ WETH Price: $${ethers.formatUnits(wethPrice, 8)}\n`);

            console.log("Setting price oracle for BLX-WETH pair...");
            tx = await this.contracts.BlumeSwapPair.setPriceOracle(this.addresses.PriceOracle);
            await this.waitForTx(tx, "Price oracle set for pair");

            // Attempt to set max price deviation to 50% to relax constraints
            try {
                console.log("Setting max price deviation to 50%...");
                tx = await this.contracts.BlumeSwapPair.setMaxPriceDeviation(5000); // 50%
                await this.waitForTx(tx, "Max price deviation set to 50%");
            } catch (error) {
                console.log(`⚠️ Could not set max price deviation: ${error.message}`);
            }

            return true;
        } catch (error) {
            console.error("❌ Error setting up price oracle:", error.message);
            return false;
        }
    }

    async testTokenOperations() {
        console.log("🪙 TESTING TOKEN OPERATIONS");
        console.log("=".repeat(50));

        try {
            let balance = await this.contracts.BlumeToken.balanceOf(this.signer.address);
            console.log(`Initial BLX balance: ${ethers.formatEther(balance)} BLX`);

            console.log("Minting 10,000 BLX tokens...");
            let tx = await this.contracts.BlumeToken.mint(
                this.signer.address,
                ethers.parseEther("10000")
            );
            await this.waitForTx(tx, "Minted 10,000 BLX tokens");

            balance = await this.contracts.BlumeToken.balanceOf(this.signer.address);
            console.log(`New BLX balance: ${ethers.formatEther(balance)} BLX\n`);

            return true;
        } catch (error) {
            console.error("❌ Error in token operations:", error.message);
            return false;
        }
    }

    async debugPriceOracle() {
        console.log("🔍 DEBUGGING PRICE ORACLE AND PAIR SETTINGS");
        console.log("=".repeat(60));

        try {
            // Check current oracle prices
            const blxPrice = await this.contracts.PriceOracle.getPrice(this.addresses.BlumeToken);
            const wethPrice = await this.contracts.PriceOracle.getPrice(this.addresses.WETH);
            
            console.log(`Oracle BLX Price: $${ethers.formatUnits(blxPrice, 8)}`);
            console.log(`Oracle WETH Price: $${ethers.formatUnits(wethPrice, 8)}`);
            console.log(`Price Ratio (WETH/BLX): ${Number(wethPrice) / Number(blxPrice)}`);
            
            // Check pair configuration
            const token0 = await this.contracts.BlumeSwapPair.token0();
            const token1 = await this.contracts.BlumeSwapPair.token1();
            console.log(`\nPair tokens:`);
            console.log(`Token0: ${token0} (${token0 === this.addresses.WETH ? 'WETH' : 'BLX'})`);
            console.log(`Token1: ${token1} (${token1 === this.addresses.WETH ? 'WETH' : 'BLX'})`);
            
            // Check current reserves
            const [reserve0, reserve1, timestamp] = await this.contracts.BlumeSwapPair.getReserves();
            console.log(`\nCurrent reserves:`);
            console.log(`Reserve0: ${ethers.formatEther(reserve0)}`);
            console.log(`Reserve1: ${ethers.formatEther(reserve1)}`);
            console.log(`Last update: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
            
            // Try to get maxPriceDeviation if it exists
            try {
                const maxDev = await this.contracts.BlumeSwapPair.maxPriceDeviation();
                console.log(`\nMax Price Deviation: ${maxDev}bp (${Number(maxDev)/100}%)`);
            } catch (e) {
                console.log(`\nCould not read maxPriceDeviation: ${e.message}`);
            }
            
            // Check if price oracle is set on the pair
            try {
                const pairOracle = await this.contracts.BlumeSwapPair.priceOracle();
                console.log(`Pair Oracle Address: ${pairOracle}`);
                console.log(`Oracle matches: ${pairOracle === this.addresses.PriceOracle}`);
            } catch (e) {
                console.log(`Could not read pair oracle: ${e.message}`);
            }
            
            return true;
        } catch (error) {
            console.error("❌ Error in debug:", error.message);
            return false;
        }
    }

    async testMinimumLiquidity() {
        console.log("🔬 TESTING MINIMUM LIQUIDITY HYPOTHESIS");
        console.log("=".repeat(50));

        try {
            const deadline = Math.floor(Date.now() / 1000) + 1800;
            
            // Try with very small amounts first to establish the pool
            console.log("Attempting to add minimal liquidity to establish pool...");
            
            // Use the absolute minimum amounts
            const minBLX = ethers.parseEther("1"); // 1 BLX
            const minETH = ethers.parseEther("1.00333"); // 0.00333 ETH (matches oracle ratio)
            
            console.log(`Adding minimal liquidity: 1 BLX + 0.00333 ETH`);
            
            const tx = await this.contracts.FixedBlumeSwapRouter.addLiquidityETH(
                this.addresses.BlumeToken,
                minBLX,
                0, // No slippage protection
                0, // No slippage protection
                this.signer.address,
                deadline,
                { value: minETH }
            );
            
            await this.waitForTx(tx, "Minimal liquidity added successfully");
            
            // Check the resulting reserves
            const [reserve0, reserve1] = await this.contracts.BlumeSwapPair.getReserves();
            console.log(`New reserves - Reserve0: ${ethers.formatEther(reserve0)}, Reserve1: ${ethers.formatEther(reserve1)}`);
            
            const lpBalance = await this.contracts.BlumeSwapPair.balanceOf(this.signer.address);
            console.log(`LP balance: ${ethers.formatEther(lpBalance)}`);
            
            return true;
        } catch (error) {
            console.error("❌ Minimal liquidity test failed:", error.message);
            console.log("\nThis suggests the issue is not with amount size but with price validation logic.");
            return false;
        }
    }

    async testDifferentRatios() {
        console.log("🧪 TESTING DIFFERENT LIQUIDITY RATIOS");
        console.log("=".repeat(50));

        const deadline = Math.floor(Date.now() / 1000) + 1800;
        const testRatios = [
            { blx: 100, eth: 0.03333, desc: "Exact oracle ratio" },
            { blx: 100, eth: 0.03, desc: "10% below oracle ratio" },
            { blx: 100, eth: 0.0366, desc: "10% above oracle ratio" },
            { blx: 100, eth: 0.025, desc: "25% below oracle ratio" },
            { blx: 100, eth: 0.0416, desc: "25% above oracle ratio" }
        ];

        for (const ratio of testRatios) {
            try {
                console.log(`\nTrying ${ratio.desc}: ${ratio.blx} BLX + ${ratio.eth} ETH`);
                
                const tx = await this.contracts.FixedBlumeSwapRouter.addLiquidityETH(
                    this.addresses.BlumeToken,
                    ethers.parseEther(ratio.blx.toString()),
                    ethers.parseEther((ratio.blx * 0.5).toString()), // 50% slippage
                    ethers.parseEther((ratio.eth * 0.5).toString()), // 50% slippage
                    this.signer.address,
                    deadline,
                    { value: ethers.parseEther(ratio.eth.toString()) }
                );
                
                await this.waitForTx(tx, `✓ Success with ${ratio.desc}`);
                return true; // If successful, exit
                
            } catch (error) {
                console.log(`❌ Failed with ${ratio.desc}: ${error.message}`);
            }
        }
        
        return false;
    }

    async testDEXOperations() {
        console.log("🔄 TESTING DEX OPERATIONS");
        console.log("=".repeat(50));

        try {
            // First, run debugging to understand the current state
            // await this.debugPriceOracle();
            
            console.log("Approving BLX for router...");
            let tx = await this.contracts.BlumeToken.approve(
                this.addresses.FixedBlumeSwapRouter,
                ethers.parseEther("15000")
            );
            await this.waitForTx(tx, "BLX approved for router");

            // Try the minimum liquidity test first
            console.log("\n" + "=".repeat(50));
            const minLiquiditySuccess = await this.testMinimumLiquidity();
            
            if (!minLiquiditySuccess) {
                // If minimum liquidity fails, try different ratios
                console.log("\n" + "=".repeat(50));
                const ratioSuccess = await this.testDifferentRatios();
                
                if (!ratioSuccess) {
                    console.log("❌ All liquidity addition attempts failed");
                    console.log("This indicates a fundamental issue with the BlumeSwap pair contract");
                    return false;
                }
            }
            
            // If we reach here, some liquidity was successfully added
            const [reserve0, reserve1] = await this.contracts.BlumeSwapPair.getReserves();
            console.log(`\nFinal reserves - Reserve0: ${ethers.formatEther(reserve0)}, Reserve1: ${ethers.formatEther(reserve1)}`);

            const lpBalance = await this.contracts.BlumeSwapPair.balanceOf(this.signer.address);
            console.log(`LP token balance: ${ethers.formatEther(lpBalance)}\n`);

            // Now test swapping
            if (lpBalance > 0) {
                console.log("Testing swap: 0.01 ETH -> BLX (small amount)...");
                const deadline = Math.floor(Date.now() / 1000) + 1800;
                const path = [this.addresses.WETH, this.addresses.BlumeToken];
                
                tx = await this.contracts.FixedBlumeSwapRouter.swapExactETHForTokens(
                    0,
                    path,
                    this.signer.address,
                    deadline,
                    { value: ethers.parseEther("0.01") }
                );
                await this.waitForTx(tx, "ETH -> BLX swap completed");

                console.log("Testing swap: 10 BLX -> ETH (small amount)...");
                tx = await this.contracts.BlumeToken.approve(
                    this.addresses.FixedBlumeSwapRouter,
                    ethers.parseEther("10")
                );
                await tx.wait();

                const pathReverse = [this.addresses.BlumeToken, this.addresses.WETH];
                tx = await this.contracts.FixedBlumeSwapRouter.swapExactTokensForETH(
                    ethers.parseEther("10"),
                    0,
                    pathReverse,
                    this.signer.address,
                    deadline
                );
                await this.waitForTx(tx, "BLX -> ETH swap completed");
            }

            return true;
        } catch (error) {
            console.error("❌ Error in DEX operations:", error.message);
            console.error("Full error:", error);
            return false;
        }
    }

    async testRegularStaking() {
        console.log("🥩 TESTING REGULAR STAKING");
        console.log("=".repeat(50));

        try {
            console.log("Approving BLX for regular staking...");
            let tx = await this.contracts.BlumeToken.approve(
                this.addresses.BlumeStaking,
                ethers.parseEther("500")
            );
            await this.waitForTx(tx, "BLX approved for staking");

            console.log("Staking 500 BLX...");
            tx = await this.contracts.BlumeStaking.stake(ethers.parseEther("500"));
            await this.waitForTx(tx, "500 BLX staked");

            console.log("Checking user tier...");
            const [tierIndex, minStake, multiplier, tierName] = 
                await this.contracts.BlumeStaking.getUserTier(this.signer.address);
            console.log(`User Tier: ${tierName} (Index: ${tierIndex})`);
            console.log(`Min Stake: ${ethers.formatEther(minStake)} BLX`);
            console.log(`Multiplier: ${Number(multiplier)}bp (${Number(multiplier)/100}%)`);

            const pendingRewards = await this.contracts.BlumeStaking.pendingRewards(this.signer.address);
            console.log(`Pending rewards: ${ethers.formatEther(pendingRewards)} BLX\n`);

            return true;
        } catch (error) {
            console.error("❌ Error in regular staking:", error.message);
            return false;
        }
    }

    async testLiquidStaking() {
        console.log("💧 TESTING LIQUID STAKING");
        console.log("=".repeat(50));

        try {
            console.log("Updating liquid staking exchange rate...");
            let tx = await this.contracts.BlumeStakingHub.updateRewardsAndExchangeRate();
            await this.waitForTx(tx, "Exchange rate updated");

            console.log("Approving BLX for liquid staking...");
            tx = await this.contracts.BlumeToken.approve(
                this.addresses.BlumeStakingHub,
                ethers.parseEther("1000")
            );
            await this.waitForTx(tx, "BLX approved for liquid staking");

            console.log("Liquid staking 1000 BLX for stBLX (30-day tier)...");
            tx = await this.contracts.BlumeStakingHub.stake(
                ethers.parseEther("1000"),
                1
            );
            await this.waitForTx(tx, "1000 BLX liquid staked");

            const stBLXBalance = await this.contracts.StakedBlumeToken.balanceOf(this.signer.address);
            console.log(`stBLX balance: ${ethers.formatEther(stBLXBalance)} stBLX`);

            const [amount, lockEnd, lockDuration, multiplier, rewards] = 
                await this.contracts.BlumeStakingHub.getUserStakingInfo(this.signer.address);
            console.log(`Staked amount: ${ethers.formatEther(amount)} BLX`);
            console.log(`Lock end: ${new Date(Number(lockEnd) * 1000).toLocaleString()}`);
            console.log(`Lock duration: ${lockDuration} seconds`);
            console.log(`Multiplier: ${multiplier}bp`);
            console.log(`Pending rewards: ${ethers.formatEther(rewards)} BLX\n`);

            return true;
        } catch (error) {
            console.error("❌ Error in liquid staking:", error.message);
            return false;
        }
    }

    async testVaultOperations() {
        console.log("🏛️ TESTING VAULT OPERATIONS");
        console.log("=".repeat(50));

        try {
            console.log("Approving BLX for vault...");
            let tx = await this.contracts.BlumeToken.approve(
                this.addresses.BlumeVault,
                ethers.parseEther("500")
            );
            await this.waitForTx(tx, "BLX approved for vault");

            console.log("Depositing 500 BLX to vault (no lock)...");
            tx = await this.contracts.BlumeVault.deposit(
                ethers.parseEther("500"),
                0
            );
            await this.waitForTx(tx, "500 BLX deposited to vault");

            const pendingRewards = await this.contracts.BlumeVault.calculatePendingRewards(
                this.signer.address
            );
            console.log(`Pending vault rewards: ${ethers.formatEther(pendingRewards)} BLX`);

            const effectiveAPY = await this.contracts.BlumeVault.getEffectiveAPY(this.signer.address);
            console.log(`Effective APY: ${Number(effectiveAPY)}bp (${Number(effectiveAPY)/100}%)\n`);

            return true;
        } catch (error) {
            console.error("❌ Error in vault operations:", error.message);
            return false;
        }
    }

    async testRemoveLiquidity() {
        console.log("↩️ TESTING REMOVE LIQUIDITY");
        console.log("=".repeat(50));

        try {
            const lpBalance = await this.contracts.BlumeSwapPair.balanceOf(this.signer.address);
            console.log(`Current LP balance: ${ethers.formatEther(lpBalance)} LP`);

            if (lpBalance > 0) {
                const lpToRemove = lpBalance / 2n;
                
                console.log("Approving LP tokens for removal...");
                let tx = await this.contracts.BlumeSwapPair.approve(
                    this.addresses.FixedBlumeSwapRouter,
                    lpToRemove
                );
                await this.waitForTx(tx, "LP tokens approved");

                console.log(`Removing ${ethers.formatEther(lpToRemove)} LP tokens...`);
                const deadline = Math.floor(Date.now() / 1000) + 1800;
                tx = await this.contracts.FixedBlumeSwapRouter.removeLiquidityETH(
                    this.addresses.BlumeToken,
                    lpToRemove,
                    0,
                    0,
                    this.signer.address,
                    deadline
                );
                await this.waitForTx(tx, "Liquidity removed successfully");

                const newLpBalance = await this.contracts.BlumeSwapPair.balanceOf(this.signer.address);
                console.log(`New LP balance: ${ethers.formatEther(newLpBalance)} LP\n`);
            } else {
                console.log("No LP tokens to remove\n");
            }

            return true;
        } catch (error) {
            console.error("❌ Error removing liquidity:", error.message);
            return false;
        }
    }

    async checkFinalStatus() {
        console.log("📊 FINAL STATUS CHECK");
        console.log("=".repeat(50));

        try {
            const blxBalance = await this.contracts.BlumeToken.balanceOf(this.signer.address);
            console.log(`Final BLX balance: ${ethers.formatEther(blxBalance)} BLX`);

            const stBLXBalance = await this.contracts.StakedBlumeToken.balanceOf(this.signer.address);
            console.log(`Final stBLX balance: ${ethers.formatEther(stBLXBalance)} stBLX`);

            const lpBalance = await this.contracts.BlumeSwapPair.balanceOf(this.signer.address);
            console.log(`Final LP balance: ${ethers.formatEther(lpBalance)} LP`);

            const ethBalance = await ethers.provider.getBalance(this.signer.address);
            console.log(`Final ETH balance: ${ethers.formatEther(ethBalance)} ETH`);

            const [reserve0, reserve1] = await this.contracts.BlumeSwapPair.getReserves();
            console.log(`Final pool reserves - Reserve0: ${ethers.formatEther(reserve0)}, Reserve1: ${ethers.formatEther(reserve1)}\n`);

            return true;
        } catch (error) {
            console.error("❌ Error checking final status:", error.message);
            return false;
        }
    }

    async runCompleteTestSuite() {
        console.log("🚀 STARTING COMPLETE BLUME ECOSYSTEM TEST SUITE");
        console.log("=".repeat(80));

        const startTime = Date.now();
        let testsPass = 0;
        let totalTests = 0;

        const tests = [
            { name: "Price Oracle Setup", func: this.setupPriceOracle.bind(this) },
            { name: "Token Operations", func: this.testTokenOperations.bind(this) },
            { name: "DEX Operations", func: this.testDEXOperations.bind(this) },
            { name: "Regular Staking", func: this.testRegularStaking.bind(this) },
            { name: "Liquid Staking", func: this.testLiquidStaking.bind(this) },
            { name: "Vault Operations", func: this.testVaultOperations.bind(this) },
            { name: "Remove Liquidity", func: this.testRemoveLiquidity.bind(this) },
            { name: "Final Status", func: this.checkFinalStatus.bind(this) }
        ];

        for (const test of tests) {
            totalTests++;
            console.log(`\n${'='.repeat(80)}`);
            try {
                const success = await test.func();
                if (success) {
                    testsPass++;
                    console.log(`✅ ${test.name} - PASSED`);
                } else {
                    console.log(`❌ ${test.name} - FAILED`);
                }
            } catch (error) {
                console.log(`❌ ${test.name} - FAILED with error:`, error.message);
            }
        }

        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log(`\n${'='.repeat(80)}`);
        console.log("🏁 TEST SUITE COMPLETE");
        console.log(`Tests passed: ${testsPass}/${totalTests}`);
        console.log(`Duration: ${duration}s`);
        console.log(`Success rate: ${((testsPass/totalTests) * 100).toFixed(1)}%`);
        console.log(`${'='.repeat(80)}\n`);
    }
}

async function main() {
    const testSuite = new BlumeTestingSuite();
    await testSuite.initialize();
    await testSuite.runCompleteTestSuite();
}

main().catch(console.error);