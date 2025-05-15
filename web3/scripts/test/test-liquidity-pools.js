// BlumeSwapFactory Script
// This script provides methods for interacting with the BlumeSwapFactory contract
// which creates and manages liquidity pairs on Blume's DEX

const { ethers: hardhatEthers } = require("hardhat");
const ethers = require("ethers"); // Direct import for constants

// Contract addresses from deployment
const FACTORY_ADDRESS = "0xb86D27c3736062132879E743c7648093F500fb7e";
const BLUME_TOKEN_ADDRESS = "0x8CBabC07717038DA6fAf1bC477a39F1627988a3a";
const WETH_ADDRESS = "0x17a8eabD12bCEb2fBD0789E8063BcD42325CA4CA";

// ABI for BlumeSwapFactory contract
const FACTORY_ABI = [
    "function createPair(address tokenA, address tokenB) external returns (address pair)",
    "function getPair(address tokenA, address tokenB) external view returns (address pair)",
    "function allPairs(uint256) external view returns (address)",
    "function allPairsLength() external view returns (uint256)",
    "function protocolFeeBPS() external view returns (uint256)",
    "function feeReceiver() external view returns (address)",
    "function setProtocolFeeBPS(uint256 newFeeBPS) external",
    "function setFeeReceiver(address newFeeReceiver) external",
    
    // Events
    "event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairIndex)",
    "event ProtocolFeeUpdated(uint256 newFeeBPS)",
    "event FeeReceiverUpdated(address newFeeReceiver)",
    
    // Access Control functions
    "function DEFAULT_ADMIN_ROLE() external view returns (bytes32)",
    "function ADMIN_ROLE() external view returns (bytes32)",
    "function grantRole(bytes32 role, address account) external",
    "function revokeRole(bytes32 role, address account) external",
    "function hasRole(bytes32 role, address account) external view returns (bool)"
];

// Initialize contract instance
async function getFactoryContract(signer) {
    return new hardhatEthers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
}

// Main Functions

// 1. Create a new trading pair
async function createPair(tokenA, tokenB, signer) {
    console.log("\n=== Creating Trading Pair ===");
    const factory = await getFactoryContract(signer);
    
    try {
        // Debug: Log ethers to ensure it's defined
        console.log("ethers defined:", !!ethers, "ethers.constants:", !!ethers.constants);
        
        // Check if pair already exists
        const existingPair = await factory.getPair(tokenA, tokenB);
        
        
        console.log(`Creating pair for tokens: ${tokenA} and ${tokenB}`);
        const tx = await factory.createPair(tokenA, tokenB);
        console.log("Transaction hash:", tx.hash);
        
        const receipt = await tx.wait();
        
        // Parse the PairCreated event to get the new pair address
        // const pairCreatedEvent = receipt.events.find(e => e.event === "PairCreated");
        // const pairAddress = pairCreatedEvent.args.pair;
        
        console.log("✅ Pair created successfully!");
        console.log("Pair address:", pairAddress);
        console.log("Token0:", pairCreatedEvent.args.token0);
        console.log("Token1:", pairCreatedEvent.args.token1);
        console.log("Pair index:", pairCreatedEvent.args.pairIndex.toString());
        
        return pairAddress;
    } catch (error) {
        console.error("Error creating pair:", error.message);
        throw error;
    }
}

// 2. Get pair address for two tokens
async function getPair(tokenA, tokenB, signer) {
    console.log("\n=== Getting Pair Address ===");
    const factory = await getFactoryContract(signer);
    
    try {
        const pairAddress = await factory.getPair(tokenA, tokenB);
        
        if (pairAddress === ethers.constants.AddressZero) {
            console.log("No pair exists for these tokens");
            return null;
        }
        
        console.log(`Pair address for ${tokenA} and ${tokenB}: ${pairAddress}`);
        return pairAddress;
    } catch (error) {
        console.error("Error getting pair:", error.message);
        throw error;
    }
}

