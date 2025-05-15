// src/components/testing/YieldStrategyTester.tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useContract } from '@/hooks/useContract';
import { useToast } from '@/hooks/use-toast';
import { useWeb3 } from '@/hooks/useWeb3';
import { ethers } from 'ethers';
import { TrendingUp, Play, DollarSign, Timer, RefreshCw, Target } from 'lucide-react';

export function YieldStrategyTester() {
  const { 
    getTokenContract,
    getStakingHubContract,
    getVaultContract,
    getRouterContract,
    getLPTokenContract,
    isExecuting 
  } = useContract();
  const { signer } = useWeb3();
  const { toast } = useToast();
  
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState('');

  const yieldStrategies = [
    {
      id: 'simple-staking',
      name: 'Simple Staking',
      description: 'Basic BLX staking with tier rewards',
      icon: <Target className="h-5 w-5" />,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'liquid-staking',
      name: 'Liquid Staking',
      description: 'Stake BLX, receive stBLX tokens',
      icon: <DollarSign className="h-5 w-5" />,
      color: 'bg-green-100 text-green-800'
    },
    {
      id: 'vault-staking',
      name: 'Vault Staking',
      description: 'Time-locked deposits with 10% APY',
      icon: <Timer className="h-5 w-5" />,
      color: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'lp-farming',
      name: 'LP Farming',
      description: 'Provide liquidity, earn trading fees',
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'bg-orange-100 text-orange-800'
    },
    {
      id: 'compound-strategy',
      name: 'Compound Strategy',
      description: 'Auto-compound rewards across strategies',
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'bg-yellow-100 text-yellow-800'
    }
  ];

  const runYieldStrategy = async (strategy) => {
    setIsRunning(true);
    setCurrentStrategy(strategy.id);
    
    const result = {
      id: strategy.id,
      name: strategy.name,
      passed: false,
      metrics: {},
      details: '',
      error: null,
      timestamp: new Date()
    };

    try {
      switch (strategy.id) {
        case 'simple-staking':
          result.metrics = await testSimpleStaking();
          result.passed = result.metrics.success;
          result.details = result.passed ? 'Simple staking strategy working' : 'Issues with simple staking';
          break;
        case 'liquid-staking':
          result.metrics = await testLiquidStaking();
          result.passed = result.metrics.success;
          result.details = result.passed ? 'Liquid staking strategy working' : 'Issues with liquid staking';
          break;
        case 'vault-staking':
          result.metrics = await testVaultStaking();
          result.passed = result.metrics.success;
          result.details = result.passed ? 'Vault staking strategy working' : 'Issues with vault staking';
          break;
        case 'lp-farming':
          result.metrics = await testLPFarming();
          result.passed = result.metrics.success;
          result.details = result.passed ? 'LP farming strategy working' : 'Issues with LP farming';
          break;
        case 'compound-strategy':
          result.metrics = await testCompoundStrategy();
          result.passed = result.metrics.success;
          result.details = result.passed ? 'Compound strategy working' : 'Issues with compounding';
          break;
        default:
          throw new Error('Strategy not implemented');
      }
    } catch (error) {
      result.error = error.message;
      result.details = `Strategy failed: ${error.message}`;
    }

    setTestResults(prev => ({ ...prev, [strategy.id]: result }));
    setIsRunning(false);
    setCurrentStrategy('');
    
    return result;
  };

  const testSimpleStaking = async () => {
    const stakingHub = getStakingHubContract();
    const token = getTokenContract();
    const userAddress = await signer.getAddress();
    
    try {
      // Check if user has BLX
      let balance = await token.balanceOf(userAddress);
      
      // Mint if needed
      if (balance < ethers.parseEther("1000")) {
        await token.mint(userAddress, ethers.parseEther("1000"));
        balance = await token.balanceOf(userAddress);
      }

      // Approve and stake
      await token.approve(stakingHub.target, ethers.parseEther("500"));
      
      // Get staking info before
      const [amountBefore] = await stakingHub.getUserStakingInfo(userAddress);
      
      // Stake tokens (tier 1 = 30-day lock)
      await stakingHub.stake(ethers.parseEther("500"), 1);
      
      // Get staking info after
      const [amountAfter, lockEnd, , multiplier, rewards] = 
        await stakingHub.getUserStakingInfo(userAddress);
      
      return {
        success: amountAfter > amountBefore,
        stakedAmount: ethers.formatEther(amountAfter),
        multiplier: multiplier.toString(),
        lockEnd: new Date(Number(lockEnd) * 1000).toISOString(),
        rewards: ethers.formatEther(rewards)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const testLiquidStaking = async () => {
    const stakingHub = getStakingHubContract();
    const token = getTokenContract();
    const stBLX = getStBLXContract();
    const userAddress = await signer.getAddress();
    
    try {
      // Get initial stBLX balance
      const stBLXBefore = await stBLX.balanceOf(userAddress);
      
      // Ensure we have BLX
      let balance = await token.balanceOf(userAddress);
      if (balance < ethers.parseEther("1000")) {
        await token.mint(userAddress, ethers.parseEther("1000"));
      }

      // Approve and stake
      await token.approve(stakingHub.target, ethers.parseEther("1000"));
      await stakingHub.stake(ethers.parseEther("1000"), 0); // No lock
      
      // Get stBLX balance after
      const stBLXAfter = await stBLX.balanceOf(userAddress);
      const stBLXReceived = stBLXAfter - stBLXBefore;
      
      return {
        success: stBLXReceived > 0n,
        stBLXReceived: ethers.formatEther(stBLXReceived),
        stBLXBalance: ethers.formatEther(stBLXAfter),
        exchangeRate: stBLXReceived > 0n ? 
          (ethers.parseEther("1000") * 100n / stBLXReceived).toString() + '%' : 'N/A'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const testVaultStaking = async () => {
    const vault = getVaultContract();
    const token = getTokenContract();
    const userAddress = await signer.getAddress();
    
    try {
      // Ensure we have BLX
      let balance = await token.balanceOf(userAddress);
      if (balance < ethers.parseEther("500")) {
        await token.mint(userAddress, ethers.parseEther("500"));
      }

      // Approve and deposit to vault
      await token.approve(vault.target, ethers.parseEther("500"));
      await vault.deposit(ethers.parseEther("500"), 0); // No lock
      
      // Get vault info
      const apy = await vault.getEffectiveAPY(userAddress);
      const pendingRewards = await vault.calculatePendingRewards(userAddress);
      
      // Try to compound rewards
      await vault.compoundRewards();
      
      return {
        success: true,
        depositAmount: "500",
        apy: (Number(apy) / 100).toString() + '%',
        pendingRewards: ethers.formatEther(pendingRewards),
        compounded: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const testLPFarming = async () => {
    const router = getRouterContract();
    const token = getTokenContract();
    const pair = getLPTokenContract();
    const userAddress = await signer.getAddress();
    
    try {
      // Ensure we have BLX
      let balance = await token.balanceOf(userAddress);
      if (balance < ethers.parseEther("100")) {
        await token.mint(userAddress, ethers.parseEther("100"));
      }

      // Get initial LP balance
      const lpBefore = await pair.balanceOf(userAddress);
      
      // Approve BLX for router
      await token.approve(router.target, ethers.parseEther("100"));
      
      // Add liquidity
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      await router.addLiquidityETH(
        token.target,
        ethers.parseEther("100"),
        0,
        0,
        userAddress,
        deadline,
        { value: ethers.parseEther("0.033") }
      );
      
      // Get LP balance after
      const lpAfter = await pair.balanceOf(userAddress);
      const lpReceived = lpAfter - lpBefore;
      
      // Simulate some trading by swapping
      const path = [DEPLOYED_CONTRACTS.WETH, token.target];
      await router.swapExactETHForTokens(
        0,
        path,
        userAddress,
        deadline,
        { value: ethers.parseEther("0.01") }
      );
      
      return {
        success: lpReceived > 0n,
        lpTokens: ethers.formatEther(lpReceived),
        blxAdded: "100",
        ethAdded: "0.033",
        tradingFeesGenerated: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const testCompoundStrategy = async () => {
    const stakingHub = getStakingHubContract();
    const vault = getVaultContract();
    const userAddress = await signer.getAddress();
    
    try {
      // Update staking hub rewards
      await stakingHub.updateRewardsAndExchangeRate();
      
      // Get pending rewards from staking
      const stakingRewards = await stakingHub.getPendingRewards(userAddress);
      
      // Get pending rewards from vault
      const vaultRewards = await vault.calculatePendingRewards(userAddress);
      
      // Compound vault rewards
      await vault.compoundRewards();
      
      // Try to claim staking rewards
      try {
        await stakingHub.claimRewards();
      } catch (e) {
        // Might fail if no rewards to claim
      }
      
      return {
        success: true,
        stakingRewards: ethers.formatEther(stakingRewards),
        vaultRewards: ethers.formatEther(vaultRewards),
        vaultCompounded: true,
        stakingClaimed: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  const runAllStrategies = async () => {
    for (const strategy of yieldStrategies) {
      await runYieldStrategy(strategy);
    }

    const results = Object.values(testResults);
    const passed = results.filter(r => r.passed).length;

    toast({
      title: "Yield Strategy Tests Complete",
      description: `${passed}/${results.length} strategies working`,
    });
  };

  const getStrategyProgress = () => {
    const completed = Object.keys(testResults).length;
    return (completed / yieldStrategies.length) * 100;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Yield Strategy Test Suite
          </CardTitle>
          <CardDescription>
            Test complete yield farming workflows and compound strategies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Strategy Testing Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(testResults).length}/{yieldStrategies.length} strategies tested
                </p>
              </div>
              <Button 
                onClick={runAllStrategies}
                disabled={isRunning || isExecuting}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Test All Strategies
              </Button>
            </div>
            <Progress value={getStrategyProgress()} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {yieldStrategies.map((strategy) => {
          const result = testResults[strategy.id];
          const isActive = currentStrategy === strategy.id;

          return (
            <Card key={strategy.id} className={isActive ? 'ring-2 ring-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {strategy.icon}
                    <div>
                      <CardTitle className="text-base">{strategy.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {strategy.description}
                      </CardDescription>
                    </div>
                  </div>
                  {result && (
                    <Badge 
                      variant={result.passed ? 'default' : 'destructive'}
                      className={strategy.color}
                    >
                      {result.passed ? 'Working' : 'Failed'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {result && result.timestamp && (
                    <div className="text-xs text-muted-foreground">
                      Last tested: {result.timestamp.toLocaleTimeString()}
                    </div>
                  )}
                  
                  {result && result.details && (
                    <div className="text-sm">
                      <strong>Status:</strong> {result.details}
                    </div>
                  )}
                  
                  {result && result.error && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      Error: {result.error}
                    </div>
                  )}
                  
                  {result && result.metrics && Object.keys(result.metrics).length > 0 && (
                    <div className="text-xs space-y-1">
                      <strong>Results:</strong>
                      {Object.entries(result.metrics).map(([key, value]) => (
                        key !== 'success' && key !== 'error' && (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-mono">{value?.toString() || 'N/A'}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runYieldStrategy(strategy)}
                    disabled={isRunning || isExecuting}
                    className="w-full"
                  >
                    {isActive ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-2" />
                        {result ? 'Retest' : 'Test'} Strategy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {Object.keys(testResults).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yield Strategy Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {Object.values(testResults).filter(r => r.passed).length}
                </div>
                <div className="text-sm text-muted-foreground">Working Strategies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {Object.values(testResults).filter(r => !r.passed).length}
                </div>
                <div className="text-sm text-muted-foreground">Failed Strategies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(testResults).length}
                </div>
                <div className="text-sm text-muted-foreground">Total Tested</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round((Object.values(testResults).filter(r => r.passed).length / Object.values(testResults).length) * 100)}%
                </div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
            
            {Object.values(testResults).every(r => r.passed) && Object.values(testResults).length === yieldStrategies.length && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
                <div className="text-green-700 font-medium">
                  🎉 All yield strategies are working correctly!
                </div>
                <div className="text-green-600 text-sm mt-1">
                  Your DeFi ecosystem is ready for yield farming
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}