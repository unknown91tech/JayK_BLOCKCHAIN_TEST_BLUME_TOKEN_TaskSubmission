import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getNetworkByChainId, getDefaultNetwork } from '@/lib/web3/networks';

// This hook manages the web3 connection state
export function useWeb3() {
  // State for wallet information
  const [walletState, setWalletState] = useState({
    isConnected: false,
    address: null,
    chainId: null,
    balance: null,
    network: null,
    isConnecting: false,
    error: null,
    provider: null,
    signer: null
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && window.ethereum !== undefined;
  }, []);

  // Initialize web3 on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isMetaMaskInstalled()) return;

      try {
        // Check if already connected
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          // User is already connected
          const address = accounts[0].address;
          const signer = await provider.getSigner();
          
          // Get network details
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          const networkInfo = getNetworkByChainId(chainId);
          
          // Get account balance
          const balance = await provider.getBalance(address);
          const formattedBalance = ethers.formatEther(balance);
          
          setWalletState({
            isConnected: true,
            address,
            chainId,
            balance: formattedBalance,
            network: networkInfo ? (networkInfo.name.toLowerCase()) : null,
            isConnecting: false,
            error: null,
            provider,
            signer
          });
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();
  }, [isMetaMaskInstalled]);

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setWalletState(prev => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask to use this application.',
        isConnecting: false,
      }));
      return;
    }

    try {
      setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      // Request account access
      const provider = new ethers.BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const accounts = await provider.listAccounts();
      const address = accounts[0].address;
      const signer = await provider.getSigner();
      
      // Get network details
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const networkInfo = getNetworkByChainId(chainId);
      
      // Get account balance
      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.formatEther(balance);
      
      setWalletState({
        isConnected: true,
        address,
        chainId,
        balance: formattedBalance,
        network: networkInfo ? (networkInfo.name.toLowerCase()) : null,
        isConnecting: false,
        error: null,
        provider,
        signer
      });
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to connect to wallet. Please try again.',
      }));
    }
  }, [isMetaMaskInstalled]);

  // Switch to a specific network
  const switchNetwork = useCallback(async (chainId) => {
    if (!isMetaMaskInstalled() || !walletState.isConnected) return;

    try {
      setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));
      
      const networkInfo = getNetworkByChainId(chainId);
      if (!networkInfo) {
        throw new Error('Network not supported');
      }

      const hexChainId = `0x${chainId.toString(16)}`;

      try {
        // Try to switch to the network
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
      } catch (switchError) {
        // If the network is not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: networkInfo.name,
                nativeCurrency: {
                  name: networkInfo.symbol,
                  symbol: networkInfo.symbol,
                  decimals: 18,
                },
                rpcUrls: [networkInfo.rpcUrl],
                blockExplorerUrls: [networkInfo.blockExplorer],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Refresh state after network switch
      await connectWallet();
      
    } catch (error) {
      console.error('Error switching network:', error);
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: `Failed to switch network: ${error.message}`,
      }));
    }
  }, [connectWallet, isMetaMaskInstalled, walletState.isConnected]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: null,
      network: null,
      isConnecting: false,
      error: null,
      provider: null,
      signer: null
    });
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (isMetaMaskInstalled()) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          // User has disconnected all accounts
          disconnectWallet();
        } else if (walletState.address !== accounts[0]) {
          // User has switched accounts
          connectWallet();
        }
      };

      const handleChainChanged = () => {
        // When chain changes, refresh the page as recommended by MetaMask
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [walletState.address, connectWallet, disconnectWallet, isMetaMaskInstalled]);

  // Auto-switch to the development network (Hoodi testnet)
  useEffect(() => {
    const autoSwitchToTestnet = async () => {
      if (walletState.isConnected && walletState.chainId) {
        const targetNetwork = getDefaultNetwork();
        
        // If not on the target network, offer to switch
        if (walletState.chainId !== targetNetwork.chainId) {
          const confirmed = window.confirm(
            `This app is designed to work with ${targetNetwork.name}. Would you like to switch networks?`
          );
          
          if (confirmed) {
            await switchNetwork(targetNetwork.chainId);
          }
        }
      }
    };

    if (walletState.isConnected && !walletState.isConnecting) {
      autoSwitchToTestnet();
    }
  }, [walletState.isConnected, walletState.isConnecting, walletState.chainId, switchNetwork]);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    isMetaMaskInstalled: isMetaMaskInstalled(),
  };
}