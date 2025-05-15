// Smart contract addresses from deployed contracts
export const DEPLOYED_CONTRACTS = {
    // Main contracts
    BlumeToken: "0x3787831C45898677A07426b51EA3053c8DB32Dd4",
    WETH: "0x2f9aAd71531651432deCB6f34f0d124F7136227A",
    BlumeSwapFactory: "0xD4F55d0Ad19c3BE0A7D5EE7e0512a00129Cd73c9",
    BlumeSwapRouter: "0x56E525384313947106bd3BF0555d15510C6E0326",
    PriceOracle: "0xb185335531Fd45Ca58E693a9ADebE0c00c074f72",
    
    // Staking and Vault contracts
    BlumeStaking: "0xD4F9Aa9F4Efe75c63877223EC43039F7958499bE",
    BlumeStakingHub: "0x5308b68C9c64C8D1d055Ee8F538156C8038C34c0",
    StakedBlumeToken: "0x18926Bc1d53f6C756c18a46Da5F4860784F2B650",
    BlumeStakingHubFactory: "0x2230f83DB74a0C91405ea559b44e3E94d535045a",
    BlumeVault: "0x1435870A6152825Bc9043829C376fc2EEBcA770A",
    BlumeVaultController: "0xe998Dd9154a68CCB171A7b247f84c642640EFBa6",
    
    // LP Pairs
    BLX_WETH_Pair: "0x7aB182A1a90bcDb426BD3284bCF45641a254590e",
    
    // Integration contracts
    BlumeStakingDeFiIntegration: "0xc06697954F5eC884045A7B68C0c025FE456fd21B",
    BlumeYieldFarmer: "0x5676F52bE459B58F42ff80D9e13D3Bbe48094605"
  };
  
  // ABI for BlumeToken (simplified for common operations)
  export const BLX_TOKEN_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
  ];
  
  // ABI for BlumeSwapRouter (simplified for common operations)
  export const ROUTER_ABI = [
    "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)",
    "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)",
    "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB)",
    "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) returns (uint amountToken, uint amountETH)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] amounts)",
    "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) returns (uint[] amounts)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] amounts)"
  ];
  
  // ABI for BlumeStakingHub (simplified for common operations)
  export const STAKING_HUB_ABI = [
    "function stake(uint256 amount, uint256 tierIndex) external",
    "function unstake(uint256 stBLXAmount) external",
    "function claimRewards() external",
    "function getPendingRewards(address user) external view returns (uint256)",
    "function getUserStakingInfo(address user) external view returns (uint256 amount, uint256 lockEnd, uint256 lockDuration, uint256 multiplier, uint256 rewards)",
    "function exchangeRate() external view returns (uint256)"
  ];
  
  // ABI for StakedBlumeToken (simplified for common operations)
  export const STBLX_TOKEN_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ];
  
  // ABI for LiquidityPool operations
  export const LP_TOKEN_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint32 blockTimestampLast)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
  ];
  
  // ABI for BlumeVault
  export const VAULT_ABI = [
    "function deposit(uint256 amount, uint256 lockPeriod) external",
    "function withdraw(uint256 amount) external",
    "function compoundRewards() external",
    "function calculatePendingRewards(address user) public view returns (uint256)",
    "function userDeposits(address) view returns (uint256 amount, uint256 lockEndTimestamp, uint256 rewardDebt, uint256 lastCompoundTime, uint256 depositTimestamp)",
    "function NO_LOCK() view returns (uint256)",
    "function LOCK_30_DAYS() view returns (uint256)",
    "function LOCK_90_DAYS() view returns (uint256)",
    "function LOCK_180_DAYS() view returns (uint256)",
    "function LOCK_365_DAYS() view returns (uint256)"
  ];
  
  // Mock Transactions for demo purposes
  export const MOCK_TRANSACTIONS = [
    {
      id: "tx-1",
      hash: "0x3a7e5b1a4237c2f3cfda26d1a4e904fc2384e41176bece44a33a4e063b9da329",
      status: "confirmed",
      timestamp: Date.now() - 3600000, // 1 hour ago
      from: "0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73",
      to: DEPLOYED_CONTRACTS.BlumeSwapRouter,
      value: "0.5",
      type: "swap"
    },
    {
      id: "tx-2",
      hash: "0x8f7b3b52661273a4f8e7b95b1e97673252c16c6ef25f389916ec10a262c8424d",
      status: "confirmed",
      timestamp: Date.now() - 7200000, // 2 hours ago
      from: "0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73",
      to: DEPLOYED_CONTRACTS.BlumeStakingHub,
      value: "1000",
      type: "stake"
    },
    {
      id: "tx-3",
      hash: "0x4f29dbc631a355e564a2fbb1ea36436f7129301317eb4a20c7cf9d28ca57ac0e",
      status: "pending",
      timestamp: Date.now() - 300000, // 5 minutes ago
      from: "0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73",
      to: DEPLOYED_CONTRACTS.BlumeSwapRouter,
      value: "2.5",
      type: "swap"
    }
  ];