# Blume DeFi Portal

A comprehensive decentralized finance (DeFi) dashboard application built with React, Tailwind CSS, and Ethereum blockchain integration. This application provides a user-friendly interface for interacting with various DeFi protocols and services.

## 📋 Features

- **Wallet Connection**: Secure integration with MetaMask and other Ethereum wallets
- **Token Swapping**: Decentralized exchange for swapping tokens
- **Liquidity Pools**: Add and remove liquidity from pools
- **Staking**: Token staking with multiple lock periods and yield rates
- **Smart Contract Interaction**: Direct interaction with deployed smart contracts
- **Transaction History**: View and track your transactions
- **Account Management**: Monitor your wallet details and balances
- **Dark/Light Mode**: Customizable UI themes

## 🔧 Technical Architecture

The project consists of several integrated components:

### Frontend
- React.js for the UI components
- Tailwind CSS for styling
- Ethers.js for blockchain interactions
- ShadCN UI component library

### Smart Contracts
- **Blume Token (BLX)**: ERC-20 token with anti-whale and anti-bot mechanisms
- **BlumeSwap**: Decentralized exchange with AMM (Automated Market Maker)
- **BlumeStaking**: Token staking with tiered rewards
- **BlumeVault**: Yield generation and auto-compounding

### Tools and Utilities
- **Price Oracle**: Real-time price data integration
- **Yield Farming**: Auto-compounding strategies
- **Gas Optimization**: Efficient transaction handling

## 📁 Project Structure

```
/ 
├── contracts/                  # Smart contract source files
│   ├── BlumeToken.sol          # Core BLX token implementation
│   ├── BlumeSwapFactory.sol    # DEX factory contract
│   ├── BlumeSwapPair.sol       # Liquidity pair contract
│   ├── BlumeSwapRouter.sol     # DEX router for swaps
│   ├── BlumeStakingHub.sol     # Staking contract with tiers
│   ├── BlumeVault.sol          # Yield-generating vault
│   ├── PriceOracle.sol         # Price feed oracle
│   └── ... (other contracts)
├── test/                       # Test files for smart contracts
│   ├── BlumeToken.test.js      # Token tests
│   ├── BlumeSwapPair.test.js   # Swap pair tests
│   ├── BlumeStakingHub.test.js # Staking tests
│   ├── BlumeSwapRouter.test.js # Router tests
│   ├── BlumeVault.test.js      # Vault tests
│   ├── AccessControl.test.js   # Security tests
│   ├── MathSafety.test.js      # Math tests
│   ├── FlashLoanAttack.test.js # Attack simulation
│   └── GasOptimization.test.js # Gas usage tests
├── src/                        # Frontend source code
│   ├── components/             # UI components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utility functions
│   ├── pages/                  # Page components
│   ├── App.tsx                 # Main application component
│   └── main.tsx                # Entry point
├── slither.sh                  # Static analysis script
├── run-mythril.sh              # Security analysis script
├── test-all.sh                 # Test runner script
└── hardhat.config.js           # Hardhat configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or similar Web3 wallet
- Python 3.x (for security tools)

### Installation

#### Frontend Setup

1. Clone the repository:

```bash
git clone https://github.com/unknown91tech/JayK_BLOCKCHAIN_TEST_BLUME_TOKEN_TaskSubmission.git
cd JayK_BLOCKCHAIN_TEST_BLUME_TOKEN_TaskSubmission/frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to http://localhost:5173

#### Smart Contract Development Setup

Install smart contract development dependencies:

```bash
cd JayK_BLOCKCHAIN_TEST_BLUME_TOKEN_TaskSubmission/web3
```

## 💻 Usage

### Connecting Your Wallet

1. Click on the "Connect Wallet" button in the header
2. Select your preferred wallet (MetaMask, etc.)
3. Approve the connection request in your wallet

### Swapping Tokens

1. Navigate to the "Swap" tab
2. Select the tokens you want to swap between
3. Enter the amount to swap
4. Click "Swap" and confirm the transaction in your wallet

### Adding Liquidity

1. Navigate to the "Liquidity" tab
2. Select the token pair you want to provide liquidity for
3. Enter the amounts for each token
4. Click "Add Liquidity" and confirm the transaction

### Staking

1. Navigate to the "Contracts" tab
2. Select the staking contract
3. Enter the amount to stake and the lock period
4. Click "Stake" and confirm the transaction

## 🧪 Testing

The smart contracts include comprehensive test suites for:

- Security features (reentrancy protection, access control)
- Math safety (overflow/underflow protection)
- Gas optimization
- Price oracle integrity

### Running Individual Scripts

Before running individual scripts, you need to configure your private keys:

1. Open `hardhat.config.js` in the web3 directory
2. Add your private key to the network configuration:

```javascript
networks: {
  hoodi: {
      url: process.env.HOODI_URL || "",
      chainId: 560048,
      // accounts: [
      //   "your_private_key_1", // Owner: 10,000 ETH
      //   "your_private_key_2", // Whale
      //   "your_private_key_3", // Bot
      //   "your_private_key_4",
      //   "your_private_key_5",  // Normal User
      // ]
    }
}
```

