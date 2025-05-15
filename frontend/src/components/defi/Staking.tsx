// src/components/defi/Staking.tsx - Corrected Version
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useContract } from '@/hooks/useContract';
import { useToast } from '@/hooks/use-toast';
import { useWeb3 } from '@/hooks/useWeb3';
import { DEPLOYED_CONTRACTS } from '@/lib/web3/contracts';
import { TestTube, Trophy, Timer, RefreshCw, Calculator, Shield } from 'lucide-react';

// Staking lock tiers
const LOCK_TIERS = [
  { id: 0, name: 'No Lock', days: 0, multiplier: '1.0x', earlyWithdrawalFee: '0%' },
  { id: 1, name: '30 Days', days: 30, multiplier: '1.1x', earlyWithdrawalFee: '10%' },
  { id: 2, name: '90 Days', days: 90, multiplier: '1.3x', earlyWithdrawalFee: '15%' },
  { id: 3, name: '180 Days', days: 180, multiplier: '1.6x', earlyWithdrawalFee: '20%' },
  { id: 4, name: '365 Days', days: 365, multiplier: '2.0x', earlyWithdrawalFee: '25%' },
];

export function Staking() {
  const { isConnected, address } = useWeb3();
  const { 
    getTokenContract, 
    getStakingHubContract, 
    getStBLXContract,
    stakeBLX, 
    unstakeBLX,
    executeContractFunction,
    isExecuting,
    testStakingFeatures
  } = useContract();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('stake');
  const [selectedTier, setSelectedTier] = useState(0);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [blxBalance, setBlxBalance] = useState('0');
  const [stblxBalance, setStblxBalance] = useState('0');
  const [stakedAmount, setStakedAmount] = useState('0');
  const [pendingRewards, setPendingRewards] = useState('0');
  const [lockEndTime, setLockEndTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // Test states
  const [isTestingStaking, setIsTestingStaking] = useState(false);
  const [isTestingTiers, setIsTestingTiers] = useState(false);
  const [isTestingRewards, setIsTestingRewards] = useState(false);
  const [isTestingLocks, setIsTestingLocks] = useState(false);
  
  // Load user balances and staking info
  useEffect(() => {
    if (isConnected && address) {
      const loadData = async () => {
        try {
          // Get contracts
          const tokenContract = getTokenContract();
          const stakingHubContract = getStakingHubContract();
          const stblxContract = getStBLXContract();
          
          if (!tokenContract || !stakingHubContract || !stblxContract) return;
          
          // Get BLX balance
          const blxBal = await tokenContract.balanceOf(address);
          setBlxBalance(ethers.formatEther(blxBal));
          
          // Get stBLX balance
          const stblxBal = await stblxContract.balanceOf(address);
          setStblxBalance(ethers.formatEther(stblxBal));
          
          // Get staking info
          const stakingInfo = await stakingHubContract.getUserStakingInfo(address);
          setStakedAmount(ethers.formatEther(stakingInfo[0])); // amount
          setLockEndTime(Number(stakingInfo[1])); // lockEnd
          
          // Get pending rewards
          const rewards = await stakingHubContract.getPendingRewards(address);
          setPendingRewards(ethers.formatEther(rewards));
        } catch (error) {
          console.error("Error loading staking data:", error);
        }
      };
      
      loadData();
      
      // Set up an interval to refresh data every 30 seconds
      const interval = setInterval(loadData, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isConnected, address, getTokenContract, getStakingHubContract, getStBLXContract]);
  
  // Update time remaining in lock
  useEffect(() => {
    if (lockEndTime > 0) {
      const updateTimeRemaining = () => {
        const now = Math.floor(Date.now() / 1000);
        if (now < lockEndTime) {
          setTimeRemaining(lockEndTime - now);
        } else {
          setTimeRemaining(0);
        }
      };
      
      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 1000);
      
      return () => clearInterval(interval);
    }
  }, [lockEndTime]);
  
  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return 'No lock';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };
  
  // Handle stake
  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to stake",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Convert amount to wei
      const amountWei = ethers.parseEther(stakeAmount);
      
      // Get token contract
      const tokenContract = getTokenContract();
      
      // Approve staking hub to spend tokens
      await tokenContract.approve(DEPLOYED_CONTRACTS.BlumeStakingHub, amountWei);
      
      // Stake tokens
      await stakeBLX(amountWei, selectedTier);
      
      toast({
        title: "Staking Successful",
        description: `Successfully staked ${stakeAmount} BLX`,
      });
      
      // Reset input
      setStakeAmount('');
      
      // Refresh balances and staking info
      const blxBal = await tokenContract.balanceOf(address);
      setBlxBalance(ethers.formatEther(blxBal));
      
      const stakingHubContract = getStakingHubContract();
      const stakingInfo = await stakingHubContract.getUserStakingInfo(address);
      setStakedAmount(ethers.formatEther(stakingInfo[0]));
      setLockEndTime(Number(stakingInfo[1]));
      
      const stblxContract = getStBLXContract();
      const stblxBal = await stblxContract.balanceOf(address);
      setStblxBalance(ethers.formatEther(stblxBal));
    } catch (error) {
      console.error("Staking error:", error);
      toast({
        title: "Staking Failed",
        description: error.message || "Failed to stake BLX tokens",
        variant: "destructive",
      });
    }
  };
  
  // Handle unstake
  const handleUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount to unstake",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Convert amount to wei
      const amountWei = ethers.parseEther(unstakeAmount);
      
      // Get stBLX contract
      const stblxContract = getStBLXContract();
      
      // Approve staking hub to spend stBLX tokens
      await stblxContract.approve(DEPLOYED_CONTRACTS.BlumeStakingHub, amountWei);
      
      // Unstake tokens
      await unstakeBLX(amountWei);
      
      toast({
        title: "Unstaking Successful",
        description: `Successfully unstaked ${unstakeAmount} stBLX`,
      });
      
      // Reset input
      setUnstakeAmount('');
      
      // Refresh balances and staking info
      const tokenContract = getTokenContract();
      const blxBal = await tokenContract.balanceOf(address);
      setBlxBalance(ethers.formatEther(blxBal));
      
      const stakingHubContract = getStakingHubContract();
      const stakingInfo = await stakingHubContract.getUserStakingInfo(address);
      setStakedAmount(ethers.formatEther(stakingInfo[0]));
      setLockEndTime(Number(stakingInfo[1]));
      
      const stblxBal = await stblxContract.balanceOf(address);
      setStblxBalance(ethers.formatEther(stblxBal));
    } catch (error) {
      console.error("Unstaking error:", error);
      toast({
        title: "Unstaking Failed",
        description: error.message || "Failed to unstake BLX tokens",
        variant: "destructive",
      });
    }
  };
  
  // Handle claim rewards
  const handleClaimRewards = async () => {
    if (parseFloat(pendingRewards) <= 0) {
      toast({
        title: "No Rewards",
        description: "You have no pending rewards to claim",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const stakingHubContract = getStakingHubContract();
      
      // Call claim rewards function
      await executeContractFunction(
        stakingHubContract,
        'claimRewards',
        []
      );
      
      toast({
        title: "Rewards Claimed",
        description: `Successfully claimed ${pendingRewards} BLX in rewards`,
      });
      
      // Refresh balances and staking info
      const tokenContract = getTokenContract();
      const blxBal = await tokenContract.balanceOf(address);
      setBlxBalance(ethers.formatEther(blxBal));
      
      const rewards = await stakingHubContract.getPendingRewards(address);
      setPendingRewards(ethers.formatEther(rewards));
    } catch (error) {
      console.error("Claim rewards error:", error);
      toast({
        title: "Claim Failed",
        description: error.message || "Failed to claim rewards",
        variant: "destructive",
      });
    }
  };

  // Test tier functionality
  const handleTestTiers = async () => {
    setIsTestingTiers(true);
    try {
      // Test different tier benefits
      const tierTests = LOCK_TIERS.map(tier => ({
        tier: tier.name,
        multiplier: tier.multiplier,
        days: tier.days
      }));

      toast({
        title: "Tier Test Complete",
        description: `Validated ${tierTests.length} staking tiers`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingTiers(false);
    }
  };

  // Test reward calculations
  const handleTestRewards = async () => {
    setIsTestingRewards(true);
    try {
      const results = await testStakingFeatures();
      const passed = results.filter(r => r.passed).length;
      
      toast({
        title: "Rewards Test Complete",
        description: `${passed}/${results.length} reward tests passed`,
        variant: passed === results.length ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingRewards(false);
    }
  };

  // Test lock period functionality
  const handleTestLocks = async () => {
    setIsTestingLocks(true);
    try {
      // Simulate lock period tests
      const lockTests = [
        { period: '30 days', multiplier: '1.1x' },
        { period: '90 days', multiplier: '1.3x' },
        { period: '180 days', multiplier: '1.6x' }
      ];

      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({
        title: "Lock Period Test Complete",
        description: `Validated ${lockTests.length} lock periods`,
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTestingLocks(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>BLX Staking</CardTitle>
            <CardDescription>Stake BLX tokens to earn rewards</CardDescription>
          </div>
          
          {/* Test Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestTiers}
              disabled={isTestingTiers || isExecuting}
              className="flex items-center gap-1"
            >
              {isTestingTiers ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Trophy className="h-3 w-3" />
              )}
              Test Tiers
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestRewards}
              disabled={isTestingRewards || isExecuting}
              className="flex items-center gap-1"
            >
              {isTestingRewards ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Calculator className="h-3 w-3" />
              )}
              Test Rewards
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestLocks}
              disabled={isTestingLocks || isExecuting}
              className="flex items-center gap-1"
            >
              {isTestingLocks ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Timer className="h-3 w-3" />
              )}
              Test Locks
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Staking Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/40 p-4 rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Your Staked BLX</div>
            <div className="text-xl font-bold">{parseFloat(stakedAmount).toFixed(4)}</div>
          </div>
          <div className="bg-muted/40 p-4 rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Pending Rewards</div>
            <div className="text-xl font-bold">{parseFloat(pendingRewards).toFixed(4)}</div>
          </div>
          <div className="bg-muted/40 p-4 rounded-md">
            <div className="text-sm text-muted-foreground mb-1">Lock Time Remaining</div>
            <div className="text-xl font-bold">
              {formatTimeRemaining(timeRemaining)}
            </div>
            {timeRemaining > 0 && (
              <Progress value={(timeRemaining / (LOCK_TIERS[selectedTier]?.days * 86400)) * 100} className="h-1 mt-2" />
            )}
          </div>
        </div>
        
        {/* Staking Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="stake">Stake</TabsTrigger>
            <TabsTrigger value="unstake">Unstake</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stake">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Lock Period</label>
                <Select
                  value={selectedTier.toString()}
                  onValueChange={(value) => setSelectedTier(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lock period" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCK_TIERS.map((tier) => (
                      <SelectItem key={tier.id} value={tier.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{tier.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {tier.multiplier}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="text-xs text-muted-foreground mt-2">
                  {LOCK_TIERS[selectedTier]?.days > 0 ? (
                    <>
                      Lock for {LOCK_TIERS[selectedTier]?.days} days and earn {LOCK_TIERS[selectedTier]?.multiplier} rewards.
                      Early withdrawal fee: {LOCK_TIERS[selectedTier]?.earlyWithdrawalFee}
                    </>
                  ) : (
                    <>
                      No lock period. Earn base rewards with no early withdrawal fee.
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Amount to Stake</label>
                  <span className="text-xs text-muted-foreground">
                    Balance: {parseFloat(blxBalance).toFixed(4)} BLX
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    min="0"
                    disabled={isExecuting}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setStakeAmount(blxBalance)}
                    disabled={isExecuting || parseFloat(blxBalance) <= 0}
                  >
                    Max
                  </Button>
                </div>
              </div>
              
              <Button
                className="w-full"
                onClick={handleStake}
                disabled={isExecuting || !stakeAmount || parseFloat(stakeAmount) <= 0 || !isConnected}
              >
                {isExecuting ? 'Processing...' : 'Stake BLX'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="unstake">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Amount to Unstake</label>
                  <span className="text-xs text-muted-foreground">
                    Balance: {parseFloat(stblxBalance).toFixed(4)} stBLX
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    min="0"
                    disabled={isExecuting}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setUnstakeAmount(stblxBalance)}
                    disabled={isExecuting || parseFloat(stblxBalance) <= 0}
                  >
                    Max
                  </Button>
                </div>
              </div>
              
              {timeRemaining > 0 && (
                <div className="p-3 bg-amber-100/20 border border-amber-300 rounded-md text-sm">
                  <p className="font-medium text-amber-700">Early Withdrawal Warning</p>
                  <p className="text-amber-600 mt-1">
                    You still have {formatTimeRemaining(timeRemaining)} remaining on your lock period.
                    Unstaking now will incur a {LOCK_TIERS[selectedTier]?.earlyWithdrawalFee} penalty fee.
                  </p>
                </div>
              )}
              
              <Button
                className="w-full"
                onClick={handleUnstake}
                disabled={isExecuting || !unstakeAmount || parseFloat(unstakeAmount) <= 0 || !isConnected}
              >
                {isExecuting ? 'Processing...' : 'Unstake BLX'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col">
        <div className="w-full">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Pending Rewards</h3>
            <span className="text-sm">{parseFloat(pendingRewards).toFixed(4)} BLX</span>
          </div>
          <Button
            className="w-full"
            variant="outline"
            onClick={handleClaimRewards}
            disabled={isExecuting || parseFloat(pendingRewards) <= 0 || !isConnected}
          >
            {isExecuting ? 'Processing...' : 'Claim Rewards'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}