# Blume DeFi Portal

A comprehensive decentralized finance (DeFi) dashboard application built with React, Tailwind CSS, and Ethereum blockchain integration. This application provides a user-friendly interface for interacting with various DeFi protocols and services.

## 📋 Features

- **Wallet Connection**: Secure integration with MetaMask and other Ethereum wallets
- **Network Support**: Multi-chain support (Ethereum, Polygon, BNB Chain, Arbitrum, Optimism)
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
- Blume Token (BLX): ERC-20 token with anti-whale and anti-bot mechanisms
- BlumeSwap: Decentralized exchange with AMM (Automated Market Maker)
- BlumeStaking: Token staking with tiered rewards
- BlumeVault: Yield generation and auto-compounding

### Tools and Utilities
- Price Oracle: Real-time price data integration
- Yield Farming: Auto-compounding strategies
- Gas Optimization: Efficient transaction handling

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

4. Open your browser and navigate to `http://localhost:5173`

#### Smart Contract Development Setup

1. Install smart contract development dependencies:
```bash
cd JayK_BLOCKCHAIN_TEST_BLUME_TOKEN_TaskSubmission/web3
```

2. Set up environment variables by creating a `.env` file:
```
ETHERSCAN_API_KEY=your_etherscan_key
REPORT_GAS=false
PRIVATE_KEY=
HOODI_URL=
SEPOLIA_URL=
```

3. Install security analysis tools (optional):
```bash
pip install slither-analyzer
pip install mythril
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
./test-all.sh
```

This will:
1. Run all Hardhat tests
2. Generate test coverage reports
3. Run Slither static analysis (if installed)
4. Run Mythril security analysis (if installed)
5. Generate gas usage reports

### Reviewing Test Results

After running the tests, check:
1. Test output for any failures
2. Coverage report (in the `coverage/` directory)
3. Slither reports (in the `slither-reports/` directory)
4. Mythril reports (in the `mythril-reports/` directory)
5. Gas reporter output in the console

## 📦 Contract Addresses

### Mainnet
- BlumeToken: `0x3787831C45898677A07426b51EA3053c8DB32Dd4`
- WETH: `0x2f9aAd71531651432deCB6f34f0d124F7136227A`
- BlumeSwapFactory: `0xD4F55d0Ad19c3BE0A7D5EE7e0512a00129Cd73c9`
- BlumeSwapRouter: `0x56E525384313947106bd3BF0555d15510C6E0326`
- PriceOracle: `0xb185335531Fd45Ca58E693a9ADebE0c00c074f72`
- BlumeStaking: `0xD4F9Aa9F4Efe75c63877223EC43039F7958499bE`
- BlumeStakingHub: `0x5308b68C9c64C8D1d055Ee8F538156C8038C34c0`
- StakedBlumeToken: `0x18926Bc1d53f6C756c18a46Da5F4860784F2B650`
- BlumeVault: `0x1435870A6152825Bc9043829C376fc2EEBcA770A`

### Testnet
- Refer to the `/deployment-hoodi-1746264850.json` file for the latest testnet addresses

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

I also have shared my own logs for the test inside the personal folder inside the web3 folder.