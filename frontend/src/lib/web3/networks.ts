// Network configurations for the app
export const NETWORKS = {
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    symbol: 'ETH',
    blockExplorer: 'https://etherscan.io',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY'
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    symbol: 'MATIC',
    blockExplorer: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com'
  },
  binance: {
    name: 'BNB Chain',
    chainId: 56,
    symbol: 'BNB',
    blockExplorer: 'https://bscscan.com',
    rpcUrl: 'https://bsc-dataseed.binance.org'
  },
  arbitrum: {
    name: 'Arbitrum',
    chainId: 42161,
    symbol: 'ETH',
    blockExplorer: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc'
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    symbol: 'ETH',
    blockExplorer: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://mainnet.optimism.io'
  },
  // Add Hoodi testnet for testing
  hoodi: {
    name: 'Hoodi Testnet',
    chainId: 560048, // replace with the actual chain ID for Hoodi
    symbol: 'ETH',
    blockExplorer: 'https://explorer.hoodi.network',
    rpcUrl: 'https://rpc.hoodi.network' // replace with actual RPC URL
  }
};

// Test networks for development
export const TEST_NETWORKS = {
  goerli: {
    name: 'Goerli',
    chainId: 5,
    symbol: 'ETH',
    blockExplorer: 'https://goerli.etherscan.io',
    rpcUrl: 'https://goerli.infura.io/v3/YOUR_INFURA_KEY'
  },
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    symbol: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
  },
  mumbai: {
    name: 'Mumbai',
    chainId: 80001,
    symbol: 'MATIC',
    blockExplorer: 'https://mumbai.polygonscan.com',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com'
  },
  hoodi: {
    name: 'Hoodi Testnet',
    chainId: 560048, // replace with the actual chain ID for Hoodi
    symbol: 'ETH',
    blockExplorer: 'https://explorer.hoodi.network',
    rpcUrl: 'https://rpc.hoodi.network' // replace with actual RPC URL
  }
};

// Get network information by chain ID
export function getNetworkByChainId(chainId) {
  // Check main networks
  const mainNetworkEntries = Object.entries(NETWORKS);
  const mainNetwork = mainNetworkEntries.find(([, network]) => network.chainId === chainId);
  if (mainNetwork) return mainNetwork[1];

  // Check test networks
  const testNetworkEntries = Object.entries(TEST_NETWORKS);
  const testNetwork = testNetworkEntries.find(([, network]) => network.chainId === chainId);
  if (testNetwork) return testNetwork[1];

  return undefined;
}

// Format address for display
export function formatAddress(address) {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Get network details for current/target environment
export function getDefaultNetwork() {
  // For development/testing, use Hoodi testnet
  return NETWORKS.hoodi;
}