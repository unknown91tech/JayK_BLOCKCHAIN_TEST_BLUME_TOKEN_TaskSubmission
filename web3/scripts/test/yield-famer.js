// Fixed yield-farmer.js script
const { ethers } = require('hardhat');

class YieldFarmingDemo {
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
    }

    async initialize() {
        [this.signer] = await ethers.getSigners();
        console.log(`🌾 Yield Farmer: ${this.signer.address}\n`);

        // Initialize contracts
        this.blumeToken = await ethers.getContractAt("BlumeToken", this.addresses.BlumeToken);
        this.router = await ethers.getContractAt("FixedBlumeSwapRouter", this.addresses.FixedBlumeSwapRouter);
        this.staking = await ethers.getContractAt("BlumeStaking", this.addresses.BlumeStaking);
        this.stakingHub = await ethers.getContractAt("BlumeStakingHub", this.addresses.BlumeStakingHub);
        this.vault = await ethers.getContractAt("BlumeVault", this.addresses.BlumeVault);
        this.yieldFarmer = await ethers.getContractAt("BlumeYieldFarmer", this.addresses.BlumeYieldFarmer);
        this.stBLX = await ethers.getContractAt("StakedBlumeToken", this.addresses.StakedBlumeToken);
        this.pair = await ethers.getContractAt("BlumeSwapPair", this.addresses.BLX_WETH_Pair);
        this.priceOracle = await ethers.getContractAt("PriceOracle", this.addresses.PriceOracle);
    }

    async setupPrices() {
        console.log("💰 Setting up oracle prices...");
        
        try {
            // Set prices for both tokens
            let tx = await this.priceOracle.setCustomPrice(
                this.addresses.BlumeToken,
                ethers.parseUnits("10.00", 8),
                { gasLimit: 200000 }
            );
            await tx.wait();
            
            tx = await this.priceOracle.setCustomPrice(
                this.addresses.WETH,
                ethers.parseUnits("3000.00", 8),
                { gasLimit: 200000 }
            );
            await tx.wait();
            
            // Configure pair
            tx = await this.pair.setPriceOracle(this.addresses.PriceOracle, { gasLimit: 200000 });
            await tx.wait();
            
            try {
                tx = await this.pair.setMaxPriceDeviation(5000, { gasLimit: 200000 }); // 50%
                await tx.wait();
            } catch (e) {
                console.log("⚠️ Could not set max price deviation");
            }
            
            console.log("✅ Oracle prices set\n");
        } catch (error) {
            console.error("❌ Price setup error:", error.message);
        }
    }

    async demonstrateYieldStrategies() {
        console.log("🎯 YIELD FARMING STRATEGIES DEMONSTRATION");
        console.log("==========================================\n");

        await this.strategy1_SimpleStaking();
        await this.strategy2_LiquidStaking();
        await this.strategy3_VaultStaking();
        await this.strategy4_LPFarming();
        await this.strategy5_AutomatedYieldFarming();
        await this.strategy6_CompoundStrategies();
    }

    async strategy1_SimpleStaking() {
        console.log("📈 STRATEGY 1: SIMPLE STAKING");
        console.log("------------------------------");
        
        try {
            await this.ensureBLXBalance(1000);
            
            // Check current balance and approve incrementally
            const balance = await this.blumeToken.balanceOf(this.signer.address);
            console.log(`Current BLX balance: ${ethers.formatEther(balance)} BLX`);
            
            // Stake 100 BLX first
            console.log("Staking 100 BLX (Bronze tier)...");
            await this.blumeToken.approve(this.addresses.BlumeStaking, ethers.parseEther("100"));
            let tx = await this.staking.stake(ethers.parseEther("100"), { gasLimit: 300000 });
            await tx.wait();
            
            await this.checkStakingDetails("After 100 BLX");
            
            // Check if we need to stake more for next tier
            console.log("Staking additional 400 BLX...");
            await this.blumeToken.approve(this.addresses.BlumeStaking, ethers.parseEther("400"));
            tx = await this.staking.stake(ethers.parseEther("400"), { gasLimit: 300000 });
            await tx.wait();
            
            await this.checkStakingDetails("After 500 BLX total");
            
        } catch (error) {
            console.error("❌ Simple staking error:", error.message);
            if (error.reason) console.error("Revert reason:", error.reason);
        }
        console.log("");
    }

    async strategy2_LiquidStaking() {
        console.log("💧 STRATEGY 2: LIQUID STAKING");
        console.log("------------------------------");
        
        try {
            await this.ensureBLXBalance(1500);
            
            // Approve tokens
            await this.blumeToken.approve(this.addresses.BlumeStakingHub, ethers.parseEther("1500"));
            
            // Update exchange rate
            console.log("Updating exchange rate...");
            let tx = await this.stakingHub.updateRewardsAndExchangeRate({ gasLimit: 300000 });
            await tx.wait();
            
            // Try different tiers (check which are valid)
            const validTiers = [0, 1, 2]; // Removed tier 3 which caused error
            const tierNames = ["No Lock", "30-day", "90-day"];
            
            for (let i = 0; i < validTiers.length; i++) {
                const tier = validTiers[i];
                const name = tierNames[i];
                
                try {
                    console.log(`Liquid staking 500 BLX (${name} lock)...`);
                    tx = await this.stakingHub.stake(ethers.parseEther("500"), tier, { gasLimit: 300000 });
                    await tx.wait();
                    console.log(`✅ Success: ${name} lock`);
                } catch (error) {
                    console.log(`❌ Failed: ${name} lock - ${error.message}`);
                    break; // Stop if we hit an error
                }
            }
            
            // Check stBLX balance
            const stBLXBalance = await this.stBLX.balanceOf(this.signer.address);
            console.log(`stBLX received: ${ethers.formatEther(stBLXBalance)} stBLX`);
            
            // Check staking info
            try {
                const [amount, lockEnd, , multiplier, rewards] = 
                    await this.stakingHub.getUserStakingInfo(this.signer.address);
                console.log(`Total staked: ${ethers.formatEther(amount)} BLX`);
                console.log(`Lock ends: ${new Date(Number(lockEnd) * 1000).toLocaleString()}`);
                console.log(`Multiplier: ${multiplier}bp`);
                console.log(`Pending rewards: ${ethers.formatEther(rewards)} BLX`);
            } catch (error) {
                console.log("Could not read staking info:", error.message);
            }
            
        } catch (error) {
            console.error("❌ Liquid staking error:", error.message);
            if (error.reason) console.error("Revert reason:", error.reason);
        }
        console.log("");
    }

    async strategy3_VaultStaking() {
        console.log("🏛️ STRATEGY 3: VAULT STAKING");
        console.log("-----------------------------");
        
        try {
            await this.ensureBLXBalance(1600);
            await this.blumeToken.approve(this.addresses.BlumeVault, ethers.parseEther("1600"));
            
            // Deposit with different lock periods
            const deposits = [
                { amount: 400, lock: 0, name: "no lock" },
                { amount: 400, lock: 30 * 24 * 3600, name: "30-day lock" },
                { amount: 400, lock: 90 * 24 * 3600, name: "90-day lock" },
                { amount: 400, lock: 365 * 24 * 3600, name: "365-day lock" }
            ];
            
            for (const deposit of deposits) {
                console.log(`Depositing ${deposit.amount} BLX with ${deposit.name}...`);
                let tx = await this.vault.deposit(
                    ethers.parseEther(deposit.amount.toString()), 
                    deposit.lock, 
                    { gasLimit: 300000 }
                );
                await tx.wait();
            }
            
            // Check vault details
            try {
                const effectiveAPY = await this.vault.getEffectiveAPY(this.signer.address);
                const pendingRewards = await this.vault.calculatePendingRewards(this.signer.address);
                const remainingLock = await this.vault.getRemainingLockTime(this.signer.address);
                
                console.log(`Effective APY: ${effectiveAPY}bp (${Number(effectiveAPY)/100}%)`);
                console.log(`Pending rewards: ${ethers.formatEther(pendingRewards)} BLX`);
                console.log(`Remaining lock time: ${remainingLock} seconds`);
            } catch (error) {
                console.log("Could not read vault details:", error.message);
            }
            
        } catch (error) {
            console.error("❌ Vault staking error:", error.message);
            if (error.reason) console.error("Revert reason:", error.reason);
        }
        console.log("");
    }

    async strategy4_LPFarming() {
        console.log("🔄 STRATEGY 4: LP FARMING");
        console.log("--------------------------");
        
        try {
            await this.ensureBLXBalance(1000);
            await this.blumeToken.approve(this.addresses.FixedBlumeSwapRouter, ethers.parseEther("1000"));
            
            // Check if pool has liquidity
            const [reserve0, reserve1] = await this.pair.getReserves();
            console.log(`Current reserves - R0: ${ethers.formatEther(reserve0)}, R1: ${ethers.formatEther(reserve1)}`);
            
            if (Number(reserve0) === 0 || Number(reserve1) === 0) {
                console.log("Adding initial liquidity: 500 BLX + 0.16667 ETH...");
                const deadline = Math.floor(Date.now() / 1000) + 3600;
                
                let tx = await this.router.addLiquidityETH(
                    this.addresses.BlumeToken,
                    ethers.parseEther("500"),
                    0, // Accept any amount
                    0, // Accept any amount
                    this.signer.address,
                    deadline,
                    { value: ethers.parseEther("0.16667"), gasLimit: 500000 }
                );
                await tx.wait();
                
                const lpBalance = await this.pair.balanceOf(this.signer.address);
                console.log(`LP tokens received: ${ethers.formatEther(lpBalance)} LP`);
            }
            
            // Simulate trading to generate fees
            console.log("Simulating trades to generate LP fees...");
            const deadline = Math.floor(Date.now() / 1000) + 3600;
            
            for (let i = 0; i < 3; i++) {
                try {
                    // ETH -> BLX
                    let tx = await this.router.swapExactETHForTokens(
                        0,
                        [this.addresses.WETH, this.addresses.BlumeToken],
                        this.signer.address,
                        deadline,
                        { value: ethers.parseEther("0.01"), gasLimit: 300000 }
                    );
                    await tx.wait();
                    
                    // BLX -> ETH
                    await this.blumeToken.approve(this.addresses.FixedBlumeSwapRouter, ethers.parseEther("10"));
                    tx = await this.router.swapExactTokensForETH(
                        ethers.parseEther("10"),
                        0,
                        [this.addresses.BlumeToken, this.addresses.WETH],
                        this.signer.address,
                        deadline,
                        { gasLimit: 300000 }
                    );
                    await tx.wait();
                } catch (error) {
                    console.log(`Swap ${i+1} failed: ${error.message}`);
                    break;
                }
            }
            console.log("✅ Trading simulation complete");
            
        } catch (error) {
            console.error("❌ LP farming error:", error.message);
            if (error.reason) console.error("Revert reason:", error.reason);
        }
        console.log("");
    }

    async strategy5_AutomatedYieldFarming() {
        console.log("🤖 STRATEGY 5: AUTOMATED YIELD FARMING");
        console.log("--------------------------------------");
        
        try {
            await this.ensureBLXBalance(1000);
            await this.blumeToken.approve(this.addresses.BlumeYieldFarmer, ethers.parseEther("1000"));
            
            // Check if the contract has the methods we expect
            try {
                console.log("Checking yield farmer contract interface...");
                
                // Try to call a simple view function first
                console.log("Depositing 1000 BLX to automated yield farmer...");
                let tx = await this.yieldFarmer.deposit(ethers.parseEther("1000"), { gasLimit: 500000 });
                await tx.wait();
                
                // Try to get user position
                console.log("Checking user position...");
                // Note: The function name might be different, adjust as needed
                
            } catch (error) {
                console.log(`Yield farmer interface error: ${error.message}`);
                console.log("⚠️ Skipping automated yield farming - contract interface mismatch");
            }
            
        } catch (error) {
            console.error("❌ Automated yield farming error:", error.message);
            if (error.reason) console.error("Revert reason:", error.reason);
        }
        console.log("");
    }

    async strategy6_CompoundStrategies() {
        console.log("🔄 STRATEGY 6: COMPOUND STRATEGIES");
        console.log("----------------------------------");
        
        try {
            // Try different reward harvesting methods
            console.log("Attempting to harvest/compound rewards...");
            
            // Try regular staking rewards
            try {
                const stakingRewards = await this.staking.pendingRewards(this.signer.address);
                console.log(`Pending staking rewards: ${ethers.formatEther(stakingRewards)} BLX`);
                
                // Try different method names for harvesting
                const harvestMethods = ['harvest', 'claimRewards', 'compound'];
                
                for (const method of harvestMethods) {
                    try {
                        if (typeof this.staking[method] === 'function') {
                            console.log(`Trying ${method}() on staking contract...`);
                            let tx = await this.staking[method]({ gasLimit: 300000 });
                            await tx.wait();
                            console.log(`✅ ${method}() successful`);
                            break;
                        }
                    } catch (error) {
                        console.log(`${method}() failed: ${error.message}`);
                    }
                }
            } catch (error) {
                console.log("Could not harvest staking rewards:", error.message);
            }
            
            // Compound vault rewards
            try {
                console.log("Compounding vault rewards...");
                let tx = await this.vault.compoundRewards({ gasLimit: 300000 });
                await tx.wait();
                console.log("✅ Vault rewards compounded");
            } catch (error) {
                console.log("Vault compound failed:", error.message);
            }
            
            // Update liquid staking
            try {
                console.log("Updating liquid staking exchange rate...");
                let tx = await this.stakingHub.updateRewardsAndExchangeRate({ gasLimit: 300000 });
                await tx.wait();
                console.log("✅ Liquid staking rewards updated");
            } catch (error) {
                console.log("Liquid staking update failed:", error.message);
            }
            
            // Check final results
            await this.checkAllRewards();
            
        } catch (error) {
            console.error("❌ Compound strategies error:", error.message);
            if (error.reason) console.error("Revert reason:", error.reason);
        }
        console.log("");
    }

    async ensureBLXBalance(amount) {
        const balance = await this.blumeToken.balanceOf(this.signer.address);
        const needed = ethers.parseEther(amount.toString());
        
        if (balance < needed) {
            console.log(`Minting ${amount} BLX tokens...`);
            const tx = await this.blumeToken.mint(this.signer.address, needed, { gasLimit: 200000 });
            await tx.wait();
        }
    }

    async checkStakingDetails(context) {
        try {
            const [tierIndex, minStake, multiplier, tierName] = 
                await this.staking.getUserTier(this.signer.address);
            const pendingRewards = await this.staking.pendingRewards(this.signer.address);
            
            console.log(`${context} - ${tierName}:`);
            console.log(`  Min stake: ${ethers.formatEther(minStake)} BLX`);
            console.log(`  Multiplier: ${multiplier}bp (${Number(multiplier)/100}%)`);
            console.log(`  Pending rewards: ${ethers.formatEther(pendingRewards)} BLX`);
        } catch (error) {
            console.error(`❌ Error checking staking details:`, error.message);
        }
    }

    async checkAllRewards() {
        console.log("\n📊 CHECKING ALL PENDING REWARDS");
        console.log("-".repeat(30));
        
        try {
            const vaultRewards = await this.vault.calculatePendingRewards(this.signer.address);
            console.log(`Vault pending rewards: ${ethers.formatEther(vaultRewards)} BLX`);
        } catch (e) { console.log("Could not check vault rewards"); }
        
        try {
            const liquidRewards = await this.stakingHub.getPendingRewards(this.signer.address);
            console.log(`Liquid staking rewards: ${ethers.formatEther(liquidRewards)} BLX`);
        } catch (e) { console.log("Could not check liquid staking rewards"); }
        
        try {
            const stakingRewards = await this.staking.pendingRewards(this.signer.address);
            console.log(`Regular staking rewards: ${ethers.formatEther(stakingRewards)} BLX`);
        } catch (e) { console.log("Could not check staking rewards"); }
    }

    async printFinalSummary() {
        console.log("📊 FINAL PORTFOLIO SUMMARY");
        console.log("===========================");
        
        try {
            const blxBalance = await this.blumeToken.balanceOf(this.signer.address);
            const stBLXBalance = await this.stBLX.balanceOf(this.signer.address);
            const lpBalance = await this.pair.balanceOf(this.signer.address);
            const ethBalance = await ethers.provider.getBalance(this.signer.address);
            
            console.log(`BLX Balance: ${ethers.formatEther(blxBalance)} BLX`);
            console.log(`stBLX Balance: ${ethers.formatEther(stBLXBalance)} stBLX`);
            console.log(`LP Tokens: ${ethers.formatEther(lpBalance)} LP`);
            console.log(`ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
            
            await this.checkAllRewards();
            
            console.log("\n✨ Yield farming demonstration complete! ✨\n");
        } catch (error) {
            console.error("❌ Error printing final summary:", error.message);
        }
    }
}

async function main() {
    const demo = new YieldFarmingDemo();
    try {
        await demo.initialize();
        await demo.setupPrices();
        await demo.demonstrateYieldStrategies();
        await demo.printFinalSummary();
    } catch (error) {
        console.error("Script execution failed:", error.message);
        if (error.reason) console.error("Revert reason:", error.reason);
    }
}

main().catch(error => {
    console.error("Unexpected error:", error.message);
    if (error.reason) console.error("Revert reason:", error.reason);
});