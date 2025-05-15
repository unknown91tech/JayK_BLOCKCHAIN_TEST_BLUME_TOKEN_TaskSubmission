// src/lib/web3/types.ts
export type NetworkType = 'ethereum' | 'polygon' | 'binance' | 'arbitrum' | 'optimism';

export interface Network {
  name: string;
  chainId: number;
  symbol: string;
  blockExplorer: string;
}

export interface Transaction {
  id: string;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  type: 'send' | 'swap' | 'approve' | 'other' | 'stake' | 'unstake';
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  network: NetworkType | null;
  isConnecting: boolean;
  error: string | null;
}

export interface ContractInfo {
  name: string;
  address: string;
  description: string;
  actions: ContractAction[];
}

export interface ContractAction {
  name: string;
  description: string;
  inputs: ContractInput[];
  stateMutability: 'view' | 'nonpayable' | 'payable';
}

export interface ContractInput {
  name: string;
  type: string;
  description?: string;
}

export interface TestResult {
  test: string;
  passed: boolean;
  details: string;
  error?: string;
  metrics?: Record<string, any>;
}