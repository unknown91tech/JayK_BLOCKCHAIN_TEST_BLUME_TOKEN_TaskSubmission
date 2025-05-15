const { ethers } = require("ethers");

// Configuration
const WETH_CONTRACT_ADDRESS = "0x2f9aAd71531651432deCB6f34f0d124F7136227A"; // Replace with actual WETH contract address
const RECIPIENT_ADDRESS = "0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73";
const PROVIDER_URL = "https://hoodi.infura.io/v3/d3826c909b504590bcfc68fda13432f3"; // e.g., Infura or Alchemy URL

// WETH ABI (minimal, only what's needed for withdrawal)
const WETH_ABI = [
    "function balanceOf(address) view returns (uint256)",
    "function withdraw(uint256)",
];

// Main function to withdraw all WETH
async function withdrawAllWETH() {
    try {
        // Set up provider and wallet
        const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        // Connect to WETH contract
        const wethContract = new ethers.Contract(WETH_CONTRACT_ADDRESS, WETH_ABI, wallet);

        // Get WETH balance
        const balance = await wethContract.balanceOf(wallet.address);
        console.log(`Current WETH balance: ${ethers.formatEther(balance)} WETH`);

        if (balance === 0n) {
            console.log("No WETH to withdraw");
            return;
        }

        // Withdraw all WETH
        console.log(`Withdrawing ${ethers.formatEther(balance)} WETH to ${RECIPIENT_ADDRESS}`);
        const tx = await wethContract.withdraw(balance);
        
        // Wait for transaction confirmation
        console.log("Waiting for transaction confirmation...");
        const receipt = await tx.wait();
        
        console.log(`Withdrawal successful! Transaction hash: ${receipt.hash}`);
        console.log(`Withdrawn ${ethers.formatEther(balance)} ETH to ${RECIPIENT_ADDRESS}`);

    } catch (error) {
        console.error("Error during withdrawal:", error.message);
    }
}

// Execute the withdrawal
withdrawAllWETH();