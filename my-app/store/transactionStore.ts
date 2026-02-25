/**
 * @file store/transactionStore.ts
 * @description Zustand store for transaction state management
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { create } from 'zustand';
import { Transaction, SettlementResult } from '@/types';
import { logger } from '@/lib/logger';

interface TransactionState {
  transactions: Transaction[];
  settlementResult: SettlementResult | null;
  isLoading: boolean;
  error: string | null;
  allParticipants: string[]; // Store all participants for settlement calculation
  
  // Actions
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setSettlementResult: (result: SettlementResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAllParticipants: (participants: string[]) => void;
  clearAll: () => void;
  
  // Async actions
  calculateSettlement: () => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  settlementResult: null,
  isLoading: false,
  error: null,
  allParticipants: [],

  setTransactions: (transactions) => {
    logger.info('transaction', 'Transactions updated', { count: transactions.length });
    set({ transactions });
  },
  
  addTransaction: (transaction) => {
    logger.info('transaction', 'Transaction added', {
      id: transaction.id,
      paidBy: transaction.paidBy,
      amount: transaction.amount,
      description: transaction.description
    });
    set((state) => ({
      transactions: [...state.transactions, transaction]
    }));
  },
  
  updateTransaction: (id, updates) => {
    logger.info('transaction', 'Transaction updated', { id, updates });
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },
  
  removeTransaction: (id) => {
    logger.info('transaction', 'Transaction removed', { id });
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },
  
  setSettlementResult: (result) => set({ settlementResult: result }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => {
    if (error && error.trim() !== '') {
      logger.error('transaction', `Error: ${error}`, new Error(error));
    }
    set({ error });
  },
  
  setAllParticipants: (participants) => {
    logger.info('transaction', 'All participants set', { participants });
    set({ allParticipants: participants });
  },
  
  clearAll: () => {
    logger.info('transaction', 'All data cleared');
    set({
      transactions: [],
      settlementResult: null,
      error: null,
      allParticipants: []
    });
  },

  calculateSettlement: async () => {
    const { transactions, allParticipants } = get();
    
    logger.info('transaction', 'Starting settlement calculation', {
      transactionCount: transactions.length,
      allParticipants,
      transactions: transactions.map(t => ({
        description: t.description,
        paidBy: t.paidBy,
        amount: t.amount,
        participants: t.participants
      }))
    });
    
    if (transactions.length === 0) {
      logger.warn('transaction', 'No transactions to calculate settlement');
      set({ settlementResult: null });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          allParticipants: allParticipants.length > 0 ? allParticipants : undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to calculate settlement');
      }

      const result = await response.json();
      logger.info('transaction', 'Settlement calculation completed', {
        balanceCount: result.balances?.length,
        settlementCount: result.settlements?.length
      });
      set({ settlementResult: result, isLoading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('transaction', `Settlement calculation failed: ${errorMessage}`, err instanceof Error ? err : undefined);
      set({
        error: errorMessage,
        isLoading: false
      });
    }
  },
}));
