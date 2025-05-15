import { useState, useCallback, useEffect } from 'react';
import { MOCK_TRANSACTIONS } from '@/lib/web3/contracts';
import { useToast } from '@/hooks/use-toast';

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const { toast } = useToast();

  // Load mock transactions for demo purposes
  useEffect(() => {
    // In a real app, we would load from localStorage or an API
    // For demo, we'll use mock transactions
    setTransactions(MOCK_TRANSACTIONS);
  }, []);

  // Add a new transaction
  const addTransaction = useCallback((transaction) => {
    const newTransaction = {
      ...transaction,
      id: transaction.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: transaction.timestamp || Date.now(),
    };

    setTransactions(prev => [newTransaction, ...prev]);
    
    // Show toast notification
    toast({
      title: 'Transaction Submitted',
      description: `Transaction hash: ${transaction.hash.substring(0, 6)}...${transaction.hash.substring(transaction.hash.length - 4)}`,
      variant: 'default',
    });

    return newTransaction.id;
  }, [toast]);

  // Update transaction status
  const updateTransaction = useCallback((id, updates) => {
    setTransactions(prev => 
      prev.map(tx => {
        if (tx.id === id) {
          const updatedTx = { ...tx, ...updates };
          
          // Show toast for status changes
          if (updates.status && updates.status !== tx.status) {
            const variant = updates.status === 'confirmed' ? 'default' : 'destructive';
            const title = updates.status === 'confirmed' ? 'Transaction Confirmed' : 'Transaction Failed';
            
            toast({
              title,
              description: `Transaction: ${tx.hash.substring(0, 6)}...${tx.hash.substring(tx.hash.length - 4)}`,
              variant,
            });
          }
          
          return updatedTx;
        }
        return tx;
      })
    );
  }, [toast]);

  // Clear all transactions
  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  return {
    transactions,
    addTransaction,
    updateTransaction,
    clearTransactions,
  };
}