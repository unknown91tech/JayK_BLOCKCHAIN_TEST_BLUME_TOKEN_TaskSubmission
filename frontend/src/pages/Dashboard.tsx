// src/pages/Dashboard.tsx - Updated with Test Suite
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { NetworkStatus } from '@/components/dashboard/NetworkStatus';
import { TransactionHistory } from '@/components/dashboard/TransactionHistory';
import { TokenSwap } from '@/components/defi/TokenSwap';
import { LiquidityPool } from '@/components/defi/LiquidityPool';
import { Staking } from '@/components/defi/Staking';
import { TestSuite } from '@/components/testing/TestSuite';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWeb3 } from '@/hooks/useWeb3';
import { WalletConnect } from '@/components/defi/WalletConnect';

export function Dashboard() {
  const { isConnected } = useWeb3();

  return (
    <div className="container py-6 w-screen mx-auto animate-in fade-in-50 duration-500">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">DeFi Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your assets and interact with decentralized protocols
          </p>
        </div>

        {!isConnected ? (
          /* Wallet Connect Section (shown when no wallet is connected) */
          <WalletConnect />
        ) : (
          <>
            {/* Dashboard Overview Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AccountSummary />
              <NetworkStatus />
              <div className="hidden md:block lg:col-span-1">
                <TokenSwap />
              </div>
            </div>

            {/* Main Interface Tabs */}
            <Tabs defaultValue="swap" className="mt-2">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="swap">Swap</TabsTrigger>
                <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
                <TabsTrigger value="stake">Staking</TabsTrigger>
                <TabsTrigger value="test">Test Suite</TabsTrigger>
              </TabsList>

              <TabsContent value="swap" className="space-y-6">
                <div className="md:hidden">
                  <TokenSwap />
                </div>
                <TransactionHistory />
              </TabsContent>

              <TabsContent value="liquidity" className="space-y-6">
                <LiquidityPool />
                <TransactionHistory />
              </TabsContent>

              <TabsContent value="stake" className="space-y-6">
                <Staking />
                <TransactionHistory />
              </TabsContent>

              <TabsContent value="test" className="space-y-6">
                <TestSuite />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}