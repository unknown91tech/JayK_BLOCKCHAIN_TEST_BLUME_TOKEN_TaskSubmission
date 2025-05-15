import { useState, useEffect } from 'react';
import { useWeb3 } from '@/hooks/useWeb3';
import { formatAddress } from '@/lib/web3/networks';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wallet, Moon, Sun, LogOut, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '../ThemeProvider';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { isConnected, address, connectWallet, disconnectWallet, chainId, balance, isConnecting } = useWeb3();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
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
        case 170: // Hoodi
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

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 transition-all duration-300",
      scrolled ? "bg-background/80 backdrop-blur-md shadow-md" : "bg-transparent"
    )}>
      <div className="flex items-center">
        <Wallet className="w-8 h-8 mr-2 text-primary" />
        <h1 className="text-2xl font-bold text-primary">DeFi Portal</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Theme toggle */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 transition-all" />
          ) : (
            <Moon className="h-5 w-5 transition-all" />
          )}
        </Button>
        
        {/* Wallet connection */}
        {isConnected && address ? (
          <div className="flex items-center gap-2">
            {balance && (
              <div className="mr-2 hidden md:block">
                <p className="text-sm font-medium">{parseFloat(balance).toFixed(4)} ETH</p>
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Avatar className="h-6 w-6 bg-primary/10">
                    <AvatarFallback className="text-xs">
                      {address.substring(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">{formatAddress(address)}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copyAddress}>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Copy Address</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openExplorer}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>View on Explorer</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={disconnectWallet}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Disconnect</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        )}
      </div>
    </header>
  );
}