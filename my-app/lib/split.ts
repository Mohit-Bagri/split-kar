/**
 * @file lib/split.ts
 * @description Split calculation logic for different split types
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { Transaction, SplitType, SplitDetail, ValidationError } from '@/types';

/**
 * Calculate how much each participant owes for a transaction
 * Returns Map of participant -> amount
 */
export function calculateSplitAmounts(transaction: Transaction): Map<string, number> {
  const { amount, splitType, splitDetails, participants } = transaction;
  const result = new Map<string, number>();

  switch (splitType) {
    case 'equal':
      return calculateEqualSplit(amount, participants);
    
    case 'fixed':
      return calculateFixedSplit(splitDetails);
    
    case 'percentage':
      return calculatePercentageSplit(amount, splitDetails);
    
    case 'shares':
      return calculateShareSplit(amount, splitDetails);
    
    default:
      // Default to equal split
      return calculateEqualSplit(amount, participants);
  }
}

/**
 * Equal split: amount / number of participants
 */
function calculateEqualSplit(amount: number, participants: string[]): Map<string, number> {
  const result = new Map<string, number>();
  const baseAmount = Math.floor((amount / participants.length) * 100) / 100;
  const remainder = Math.round((amount - baseAmount * participants.length) * 100) / 100;

  // Distribute base amount to all
  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    // Add remainder to first participant to balance
    const finalAmount = i === 0 ? baseAmount + remainder : baseAmount;
    result.set(participant, Math.round(finalAmount * 100) / 100);
  }

  return result;
}

/**
 * Fixed amount split: use provided amounts directly
 */
function calculateFixedSplit(splitDetails: SplitDetail[]): Map<string, number> {
  const result = new Map<string, number>();
  
  for (const detail of splitDetails) {
    if (detail.amount !== undefined) {
      result.set(detail.participant, detail.amount);
    }
  }

  return result;
}

/**
 * Percentage split: amount * (percentage / 100)
 */
function calculatePercentageSplit(amount: number, splitDetails: SplitDetail[]): Map<string, number> {
  const result = new Map<string, number>();
  let totalCalculated = 0;

  // First pass: calculate amounts
  for (let i = 0; i < splitDetails.length; i++) {
    const detail = splitDetails[i];
    if (detail.percentage !== undefined) {
      const calculatedAmount = (amount * detail.percentage) / 100;
      const roundedAmount = Math.round(calculatedAmount * 100) / 100;
      result.set(detail.participant, roundedAmount);
      totalCalculated += roundedAmount;
    }
  }

  // Adjust for rounding errors on last participant
  const diff = Math.round((amount - totalCalculated) * 100) / 100;
  if (diff !== 0 && splitDetails.length > 0) {
    const lastParticipant = splitDetails[splitDetails.length - 1].participant;
    const currentAmount = result.get(lastParticipant) || 0;
    result.set(lastParticipant, currentAmount + diff);
  }

  return result;
}

/**
 * Share-based split: amount * (shares / totalShares)
 */
function calculateShareSplit(amount: number, splitDetails: SplitDetail[]): Map<string, number> {
  const result = new Map<string, number>();
  const totalShares = splitDetails.reduce((sum, d) => sum + (d.shares || 0), 0);

  if (totalShares === 0) {
    return result;
  }

  let totalCalculated = 0;

  // First pass: calculate amounts
  for (let i = 0; i < splitDetails.length; i++) {
    const detail = splitDetails[i];
    if (detail.shares !== undefined) {
      const calculatedAmount = (amount * detail.shares) / totalShares;
      const roundedAmount = Math.round(calculatedAmount * 100) / 100;
      result.set(detail.participant, roundedAmount);
      totalCalculated += roundedAmount;
    }
  }

  // Adjust for rounding errors on last participant
  const diff = Math.round((amount - totalCalculated) * 100) / 100;
  if (diff !== 0 && splitDetails.length > 0) {
    const lastParticipant = splitDetails[splitDetails.length - 1].participant;
    const currentAmount = result.get(lastParticipant) || 0;
    result.set(lastParticipant, currentAmount + diff);
  }

  return result;
}

/**
 * Validate that split amounts sum to transaction amount
 */
export function validateSplit(transaction: Transaction): ValidationError[] {
  const errors: ValidationError[] = [];
  const splitAmounts = calculateSplitAmounts(transaction);
  
  let totalSplit = 0;
  for (const amount of splitAmounts.values()) {
    totalSplit += amount;
  }

  const diff = Math.abs(totalSplit - transaction.amount);
  if (diff > 0.02) {
    errors.push({
      field: 'splitDetails',
      message: `Split amounts (${totalSplit.toFixed(2)}) do not equal transaction amount (${transaction.amount.toFixed(2)})`,
      value: { totalSplit, expected: transaction.amount },
    });
  }

  // Check that payer is included if it's an equal split
  if (transaction.splitType === 'equal') {
    const payerIncluded = transaction.participants.includes(transaction.paidBy);
    if (!payerIncluded) {
      errors.push({
        field: 'participants',
        message: 'Payer must be included in participants for equal split',
        value: transaction.paidBy,
      });
    }
  }

  return errors;
}

/**
 * Create default split details based on split type
 */
export function createDefaultSplitDetails(
  splitType: SplitType,
  participants: string[],
  totalAmount: number
): SplitDetail[] {
  switch (splitType) {
    case 'equal':
      return participants.map(p => ({
        participant: p,
        amount: totalAmount / participants.length,
      }));
    
    case 'percentage':
      const equalPercentage = 100 / participants.length;
      return participants.map(p => ({
        participant: p,
        percentage: equalPercentage,
      }));
    
    case 'shares':
      return participants.map(p => ({
        participant: p,
        shares: 1,
      }));
    
    case 'fixed':
      return participants.map(p => ({
        participant: p,
        amount: 0,
      }));
    
    default:
      return [];
  }
}
