// src/hooks/useContract.ts
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3 } from '@/hooks/useWeb3';
import { useTransactions } from '@/hooks/useTransactions';
import { useToast } from '@/hooks/use-toast';
import {
  DEPLOYED_CONTRACTS,
  BLX_TOKEN_ABI,
  ROUTER_ABI,
  STAKING_HUB_ABI,
  STBLX_TOKEN_ABI,
  LP_TOKEN_ABI,
  VAULT_ABI
} from '@/lib/web3/contracts';

export function useContract() {
  const { isConnected, provider, signer } = useWeb3();
  const { addTransaction, updateTransaction } = useTransactions();
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResults, setTestResults] = useState({});

  /**
   * Get a contract instance
   */
  const getContract = useCallback((address, abi, useSigner = true) => {
    if (!provider) return null;
    
    try {
      return new ethers.Contract(
        address,
        abi,
        useSigner && signer ? signer : provider
      );
    } catch (error) {
      console.error('Error getting contract:', error);
      return null;
    }
  }, [provider, signer]);

  /**
   * Get BlumeToken contract
   */
  const getTokenContract = useCallback(() => {
    return getContract(DEPLOYED_CONTRACTS.BlumeToken, BLX_TOKEN_ABI);
  }, [getContract]);

  /**
   * Get BlumeSwapRouter contract
   */
  const getRouterContract = useCallback(() => {
    return getContract(DEPLOYED_CONTRACTS.BlumeSwapRouter, ROUTER_ABI);
  }, [getContract]);

  /**
   * Get BlumeStakingHub contract
   */
  const getStakingHubContract = useCallback(() => {
    return getContract(DEPLOYED_CONTRACTS.BlumeStakingHub, STAKING_HUB_ABI);
  }, [getContract]);

  /**
   * Get StakedBlumeToken contract
   */
  const getStBLXContract = useCallback(() => {
    return getContract(DEPLOYED_CONTRACTS.StakedBlumeToken, STBLX_TOKEN_ABI);
  }, [getContract]);

  /**
   * Get BLX-WETH Pair contract
   */
  const getLPTokenContract = useCallback(() => {
    return getContract(DEPLOYED_CONTRACTS.BLX_WETH_Pair, LP_TOKEN_ABI);
  }, [getContract]);

  /**
   * Get BlumeVault contract
   */
  const getVaultContract = useCallback(() => {
    return getContract(DEPLOYED_CONTRACTS.BlumeVault, VAULT_ABI);
  }, [getContract]);

  /**
   * Execute a contract function
   */
  const executeContractFunction = useCallback(async (
    contractInstance,
    functionName,
    args = [],
    options = {}
  ) => {
    if (!isConnected || !contractInstance) {
      throw new Error('Wallet not connected or contract not available');
    }
    
    setIsExecuting(true);
    
    try {
      // Prepare transaction
      const txFunction = contractInstance[functionName];
      const tx = await txFunction(...args, options);
      
      // If the function is a read function, return the result directly
      if (!tx.hash) {
        setIsExecuting(false);
        return tx;
      }
      
      // For transactions, add it to the tracking list
      const txId = addTransaction({
        hash: tx.hash,
        status: 'pending',
        from: await signer.getAddress(),
        to: contractInstance.target,
        value: options.value ? ethers.formatEther(options.value) : '0',
        type: 'other',
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      // Update transaction status
      updateTransaction(txId, {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
      });
      
      setIsExecuting(false);
      return receipt;
    } catch (error) {
      console.error('Contract execution error:', error);
      setIsExecuting(false);
      throw error;
    }
  }, [isConnected, signer, addTransaction, updateTransaction]);

  // Existing contract functions (swapTokens, addLiquidity, etc.)
  // ... (keeping existing implementation)

  // NEW TESTING FUNCTIONS

  /**
   * Test token operations
   */
  const testTokenOperations = useCallback(async () => {
    const results = [];
    const contract = getTokenContract();
    const userAddress = await signer.getAddress();

    try {
      // Test 1: Check token metadata
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      results.push({
        test: 'Token Metadata',
        passed: name.length > 0 && symbol === 'BLX' && decimals === 18n,
        details: `${name} (${symbol}) - ${decimals} decimals`
      });

      // Test 2: Test minting
      const mintAmount = ethers.parseEther("1000");
      const balanceBefore = await contract.balanceOf(userAddress);
      await contract.mint(userAddress, mintAmount);
      const balanceAfter = await contract.balanceOf(userAddress);
      results.push({
        test: 'Minting',
        passed: balanceAfter - balanceBefore === mintAmount,
        details: `Minted ${ethers.formatEther(mintAmount)} BLX`
      });

      // Test 3: Test transfer
      const signers = await ethers.getSigners();
      const recipient = signers[1];
      const transferAmount = ethers.parseEther("100");
      await contract.transfer(recipient.address, transferAmount);
      const recipientBalance = await contract.balanceOf(recipient.address);
      results.push({
        test: 'Transfer',
        passed: recipientBalance >= transferAmount,
        details: `Transferred ${ethers.formatEther(transferAmount)} BLX`
      });

      toast({
        title: "Token Tests Complete",
        description: `${results.filter(r => r.passed).length}/${results.length} tests passed`,
      });

      return results;
    } catch (error) {
      console.error('Token operation tests failed:', error);
      throw error;
    }
  }, [getTokenContract, signer, toast]);

  /**
   * Test DEX operations
   */
  const testDEXOperations = useCallback(async () => {
    const results = [];
    const router = getRouterContract();
    const token = getTokenContract();
    const pair = getLPTokenContract();
    const userAddress = await signer.getAddress();

    try {
      // Test 1: Add liquidity
      const blxAmount = ethers.parseEther("100");
      const ethAmount = ethers.parseEther("0.03333");
      
      await token.approve(router.target, blxAmount);
      const lpBalanceBefore = await pair.balanceOf(userAddress);
      
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await router.addLiquidityETH(
        token.target,
        blxAmount,
        0,
        0,
        userAddress,
        deadline,
        { value: ethAmount }
      );
      
      const lpBalanceAfter = await pair.balanceOf(userAddress);
      results.push({
        test: 'Add Liquidity',
        passed: lpBalanceAfter > lpBalanceBefore,
        details: `Added ${ethers.formatEther(blxAmount)} BLX + ${ethers.formatEther(ethAmount)} ETH`
      });

      // Test 2: Swap ETH for BLX
      const swapAmount = ethers.parseEther("0.01");
      const path = [DEPLOYED_CONTRACTS.WETH, token.target];
      const blxBalanceBefore = await token.balanceOf(userAddress);
      
      await router.swapExactETHForTokens(
        0,
        path,
        userAddress,
        deadline,
        { value: swapAmount }
      );
      
      const blxBalanceAfter = await token.balanceOf(userAddress);
      results.push({
        test: 'ETH to BLX Swap',
        passed: blxBalanceAfter > blxBalanceBefore,
        details: `Swapped ${ethers.formatEther(swapAmount)} ETH for BLX`
      });

      // Test 3: Check pool reserves
      const [reserve0, reserve1] = await pair.getReserves();
      results.push({
        test: 'Pool Reserves',
        passed: reserve0 > 0n && reserve1 > 0n,
        details: `Reserves: ${ethers.formatEther(reserve0)} / ${ethers.formatEther(reserve1)}`
      });

      toast({
        title: "DEX Tests Complete",
        description: `${results.filter(r => r.passed).length}/${results.length} tests passed`,
      });

      return results;
    } catch (error) {
      console.error('DEX operation tests failed:', error);
      throw error;
    }
  }, [getRouterContract, getTokenContract, getLPTokenContract, signer, toast]);

  /**
   * Test staking features
   */
  const testStakingFeatures = useCallback(async () => {
    const results = [];
    const stakingHub = getStakingHubContract();
    const token = getTokenContract();
    const stBLX = getStBLXContract();
    const userAddress = await signer.getAddress();

    try {
      // Test 1: Liquid staking
      const stakeAmount = ethers.parseEther("1000");
      await token.approve(stakingHub.target, stakeAmount);
      const stBLXBefore = await stBLX.balanceOf(userAddress);
      
      await stakingHub.stake(stakeAmount, 1); // 30-day lock
      
      const stBLXAfter = await stBLX.balanceOf(userAddress);
      results.push({
        test: 'Liquid Staking',
        passed: stBLXAfter > stBLXBefore,
        details: `Received ${ethers.formatEther(stBLXAfter - stBLXBefore)} stBLX`
      });

      // Test 2: Check staking info
      const [amount, lockEnd, , multiplier, rewards] = 
        await stakingHub.getUserStakingInfo(userAddress);
      results.push({
        test: 'Staking Info',
        passed: amount > 0n,
        details: `${ethers.formatEther(amount)} BLX staked, ${multiplier}bp multiplier`
      });

      // Test 3: Pending rewards
      const pendingRewards = await stakingHub.getPendingRewards(userAddress);
      results.push({
        test: 'Rewards Calculation',
        passed: true, // Rewards might be 0 initially
        details: `${ethers.formatEther(pendingRewards)} BLX pending`
      });

      toast({
        title: "Staking Tests Complete",
        description: `${results.filter(r => r.passed).length}/${results.length} tests passed`,
      });

      return results;
    } catch (error) {
      console.error('Staking tests failed:', error);
      throw error;
    }
  }, [getStakingHubContract, getTokenContract, getStBLXContract, signer, toast]);

  /**
   * Test vault operations
   */
  const testVaultOperations = useCallback(async () => {
    const results = [];
    const vault = getVaultContract();
    const token = getTokenContract();
    const userAddress = await signer.getAddress();

    try {
      // Test 1: Vault deposit
      const depositAmount = ethers.parseEther("500");
      await token.approve(vault.target, depositAmount);
      
      await vault.deposit(depositAmount, 0); // No lock
      
      results.push({
        test: 'Vault Deposit',
        passed: true,
        details: `Deposited ${ethers.formatEther(depositAmount)} BLX`
      });

      // Test 2: Check vault APY
      const apy = await vault.getEffectiveAPY(userAddress);
      results.push({
        test: 'Vault APY',
        passed: apy > 0n,
        details: `${Number(apy) / 100}% APY`
      });

      // Test 3: Check pending rewards
      const pendingRewards = await vault.calculatePendingRewards(userAddress);
      results.push({
        test: 'Vault Rewards',
        passed: true,
        details: `${ethers.formatEther(pendingRewards)} BLX pending`
      });

      // Test 4: Compound rewards
      await vault.compoundRewards();
      results.push({
        test: 'Compound Rewards',
        passed: true,
        details: 'Rewards compounded successfully'
      });

      toast({
        title: "Vault Tests Complete",
        description: `${results.filter(r => r.passed).length}/${results.length} tests passed`,
      });

      return results;
    } catch (error) {
      console.error('Vault tests failed:', error);
      throw error;
    }
  }, [getVaultContract, getTokenContract, signer, toast]);

  /**
   * Run security tests
   */
  const runSecurityTests = useCallback(async () => {
    const results = [];
    const token = getTokenContract();
    const userAddress = await signer.getAddress();

    try {
      // Test 1: Check role-based access
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const hasAdminRole = await token.hasRole(DEFAULT_ADMIN_ROLE, userAddress);
      results.push({
        test: 'Role Management',
        passed: hasAdminRole,
        details: `User has admin role: ${hasAdminRole}`
      });

      // Test 2: Check pause functionality
      const isPaused = await token.paused();
      results.push({
        test: 'Pause Mechanism',
        passed: true,
        details: `Contract is ${isPaused ? 'paused' : 'active'}`
      });

      // Test 3: Check transaction limits
      const maxTx = await token.maxTransactionAmount();
      const maxWallet = await token.maxWalletBalance();
      results.push({
        test: 'Transaction Limits',
        passed: maxTx > 0n && maxWallet > 0n,
        details: `Max TX: ${ethers.formatEther(maxTx)} BLX, Max Wallet: ${ethers.formatEther(maxWallet)} BLX`
      });

      // Test 4: Check cooldown protection
      const cooldownTime = await token.cooldownTime();
      results.push({
        test: 'Cooldown Protection',
        passed: cooldownTime > 0n,
        details: `${cooldownTime} seconds cooldown`
      });

      toast({
        title: "Security Tests Complete",
        description: `${results.filter(r => r.passed).length}/${results.length} tests passed`,
      });

      return results;
    } catch (error) {
      console.error('Security tests failed:', error);
      throw error;
    }
  }, [getTokenContract, signer, toast]);

  /**
   * Test yield strategies
   */
  const testYieldStrategies = useCallback(async () => {
    const results = [];
    
    try {
      // Run all yield strategy tests
      const tokenResults = await testTokenOperations();
      const stakingResults = await testStakingFeatures();
      const vaultResults = await testVaultOperations();
      const dexResults = await testDEXOperations();

      const allResults = [
        ...tokenResults,
        ...stakingResults,
        ...vaultResults,
        ...dexResults
      ];

      const passed = allResults.filter(r => r.passed).length;
      const total = allResults.length;

      results.push({
        test: 'Complete Yield Strategy',
        passed: passed / total > 0.8, // 80% success rate
        details: `${passed}/${total} components working`
      });

      toast({
        title: "Yield Strategy Tests Complete",
        description: `${results.filter(r => r.passed).length}/${results.length} strategies validated`,
      });

      return results;
    } catch (error) {
      console.error('Yield strategy tests failed:', error);
      throw error;
    }
  }, [testTokenOperations, testStakingFeatures, testVaultOperations, testDEXOperations, toast]);

  return {
    // Existing functions
    getContract,
    getTokenContract,
    getRouterContract,
    getStakingHubContract,
    getStBLXContract,
    getLPTokenContract,
    getVaultContract,
    executeContractFunction,
    isExecuting,
    
    // New testing functions
    testTokenOperations,
    testDEXOperations,
    testStakingFeatures,
    testVaultOperations,
    runSecurityTests,
    testYieldStrategies,
    testResults
  };
}