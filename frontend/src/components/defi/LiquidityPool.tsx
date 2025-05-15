import { useState } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useContract } from '@/hooks/useContract';
import { useToast } from '@/hooks/use-toast';
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

// Mock liquidity pool pairs
const POOL_PAIRS = [
  { id: 'blx-eth', name: 'BLX-ETH', tokens: ['BLX', 'ETH'], apr: '4.2%', tvl: '$24.5M' },
  { id: 'eth-usdc', name: 'ETH-USDC', tokens: ['ETH', 'USDC'], apr: '3.8%', tvl: '$18.2M' },
  { id: 'blx-usdc', name: 'BLX-USDC', tokens: ['BLX', 'USDC'], apr: '5.1%', tvl: '$8.7M' },
];

// Mock ratios between tokens (in a real app, this would come from the pool reserves)
const RATIOS = {
  'blx-eth': 0.00055, // 1 BLX = 0.00055 ETH
  'eth-usdc': 1800, // 1 ETH = 1800 USDC
  'blx-usdc': 1, // 1 BLX = 1 USDC
};

export function LiquidityPool() {
  const { isConnected } = useWeb3();
  const { getTokenContract, getRouterContract, addLiquidity, isExecuting } = useContract();
  const { toast } = useToast();
  
  const [selectedPair, setSelectedPair] = useState(POOL_PAIRS[0].id);
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [action, setAction] = useState('add');

  // Get the selected pair details
  const currentPair = POOL_PAIRS.find(pair => pair.id === selectedPair);
  const token1 = TOKENS.find(t => t.symbol === currentPair?.tokens[0]);
  const token2 = TOKENS.find(t => t.symbol === currentPair?.tokens[1]);

  // Calculate second token amount based on the ratio
  const calculateTokenAmount = (amount, isFirstToken) => {
    if (!amount || parseFloat(amount) <= 0) {
      if (isFirstToken) {
        setToken2Amount('');
      } else {
        setToken1Amount('');
      }
      return;
    }

    const ratio = RATIOS[selectedPair] || 1;
    
    if (isFirstToken) {
      const result = parseFloat(amount) * ratio;
      setToken2Amount(result.toFixed(6));
    } else {
      const result = parseFloat(amount) / ratio;
      setToken1Amount(result.toFixed(6));
    }
  };

  // Handle adding liquidity
  const handleAddLiquidity = async () => {
    if (!token1 || !token2 || !token1Amount || !token2Amount) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid amounts for both tokens",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert amounts to wei
      const parsedToken1Amount = ethers.parseUnits(token1Amount, token1.decimals);
      const parsedToken2Amount = ethers.parseUnits(token2Amount, token2.decimals);
      
      // Calculate minimum amounts (with 3% slippage tolerance)
      const minToken1Amount = parsedToken1Amount.mul(97).div(100);
      const minToken2Amount = parsedToken2Amount.mul(97).div(100);

      // Get token contracts
      const token1Contract = await getTokenContract();
      
      // Approve router to spend tokens
      await token1Contract.approve(DEPLOYED_CONTRACTS.BlumeSwapRouter, parsedToken1Amount);
      
      // For token2, if it's ETH we need a different approval
      let token2Contract;
      if (token2.symbol === 'ETH') {
        // For ETH, we would use addLiquidityETH instead
        // This is just a mock implementation
        toast({
          title: "ETH Liquidity",
          description: "Adding liquidity with ETH is not implemented in this demo",
        });
        return;
      } else {
        token2Contract = await getTokenContract();
        await token2Contract.approve(DEPLOYED_CONTRACTS.BlumeSwapRouter, parsedToken2Amount);
      }

      // Add liquidity
      await addLiquidity(
        token1.address,
        token2.address,
        parsedToken1Amount,
        parsedToken2Amount,
        minToken1Amount,
        minToken2Amount
      );

      toast({
        title: "Liquidity Added",
        description: `Successfully added ${token1Amount} ${token1.symbol} and ${token2Amount} ${token2.symbol} to the pool`,
      });
      
      // Reset input fields
      setToken1Amount('');
      setToken2Amount('');
    } catch (error) {
      console.error(error);
      toast({
        title: "Transaction Failed",
        description: error.message || "Failed to add liquidity to the pool",
        variant: "destructive",
      });
    }
  };

  // Handle removing liquidity
  const handleRemoveLiquidity = async () => {
    toast({
      title: "Not Implemented",
      description: "Removing liquidity is not implemented in this demo",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Liquidity Pools</CardTitle>
            <CardDescription>Provide liquidity and earn fees</CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant={action === 'add' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setAction('add')}
            >
              Add
            </Button>
            <Button 
              variant={action === 'remove' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setAction('remove')}
            >
              Remove
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pool Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Pool</label>
          <Select
            value={selectedPair}
            onValueChange={(value) => {
              setSelectedPair(value);
              setToken1Amount('');
              setToken2Amount('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a pool" />
            </SelectTrigger>
            <SelectContent>
              {POOL_PAIRS.map((pair) => (
                <SelectItem key={pair.id} value={pair.id}>
                  <div className="flex items-center">
                    <span className="mr-2">{pair.tokens[0]}-{pair.tokens[1]}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      APR: {pair.apr}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {currentPair && (
          <div className="grid grid-cols-2 gap-4 bg-muted/40 p-3 rounded-md">
            <div>
              <span className="text-xs text-muted-foreground">Pool</span>
              <p className="font-medium">{currentPair.name}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">APR</span>
              <p className="font-medium">{currentPair.apr}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Value Locked</span>
              <p className="font-medium">{currentPair.tvl}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Your Position</span>
              <p className="font-medium">0.00 LP</p>
            </div>
          </div>
        )}

        {action === 'add' ? (
          <>
            {/* First Token Input */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-sm font-medium">{token1?.symbol}</label>
                <span className="text-xs text-muted-foreground">Balance: 0.00</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-muted px-3 py-2 rounded-md">
                  <span>{token1?.icon}</span>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={token1Amount}
                  onChange={(e) => {
                    setToken1Amount(e.target.value);
                    calculateTokenAmount(e.target.value, true);
                  }}
                  min="0"
                  disabled={isExecuting}
                />
              </div>
            </div>

            {/* Second Token Input */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-sm font-medium">{token2?.symbol}</label>
                <span className="text-xs text-muted-foreground">Balance: 0.00</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-muted px-3 py-2 rounded-md">
                  <span>{token2?.icon}</span>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={token2Amount}
                  onChange={(e) => {
                    setToken2Amount(e.target.value);
                    calculateTokenAmount(e.target.value, false);
                  }}
                  min="0"
                  disabled={isExecuting}
                />
              </div>
            </div>
          </>
        ) : (
          // Remove Liquidity UI
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount to Remove (%)</label>
              <Input
                type="number"
                placeholder="0.00"
                value={token1Amount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Limit to 100%
                  if (!value || parseFloat(value) <= 100) {
                    setToken1Amount(value);
                  }
                }}
                min="0"
                max="100"
                disabled={isExecuting}
              />
            </div>
            
            <div className="bg-muted/40 p-3 rounded-md">
              <p className="text-sm mb-2">You will receive (estimated):</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <span>{token1?.icon}</span>
                  <span>{token1Amount ? (parseFloat(token1Amount) / 100 * 10).toFixed(6) : '0.00'} {token1?.symbol}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>{token2?.icon}</span>
                  <span>{token1Amount ? (parseFloat(token1Amount) / 100 * (10 * parseFloat(RATIOS[selectedPair] || 1))).toFixed(6) : '0.00'} {token2?.symbol}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          size="lg"
          onClick={action === 'add' ? handleAddLiquidity : handleRemoveLiquidity}
          disabled={isExecuting || !token1Amount || parseFloat(token1Amount) <= 0 || !isConnected}
        >
          {isExecuting 
            ? 'Processing...' 
            : !isConnected
              ? 'Connect Wallet'
              : !token1Amount || parseFloat(token1Amount) <= 0
                ? 'Enter an amount'
                : action === 'add'
                  ? `Add Liquidity to ${currentPair?.name}`
                  : `Remove ${token1Amount}% Liquidity`}
        </Button>
      </CardFooter>
    </Card>
  );
}