// src/lib/web3/mockContracts.ts
import { ContractInfo } from './types';

export const MOCK_CONTRACTS: ContractInfo[] = [
  {
    name: "BlumeToken",
    address: "0x8CBabC07717038DA6fAf1bC477a39F1627988a3a",
    description: "The main BLX token contract with minting, burning, and transfer capabilities",
    actions: [
      {
        name: "mint",
        description: "Mint new BLX tokens to an address",
        inputs: [
          { name: "to", type: "address", description: "Address to receive tokens" },
          { name: "amount", type: "uint256", description: "Amount of tokens to mint" }
        ],
        stateMutability: "nonpayable"
      },
      {
        name: "burn",
        description: "Burn BLX tokens from caller's balance",
        inputs: [
          { name: "amount", type: "uint256", description: "Amount of tokens to burn" }
        ],
        stateMutability: "nonpayable"
      },
      {
        name: "transfer",
        description: "Transfer BLX tokens to another address",
        inputs: [
          { name: "to", type: "address", description: "Recipient address" },
          { name: "amount", type: "uint256", description: "Amount to transfer" }
        ],
        stateMutability: "nonpayable"
      },
      {
        name: "balanceOf",
        description: "Get BLX balance of an address",
        inputs: [
          { name: "account", type: "address", description: "Address to check balance" }
        ],
        stateMutability: "view"
      },
      {
        name: "pause",
        description: "Pause all token transfers (admin only)",
        inputs: [],
        stateMutability: "nonpayable"
      },
      {
        name: "unpause",
        description: "Unpause all token transfers (admin only)",
        inputs: [],
        stateMutability: "nonpayable"
      }
    ]
  },
  {
    name: "BlumeStakingHub",
    address: "0x36febc9a715B86c87429C671f596B30ad38Bf580",
    description: "Liquid staking contract for BLX tokens with multiple lock tiers",
    actions: [
      {
        name: "stake",
        description: "Stake BLX tokens and receive stBLX",
        inputs: [
          { name: "amount", type: "uint256", description: "Amount of BLX to stake" },
          { name: "tierIndex", type: "uint256", description: "Lock tier (0-4)" }
        ],
        stateMutability: "nonpayable"
      },
      {
        name: "unstake",
        description: "Unstake stBLX tokens to receive BLX",
        inputs: [
          { name: "stBLXAmount", type: "uint256", description: "Amount of stBLX to unstake" }
        ],
        stateMutability: "nonpayable"
      },
      {
        name: "claimRewards",
        description: "Claim pending staking rewards",
        inputs: [],
        stateMutability: "nonpayable"
      },
      {
        name: "getPendingRewards",
        description: "Get pending rewards for an address",
        inputs: [
          { name: "user", type: "address", description: "User address" }
        ],
        stateMutability: "view"
      },
      {
        name: "updateRewardsAndExchangeRate",
        description: "Update reward calculations and exchange rate",
        inputs: [],
        stateMutability: "nonpayable"
      }
    ]
  },
  {
    name: "BlumeVault",
    address: "0x9cc370104fF1D80c0986471aAC407A4025CA038C",
    description: "Time-locked vault with 10% APY and auto-compounding",
    actions: [
      {
        name: "deposit",
        description: "Deposit BLX tokens with optional time lock",
        inputs: [
          { name: "amount", type: "uint256", description: "Amount of BLX to deposit" },
          { name: "lockPeriod", type: "uint256", description: "Lock period in seconds" }
        ],
        stateMutability: "nonpayable"
      },
      {
        name: "withdraw",
        description: "Withdraw BLX tokens from vault",
        inputs: [
          { name: "amount", type: "uint256", description: "Amount of BLX to withdraw" }
        ],
        stateMutability: "nonpayable"
      },
      {
        name: "compoundRewards",
        description: "Compound pending rewards into principal",
        inputs: [],
        stateMutability: "nonpayable"
      },
      {
        name: "calculatePendingRewards",
        description: "Calculate pending rewards for a user",
        inputs: [
          { name: "user", type: "address", description: "User address" }
        ],
        stateMutability: "view"
      },
      {
        name: "getEffectiveAPY",
        description: "Get effective APY for a user's deposits",
        inputs: [
          { name: "user", type: "address", description: "User address" }
        ],
        stateMutability: "view"
      }
    ]
  },
  {
    name: "FixedBlumeSwapRouter",
    address: "0x40cDf70E2364b69AA5e00189A4f1BE631a351Ec4",
    description: "DEX router for token swaps and liquidity management",
    actions: [
      {
        name: "addLiquidityETH",
        description: "Add liquidity to BLX-ETH pool",
        inputs: [
          { name: "token", type: "address", description: "Token address (BLX)" },
          { name: "amountTokenDesired", type: "uint256", description: "Desired token amount" },
          { name: "amountTokenMin", type: "uint256", description: "Minimum token amount" },
          { name: "amountETHMin", type: "uint256", description: "Minimum ETH amount" },
          { name: "to", type: "address", description: "Recipient address" },
          { name: "deadline", type: "uint256", description: "Transaction deadline" }
        ],
        stateMutability: "payable"
      },
      {
        name: "swapExactETHForTokens",
        description: "Swap exact ETH for tokens",
        inputs: [
          { name: "amountOutMin", type: "uint256", description: "Minimum output tokens" },
          { name: "path", type: "address[]", description: "Swap path" },
          { name: "to", type: "address", description: "Recipient address" },
          { name: "deadline", type: "uint256", description: "Transaction deadline" }
        ],
        stateMutability: "payable"
      },
      {
        name: "swapExactTokensForETH",
        description: "Swap exact tokens for ETH",
        inputs: [
          { name: "amountIn", type: "uint256", description: "Input token amount" },
          { name: "amountOutMin", type: "uint256", description: "Minimum output ETH" },
          { name: "path", type: "address[]", description: "Swap path" },
          { name: "to", type: "address", description: "Recipient address" },
          { name: "deadline", type: "uint256", description: "Transaction deadline" }
        ],
        stateMutability: "nonpayable"
      }
    ]
  },
  {
    name: "FixedPriceOracle",
    address: "0xBa597F46Cad97A8eAbbcb7E63EcEB9957B1f7688",
    description: "Price oracle for token price feeds",
    actions: [
      {
        name: "getPrice",
        description: "Get current price for a token",
        inputs: [
          { name: "token", type: "address", description: "Token address" }
        ],
        stateMutability: "view"
      },
      {
        name: "setCustomPrice",
        description: "Set custom price for a token (admin only)",
        inputs: [
          { name: "token", type: "address", description: "Token address" },
          { name: "price", type: "uint256", description: "Price in 8 decimals" }
        ],
        stateMutability: "nonpayable"
      }
    ]
  }
];