// 3. Get all pairs created through the factory
async function getAllPairs(signer) {
    console.log("\n=== Getting All Pairs ===");
    const factory = await getFactoryContract(signer);
    
    try {
        const pairCount = await factory.allPairsLength();
        console.log(`Total pairs created: ${pairCount}`);
        
        const pairs = [];
        for (let i = 0; i < pairCount; i++) {
            const pairAddress = await factory.allPairs(i);
            pairs.push(pairAddress);
            console.log(`Pair ${i}: ${pairAddress}`);
        }
        
        return pairs;
    } catch (error) {
        console.error("Error getting all pairs:", error.message);
        throw error;
    }
}

// 4. Get current protocol fee settings
async function getProtocolFeeSettings(signer) {
    console.log("\n=== Protocol Fee Settings ===");
    const factory = await getFactoryContract(signer);
    
    try {
        const protocolFeeBPS = await factory.protocolFeeBPS();
        const feeReceiver = await factory.feeReceiver();
        
        // Convert BigInt to number for percentage calculation
        const feePercentage = Number(protocolFeeBPS) / 100;
        
        console.log(`Protocol fee: ${protocolFeeBPS.toString()} basis points (${feePercentage}%)`);
        console.log(`Fee receiver: ${feeReceiver}`);
        
        return { protocolFeeBPS, feeReceiver };
    } catch (error) {
        console.error("Error getting fee settings:", error.message);
        throw error;
    }
}

// 5. Update protocol fee (admin only)
async function setProtocolFee(newFeeBPS, signer) {
    console.log("\n=== Updating Protocol Fee ===");
    const factory = await getFactoryContract(signer);
    
    try {
        // Check if signer has admin role
        const adminRole = await factory.ADMIN_ROLE();
        const hasAdminRole = await factory.hasRole(adminRole, signer.address);
        
        if (!hasAdminRole) {
            throw new Error("Signer does not have ADMIN_ROLE");
        }
        
        // Fee must be <= 100 basis points (1%)
        if (newFeeBPS > 100) {
            throw new Error("Fee too high (max 100 basis points)");
        }
        
        console.log(`Setting protocol fee to ${newFeeBPS} basis points (${newFeeBPS / 100}%)`);
        const tx = await factory.setProtocolFeeBPS(newFeeBPS);
        console.log("Transaction hash:", tx.hash);
        
        await tx.wait();
        console.log("✅ Protocol fee updated successfully!");
        
    } catch (error) {
        console.error("Error updating protocol fee:", error.message);
        throw error;
    }
}

// 6. Update fee receiver (admin only)
async function setFeeReceiver(newReceiver, signer) {
    console.log("\n=== Updating Fee Receiver ===");
    const factory = await getFactoryContract(signer);
    
    try {
        // Check if signer has admin role
        const adminRole = await factory.ADMIN_ROLE();
        const hasAdminRole = await factory.hasRole(adminRole, signer.address);
        
        if (!hasAdminRole) {
            throw new Error("Signer does not have ADMIN_ROLE");
        }
        
        console.log(`Setting fee receiver to ${newReceiver}`);
        const tx = await factory.setFeeReceiver(newReceiver);
        console.log("Transaction hash:", tx.hash);
        
        await tx.wait();
        console.log("✅ Fee receiver updated successfully!");
        
    } catch (error) {
        console.error("Error updating fee receiver:", error.message);
        throw error;
    }
}

// 7. Grant admin role to an account (admin only)
async function grantAdminRole(account, signer) {
    console.log("\n=== Granting Admin Role ===");
    const factory = await getFactoryContract(signer);
    
    try {
        const adminRole = await factory.ADMIN_ROLE();
        
        console.log(`Granting admin role to ${account}`);
        const tx = await factory.grantRole(adminRole, account);
        console.log("Transaction hash:", tx.hash);
        
        await tx.wait();
        console.log("✅ Admin role granted successfully!");
        
    } catch (error) {
        console.error("Error granting admin role:", error.message);
        throw error;
    }
}

