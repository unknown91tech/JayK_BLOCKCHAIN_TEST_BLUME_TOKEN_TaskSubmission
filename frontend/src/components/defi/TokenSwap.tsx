// src/components/defi/TokenSwap.tsx - Corrected Version
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, RefreshCw, TestTube, Activity, Shield } from 'lucide-react';
import { useContract } from '@/hooks/useContract';
import { useToast } from '@/hooks/use-toast';
import { formatAddress } from '@/lib/web3/networks';
import { useWeb3 } from '@/hooks/useWeb3';
import { DEPLOYED_CONTRACTS } from '@/lib/web3/contracts';

// Mock token data for the demo
const TOKENS = [
  { 
    symbol: 'BLX', 
    name: 'BLUME TOKEN', 
    address: DEPLOYED_CONTRACTS.BlumeToken, 
    decimals: 18, 
    icon: '🔵' 
  },
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    address: DEPLOYED_CONTRACTS.WETH, 
    decimals: 18, 
    icon: '⟠' 
  },
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 
    decimals: 6, 
    icon: '💲' 
  },
];

export function TokenSwap() {
  const { isConnected } = useWeb3();
  const { getTokenContract, swapTokens, isExecuting, testDEXOperations } = useContract();
  const { toast } = useToast();
  
  const [fromToken, setFromToken] = useState(TOKENS[0].symbol);
  const [toToken, setToToken] = useState(TOKENS[1].symbol);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [tokenBalances, setTokenBalances] = useState({});
  const [isTestingDEX, setIsTestingDEX] = useState(false);

  // Get token objects
  const fromTokenObj = TOKENS.find(t => t.symbol === fromToken);
  const toTokenObj = TOKENS.find(t => t.symbol === toToken);

  // Load token balances when connected
  useEffect(() => {
    if (isConnected) {
      const loadBalances = async () => {
        const balances = {};
        
        for (const token of TOKENS) {
          try {
            // Skip ETH balance as it's handled by the web3 hook
            if (token.symbol === 'ETH') continue;
            
            const contract = await getTokenContract();
            if (contract) {
              const balance = await contract.balanceOf(window.ethereum.selectedAddress);
              balances[token.symbol] = ethers.formatUnits(balance, token.decimals);
            }
          } catch (error) {
            console.error(`Error loading ${token.symbol} balance:`, error);
          }
        }
        
        setTokenBalances(balances);
      };
      
      loadBalances();
    }
  }, [isConnected, getTokenContract]);

  // Calculate expected output amount (mock implementation)
  const calculateExpectedOutput = (input) => {
    if (!input || parseFloat(input) <= 0 || !fromTokenObj || !toTokenObj) {
      setToAmount('');
      return;
    }

    setIsCalculating(true);

    // Simulate API delay
    setTimeout(() => {
      // Mock conversion rate (in a real app, this would come from an oracle or DEX API)
      const rates = {
        'BLX': { 'ETH': 0.00055, 'USDC': 1 },
        'ETH': { 'BLX': 1800, 'USDC': 3300 },
        'USDC': { 'BLX': 1, 'ETH': 0.000303 },
      };
      
      if (fromToken === toToken) {
        setToAmount(input);
      } else {
        const rate = rates[fromToken]?.[toToken] || 0;
        const result = parseFloat(input) * rate;
        setToAmount(result.toFixed(6));
      }
      setIsCalculating(false);
    }, 500);
  };

  // Handle swap button click
  const handleSwap = async () => {
    if (!fromTokenObj || !toTokenObj || !fromAmount || parseFloat(fromAmount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid amount to swap",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert amounts to wei
      const parsedFromAmount = ethers.parseUnits(fromAmount, fromTokenObj.decimals);
      const minToAmount = ethers.parseUnits(
        (parseFloat(toAmount) * 0.97).toFixed(toTokenObj.decimals), 
        toTokenObj.decimals
      ); // 3% slippage tolerance
      
      // Get token contracts first for approval
      const tokenContract = getTokenContract();

      // Approve router to spend tokens
      await tokenContract.approve(DEPLOYED_CONTRACTS.BlumeSwapRouter, parsedFromAmount);
      
      // Execute swap
      await swapTokens(
        fromTokenObj.address, 
        toTokenObj.address,
        parsedFromAmount,
        minToAmount
      );

      toast({
        title: "Swap Initiated",
        description: `Swapping ${fromAmount} ${fromToken} to ${toAmount} ${toToken}`,
      });
      
      // Reset input fields after successful swap
      setFromAmount('');
      setToAmount('');
    } catch (error) {
      console.error(error);
      toast({
        title: "Swap Failed",
        description: error.message || "Failed to execute the swap",
        variant: "destructive",
      });
    }
  };

  // Handle token swap (flip from/to tokens)
  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Handle DEX test button click
  const handleTestDEX = async () => {
    setIsTestingDEX(true);
    try {
      const results = await testDEXOperations();
      const passed = results.filter(r => r.passed).length;
      
      toast({
        title: "DEX Tests Complete",
        description: `${passed}/${results.length} tests passed`,
        variant: passed === results.length ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingDEX(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Swap Tokens</CardTitle>
            <CardDescription>Exchange tokens at the best rates</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestDEX}
              disabled={isTestingDEX || isExecuting || !isConnected}
              className="flex items-center gap-2"
            >
              {isTestingDEX ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              Test DEX
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">From</label>
            <span className="text-xs text-muted-foreground">
              Balance: {isConnected ? (tokenBalances[fromToken] || '0.00') : '—'}
            </span>
          </div>
          <div className="flex space-x-2">
            <Select
              value={fromToken}
              onValueChange={(value) => {
                if (value === toToken) {
                  switchTokens();
                } else {
                  setFromToken(value);
                  if (fromAmount) calculateExpectedOutput(fromAmount);
                }
              }}
            >
              <SelectTrigger className="w-1/3">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {TOKENS.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center">
                      <span className="mr-2">{token.icon}</span>
                      {token.symbol}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="0.00"
              value={fromAmount}
              onChange={(e) => {
                setFromAmount(e.target.value);
                calculateExpectedOutput(e.target.value);
              }}
              min="0"
              disabled={isExecuting}
            />
          </div>
          {fromTokenObj && (
            <div className="text-xs text-muted-foreground">
              {fromTokenObj.name} • {formatAddress(fromTokenObj.address)}
            </div>
          )}
        </div>

        {/* Switch button */}
        <div className="flex justify-center">
          <Button 
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-muted"
            onClick={switchTokens}
            disabled={isExecuting}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium">To</label>
            <span className="text-xs text-muted-foreground">
              Balance: {isConnected ? (tokenBalances[toToken] || '0.00') : '—'}
            </span>
          </div>
          <div className="flex space-x-2">
            <Select
              value={toToken}
              onValueChange={(value) => {
                if (value === fromToken) {
                  switchTokens();
                } else {
                  setToToken(value);
                  if (fromAmount) calculateExpectedOutput(fromAmount);
                }
              }}
            >
              <SelectTrigger className="w-1/3">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {TOKENS.map((token) => (
                  <SelectItem key={token.symbol} value={token.symbol}>
                    <div className="flex items-center">
                      <span className="mr-2">{token.icon}</span>
                      {token.symbol}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Input
                type="number"
                placeholder="0.00"
                value={toAmount}
                readOnly
                className="pr-8"
              />
              {isCalculating && (
                <RefreshCw className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
          {toTokenObj && (
            <div className="text-xs text-muted-foreground">
              {toTokenObj.name} • {formatAddress(toTokenObj.address)}
            </div>
          )}
        </div>

        {fromToken && toToken && fromToken !== toToken && fromAmount && toAmount && (
          <div className="text-xs text-muted-foreground pt-1">
            <span>Exchange Rate: </span>
            <span className="font-medium">1 {fromToken} ≈ {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken}</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSwap}
          disabled={!isConnected || isExecuting || !fromAmount || parseFloat(fromAmount) <= 0}
        >
          {isExecuting 
            ? 'Processing...' 
            : !isConnected 
              ? 'Connect Wallet' 
              : !fromAmount || parseFloat(fromAmount) <= 0
                ? 'Enter an amount'
                : `Swap ${fromToken} to ${toToken}`}
        </Button>
      </CardFooter>
    </Card>
  );
}