/**
 * @file app/api/parse/route.ts
 * @description API route for parsing CSV and natural language
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  parseCSV,
  parseNaturalLanguageRuleBased,
  validateCSVNames,
  applyNameCorrections,
  CSVValidationResult
} from '@/lib/parser';
import { parseWithLLM, isLLMAvailable } from '@/lib/llm';
import { logger } from '@/lib/logger';
import { SplitType } from '@/types';

const ParseRequestSchema = z.object({
  type: z.enum(['csv', 'text', 'names']),
  content: z.string(),
  options: z.object({}).passthrough().optional(),
  useLLM: z.boolean().optional(),
  participants: z.array(z.string()).optional(), // Predefined participant list
});

export async function POST(request: NextRequest) {
  try {
    logger.info('parser', 'Parse API called', { type: request.headers.get('content-type') });
    
    const body = await request.json();
    const validated = ParseRequestSchema.parse(body);

    logger.debug('parser', 'Request validated', {
      type: validated.type,
      hasParticipants: !!validated.participants,
      participantCount: validated.participants?.length || 0
    });

    // Handle names CSV upload
    if (validated.type === 'names') {
      const names = parseNamesCSV(validated.content);
      logger.info('parser', 'Names parsed from CSV', { count: names.length });
      return NextResponse.json({ names, count: names.length });
    }

    if (validated.type === 'csv') {
      const result = parseCSV(validated.content, validated.options || {}, validated.participants);
      
      // Validate CSV names against group participants if provided
      let validationResult: CSVValidationResult | undefined;
      if (validated.participants && validated.participants.length > 0) {
        validationResult = validateCSVNames(result.transactions, validated.participants);
        
        // If there are suggestions but no errors, auto-apply corrections
        if (validationResult.valid && validationResult.suggestions.size > 0) {
          logger.info('parser', 'Auto-applying name corrections', {
            corrections: Object.fromEntries(validationResult.suggestions)
          });
          result.transactions = applyNameCorrections(result.transactions, validationResult.suggestions);
        }
        
        // Add validation result to response
        result.validation = {
          valid: validationResult.valid,
          errors: validationResult.errors,
          unmatchedNames: validationResult.unmatchedNames,
          suggestions: Object.fromEntries(validationResult.suggestions)
        };
        
        // If validation failed, return error
        if (!validationResult.valid) {
          logger.error('parser', 'CSV validation failed', undefined, {
            errors: validationResult.errors,
            unmatchedNames: validationResult.unmatchedNames
          });
          return NextResponse.json(result, { status: 400 });
        }
      }
      
      // Normalize participant names if list provided
      if (validated.participants) {
        result.transactions = normalizeTransactions(result.transactions, validated.participants);
      }
      
      logger.info('parser', 'CSV parsed successfully', {
        transactionCount: result.transactions.length,
        confidence: result.confidence
      });
      
      return NextResponse.json(result);
    } else {
      // Try rule-based first
      let result = parseNaturalLanguageRuleBased(validated.content);
      
      logger.debug('parser', 'Rule-based parsing attempted', {
        hasResult: !!result,
        transactionCount: result?.transactions?.length || 0
      });
      
      // If rule-based fails or user explicitly wants LLM
      if (!result || validated.useLLM) {
        if (isLLMAvailable()) {
          logger.info('parser', 'Using LLM for parsing');
          result = await parseWithLLM(validated.content);
        } else {
          logger.warn('parser', 'LLM not available for parsing');
          // Return empty result instead of error - let UI handle it
          return NextResponse.json({
            transactions: [],
            confidence: 0,
            parsingMethod: 'rule-based' as const,
            errors: ['Could not parse text. Try formatting like: "Mohit paid 500 for dinner"'],
          });
        }
      }

      // Normalize participant names if list provided
      if (validated.participants && result) {
        result.transactions = normalizeTransactions(result.transactions, validated.participants);
      }

      logger.info('parser', 'Text parsed successfully', {
        transactionCount: result?.transactions?.length || 0,
        confidence: result?.confidence
      });

      return NextResponse.json(result);
    }
  } catch (error) {
    logger.error('parser', 'Parse API error', error instanceof Error ? error : undefined);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Parse names from CSV content (single column)
 */
function parseNamesCSV(content: string): string[] {
  const lines = content.trim().split('\n');
  const names: string[] = [];
  
  // Skip header if it contains 'name'
  const startIndex = lines[0].toLowerCase().includes('name') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const name = lines[i].trim();
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }
  
  return names;
}

interface TransactionData {
  paidBy: string;
  amount: number;
  description: string;
  participants: string[];
  splitType: SplitType;
}

/**
 * Normalize transaction participants against predefined list
 * Handles case-insensitive matching (Mohit = mohit = MOHIT)
 */
function normalizeTransactions(
  transactions: TransactionData[],
  validParticipants: string[]
): TransactionData[] {
  // Create case-insensitive lookup map
  const normalizedMap = new Map<string, string>();
  validParticipants.forEach(p => {
    normalizedMap.set(p.toLowerCase(), p);
  });

  return transactions.map(tx => {
    // Normalize paidBy - if not in valid participants, use first valid participant as fallback
    let normalizedPaidBy = normalizedMap.get(tx.paidBy.toLowerCase());
    if (!normalizedPaidBy) {
      // Payer not in group - use first participant as fallback and add original as participant
      normalizedPaidBy = validParticipants[0] || tx.paidBy;
    }
    
    // Handle participants
    let normalizedParticipants: string[];
    
    // If participants is empty or only contains the payer, use ALL valid participants
    if (tx.participants.length === 0 ||
        (tx.participants.length === 1 && tx.participants[0].toLowerCase() === tx.paidBy.toLowerCase())) {
      normalizedParticipants = [...validParticipants];
    } else {
      // Normalize each participant name
      normalizedParticipants = tx.participants.map(p =>
        normalizedMap.get(p.toLowerCase()) || p
      ).filter(p => validParticipants.includes(p)); // Only keep valid participants
      
      // If after filtering no valid participants remain, use all
      if (normalizedParticipants.length === 0) {
        normalizedParticipants = [...validParticipants];
      }
    }
    
    // Ensure payer is always in participants
    if (!normalizedParticipants.includes(normalizedPaidBy)) {
      normalizedParticipants.push(normalizedPaidBy);
    }

    return {
      ...tx,
      paidBy: normalizedPaidBy,
      participants: normalizedParticipants,
    };
  });
}
