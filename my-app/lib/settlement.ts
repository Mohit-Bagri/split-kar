/**
 * @file lib/settlement.ts
 * @description Optimized settlement algorithm using greedy matching
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { Transaction, Balance, Settlement, SettlementResult, SplitDetail } from '@/types';
import { calculateSplitAmounts } from './split';
import { logger } from './logger';

/**
 * Calculate net balance for each participant
 * Positive = creditor (owed money), Negative = debtor (owes money)
 * @param transactions - List of transactions
 * @param allParticipants - Optional list of all participants to include (even with 0 balance)
 */
export function calculateBalances(transactions: Transaction[], allParticipants?: string[]): Balance[] {
  logger.info('settlement', 'Starting balance calculation', {
    transactionCount: transactions.length,
    allParticipants: allParticipants || 'not provided'
  });
  
  const balanceMap = new Map<string, number>();
  
  // Initialize all participants with 0 balance if provided
  if (allParticipants) {
    for (const p of allParticipants) {
      balanceMap.set(p, 0);
    }
  }

  for (const transaction of transactions) {
    // Add full amount to payer
    const currentPayerBalance = balanceMap.get(transaction.paidBy) || 0;
    balanceMap.set(transaction.paidBy, currentPayerBalance + transaction.amount);

    // Calculate what each participant owes
    const splitAmounts = calculateSplitAmounts(transaction);
    
    // Debug logging
    logger.info('settlement', `Transaction: ${transaction.description}`, {
      paidBy: transaction.paidBy,
      amount: transaction.amount,
      participants: transaction.participants,
      splitAmounts: Array.from(splitAmounts.entries())
    });

    for (const [participant, amount] of splitAmounts) {
      const currentBalance = balanceMap.get(participant) || 0;
      balanceMap.set(participant, currentBalance - amount);
    }
  }
  
  // Log final balances before sorting
  logger.info('settlement', 'Final balances before sorting', {
    balances: Array.from(balanceMap.entries()).map(([participant, amount]) => ({
      participant,
      amount: Math.round(amount * 100) / 100
    }))
  });

  // Convert to array and round to 2 decimal places
  const balances: Balance[] = [];
  for (const [participant, amount] of balanceMap) {
    // Round to 2 decimal places, then treat near-zero as exactly zero
    const roundedAmount = Math.round(amount * 100) / 100;
    const finalAmount = Math.abs(roundedAmount) < 0.01 ? 0 : roundedAmount;
    balances.push({
      participant,
      amount: finalAmount,
    });
  }

  // Ensure all participants from allParticipants are in the result, even with 0 balance
  if (allParticipants) {
    const existingParticipants = new Set(balances.map(b => b.participant));
    for (const p of allParticipants) {
      if (!existingParticipants.has(p)) {
        balances.push({ participant: p, amount: 0 });
        logger.debug('settlement', `Added missing participant with 0 balance: ${p}`);
      }
    }
  }

  const sortedBalances = balances.sort((a, b) => b.amount - a.amount);
  
  logger.info('settlement', 'Balance calculation complete', {
    participantCount: sortedBalances.length,
    balances: sortedBalances.map(b => ({ participant: b.participant, amount: b.amount }))
  });

  return sortedBalances;
}

/**
 * Optimized settlement using greedy algorithm
 * Minimizes number of transactions by matching largest debtors with largest creditors
 */
export function calculateOptimizedSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];
  
  logger.debug('settlement', 'Starting optimized settlement calculation', {
    totalParticipants: balances.length,
    balances: balances.map(b => ({ participant: b.participant, amount: b.amount }))
  });
  
  // Create copies of balances to avoid mutating the original array
  const balanceMap = new Map<string, number>();
  for (const b of balances) {
    balanceMap.set(b.participant, b.amount);
  }
  
  // Separate creditors (positive) and debtors (negative)
  const creditors: Array<{ participant: string; amount: number }> = [];
  const debtors: Array<{ participant: string; amount: number }> = [];
  
  for (const [participant, amount] of balanceMap) {
    if (amount > 0.01) {
      creditors.push({ participant, amount });
    } else if (amount < -0.01) {
      debtors.push({ participant, amount: Math.abs(amount) });
    }
  }
  
  // Sort by amount descending for optimal matching (largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);
  
  logger.info('settlement', 'Sorted creditors and debtors', {
    creditors: creditors.map(c => ({ participant: c.participant, amount: c.amount })),
    debtors: debtors.map(d => ({ participant: d.participant, amount: d.amount }))
  });
  
  // Track zero-balance participants
  const zeroBalanceParticipants = balances
    .filter(b => Math.abs(b.amount) <= 0.01)
    .map(b => b.participant);
  
  logger.debug('settlement', 'Separated creditors and debtors', {
    creditorCount: creditors.length,
    debtorCount: debtors.length,
    zeroBalanceCount: zeroBalanceParticipants.length,
    zeroBalanceParticipants
  });

  let i = 0; // creditor index
  let j = 0; // debtor index

  let step = 1;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    logger.info('settlement', `Settlement step ${step}`, {
      creditor: creditor.participant,
      creditorAmount: creditor.amount,
      debtor: debtor.participant,
      debtorAmount: debtor.amount,
      i,
      j
    });

    // Skip if already settled
    if (creditor.amount <= 0.01) {
      logger.info('settlement', `Creditor ${creditor.participant} settled, moving to next`);
      i++;
      continue;
    }
    if (debtor.amount <= 0.01) {
      logger.info('settlement', `Debtor ${debtor.participant} settled, moving to next`);
      j++;
      continue;
    }

    // Calculate the settlement amount
    const settlementAmount = Math.min(creditor.amount, debtor.amount);
    
    if (settlementAmount > 0.01) {
      settlements.push({
        from: debtor.participant,
        to: creditor.participant,
        amount: Math.round(settlementAmount * 100) / 100,
      });
      
      logger.info('settlement', `Created settlement`, {
        from: debtor.participant,
        to: creditor.participant,
        amount: Math.round(settlementAmount * 100) / 100
      });

      // Update remaining amounts
      creditor.amount -= settlementAmount;
      debtor.amount -= settlementAmount;
    }

    // Move to next if settled
    if (creditor.amount <= 0.01) {
      logger.info('settlement', `Creditor ${creditor.participant} now settled`);
      i++;
    }
    if (debtor.amount <= 0.01) {
      logger.info('settlement', `Debtor ${debtor.participant} now settled`);
      j++;
    }
    step++;
  }

  logger.info('settlement', 'Settlement calculation complete', {
    settlementCount: settlements.length,
    settlements: settlements.map(s => ({ from: s.from, to: s.to, amount: s.amount }))
  });

  return settlements;
}

