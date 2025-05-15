import { useWeb3 } from '@/hooks/useWeb3';
import { formatAddress } from '@/lib/web3/networks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function AccountSummary() {
  const { isConnected, address, balance, chainId } = useWeb3();
  const [copySuccess, setCopySuccess] = useState(false);

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopySuccess(true);
      
      // Reset copy success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    }
  };

  // View address on block explorer
  const openExplorer = () => {
    if (address && chainId) {
      let explorerUrl;
      
      // Determine which block explorer to use based on chain ID
      switch (chainId) {
        case 1: // Ethereum Mainnet
          explorerUrl = `https://etherscan.io/address/${address}`;
          break;
        case 137: // Polygon
          explorerUrl = `https://polygonscan.com/address/${address}`;
          break;
        case 56: // BSC
          explorerUrl = `https://bscscan.com/address/${address}`;
          break;
        case 170: // Hoodi (assuming chain ID 170)
          explorerUrl = `https://explorer.hoodi.network/address/${address}`;
          break;
        case 5: // Goerli
          explorerUrl = `https://goerli.etherscan.io/address/${address}`;
          break;
        default:
          explorerUrl = `https://etherscan.io/address/${address}`;
      }
      
      window.open(explorerUrl, '_blank');
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
          <CardDescription>Connect your wallet to view account details</CardDescription>
        </CardHeader>
        <CardContent className="h-32 flex items-center justify-center">
          <p className="text-muted-foreground">No wallet connected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Summary</CardTitle>
        <CardDescription>Your wallet information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-1">Wallet Address</h4>
            <div className="flex items-center gap-2">
              <code className="relative rounded bg-muted px-[0.5rem] py-[0.25rem] font-mono text-sm">
                {address && formatAddress(address)}
              </code>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={copyAddress} 
                className="h-8 w-8 relative"
                title="Copy address to clipboard"
              >
                {copySuccess ? (
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded">Copied!</span>
                ) : null}
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy Address</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={openExplorer} 
                className="h-8 w-8"
                title="View on block explorer"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">View on Explorer</span>
              </Button>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-1">Balance</h4>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold">
                {balance ? parseFloat(balance).toFixed(4) : '0.0000'}
              </p>
              <span className="text-sm font-medium text-muted-foreground">
                {chainId === 1 || chainId === 5 || chainId === 11155111 ? 'ETH' : 
                 chainId === 137 || chainId === 80001 ? 'MATIC' : 
                 chainId === 56 ? 'BNB' : 'ETH'}
              </span>
            </div>
          </div>
          
          <div className="pt-2">
            <Button variant="outline" onClick={openExplorer} className="w-full">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Account on Explorer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}