// 8. Create multiple standard pairs
async function createStandardPairs(signer) {
    console.log("\n=== Creating Standard Pairs ===");
    
    const standardPairs = [
        { tokenA: BLUME_TOKEN_ADDRESS, tokenB: WETH_ADDRESS, name: "BLX-WETH" },
        // Add more pairs as needed
    ];
    
    const createdPairs = [];
    
    for (const pair of standardPairs) {
        try {
            console.log(`\nCreating ${pair.name} pair...`);
            const pairAddress = await createPair(pair.tokenA, pair.tokenB, signer);
            createdPairs.push({ ...pair, address: pairAddress });
        } catch (error) {
            console.error(`Failed to create ${pair.name} pair:`, error.message);
        }
    }
    
    return createdPairs;
}

// 9. Watch for pair creation events
async function watchPairCreation(signer) {
    console.log("\n=== Watching for Pair Creation Events ===");
    const factory = await getFactoryContract(signer);
    
    factory.on("PairCreated", (token0, token1, pair, pairIndex) => {
        console.log("\n🆕 New pair created!");
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        console.log("Pair address:", pair);
        console.log("Pair index:", pairIndex.toString());
    });
    
    console.log("Listening for PairCreated events... (Press Ctrl+C to stop)");
}

// Utility function to display factory information
async function displayFactoryInfo(signer) {
    console.log("\n=== Factory Information ===");
    const factory = await getFactoryContract(signer);
    
    try {
        const pairCount = await factory.allPairsLength();
        const { protocolFeeBPS, feeReceiver } = await getProtocolFeeSettings(signer);
        
        console.log("Factory address:", FACTORY_ADDRESS);
        console.log("Total pairs created:", pairCount.toString());
        console.log("Protocol fee:", protocolFeeBPS.toString(), "basis points");
        console.log("Fee receiver:", feeReceiver);
        
        // Display admin role holders
        const adminRole = await factory.ADMIN_ROLE();
        const defaultAdminRole = await factory.DEFAULT_ADMIN_ROLE();
        
        console.log("\nAccess Control:");
        console.log("ADMIN_ROLE:", adminRole);
        console.log("DEFAULT_ADMIN_ROLE:", defaultAdminRole);
        
    } catch (error) {
        console.error("Error displaying factory info:", error.message);
    }
}

// Main execution function
async function main() {
    // Get signers
    const [deployer, admin] = await hardhatEthers.getSigners();
    console.log("Using account:", deployer.address);
    
    // Display factory information
    await displayFactoryInfo(deployer);
    
    // Get all existing pairs
    await getAllPairs(deployer);
    
    // Create BLX-WETH pair
    // await createPair(BLUME_TOKEN_ADDRESS, WETH_ADDRESS, deployer);
    
    // Update protocol fee to 50 basis points (0.5%)
    try {
        await setProtocolFee(50, deployer);
    } catch (error) {
        console.log("Failed to update protocol fee, continuing...");
    }
    
    // Update fee receiver (admin only)
    try {
        await setFeeReceiver(deployer.address, deployer);
    } catch (error) {
        console.log("Failed to update fee receiver, continuing...");
    }
    
    // Grant admin role to admin account
    try {
        await grantAdminRole(admin.address, deployer);
    } catch (error) {
        console.log("Failed to grant admin role, continuing...");
    }
    
    // Create standard pairs
    await createStandardPairs(deployer);
    
    // Watch for new pair creation events
    await watchPairCreation(deployer);
}

// Export functions for use in other scripts
module.exports = {
    getFactoryContract,
    createPair,
    getPair,
    getAllPairs,
    getProtocolFeeSettings,
    setProtocolFee,
    setFeeReceiver,
    grantAdminRole,
    createStandardPairs,
    watchPairCreation,
    displayFactoryInfo,
    FACTORY_ADDRESS,
    BLUME_TOKEN_ADDRESS,
    WETH_ADDRESS
};

// Execute main function if script is run directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}