const { ethers } = require('hardhat');

// Contract addresses from deployment
const addresses = {
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

// ABIs for the contracts
const abis = {
    BlumeToken: [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function mint(address to, uint256 amount)",
        "function burn(uint256 amount)",
        "function setExcludedFromLimits(address account, bool excluded)",
        "function totalSupply() view returns (uint256)",
        "function maxTransactionAmount() view returns (uint256)",
        "function maxWalletBalance() view returns (uint256)",
        "function cooldownTime() view returns (uint256)",
        "function isExcludedFromLimits(address) view returns (bool)",
        "function setMaxTransactionAmount(uint256 amount)",
        "function setMaxWalletBalance(uint256 amount)",
        "function setCooldownTime(uint256 time)",
        "function pause()",
        "function unpause()",
        "function paused() view returns (bool)",
        "function grantRole(bytes32 role, address account)",
        "function revokeRole(bytes32 role, address account)",
        "function hasRole(bytes32 role, address account) view returns (bool)",
        "function getRoleAdmin(bytes32 role) view returns (bytes32)",
        "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
    ],
    BlumeSwapRouter: [
        "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
        "function removeLiquidityETH(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) returns (uint256 amountToken, uint256 amountETH)",
        "function swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline) payable returns (uint256[] amounts)",
        "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) returns (uint256[] amounts)"
    ],
    BlumeStaking: [
        "function stake(uint256 amount)",
        "function unstake(uint256 amount)",
        "function claimReward()",
        "function claimRewards()",
        "function pendingRewards(address account) view returns (uint256)",
        "function getUserTier(address account) view returns (uint256, uint256, uint256, string)",
        "function harvest()",
        "function compound()"
    ],
    BlumeStakingHub: [
        "function stake(uint256 amount, uint256 tierIndex)",
        "function unstake(uint256 stBLXAmount)",
        "function claimRewards()",
        "function getPendingRewards(address user) view returns (uint256)",
        "function getUserStakingInfo(address user) view returns (uint256, uint256, uint256, uint256, uint256)",
        "function updateRewardsAndExchangeRate()"
    ],
    BlumeVault: [
        "function deposit(uint256 amount, uint256 lockPeriod)",
        "function withdraw(uint256 amount)",
        "function compoundRewards()",
        "function calculatePendingRewards(address user) view returns (uint256)",
        "function getEffectiveAPY(address user) view returns (uint256)",
        "function getRemainingLockTime(address user) view returns (uint256)"
    ],
    PriceOracle: [
        "function getPrice(address token) view returns (uint256)",
        "function setPriceFeed(address token, address priceFeed)",
        "function setCustomPrice(address token, uint256 price)"
    ],
    BlumeSwapPair: [
        "function getReserves() view returns (uint256, uint256, uint32)",
        "function balanceOf(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function setPriceOracle(address _priceOracle)",
        "function setMaxPriceDeviation(uint256 _maxDeviation)",
        "function approve(address, uint256) returns (bool)",
        "function token0() view returns (address)",
        "function token1() view returns (address)",
        "function priceOracle() view returns (address)",
        "function maxPriceDeviation() view returns (uint256)"
    ],
    BlumeSwapFactory: [
        "function getPair(address tokenA, address tokenB) view returns (address)",
        "function createPair(address tokenA, address tokenB) returns (address)",
        "function allPairs(uint256) view returns (address)",
        "function allPairsLength() view returns (uint256)",
        "function protocolFeeBPS() view returns (uint256)",
        "function feeReceiver() view returns (address)",
        "function setProtocolFeeBPS(uint256 newFeeBPS)",
        "function setFeeReceiver(address newFeeReceiver)",
        "function grantRole(bytes32 role, address account)"
    ],
    WETH: [
        "function deposit() payable",
        "function withdraw(uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function approve(address, uint256) returns (bool)"
    ],
    StakedBlumeToken: [
        "function balanceOf(address) view returns (uint256)",
        "function totalSupply() view returns (uint256)"
    ],
    BlumeYieldFarmer: [
        "function deposit(uint256 amount)",
        "function withdraw(uint256 amount)",
        "function harvest()",
        "function compound()",
        "function getUserPosition(address user) view returns (uint256, uint256, uint256)"
    ]
};

// Role constants (from role-management test)
const ROLES = {
    DEFAULT_ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000",
    ADMIN_ROLE: "0x0000000000000000000000000000000000000000000000000000000000000000", // Same as DEFAULT_ADMIN_ROLE
    MINTER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")),
    PAUSER_ROLE: ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"))
};

class BlumeEcosystemInteraction {
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.contracts = {};
        this.initializeContracts();
    }

    async initializeContracts() {
        // Initialize contract instances using ethers.getContractAt for better compatibility
        this.contracts.BlumeToken = await ethers.getContractAt("BlumeToken", addresses.BlumeToken);
        this.contracts.PriceOracle = await ethers.getContractAt("PriceOracle", addresses.PriceOracle);
        this.contracts.FixedBlumeSwapRouter = await ethers.getContractAt("FixedBlumeSwapRouter", addresses.FixedBlumeSwapRouter);
        this.contracts.BlumeSwapPair = await ethers.getContractAt("BlumeSwapPair", addresses.BLX_WETH_Pair);
        this.contracts.BlumeStaking = await ethers.getContractAt("BlumeStaking", addresses.BlumeStaking);
        this.contracts.BlumeStakingHub = await ethers.getContractAt("BlumeStakingHub", addresses.BlumeStakingHub);
        this.contracts.StakedBlumeToken = await ethers.getContractAt("StakedBlumeToken", addresses.StakedBlumeToken);
        this.contracts.BlumeVault = await ethers.getContractAt("BlumeVault", addresses.BlumeVault);
        this.contracts.BlumeSwapFactory = await ethers.getContractAt("BlumeSwapFactory", addresses.BlumeSwapFactory);
        this.contracts.BlumeYieldFarmer = await ethers.getContractAt("BlumeYieldFarmer", addresses.BlumeYieldFarmer);
        
        // Connect with signer
        Object.keys(this.contracts).forEach(key => {
            this.contracts[key] = this.contracts[key].connect(this.signer);
        });
    }

    // Helper function to get deadline (30 minutes from now)
    getDeadline() {
        return Math.floor(Date.now() / 1000) + 1800;
    }

    // Helper function to wait for transaction with gas tracking
    async waitForTx(tx, description) {
        console.log(`${description} (tx: ${tx.hash})`);
        const receipt = await tx.wait();
        console.log(`✓ ${description} confirmed (gas used: ${receipt.gasUsed})\n`);
        return receipt;
    }

    // ===== PRICE ORACLE SETUP =====
    async setupPriceOracle() {
        console.log("🔮 SETTING UP PRICE ORACLE");
        console.log("=".repeat(50));

        try {
            console.log("Setting BLX price to $10.00...");
            let tx = await this.contracts.PriceOracle.setCustomPrice(
                addresses.BlumeToken,
                ethers.parseUnits("10.00", 8),
                { gasLimit: 200000 }
            );
            await this.waitForTx(tx, "BLX price set to $10.00");

            console.log("Setting WETH price to $3000.00...");
            tx = await this.contracts.PriceOracle.setCustomPrice(
                addresses.WETH,
                ethers.parseUnits("3000.00", 8),
                { gasLimit: 200000 }
            );
            await this.waitForTx(tx, "WETH price set to $3000.00");

            // Verify prices
            await this.checkTokenPrice(addresses.BlumeToken, "BLX");
            await this.checkTokenPrice(addresses.WETH, "WETH");

            console.log("Setting price oracle for BLX-WETH pair...");
            tx = await this.contracts.BlumeSwapPair.setPriceOracle(addresses.PriceOracle, { gasLimit: 200000 });
            await this.waitForTx(tx, "Price oracle set for pair");

            // Set max price deviation to 50% to relax constraints
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

    async checkTokenPrice(tokenAddress, tokenName = "Token") {
        try {
            const price = await this.contracts.PriceOracle.getPrice(tokenAddress);
            console.log(`${tokenName} price: $${ethers.formatUnits(price, 8)}`);
            return price;
        } catch (error) {
            console.log(`Error getting ${tokenName} price: ${error.message}`);
            return null;
        }
    }

    // ===== TOKEN OPERATIONS =====
    async checkBLXBalance(address) {
        const balance = await this.contracts.BlumeToken.balanceOf(address);
        console.log(`BLX Balance: ${ethers.formatEther(balance)} BLX`);
        return balance;
    }

    async mintBLX(amount) {
        console.log(`Minting ${amount} BLX tokens...`);
        const tx = await this.contracts.BlumeToken.mint(
            await this.signer.getAddress(),
            ethers.parseEther(amount.toString()),
            { gasLimit: 200000 }
        );
        await this.waitForTx(tx, `Minted ${amount} BLX tokens`);
    }

    async approveBLX(spender, amount) {
        console.log(`Approving ${amount} BLX for ${spender}...`);
        const tx = await this.contracts.BlumeToken.approve(
            spender,
            ethers.parseEther(amount.toString()),
            { gasLimit: 100000 }
        );
        await this.waitForTx(tx, `Approved ${amount} BLX`);
    }

    async getTokenInfo() {
        console.log("📋 Token Information:");
        console.log("Name:", await this.contracts.BlumeToken.name());
        console.log("Symbol:", await this.contracts.BlumeToken.symbol());
        console.log("Decimals:", await this.contracts.BlumeToken.decimals());
        console.log("Total Supply:", ethers.formatEther(await this.contracts.BlumeToken.totalSupply()), "BLX");
        console.log("Max TX Amount:", ethers.formatEther(await this.contracts.BlumeToken.maxTransactionAmount()), "BLX");
        console.log("Max Wallet Balance:", ethers.formatEther(await this.contracts.BlumeToken.maxWalletBalance()), "BLX");
        console.log("Cooldown Time:", (await this.contracts.BlumeToken.cooldownTime()).toString(), "seconds");
    }

    // ===== DEX OPERATIONS =====
    async debugPairInfo() {
        console.log("🔍 Pair Information:");
        const token0 = await this.contracts.BlumeSwapPair.token0();
        const token1 = await this.contracts.BlumeSwapPair.token1();
        console.log(`Token0: ${token0} (${token0 === addresses.WETH ? 'WETH' : 'BLX'})`);
        console.log(`Token1: ${token1} (${token1 === addresses.WETH ? 'WETH' : 'BLX'})`);
        
        try {
            const pairOracle = await this.contracts.BlumeSwapPair.priceOracle();
            console.log(`Pair Oracle: ${pairOracle}`);
            console.log(`Oracle matches: ${pairOracle === addresses.PriceOracle}`);
        } catch (e) {
            console.log(`Could not read pair oracle: ${e.message}`);
        }
    }

    async addLiquidity(blxAmount, ethAmount) {
        console.log(`Adding liquidity: ${blxAmount} BLX + ${ethAmount} ETH...`);
        
        // Ensure we have enough BLX
        const userAddress = await this.signer.getAddress();
        const blxBalance = await this.contracts.BlumeToken.balanceOf(userAddress);
        if (blxBalance < ethers.parseEther(blxAmount.toString())) {
            console.log("Insufficient BLX balance, minting more...");
            await this.mintBLX(blxAmount * 2);
        }
        
        // Approve BLX
        await this.approveBLX(addresses.FixedBlumeSwapRouter, blxAmount * 2);
        
        const deadline = this.getDeadline();
        
        // Try with minimal slippage first
        try {
            const tx = await this.contracts.FixedBlumeSwapRouter.addLiquidityETH(
                addresses.BlumeToken,
                ethers.parseEther(blxAmount.toString()),
                0, // Accept any amount to avoid price validation issues
                0, // Accept any amount
                userAddress,
                deadline,
                { value: ethers.parseEther(ethAmount.toString()), gasLimit: 500000 }
            );
            await this.waitForTx(tx, `Added liquidity: ${blxAmount} BLX + ${ethAmount} ETH`);
            return true;
        } catch (error) {
            console.error("❌ Liquidity addition failed:", error.message);
            
            // Try with smaller amounts if failed
            const smallerBLX = blxAmount / 10;
            const smallerETH = ethAmount / 10;
            console.log(`Trying with smaller amounts: ${smallerBLX} BLX + ${smallerETH} ETH...`);
            
            try {
                const tx = await this.contracts.FixedBlumeSwapRouter.addLiquidityETH(
                    addresses.BlumeToken,
                    ethers.parseEther(smallerBLX.toString()),
                    0,
                    0,
                    userAddress,
                    deadline,
                    { value: ethers.parseEther(smallerETH.toString()), gasLimit: 500000 }
                );
                await this.waitForTx(tx, `Added smaller liquidity: ${smallerBLX} BLX + ${smallerETH} ETH`);
                return true;
            } catch (secondError) {
                console.error("❌ Even smaller liquidity addition failed:", secondError.message);
                return false;
            }
        }
    }

    async removeLiquidity(lpAmount) {
        console.log(`Removing ${lpAmount} LP tokens...`);
        
        const userAddress = await this.signer.getAddress();
        const lpBalance = await this.contracts.BlumeSwapPair.balanceOf(userAddress);
        console.log(`Current LP balance: ${ethers.formatEther(lpBalance)}`);
        
        if (lpBalance < ethers.parseEther(lpAmount.toString())) {
            console.log("Insufficient LP balance");
            return false;
        }
        
        // Approve LP tokens
        const tx1 = await this.contracts.BlumeSwapPair.approve(
            addresses.FixedBlumeSwapRouter, 
            ethers.parseEther(lpAmount.toString()),
            { gasLimit: 100000 }
        );
        await tx1.wait();
        
        const tx = await this.contracts.FixedBlumeSwapRouter.removeLiquidityETH(
            addresses.BlumeToken,
            ethers.parseEther(lpAmount.toString()),
            0, // Min BLX amount
            0, // Min ETH amount
            userAddress,
            this.getDeadline(),
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Removed ${lpAmount} LP tokens`);
        return true;
    }

    async swapETHforBLX(ethAmount, minBLX = 0) {
        console.log(`Swapping ${ethAmount} ETH for at least ${minBLX} BLX...`);
        
        const path = [addresses.WETH, addresses.BlumeToken];
        const tx = await this.contracts.FixedBlumeSwapRouter.swapExactETHForTokens(
            ethers.parseEther(minBLX.toString()),
            path,
            await this.signer.getAddress(),
            this.getDeadline(),
            { value: ethers.parseEther(ethAmount.toString()), gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Swapped ${ethAmount} ETH for BLX`);
    }

    async swapBLXforETH(blxAmount, minETH = 0) {
        console.log(`Swapping ${blxAmount} BLX for at least ${minETH} ETH...`);
        
        await this.approveBLX(addresses.FixedBlumeSwapRouter, blxAmount);
        
        const path = [addresses.BlumeToken, addresses.WETH];
        const tx = await this.contracts.FixedBlumeSwapRouter.swapExactTokensForETH(
            ethers.parseEther(blxAmount.toString()),
            ethers.parseEther(minETH.toString()),
            path,
            await this.signer.getAddress(),
            this.getDeadline(),
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Swapped ${blxAmount} BLX for ETH`);
    }

    async checkPoolReserves() {
        const [reserve0, reserve1] = await this.contracts.BlumeSwapPair.getReserves();
        console.log(`Pool Reserves:`);
        console.log(`  Reserve0: ${ethers.formatEther(reserve0)}`);
        console.log(`  Reserve1: ${ethers.formatEther(reserve1)}`);
        
        // Check which token is which
        const token0 = await this.contracts.BlumeSwapPair.token0();
        const token1 = await this.contracts.BlumeSwapPair.token1();
        
        if (token0.toLowerCase() === addresses.BlumeToken.toLowerCase()) {
            console.log(`  BLX: ${ethers.formatEther(reserve0)}`);
            console.log(`  WETH: ${ethers.formatEther(reserve1)}`);
        } else {
            console.log(`  WETH: ${ethers.formatEther(reserve0)}`);
            console.log(`  BLX: ${ethers.formatEther(reserve1)}`);
        }
        
        return { reserve0, reserve1 };
    }

    async checkLPBalance(address) {
        const balance = await this.contracts.BlumeSwapPair.balanceOf(address);
        console.log(`LP Token Balance: ${ethers.formatEther(balance)}`);
        return balance;
    }

    // ===== STAKING OPERATIONS =====
    async stakeBLX(amount) {
        console.log(`Staking ${amount} BLX in BlumeStaking...`);
        
        await this.approveBLX(addresses.BlumeStaking, amount);
        
        const tx = await this.contracts.BlumeStaking.stake(
            ethers.parseEther(amount.toString()),
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Staked ${amount} BLX`);
    }

    async unstakeBLX(amount) {
        console.log(`Unstaking ${amount} BLX from BlumeStaking...`);
        
        const tx = await this.contracts.BlumeStaking.unstake(
            ethers.parseEther(amount.toString()),
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Unstaked ${amount} BLX`);
    }

    async claimStakingRewards() {
        console.log(`Claiming staking rewards...`);
        
        // Try different methods for claiming rewards
        const claimMethods = ['claimReward', 'claimRewards', 'harvest'];
        
        for (const method of claimMethods) {
            try {
                const tx = await this.contracts.BlumeStaking[method]({ gasLimit: 300000 });
                await this.waitForTx(tx, `Claimed staking rewards via ${method}`);
                return true;
            } catch (error) {
                console.log(`${method} failed: ${error.message}`);
            }
        }
        
        console.log("❌ All claim methods failed");
        return false;
    }

    async checkStakingRewards(address) {
        const rewards = await this.contracts.BlumeStaking.pendingRewards(address);
        console.log(`Pending staking rewards: ${ethers.formatEther(rewards)} BLX`);
        return rewards;
    }

    async checkUserTier(address) {
        const [tierIndex, minStake, multiplier, tierName] = 
            await this.contracts.BlumeStaking.getUserTier(address);
        console.log(`User Tier: ${tierName} (${tierIndex})`);
        console.log(`Min Stake: ${ethers.formatEther(minStake)} BLX`);
        console.log(`Multiplier: ${multiplier}bp (${Number(multiplier)/100}%)`);
        return { tierIndex, minStake, multiplier, tierName };
    }

    // ===== LIQUID STAKING OPERATIONS =====
    async stakeBLXForStBLX(amount, tierIndex) {
        console.log(`Liquid staking ${amount} BLX for stBLX (tier ${tierIndex})...`);
        
        await this.approveBLX(addresses.BlumeStakingHub, amount);
        
        // Update exchange rate first
        try {
            console.log("Updating exchange rate...");
            let tx = await this.contracts.BlumeStakingHub.updateRewardsAndExchangeRate({ gasLimit: 300000 });
            await tx.wait();
        } catch (error) {
            console.log("Could not update exchange rate:", error.message);
        }
        
        const tx = await this.contracts.BlumeStakingHub.stake(
            ethers.parseEther(amount.toString()),
            tierIndex,
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Liquid staked ${amount} BLX`);
    }

    async unstakeStBLX(amount) {
        console.log(`Unstaking ${amount} stBLX...`);
        
        const tx = await this.contracts.BlumeStakingHub.unstake(
            ethers.parseEther(amount.toString()),
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Unstaked ${amount} stBLX`);
    }

    async claimLiquidStakingRewards() {
        console.log(`Claiming liquid staking rewards...`);
        
        const tx = await this.contracts.BlumeStakingHub.claimRewards({ gasLimit: 300000 });
        await this.waitForTx(tx, `Claimed liquid staking rewards`);
    }

    async checkLiquidStakingInfo(address) {
        try {
            const [amount, lockEnd, lockDuration, multiplier, rewards] = 
                await this.contracts.BlumeStakingHub.getUserStakingInfo(address);
            console.log(`Liquid Staking Info:`);
            console.log(`  Staked: ${ethers.formatEther(amount)} BLX`);
            console.log(`  Lock ends: ${new Date(Number(lockEnd) * 1000).toLocaleString()}`);
            console.log(`  Lock duration: ${lockDuration} seconds`);
            console.log(`  Multiplier: ${multiplier}bp`);
            console.log(`  Pending rewards: ${ethers.formatEther(rewards)} BLX`);
            return { amount, lockEnd, lockDuration, multiplier, rewards };
        } catch (error) {
            console.log("Could not read liquid staking info:", error.message);
            return null;
        }
    }

    // ===== VAULT OPERATIONS =====
    async depositToVault(amount, lockPeriod) {
        console.log(`Depositing ${amount} BLX to vault with ${lockPeriod} seconds lock...`);
        
        await this.approveBLX(addresses.BlumeVault, amount);
        
        const tx = await this.contracts.BlumeVault.deposit(
            ethers.parseEther(amount.toString()),
            lockPeriod,
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Deposited ${amount} BLX to vault`);
    }

    async withdrawFromVault(amount) {
        console.log(`Withdrawing ${amount} BLX from vault...`);
        
        const tx = await this.contracts.BlumeVault.withdraw(
            ethers.parseEther(amount.toString()),
            { gasLimit: 300000 }
        );
        await this.waitForTx(tx, `Withdrawn ${amount} BLX from vault`);
    }

    async compoundVaultRewards() {
        console.log(`Compounding vault rewards...`);
        
        const tx = await this.contracts.BlumeVault.compoundRewards({ gasLimit: 300000 });
        await this.waitForTx(tx, `Compounded vault rewards`);
    }

    async checkVaultRewards(address) {
        const rewards = await this.contracts.BlumeVault.calculatePendingRewards(address);
        console.log(`Pending vault rewards: ${ethers.formatEther(rewards)} BLX`);
        return rewards;
    }

    async checkVaultInfo(address) {
        try {
            const effectiveAPY = await this.contracts.BlumeVault.getEffectiveAPY(address);
            const pendingRewards = await this.contracts.BlumeVault.calculatePendingRewards(address);
            const remainingLock = await this.contracts.BlumeVault.getRemainingLockTime(address);
            
            console.log(`Vault Info:`);
            console.log(`  Effective APY: ${effectiveAPY}bp (${Number(effectiveAPY)/100}%)`);
            console.log(`  Pending rewards: ${ethers.formatEther(pendingRewards)} BLX`);
            console.log(`  Remaining lock: ${remainingLock} seconds`);
            return { effectiveAPY, pendingRewards, remainingLock };
        } catch (error) {
            console.log("Could not read vault info:", error.message);
            return null;
        }
    }

    // ===== YIELD FARMING =====
    async depositToYieldFarmer(amount) {
        console.log(`Depositing ${amount} BLX to yield farmer...`);
        
        await this.approveBLX(addresses.BlumeYieldFarmer, amount);
        
        try {
            const tx = await this.contracts.BlumeYieldFarmer.deposit(
                ethers.parseEther(amount.toString()),
                { gasLimit: 500000 }
            );
            await this.waitForTx(tx, `Deposited ${amount} BLX to yield farmer`);
            return true;
        } catch (error) {
            console.log("Yield farmer deposit failed:", error.message);
            return false;
        }
    }

    async withdrawFromYieldFarmer(amount) {
        console.log(`Withdrawing ${amount} BLX from yield farmer...`);
        
        try {
            const tx = await this.contracts.BlumeYieldFarmer.withdraw(
                ethers.parseEther(amount.toString()),
                { gasLimit: 500000 }
            );
            await this.waitForTx(tx, `Withdrawn ${amount} BLX from yield farmer`);
            return true;
        } catch (error) {
            console.log("Yield farmer withdrawal failed:", error.message);
            return false;
        }
    }

    async harvestYieldFarmer() {
        console.log(`Harvesting yield farmer rewards...`);
        
        try {
            const tx = await this.contracts.BlumeYieldFarmer.harvest({ gasLimit: 300000 });
            await this.waitForTx(tx, `Harvested yield farmer rewards`);
            return true;
        } catch (error) {
            console.log("Yield farmer harvest failed:", error.message);
            return false;
        }
    }

    // ===== ROLE MANAGEMENT =====
    async checkRole(roleName, address) {
        const role = ROLES[roleName];
        if (!role) {
            console.log(`Unknown role: ${roleName}`);
            return false;
        }
        const hasRole = await this.contracts.BlumeToken.hasRole(role, address);
        console.log(`${address} has ${roleName}: ${hasRole}`);
        return hasRole;
    }

    async grantRole(roleName, address) {
        const role = ROLES[roleName];
        if (!role) {
            console.log(`Unknown role: ${roleName}`);
            return false;
        }
        
        try {
            console.log(`Granting ${roleName} to ${address}...`);
            const tx = await this.contracts.BlumeToken.grantRole(role, address, { gasLimit: 200000 });
            await this.waitForTx(tx, `Granted ${roleName} to ${address}`);
            return true;
        } catch (error) {
            console.log(`Failed to grant ${roleName}:`, error.message);
            return false;
        }
    }

    async revokeRole(roleName, address) {
        const role = ROLES[roleName];
        if (!role) {
            console.log(`Unknown role: ${roleName}`);
            return false;
        }
        
        try {
            console.log(`Revoking ${roleName} from ${address}...`);
            const tx = await this.contracts.BlumeToken.revokeRole(role, address, { gasLimit: 200000 });
            await this.waitForTx(tx, `Revoked ${roleName} from ${address}`);
            return true;
        } catch (error) {
            console.log(`Failed to revoke ${roleName}:`, error.message);
            return false;
        }
    }

    // ===== PAUSE/UNPAUSE =====
    async pauseContract() {
        console.log("Pausing BlumeToken contract...");
        try {
            const tx = await this.contracts.BlumeToken.pause({ gasLimit: 200000 });
            await this.waitForTx(tx, "Contract paused");
            return true;
        } catch (error) {
            console.log("Failed to pause contract:", error.message);
            return false;
        }
    }

    async unpauseContract() {
        console.log("Unpausing BlumeToken contract...");
        try {
            const tx = await this.contracts.BlumeToken.unpause({ gasLimit: 200000 });
            await this.waitForTx(tx, "Contract unpaused");
            return true;
        } catch (error) {
            console.log("Failed to unpause contract:", error.message);
            return false;
        }
    }

    async checkPauseStatus() {
        const paused = await this.contracts.BlumeToken.paused();
        console.log(`Contract paused: ${paused}`);
        return paused;
    }


    // ===== FACTORY OPERATIONS =====
    async createPair(tokenA, tokenB) {
        console.log(`Creating pair for ${tokenA} and ${tokenB}...`);
        
        try {
            // Check if pair already exists
            const existingPair = await this.contracts.BlumeSwapFactory.getPair(tokenA, tokenB);
            
            if (existingPair !== "0x0000000000000000000000000000000000000000") {
                console.log("Pair already exists:", existingPair);
                return existingPair;
            }
            
            const tx = await this.contracts.BlumeSwapFactory.createPair(tokenA, tokenB, { gasLimit: 300000 });
            await this.waitForTx(tx, "Pair created");
            
            // Get the new pair address
            const newPairAddress = await this.contracts.BlumeSwapFactory.getPair(tokenA, tokenB);
            console.log("New pair address:", newPairAddress);
            return newPairAddress;
        } catch (error) {
            console.log("Failed to create pair:", error.message);
            return null;
        }
    }

    async getFactoryInfo() {
        console.log("\n📊 Factory Information");
        console.log("-".repeat(30));
        
        try {
            const pairCount = await this.contracts.BlumeSwapFactory.allPairsLength();
            const protocolFeeBPS = await this.contracts.BlumeSwapFactory.protocolFeeBPS();
            const feeReceiver = await this.contracts.BlumeSwapFactory.feeReceiver();
            
            console.log(`Total pairs: ${pairCount}`);
            console.log(`Protocol fee: ${protocolFeeBPS}bp (${Number(protocolFeeBPS)/100}%)`);
            console.log(`Fee receiver: ${feeReceiver}`);
            
            return { pairCount, protocolFeeBPS, feeReceiver };
        } catch (error) {
            console.log("Could not get factory info:", error.message);
            return null;
        }
    }

    async setProtocolFee(newFeeBPS) {
        console.log(`Setting protocol fee to ${newFeeBPS}bp...`);
        
        try {
            const tx = await this.contracts.BlumeSwapFactory.setProtocolFeeBPS(newFeeBPS, { gasLimit: 200000 });
            await this.waitForTx(tx, `Protocol fee set to ${newFeeBPS}bp`);
            return true;
        } catch (error) {
            console.log("Failed to set protocol fee:", error.message);
            return false;
        }
    }

    // ===== COMPREHENSIVE TESTING FUNCTIONS =====
    async ensureBLXBalance(amount) {
        const userAddress = await this.signer.getAddress();
        const balance = await this.contracts.BlumeToken.balanceOf(userAddress);
        const needed = ethers.parseEther(amount.toString());
        
        if (balance < needed) {
            console.log(`Minting ${amount} BLX tokens...`);
            await this.mintBLX(amount);
        }
    }

    async checkAllBalances(address) {
        console.log("\n📊 Balance Summary");
        console.log("-".repeat(30));
        
        try {
            const blxBalance = await this.contracts.BlumeToken.balanceOf(address);
            const stBLXBalance = await this.contracts.StakedBlumeToken.balanceOf(address);
            const lpBalance = await this.contracts.BlumeSwapPair.balanceOf(address);
            const ethBalance = await ethers.provider.getBalance(address);
            
            console.log(`BLX: ${ethers.formatEther(blxBalance)} BLX`);
            console.log(`stBLX: ${ethers.formatEther(stBLXBalance)} stBLX`);
            console.log(`LP Tokens: ${ethers.formatEther(lpBalance)} LP`);
            console.log(`ETH: ${ethers.formatEther(ethBalance)} ETH`);
            
            return { blxBalance, stBLXBalance, lpBalance, ethBalance };
        } catch (error) {
            console.log("Error checking balances:", error.message);
            return null;
        }
    }

    async checkAllRewards(address) {
        console.log("\n🎯 Rewards Summary");
        console.log("-".repeat(30));
        
        try {
            const stakingRewards = await this.contracts.BlumeStaking.pendingRewards(address);
            console.log(`Staking rewards: ${ethers.formatEther(stakingRewards)} BLX`);
        } catch (e) { console.log("Could not check staking rewards"); }
        
        try {
            const liquidRewards = await this.contracts.BlumeStakingHub.getPendingRewards(address);
            console.log(`Liquid staking rewards: ${ethers.formatEther(liquidRewards)} BLX`);
        } catch (e) { console.log("Could not check liquid staking rewards"); }
        
        try {
            const vaultRewards = await this.contracts.BlumeVault.calculatePendingRewards(address);
            console.log(`Vault rewards: ${ethers.formatEther(vaultRewards)} BLX`);
        } catch (e) { console.log("Could not check vault rewards"); }
    }

    // ===== YIELD STRATEGIES DEMO =====
    async demonstrateYieldStrategies() {
        console.log("\n🌾 YIELD FARMING STRATEGIES");
        console.log("=".repeat(50));
        
        const userAddress = await this.signer.getAddress();
        
        // Strategy 1: Simple Staking
        console.log("\n1. Simple Staking Strategy");
        await this.ensureBLXBalance(1000);
        await this.stakeBLX(100);
        await this.checkUserTier(userAddress);
        await this.stakeBLX(400); // Total 500 for higher tier
        await this.checkUserTier(userAddress);
        
        // Strategy 2: Liquid Staking
        console.log("\n2. Liquid Staking Strategy");
        await this.ensureBLXBalance(1500);
        await this.stakeBLXForStBLX(500, 0); // No lock
        await this.stakeBLXForStBLX(500, 1); // 30-day lock
        await this.checkLiquidStakingInfo(userAddress);
        
        // Strategy 3: Vault Staking
        console.log("\n3. Vault Staking Strategy");
        await this.ensureBLXBalance(1600);
        await this.depositToVault(400, 0); // No lock
        await this.depositToVault(400, 30 * 24 * 3600); // 30-day lock
        await this.depositToVault(400, 90 * 24 * 3600); // 90-day lock
        await this.checkVaultInfo(userAddress);
        
        // Strategy 4: LP Farming
        console.log("\n4. LP Farming Strategy");
        await this.ensureBLXBalance(1000);
        const liquiditySuccess = await this.addLiquidity(500, 0.16667);
        if (liquiditySuccess) {
            await this.checkPoolReserves();
            await this.checkLPBalance(userAddress);
            
            // Simulate some trades
            await this.swapETHforBLX(0.01, 0);
            await this.swapBLXforETH(10, 0);
        }
        
        // Strategy 5: Automated Yield Farming
        console.log("\n5. Automated Yield Farming");
        await this.ensureBLXBalance(1000);
        await this.depositToYieldFarmer(1000);
        
        // Final summary
        await this.checkAllBalances(userAddress);
        await this.checkAllRewards(userAddress);
    }

    // ===== COMPREHENSIVE TEST SUITE =====
    async runComprehensiveTestSuite() {
        const userAddress = await this.signer.getAddress();
        console.log(`\n🚀 BLUME ECOSYSTEM COMPREHENSIVE TEST`);
        console.log(`User: ${userAddress}`);
        console.log("=".repeat(80));

        let passedTests = 0;
        let totalTests = 0;

        const runTest = async (testName, testFunction) => {
            totalTests++;
            console.log(`\n${totalTests}. ${testName}`);
            console.log("-".repeat(50));
            
            try {
                const result = await testFunction();
                if (result !== false) {
                    console.log(`✅ ${testName} - PASSED`);
                    passedTests++;
                } else {
                    console.log(`❌ ${testName} - FAILED`);
                }
            } catch (error) {
                console.log(`❌ ${testName} - ERROR: ${error.message}`);
            }
        };

        // Core setup tests
        await runTest("Price Oracle Setup", () => this.setupPriceOracle());
        await runTest("Token Information", () => this.getTokenInfo());
        await runTest("Factory Information", () => this.getFactoryInfo());

        // Token operations tests
        await runTest("Token Minting", () => this.mintBLX(10000));
        await runTest("Balance Check", () => this.checkBLXBalance(userAddress));

        // DEX operations tests
        await runTest("Add Liquidity", () => this.addLiquidity(100, 0.03333));
        await runTest("Pool Reserves Check", () => this.checkPoolReserves());
        await runTest("Swap ETH for BLX", () => this.swapETHforBLX(0.01, 0));
        await runTest("Swap BLX for ETH", () => this.swapBLXforETH(10, 0));

        // Staking tests
        await runTest("Simple Staking", () => this.stakeBLX(500));
        await runTest("Check User Tier", () => this.checkUserTier(userAddress));
        await runTest("Liquid Staking", () => this.stakeBLXForStBLX(1000, 1));
        await runTest("Vault Deposit", () => this.depositToVault(500, 0));

        // Advanced features
        await runTest("Yield Strategies Demo", () => this.demonstrateYieldStrategies());
        
        // Final checks
        await runTest("Final Balance Check", () => this.checkAllBalances(userAddress));
        await runTest("Final Rewards Check", () => this.checkAllRewards(userAddress));

        // Summary
        console.log(`\n${"=".repeat(80)}`);
        console.log(`🏁 TEST SUITE COMPLETE`);
        console.log(`Tests passed: ${passedTests}/${totalTests}`);
        console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        console.log(`${"=".repeat(80)}`);

        return { passedTests, totalTests };
    }

    // ===== QUICK SETUP =====
    async quickSetup() {
        console.log("\n⚡ QUICK SETUP");
        console.log("=".repeat(30));
        
        // Setup oracle first
        await this.setupPriceOracle();
        
        // Mint tokens
        await this.mintBLX(10000);
        
        // Exclude deployer from limits for easier testing
        const userAddress = await this.signer.getAddress();
        try {
            await this.contracts.BlumeToken.setExcludedFromLimits(userAddress, true);
            console.log("✅ User excluded from limits");
        } catch (error) {
            console.log("Could not exclude user from limits:", error.message);
        }
        
        console.log("✅ Quick setup complete!");
    }

    // ===== ADVANCED TESTING =====
    async testRoleManagement() {
        console.log("\n🔐 ROLE MANAGEMENT TESTING");
        console.log("=".repeat(40));
        
        const userAddress = await this.signer.getAddress();
        
        // Check initial roles
        await this.checkRole("DEFAULT_ADMIN_ROLE", userAddress);
        await this.checkRole("MINTER_ROLE", userAddress);
        await this.checkRole("PAUSER_ROLE", userAddress);
        
        // Test pause/unpause
        await this.pauseContract();
        await this.checkPauseStatus();
        await this.unpauseContract();
        await this.checkPauseStatus();
    }

}

// Export for use as module
module.exports = {
    BlumeEcosystemInteraction,
    addresses,
    abis,
    ROLES
};

// Main execution function
async function main() {
    try {
        const [signer] = await ethers.getSigners();
        console.log(`Initializing Blume Ecosystem with account: ${signer.address}`);
        
        const blume = new BlumeEcosystemInteraction(ethers.provider, signer);
        await blume.initializeContracts();
        
        // Quick setup for clean state
        await blume.quickSetup();
        
        // Run comprehensive test suite
        const results = await blume.runComprehensiveTestSuite();
        
        // Optional: Test security features and role management
        console.log("\n🔍 ADDITIONAL TESTING");
        await blume.testRoleManagement();
        await blume.testSecurityFeatures();
        
        console.log("\n✨ All tests completed! ✨");
        
    } catch (error) {
        console.error("\n❌ Fatal error:", error.message);
        console.error(error);
        process.exit(1);
    }
}

// Execute main function if script is run directly
if (require.main === module) {
    main().catch(console.error);
}