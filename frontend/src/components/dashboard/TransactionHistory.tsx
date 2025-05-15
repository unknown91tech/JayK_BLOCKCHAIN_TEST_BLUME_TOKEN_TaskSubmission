import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistance } from 'date-fns';
import { ExternalLink, Trash2, Activity } from 'lucide-react';
import { formatAddress } from '@/lib/web3/networks';

export function TransactionHistory() {
  const { transactions, clearTransactions } = useTransactions();
  const [visibleCount, setVisibleCount] = useState(5);
  
  // Get status badge variant
  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Format transaction time
  const formatTime = (timestamp) => {
    return formatDistance(timestamp, Date.now(), { addSuffix: true });
  };
  
  // View transaction on explorer
  const openTxExplorer = (hash) => {
    window.open(`https://etherscan.io/tx/${hash}`, '_blank');
  };
  
  // Show more transactions
  const showMore = () => {
    setVisibleCount(prev => prev + 5);
  };
  
  // Filter transactions to show only the most recent ones
  const visibleTransactions = transactions.slice(0, visibleCount);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </div>
        {transactions.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearTransactions}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            description="When you make transactions, they will appear here"
            icon="activity"
          />
        ) : (
          <>
            <div className="space-y-4">
              {visibleTransactions.map(tx => (
                <div key={tx.id} className="flex flex-col space-y-2 p-3 rounded-lg bg-muted/40">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Transaction</h4>
                    {getStatusBadge(tx.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-muted-foreground">Hash</span>
                    <div className="flex items-center">
                      <code className="text-xs">{formatAddress(tx.hash)}</code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 ml-1"
                        onClick={() => openTxExplorer(tx.hash)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <span className="text-muted-foreground">From</span>
                    <code className="text-xs">{formatAddress(tx.from)}</code>
                    
                    <span className="text-muted-foreground">To</span>
                    <code className="text-xs">{formatAddress(tx.to)}</code>
                    
                    <span className="text-muted-foreground">Time</span>
                    <span>{formatTime(tx.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {transactions.length > visibleCount && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={showMore}>
                  Show More
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Empty state component
function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        {icon === 'activity' && <Activity className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}