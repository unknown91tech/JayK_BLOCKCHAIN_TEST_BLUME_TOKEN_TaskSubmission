import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWeb3 } from '@/hooks/useWeb3';
import { getNetworkByChainId } from '@/lib/web3/networks';

export function NetworkStatus() {
  const { isConnected, chainId } = useWeb3();
  const network = chainId ? getNetworkByChainId(chainId) : undefined;

  // Function to determine badge color based on network
  const getNetworkBadgeVariant = () => {
    if (!chainId) return 'outline';
    
    // Mainnet networks
    if (chainId === 1) return 'default'; // Ethereum
    if (chainId === 137) return 'secondary'; // Polygon
    if (chainId === 56) return 'destructive'; // BNB Chain
    if (chainId === 10) return 'default'; // Optimism
    if (chainId === 42161) return 'secondary'; // Arbitrum
    if (chainId === 170) return 'default'; // Hoodi
    
    // Test networks
    if (chainId === 5 || chainId === 11155111 || chainId === 80001) {
      return 'destructive';
    }
    
    return 'outline';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Network Status</CardTitle>
        <CardDescription>
          Current blockchain network information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection</span>
            <Badge variant={isConnected ? 'default' : 'outline'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Network</span>
            {isConnected && network ? (
              <Badge variant={getNetworkBadgeVariant()}>
                {network.name}
              </Badge>
            ) : (
              <Badge variant="outline">Not Connected</Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Chain ID</span>
            <span className="text-sm">{chainId || 'Unknown'}</span>
          </div>
          
          {isConnected && network && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Currency</span>
              <span className="text-sm">{network.symbol}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}