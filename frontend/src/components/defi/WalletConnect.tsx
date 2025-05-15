import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle, ArrowRight } from 'lucide-react';
import { useWeb3 } from '@/hooks/useWeb3';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function WalletConnect() {
  const { connectWallet, isConnecting, isMetaMaskInstalled, error } = useWeb3();
  const [showMetaMaskHelp, setShowMetaMaskHelp] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto py-8">
      <Card className="w-full transition-all duration-500 hover:shadow-lg">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Connect Your Wallet</CardTitle>
          <CardDescription className="text-center max-w-md mx-auto">
            Connect your wallet to access the DeFi dashboard and start interacting with decentralized protocols.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            size="lg" 
            className="w-full max-w-xs font-medium gap-2"
            onClick={connectWallet}
            disabled={isConnecting || !isMetaMaskInstalled}
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
            <ArrowRight className="h-4 w-4" />
          </Button>

          {!isMetaMaskInstalled && (
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={() => setShowMetaMaskHelp(prev => !prev)}
              >
                Don't have MetaMask installed?
              </Button>
              
              {showMetaMaskHelp && (
                <div className="mt-4 text-sm bg-muted p-4 rounded-md">
                  <p className="mb-2">
                    MetaMask is a browser extension that allows you to interact with the Ethereum blockchain.
                  </p>
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-primary underline"
                  >
                    Click here to install MetaMask
                  </a>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        <FeatureCard 
          icon={<Wallet className="h-8 w-8" />}
          title="Connect Securely"
          description="Your private keys never leave your device"
        />
        <FeatureCard 
          icon={<svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>}
          title="Self-Custody"
          description="You maintain complete control of your funds"
        />
        <FeatureCard 
          icon={<svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12C21 16.9706 16.9706 21 12 21M21 12C21 7.02944 16.9706 3 12 3M21 12H3M12 21C7.02944 21 3 16.9706 3 12M12 21C13.6569 21 15 16.9706 15 12C15 7.02944 13.6569 3 12 3M12 21C10.3431 21 9 16.9706 9 12C9 7.02944 10.3431 3 12 3M3 12C3 7.02944 7.02944 3 12 3" stroke="currentColor" strokeWidth="1.5"/>
          </svg>}
          title="Access DeFi"
          description="Swap, provide liquidity, and earn yield"
        />
      </div>
    </div>
  );
}

// Feature card sub-component
function FeatureCard({ icon, title, description }) {
  return (
    <Card className="border-0 bg-muted/40">
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className="mb-4 text-primary">{icon}</div>
        <h3 className="font-medium text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}