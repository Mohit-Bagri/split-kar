/**
 * @file __tests__/settlement.test.ts
 * @description Unit tests for settlement algorithm
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { describe, it, expect } from 'vitest';
import { calculateBalances, calculateOptimizedSettlements, calculateSettlement, validateSettlements } from '@/lib/settlement';
import { Transaction, Balance } from '@/types';

// Helper to create transactions
const createTransaction = (
  paidBy: string,
  amount: number,
  description: string,
  participants: string[]
): Transaction => ({
  id: Math.random().toString(36).substr(2, 9),
  paidBy,
  amount,
  description,
  participants,
  splitType: 'equal',
  splitDetails: participants.map(p => ({ participant: p, amount: amount / participants.length })),
  createdAt: new Date(),
});

describe('Settlement Algorithm', () => {
  describe('calculateBalances', () => {
    it('should calculate correct balances for simple equal split', () => {
      const transactions: Transaction[] = [
        createTransaction('Alice', 100, 'Dinner', ['Alice', 'Bob']),
      ];

      const balances = calculateBalances(transactions);
      
      expect(balances).toHaveLength(2);
      expect(balances.find(b => b.participant === 'Alice')?.amount).toBe(50);
      expect(balances.find(b => b.participant === 'Bob')?.amount).toBe(-50);
    });

    it('should handle multiple transactions', () => {
      const transactions: Transaction[] = [
        createTransaction('Alice', 100, 'Dinner', ['Alice', 'Bob', 'Charlie']),
        createTransaction('Bob', 60, 'Lunch', ['Alice', 'Bob', 'Charlie']),
      ];

      const balances = calculateBalances(transactions);
      
      // Alice paid 100, owes 20 (100/3 + 60/3) = 100 - 53.33 = 46.67
      // Bob paid 60, owes 53.33 = 60 - 53.33 = 6.67
      // Charlie owes 53.33
      expect(balances).toHaveLength(3);
    });

    it('should return empty array for no transactions', () => {
      const balances = calculateBalances([]);
      expect(balances).toHaveLength(0);
    });

    it('should handle payer not in participants', () => {
      const transaction: Transaction = {
        id: '1',
        paidBy: 'Alice',
        amount: 100,
        description: 'Gift',
        participants: ['Bob', 'Charlie'],
        splitType: 'equal',
        splitDetails: [
          { participant: 'Bob', amount: 50 },
          { participant: 'Charlie', amount: 50 },
        ],
        createdAt: new Date(),
      };

      const balances = calculateBalances([transaction]);
      
      expect(balances.find(b => b.participant === 'Alice')?.amount).toBe(100);
      expect(balances.find(b => b.participant === 'Bob')?.amount).toBe(-50);
      expect(balances.find(b => b.participant === 'Charlie')?.amount).toBe(-50);
    });
  });

  describe('calculateOptimizedSettlements', () => {
    it('should minimize number of transactions', () => {
      const balances: Balance[] = [
        { participant: 'Alice', amount: 100 },
        { participant: 'Bob', amount: -50 },
        { participant: 'Charlie', amount: -50 },
      ];

      const settlements = calculateOptimizedSettlements(balances);

      expect(settlements).toHaveLength(2);
      expect(settlements).toContainEqual({ from: 'Bob', to: 'Alice', amount: 50 });
      expect(settlements).toContainEqual({ from: 'Charlie', to: 'Alice', amount: 50 });
    });

    it('should handle large imbalances', () => {
      const balances: Balance[] = [
        { participant: 'Alice', amount: 200 },
        { participant: 'Bob', amount: -150 },
        { participant: 'Charlie', amount: -50 },
      ];

      const settlements = calculateOptimizedSettlements(balances);

      expect(settlements).toHaveLength(2);
      expect(settlements[0].amount).toBe(150); // Bob pays Alice
      expect(settlements[1].amount).toBe(50);  // Charlie pays Alice
    });

    it('should skip zero or near-zero balances', () => {
      const balances: Balance[] = [
        { participant: 'Alice', amount: 100 },
        { participant: 'Bob', amount: -100 },
        { participant: 'Charlie', amount: 0.005 }, // Should be ignored
      ];

      const settlements = calculateOptimizedSettlements(balances);

      expect(settlements).toHaveLength(1);
    });

    it('should handle empty balances', () => {
      const settlements = calculateOptimizedSettlements([]);
      expect(settlements).toHaveLength(0);
    });
  });

  describe('calculateSettlement', () => {
    it('should return correct summary', () => {
      const transactions: Transaction[] = [
        createTransaction('Alice', 100, 'Dinner', ['Alice', 'Bob']),
        createTransaction('Bob', 50, 'Lunch', ['Alice', 'Bob']),
      ];

      const result = calculateSettlement(transactions);

      expect(result.totalTransactions).toBe(2);
      expect(result.totalAmount).toBe(150);
      expect(result.balances).toHaveLength(2);
      expect(result.settlements.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty transactions', () => {
      const result = calculateSettlement([]);

      expect(result.totalTransactions).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(result.balances).toHaveLength(0);
      expect(result.settlements).toHaveLength(0);
    });
  });

  describe('validateSettlements', () => {
    it('should return true for valid settlements', () => {
      const balances: Balance[] = [
        { participant: 'Alice', amount: 50 },
        { participant: 'Bob', amount: -50 },
      ];

      const settlements = [
        { from: 'Bob', to: 'Alice', amount: 50 },
      ];

      expect(validateSettlements(balances, settlements)).toBe(true);
    });

    it('should return false for invalid settlements', () => {
      const balances: Balance[] = [
        { participant: 'Alice', amount: 50 },
        { participant: 'Bob', amount: -50 },
      ];

      const settlements = [
        { from: 'Bob', to: 'Alice', amount: 40 }, // Wrong amount
      ];

      expect(validateSettlements(balances, settlements)).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle the example from requirements', () => {
      // Mohit paid 500 for horse riding for Mohit, Pankaj, Dhruv, Rudra
      // Pankaj paid 300 for breakfast for everyone
      const transactions: Transaction[] = [
        createTransaction('Mohit', 500, 'Horse Riding', ['Mohit', 'Pankaj', 'Dhruv', 'Rudra']),
        createTransaction('Pankaj', 300, 'Breakfast', ['Mohit', 'Pankaj', 'Dhruv', 'Rudra']),
      ];

      const result = calculateSettlement(transactions);

      expect(result.totalAmount).toBe(800);
      
      // Mohit paid 500, owes 200 (his share of both) = +300
      // Pankaj paid 300, owes 200 (his share) = +100
      // Dhruv owes 200
      // Rudra owes 200
      
      const mohitBalance = result.balances.find(b => b.participant === 'Mohit')?.amount;
      const pankajBalance = result.balances.find(b => b.participant === 'Pankaj')?.amount;
      
      expect(mohitBalance).toBeGreaterThan(0);
      expect(pankajBalance).toBeGreaterThan(0);
      
      // Verify settlements resolve balances
      expect(validateSettlements(result.balances, result.settlements)).toBe(true);
    });

    it('should handle many participants', () => {
      const participants = ['A', 'B', 'C', 'D', 'E', 'F'];
      const transactions: Transaction[] = [
        createTransaction('A', 600, 'Group Dinner', participants),
      ];

      const result = calculateSettlement(transactions);

      expect(result.balances).toHaveLength(6);
      expect(result.settlements.length).toBeLessThanOrEqual(5); // Optimized
      expect(validateSettlements(result.balances, result.settlements)).toBe(true);
    });
  });
});