/**
 * Main settlement calculation function
 * @param transactions - List of transactions
 * @param allParticipants - Optional list of all participants to include (even with 0 balance)
 */
export function calculateSettlement(
  transactions: Transaction[],
  allParticipants?: string[]
): SettlementResult {
  logger.info('settlement', 'Starting settlement calculation', {
    transactionCount: transactions.length,
    allParticipants: allParticipants || 'not provided'
  });

  if (transactions.length === 0) {
    logger.warn('settlement', 'No transactions provided for settlement');
    return {
      settlements: [],
      balances: [],
      totalTransactions: 0,
      totalAmount: 0,
      optimizedTransactions: 0,
    };
  }

  // If allParticipants not provided, extract unique participants from transactions
  const participants = allParticipants || Array.from(new Set(
    transactions.flatMap(t => [t.paidBy, ...t.participants])
  ));

  const balances = calculateBalances(transactions, participants);
  const settlements = calculateOptimizedSettlements(balances);
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  const result: SettlementResult = {
    settlements,
    balances,
    totalTransactions: transactions.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    optimizedTransactions: settlements.length,
  };

  logger.info('settlement', 'Settlement calculation complete', {
    totalTransactions: result.totalTransactions,
    totalAmount: result.totalAmount,
    optimizedTransactions: result.optimizedTransactions,
    participantCount: result.balances.length
  });

  return result;
}

/**
 * Validate that settlements correctly resolve all balances
 */
/**
 * Audit log entry for settlement operations
 */
export interface SettlementAuditEntry {
  timestamp: string;
  operation: 'balance_calculation' | 'settlement_optimization' | 'validation';
  input: unknown;
  output: unknown;
  errors?: string[];
}

/**
 * Validate that settlements correctly resolve all balances
 */
export function validateSettlements(
  balances: Balance[],
  settlements: Settlement[]
): boolean {
  logger.debug('settlement', 'Validating settlements', {
    balanceCount: balances.length,
    settlementCount: settlements.length
  });
  
  const expectedBalances = new Map<string, number>();
  
  // Initialize with original balances
  for (const b of balances) {
    expectedBalances.set(b.participant, b.amount);
  }

  // Apply settlements
  for (const s of settlements) {
    const fromBalance = expectedBalances.get(s.from) || 0;
    const toBalance = expectedBalances.get(s.to) || 0;
    
    expectedBalances.set(s.from, fromBalance + s.amount);
    expectedBalances.set(s.to, toBalance - s.amount);
  }

  // Check if all balances are ~0
  for (const [participant, amount] of expectedBalances) {
    if (Math.abs(amount) > 0.01) {
      logger.error('settlement', `Validation failed: ${participant} has remaining balance of ${amount}`);
      return false;
    }
  }

  logger.info('settlement', 'Settlement validation passed');
  return true;
}

/**
 * Get audit trail for settlement calculation
 */
export function getSettlementAuditTrail(
  transactions: Transaction[],
  allParticipants?: string[]
): SettlementAuditEntry[] {
  const auditTrail: SettlementAuditEntry[] = [];
  
  // Log balance calculation
  auditTrail.push({
    timestamp: new Date().toISOString(),
    operation: 'balance_calculation',
    input: { transactions, allParticipants },
    output: calculateBalances(transactions, allParticipants)
  });
  
  // Log settlement optimization
  const balances = calculateBalances(transactions, allParticipants);
  auditTrail.push({
    timestamp: new Date().toISOString(),
    operation: 'settlement_optimization',
    input: balances,
    output: calculateOptimizedSettlements(balances)
  });
  
  // Log validation
  const settlements = calculateOptimizedSettlements(balances);
  auditTrail.push({
    timestamp: new Date().toISOString(),
    operation: 'validation',
    input: { balances, settlements },
    output: validateSettlements(balances, settlements)
  });
  
  return auditTrail;
}
