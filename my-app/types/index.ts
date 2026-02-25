/**
 * @file types/index.ts
 * @description Core type definitions for SplitKar
 * @author SplitKar Team
 * @created 2026-02-24
 */

export type SplitType = 'equal' | 'percentage' | 'fixed' | 'shares';

export interface SplitDetail {
  participant: string;
  amount?: number;
  percentage?: number;
  shares?: number;
}

export interface Transaction {
  id: string;
  paidBy: string;
  amount: number;
  description: string;
  participants: string[];
  splitType: SplitType;
  splitDetails: SplitDetail[];
  date?: string;
  createdAt: Date;
}

export interface Participant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface Balance {
  participant: string;
  amount: number;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface ParsedTransaction {
  paidBy: string;
  amount: number;
  description: string;
  participants: string[];
  splitType: SplitType;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  confidence: number;
  parsingMethod: 'rule-based' | 'llm';
  errors?: string[];
  validation?: {
    valid: boolean;
    errors: string[];
    unmatchedNames: string[];
    suggestions: Record<string, string>;
  };
}

export interface CSVParseOptions {
  hasHeaders?: boolean;
  delimiter?: string;
  encoding?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface SettlementResult {
  settlements: Settlement[];
  balances: Balance[];
  totalTransactions: number;
  totalAmount: number;
  optimizedTransactions: number;
}

export interface PDFReportData {
  title: string;
  date: string;
  transactions: Transaction[];
  balances: Balance[];
  settlements: Settlement[];
  participants: string[];
  totalAmount: number;
  currency?: string;
}

export interface AppState {
  transactions: Transaction[];
  participants: Participant[];
  settlements: Settlement[];
  balances: Balance[];
  isLoading: boolean;
  error: string | null;
}

export interface SplitConfig {
  type: SplitType;
  details: Map<string, number>; // participant -> value (amount/percentage/shares)
}

export interface NaturalLanguageParseRequest {
  text: string;
  useLLM?: boolean;
}

export interface CSVParseRequest {
  content: string;
  filename?: string;
  options?: CSVParseOptions;
}

export interface GeneratePDFRequest {
  title?: string;
  includeTransactions?: boolean;
  includeSettlements?: boolean;
  includeBalances?: boolean;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
}