3. Open `scripts/test/test-blume-token.js`
4. Add your private key or wallet configuration as needed for the test script
5. Run the script using:

```bash
npx hardhat run scripts/test/eco-system.js --network hoodi
```

**Note**: Never commit private keys to version control. Use environment variables or a secure configuration method in production.

### Running Individual Tests

You can run specific test suites to check individual contract functionality:

```bash
# Run token tests
npx hardhat test test/BlumeToken.test.js

# Run swap pair tests
npx hardhat test test/BlumeSwapPair.test.js

# Run router tests
npx hardhat test test/BlumeSwapRouter.test.js

# Run vault tests
npx hardhat test test/BlumeVault.test.js

# Run staking hub tests
npx hardhat test test/BlumeStakingHub.test.js

# Run access control tests
npx hardhat test test/AccessControl.test.js

# Run math safety tests
npx hardhat test test/MathSafety.test.js

# Run flash loan attack tests
npx hardhat test test/FlashLoanAttack.test.js

# Run gas optimization tests
npx hardhat test test/GasOptimization.test.js
```

### Running Complete Test Suite

Execute the test-all.sh script to run all tests and analysis tools:

```bash
./run-all.sh
```

This will:
- Run all Hardhat tests
- Generate test coverage reports
- Run Slither static analysis (if installed)
- Run Mythril security analysis (if installed)
- Generate gas usage reports

### Reviewing Test Results

After running the tests, check:
- Test output for any failures
- Coverage report (in the `coverage/` directory)
- Slither reports (in the `slither-reports/` directory)
- Mythril reports (in the `mythril-reports/` directory)
- Gas reporter output in the console

## 📦 Contract Addresses

### Testnet (Hoodi)

```
Network: Hoodi
Timestamp: 2025-05-03T09:34:10.100Z
Deployer: 0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73

Contracts:
BlumeToken: 0x8CBabC07717038DA6fAf1bC477a39F1627988a3a
WETH: 0x17a8eabD12bCEb2fBD0789E8063BcD42325CA4CA
BlumeSwapFactory: 0xb86D27c3736062132879E743c7648093F500fb7e
BlumeSwapRouter: 0x40cDf70E2364b69AA5e00189A4f1BE631a351Ec4
FixedPriceOracle: 0xBa597F46Cadashop7A8eAbbcb7E63EcEB9957B1f7688
BlumeStaking: 0xA8a69ce8C3657BA48d40a8F93aF3a743c45b96D0
BlumeStakingHub: 0x36febc9a715B86c87429C671f596B30ad38Bf580
StakedBlumeToken: 0x2f1473c53163A24439Dc48E994c8A5d0E3B8B98B
BlumeStakingHubFactory: 0x9C2b2bc3357D64bBa3471547C5a33D58E42550ea
BlumeVault: 0x9cc370104fF1D80c0986471aAC407A4025CA038C
BlumeVaultController: 0x263c05A4B4348Cb0B74db5b3e85174532209c5BA
BLX_WETH_Pair: 0x9cAFb45c2f4B06d68A30179Fd103c735B2338150
BlumeStakingDeFiIntegration: 0x9d09e7E7F265dc6a6Ca8CB14aC973cA411b64b42
BlumeYieldFarmer: 0xf9fa9fFF3896A97AC50247062C7843DD78F2c0B7
```

### Configuration

```
Initial Supply: 0x52b7d2dcc80cd2e4000000 (BigNumber)
Reward Rate: 500
Protocol Fee: 300
Yield Rate: 800
Compound Frequency: 86400 seconds
Max Price Deviation: 300
Verify Contracts: False
```

## 🛡️ Security Features

The protocol implements several security measures:

- **Reentrancy Protection**: Prevents reentrancy attacks in all sensitive functions
- **Access Control**: Role-based access control for administrative functions
- **Math Safety**: SafeMath and overflow/underflow protection
- **Price Oracle**: External price feeds with deviation bounds to prevent price manipulation
- **Anti-Bot & Anti-Whale**: Measures to prevent front-running and market manipulation

## 🔄 Architectural Flow

The DeFi portal follows a modular architecture:

1. **User Interface Layer**: React components for user interaction
2. **State Management Layer**: Hooks and context for application state
3. **Blockchain Interface Layer**: Web3 services for smart contract interaction
4. **Smart Contract Layer**: Solidity contracts deployed on various networks

## 🛠️ Development

### Project Structure

```
defi-portal/
├── src/
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── pages/              # Page components
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Entry point
│
├── contracts/              # Smart contract source code
│   ├── tokens/             # Token contracts
│   ├── dex/                # Exchange contracts
│   ├── staking/            # Staking contracts
│   └── utils/              # Utility contracts
│
├── test/                   # Contract test suites
└── deployment/             # Deployment scripts and config
```
