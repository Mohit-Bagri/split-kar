/**
 * @file lib/parser.ts
 * @description CSV and natural language parsing logic
 * @author SplitKar Team
 * @created 2026-02-24
 */

import {
  Transaction,
  ParsedTransaction,
  ParseResult,
  CSVParseOptions,
  SplitType
} from '@/types';
import { logger } from './logger';

export interface CSVValidationResult {
  valid: boolean;
  errors: string[];
  unmatchedNames: string[];
  suggestions: Map<string, string>; // unmatched name -> suggested match
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Find best match for a name from the valid participants list
 */
function findBestMatch(name: string, validParticipants: string[]): string | null {
  const normalizedName = name.toLowerCase().trim();
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  
  for (const participant of validParticipants) {
    const normalizedParticipant = participant.toLowerCase().trim();
    
    // Exact match
    if (normalizedName === normalizedParticipant) {
      return participant;
    }
    
    // Calculate Levenshtein distance
    const distance = levenshteinDistance(normalizedName, normalizedParticipant);
    const maxLength = Math.max(normalizedName.length, normalizedParticipant.length);
    const similarity = 1 - (distance / maxLength);
    
    // Consider it a match if similarity is high (> 0.6)
    if (similarity > 0.6 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = participant;
    }
  }
  
  return bestMatch;
}

/**
 * Validate CSV names against group participants
 */
export function validateCSVNames(
  transactions: ParsedTransaction[],
  validParticipants: string[]
): CSVValidationResult {
  logger.info('parser', 'Validating CSV names against participants', {
    transactionCount: transactions.length,
    validParticipants
  });
  
  const errors: string[] = [];
  const unmatchedNames: string[] = [];
  const suggestions = new Map<string, string>();
  const allNamesInCSV = new Set<string>();
  
  // Collect all unique names from CSV
  for (const tx of transactions) {
    allNamesInCSV.add(tx.paidBy);
    tx.participants.forEach(p => allNamesInCSV.add(p));
  }
  
  logger.debug('parser', 'Names found in CSV', {
    names: Array.from(allNamesInCSV)
  });
  
  // Validate each name
  for (const name of allNamesInCSV) {
    const bestMatch = findBestMatch(name, validParticipants);
    
    if (!bestMatch) {
      unmatchedNames.push(name);
      errors.push(`"${name}" is not in the group participants list`);
    } else if (bestMatch.toLowerCase() !== name.toLowerCase()) {
      // Found a fuzzy match
      suggestions.set(name, bestMatch);
      logger.warn('parser', `Name mismatch: "${name}" -> suggested "${bestMatch}"`);
    }
  }
  
  const result: CSVValidationResult = {
    valid: unmatchedNames.length === 0,
    errors,
    unmatchedNames,
    suggestions
  };
  
  if (!result.valid) {
    logger.error('parser', 'CSV validation failed', undefined, {
      errors,
      unmatchedNames,
      suggestionCount: suggestions.size
    });
  } else if (suggestions.size > 0) {
    logger.warn('parser', 'CSV validation passed with suggestions', {
      suggestions: Object.fromEntries(suggestions)
    });
  } else {
    logger.info('parser', 'CSV validation passed');
  }
  
  return result;
}

/**
 * Apply name corrections to transactions based on suggestions
 */
export function applyNameCorrections(
  transactions: ParsedTransaction[],
  corrections: Map<string, string>
): ParsedTransaction[] {
  return transactions.map(tx => ({
    ...tx,
    paidBy: corrections.get(tx.paidBy) || tx.paidBy,
    participants: tx.participants.map(p => corrections.get(p) || p)
  }));
}

// Simple UUID generator
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface CSVRow {
  [key: string]: string | number;
}

const COLUMN_MAPPINGS: Record<string, string[]> = {
  paidBy: ['paid_by', 'paidby', 'payer', 'paid by', 'who paid', 'person', 'name', 'from'],
  amount: ['amount', 'cost', 'price', 'total', 'value', 'sum', 'amt'],
  description: ['description', 'desc', 'item', 'expense', 'what', 'for', 'note', 'details'],
  participants: ['participants', 'split_with', 'split with', 'involved', 'shared with', 'people'],
  splitType: ['split_type', 'splittype', 'type', 'split'],
  date: ['date', 'day', 'when', 'timestamp'],
};

/**
 * Normalize column name to standard field
 */
function normalizeColumnName(colName: string): string | null {
  const normalized = colName.toLowerCase().trim().replace(/[_\s-]+/g, '_');
  
  for (const [standard, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    if (aliases.includes(normalized) || aliases.includes(colName.toLowerCase().trim())) {
      return standard;
    }
  }
  
  return null;
}

/**
 * Detect column mapping from CSV headers
 */
function detectColumnMapping(headers: string[]): Map<string, string> {
  const mapping = new Map<string, string>();
  
  for (const header of headers) {
    const normalized = normalizeColumnName(header);
    if (normalized) {
      mapping.set(normalized, header);
    }
  }
  
  return mapping;
}

/**
 * Parse amount from various formats
 */
function parseAmount(value: string | number): number {
  if (typeof value === 'number') return value;
  
  // Remove currency symbols and whitespace
  const cleaned = value.replace(/[₹$€£\s,]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse participants from various formats
 * Handles quoted CSV values like "Mohit,Pankaj,Dhruv"
 */
function parseParticipants(value: string | number): string[] {
  if (typeof value === 'number') return [String(value)];
  
  // Remove surrounding quotes if present
  let cleanedValue = value.trim();
  if ((cleanedValue.startsWith('"') && cleanedValue.endsWith('"')) ||
      (cleanedValue.startsWith("'") && cleanedValue.endsWith("'"))) {
    cleanedValue = cleanedValue.slice(1, -1);
  }
  
  // Split by common delimiters
  const participants = cleanedValue
    .split(/[,|\/;&]+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  return participants;
}

/**
 * Parse a CSV line respecting quoted values
 * Handles: value1,"value, with, commas",value3
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    // Only treat double quotes as CSV quote characters (not single quotes)
    if (char === '"' && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Parse CSV content into transactions using simple parsing
 * @param predefinedParticipants - Optional list of participants to use when not specified in CSV
 */
export function parseCSV(
  content: string,
  options: CSVParseOptions = {},
  predefinedParticipants?: string[]
): ParseResult {
  logger.info('parser', 'Starting CSV parse', {
    hasPredefinedParticipants: !!predefinedParticipants,
    participantCount: predefinedParticipants?.length || 0
  });
  
  const errors: string[] = [];
  const lines = content.trim().split('\n');
  
  // DEBUG: Log raw line count
  logger.info('parser', 'DEBUG - Raw CSV stats', {
    totalLines: lines.length,
    headerLine: lines[0]?.substring(0, 50),
    lastLineNumber: lines.length,
    lastLinePreview: lines[lines.length - 1]?.substring(0, 50)
  });
  
  if (lines.length === 0) {
    logger.warn('parser', 'Empty CSV content');
    return { transactions: [], confidence: 0, parsingMethod: 'rule-based', errors: ['Empty CSV'] };
  }

  // Detect delimiter
  const delimiter = options.delimiter || ',';
  
  // Parse headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter);
  const columnMapping = detectColumnMapping(headers);
  
  logger.debug('parser', 'CSV headers detected', {
    headers,
    mappedColumns: Object.fromEntries(columnMapping)
  });

  // Validate required columns
  const requiredColumns = ['paidBy', 'amount', 'description'];
  const missingColumns = requiredColumns.filter(col => !columnMapping.has(col));
  
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    // Continue anyway - try to parse with position-based heuristic
  }

  const transactions: ParsedTransaction[] = [];
  const skippedRows: { line: number; reason: string; content: string }[] = [];
  let processedCount = 0;
  let pushCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    processedCount++;
    
    // DEBUG: Log any line that's being skipped
    if (!line) {
      skippedRows.push({ line: i + 1, reason: 'Empty line', content: '' });
      logger.warn('parser', `Skipping EMPTY line ${i + 1}`);
      continue;
    }

    try {
      // DEBUG: Log before parsing line 31
      if (i === 30) {
        logger.info('parser', `DEBUG - About to parse line ${i + 1}`, { line: line.substring(0, 100) });
      }
      
      const values = parseCSVLine(line, delimiter);
      
      // DEBUG: Log after parsing line 31
      if (i === 30) {
        logger.info('parser', `DEBUG - Successfully parsed line ${i + 1}`, { valuesCount: values.length });
      }
      
      // DEBUG: Log parsed values for line 101
      if (i === 100) {
        logger.info('parser', `DEBUG - Parsed values for line ${i + 1}`, {
          valuesCount: values.length,
          values: values.map(v => v?.substring(0, 30)),
          paidByIndex: headers.indexOf(columnMapping.get('paidBy') || ''),
          amountIndex: headers.indexOf(columnMapping.get('amount') || ''),
          descIndex: headers.indexOf(columnMapping.get('description') || '')
        });
      }
      
      // Map values based on detected columns or position
      const paidByCol = columnMapping.get('paidBy');
      const amountCol = columnMapping.get('amount');
      const descCol = columnMapping.get('description');
      const participantsCol = columnMapping.get('participants');
      const splitTypeCol = columnMapping.get('splitType');

      const paidBy = paidByCol
        ? values[headers.indexOf(paidByCol)]
        : values[0];
      const amount = parseAmount(amountCol
        ? values[headers.indexOf(amountCol)]
        : values[1]);
      const description = descCol
        ? values[headers.indexOf(descCol)]
        : values[2];

      // DEBUG: Log validation check for line 101
      if (i === 100) {
        logger.info('parser', `DEBUG - Validation check for line ${i + 1}`, {
          paidBy,
          amount,
          description,
          hasPaidBy: !!paidBy,
          isValidAmount: amount > 0,
          hasDescription: !!description,
          willSkip: !paidBy || amount <= 0 || !description
        });
      }
      
      if (!paidBy || amount <= 0 || !description) {
        const reason = !paidBy ? 'Missing payer' :
                      amount <= 0 ? 'Invalid amount' :
                      'Missing description';
        skippedRows.push({ line: i + 1, reason, content: line.substring(0, 100) });
        logger.warn('parser', `Skipping row ${i + 1}: ${reason}`, { line: i + 1, paidBy, amount, description: description?.substring(0, 50) });
        continue; // Skip invalid rows
      }
      
      // DEBUG: Log every push
      logger.info('parser', `PUSH row ${i + 1}: ${description?.substring(0, 30)}`, {
        line: i + 1,
        description: description?.substring(0, 30),
        paidBy,
        amount,
        pushNumber: pushCount + 1
      });
      
      // DEBUG: Log successful push for line 101
      if (i === 100) {
        logger.info('parser', `DEBUG - Successfully adding transaction for line ${i + 1}`);
      }

      // Parse participants - use predefined list if available and no participants column
      let participants: string[];
      if (participantsCol) {
        const participantValue = values[headers.indexOf(participantsCol)];
        participants = parseParticipants(participantValue);
      } else if (predefinedParticipants && predefinedParticipants.length > 0) {
        // Use the group participants when not specified in CSV
        participants = [...predefinedParticipants];
      } else {
        participants = [paidBy];
      }
      
      // Ensure payer is always included in participants
      if (!participants.includes(paidBy.trim())) {
        participants.push(paidBy.trim());
      }

      // Parse split type
      let splitType: SplitType = 'equal';
      if (splitTypeCol) {
        const typeStr = values[headers.indexOf(splitTypeCol)]?.toLowerCase() || '';
        if (typeStr.includes('percent')) splitType = 'percentage';
        else if (typeStr.includes('fixed')) splitType = 'fixed';
        else if (typeStr.includes('share')) splitType = 'shares';
      }

      transactions.push({
        paidBy: paidBy.trim(),
        amount,
        description: description.trim(),
        participants: participants.length > 0 ? participants : [paidBy.trim()],
        splitType,
      });
      pushCount++;
    } catch (err) {
      const errorMsg = `Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`;
      errors.push(errorMsg);
      logger.error('parser', `Error parsing row ${i + 1}`, err instanceof Error ? err : undefined, {
        line: i + 1,
        lineContent: line.substring(0, 100)
      });
    }
  }

  // Add warning about skipped rows
  if (skippedRows.length > 0) {
    const skippedMessage = `⚠️ ${skippedRows.length} row(s) were skipped during import:\n` +
      skippedRows.slice(0, 5).map(s => `  Row ${s.line}: ${s.reason}`).join('\n') +
      (skippedRows.length > 5 ? `\n  ... and ${skippedRows.length - 5} more` : '');
    errors.push(skippedMessage);
    
    logger.warn('parser', `${skippedRows.length} rows skipped during CSV parsing`, {
      totalRows: lines.length - 1,
      parsedRows: transactions.length,
      skippedRows: skippedRows.length,
      firstFewSkipped: skippedRows.slice(0, 3)
    });
  }

  // DEBUG: Detailed line-by-line tracking
  const processedLineNumbers = new Set<number>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) processedLineNumbers.add(i);
  }
  const skippedLineNumbers = new Set(skippedRows.map(s => s.line - 1)); // Convert to 0-indexed
  const missingLineNumbers: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!skippedLineNumbers.has(i) && !transactions[i - 1]) {
      missingLineNumbers.push(i + 1); // Convert back to 1-indexed for display
    }
  }
  
  // DEBUG: Check last transaction
  logger.info('parser', `CSV parsing complete`, {
    totalLines: lines.length,
    dataRows: lines.length - 1,
    processedCount,
    pushCount,
    transactionsLength: transactions.length,
    parsedRows: transactions.length,
    skippedRows: skippedRows.length,
    errors: errors.length,
    missingLineNumbers: missingLineNumbers.slice(0, 5),
    lastFewLines: lines.slice(-3).map((l, i) => ({
      lineNum: lines.length - 2 + i,
      preview: l.substring(0, 60),
      isEmpty: !l.trim()
    })),
    lastTransaction: transactions.length > 0 ? {
      index: transactions.length - 1,
      paidBy: transactions[transactions.length - 1]?.paidBy,
      description: transactions[transactions.length - 1]?.description,
      amount: transactions[transactions.length - 1]?.amount
    } : null
  });

  return {
    transactions,
    confidence: errors.length === 0 ? 1 : 0.7,
    parsingMethod: 'rule-based',
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Rule-based natural language parsing
 * Returns null if confidence is too low (needs LLM)
 */
export function parseNaturalLanguageRuleBased(text: string): ParseResult | null {
  const transactions: ParsedTransaction[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Pattern: [Name] paid [amount] for [description] [for/with] [participants]
  const paymentPattern = /(\w+)\s+(?:paid|spent|gave)\s+(?:₹|Rs\.?\s*|\$)?\s*(\d+(?:\.\d{1,2})?)\s+(?:for|on)\s+(.+?)(?:\s+(?:for|with|among|between)\s+(.+))?$/i;
  
  // Alternative pattern: [Name] [bought/purchased] [description] for [amount]
  const purchasePattern = /(\w+)\s+(?:bought|purchased)\s+(.+?)\s+(?:for|at)\s+(?:₹|Rs\.?\s*|\$)?\s*(\d+(?:\.\d{1,2})?)/i;

  let hasHighConfidence = true;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 5) continue;

    let match = paymentPattern.exec(trimmed);
    let paidBy: string | null = null;
    let amount = 0;
    let description = '';
    let participants: string[] = [];

    if (match) {
      paidBy = match[1];
      amount = parseFloat(match[2]);
      description = match[3]?.trim() || '';
      const participantsStr = match[4];
      
      if (participantsStr) {
        participants = parseParticipantsFromText(participantsStr);
      }
    } else {
      match = purchasePattern.exec(trimmed);
      if (match) {
        paidBy = match[1];
        description = match[2]?.trim() || '';
        amount = parseFloat(match[3]);
      }
    }

    if (paidBy && amount > 0 && description) {
      // If no participants specified, assume payer + "everyone" or just payer
      if (participants.length === 0) {
        participants = [paidBy];
      }

      transactions.push({
        paidBy,
        amount,
        description,
        participants: participants.length > 0 ? participants : [paidBy],
        splitType: 'equal',
      });
    } else {
      hasHighConfidence = false;
    }
  }

  if (transactions.length === 0) {
    return null; // Signal to use LLM
  }

  return {
    transactions,
    confidence: hasHighConfidence ? 0.9 : 0.5,
    parsingMethod: 'rule-based',
  };
}

/**
 * Parse participants from text like "Mohit, Pankaj and Dhruv" or "everyone"
 */
function parseParticipantsFromText(text: string): string[] {
  // Handle "everyone", "all", "the group"
  const groupWords = ['everyone', 'all', 'the group', 'us', 'the team'];
  const lowerText = text.toLowerCase().trim();
  
  if (groupWords.some(word => lowerText.includes(word))) {
    // Return empty to signal it should be determined from context
    return [];
  }

  // Split by common delimiters and words
  const participants = text
    .split(/[,\s]+(?:and|&|\+)[,\s]*|[,\s]+/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !['and', '&', '+', ''].includes(p));

  return participants;
}

/**
 * Convert parsed transactions to full Transaction objects
 */
export function toTransactions(parsed: ParsedTransaction[]): Transaction[] {
  return parsed.map(p => ({
    id: generateId(),
    paidBy: p.paidBy,
    amount: p.amount,
    description: p.description,
    participants: p.participants,
    splitType: p.splitType,
    splitDetails: p.participants.map(part => ({
      participant: part,
      amount: p.splitType === 'equal' ? p.amount / p.participants.length : undefined,
    })),
    createdAt: new Date(),
  }));
}
