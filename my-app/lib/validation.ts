/**
 * @file lib/validation.ts
 * @description Validation schemas using Zod
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { z } from 'zod';

export const SplitDetailSchema = z.object({
  participant: z.string().min(1, 'Participant name is required'),
  amount: z.number().optional(),
  percentage: z.number().min(0).max(100).optional(),
  shares: z.number().int().positive().optional(),
});

export const TransactionSchema = z.object({
  id: z.string(),
  paidBy: z.string().min(1, 'Payer name is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  participants: z.array(z.string()).min(1, 'At least one participant is required'),
  splitType: z.enum(['equal', 'percentage', 'fixed', 'shares']),
  splitDetails: z.array(SplitDetailSchema),
  date: z.string().optional(),
  createdAt: z.date(),
});

export const ParsedTransactionSchema = z.object({
  paidBy: z.string(),
  amount: z.number().positive(),
  description: z.string(),
  participants: z.array(z.string()),
  splitType: z.enum(['equal', 'percentage', 'fixed', 'shares']),
});

export const ParseResultSchema = z.object({
  transactions: z.array(ParsedTransactionSchema),
  confidence: z.number().min(0).max(1),
  parsingMethod: z.enum(['rule-based', 'llm']),
  errors: z.array(z.string()).optional(),
});

export const CSVParseRequestSchema = z.object({
  content: z.string().min(1, 'CSV content is required'),
  filename: z.string().optional(),
  options: z.object({
    hasHeaders: z.boolean().optional(),
    delimiter: z.string().optional(),
    encoding: z.string().optional(),
  }).optional(),
});

export const NaturalLanguageParseRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  useLLM: z.boolean().optional(),
});

export const GeneratePDFRequestSchema = z.object({
  title: z.string().optional(),
  includeTransactions: z.boolean().optional(),
  includeSettlements: z.boolean().optional(),
  includeBalances: z.boolean().optional(),
});

export const BalanceSchema = z.object({
  participant: z.string(),
  amount: z.number(),
});

export const SettlementSchema = z.object({
  from: z.string(),
  to: z.string(),
  amount: z.number().positive(),
});

export type ValidatedTransaction = z.infer<typeof TransactionSchema>;
export type ValidatedParseResult = z.infer<typeof ParseResultSchema>;
export type ValidatedBalance = z.infer<typeof BalanceSchema>;
export type ValidatedSettlement = z.infer<typeof SettlementSchema>;
