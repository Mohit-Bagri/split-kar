/**
 * @file lib/llm.ts
 * @description OpenAI LLM integration for natural language parsing
 * @author SplitKar Team
 * @created 2026-02-24
 */

import OpenAI from 'openai';
import { ParsedTransaction, ParseResult } from '@/types';

// Initialize OpenAI client (server-side only)
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }
  return new OpenAI({ apiKey });
};

const SYSTEM_PROMPT = `You are a precise expense parsing assistant. Extract expense transactions from the user's text.

Rules:
1. Return ONLY valid JSON - no markdown, no explanations, no commentary
2. The response must match this exact structure:
{
  "transactions": [
    {
      "paidBy": "Name of person who paid",
      "amount": 500,
      "description": "What was purchased",
      "participants": ["Name1", "Name2"],
      "splitType": "equal"
    }
  ]
}

3. paidBy: The person who paid (single name)
4. amount: Numeric value only, no currency symbols
5. description: Brief description of the expense
6. participants: Array of all people sharing the expense (including payer if they're part of the split)
7. splitType: Always "equal" unless specified otherwise

8. If text mentions "everyone", "all", "us", "the group" - include all unique names mentioned in the entire text as participants
9. If multiple expenses are mentioned, create multiple transaction objects
10. Use exact names as they appear in the text

Example input: "Mohit paid 500 for horse riding for Mohit, Pankaj, Dhruv and Rudra. Pankaj paid 300 for breakfast."
Example output:
{
  "transactions": [
    {
      "paidBy": "Mohit",
      "amount": 500,
      "description": "horse riding",
      "participants": ["Mohit", "Pankaj", "Dhruv", "Rudra"],
      "splitType": "equal"
    },
    {
      "paidBy": "Pankaj",
      "amount": 300,
      "description": "breakfast",
      "participants": ["Mohit", "Pankaj", "Dhruv", "Rudra"],
      "splitType": "equal"
    }
  ]
}`;

/**
 * Parse natural language using OpenAI LLM
 */
export async function parseWithLLM(text: string): Promise<ParseResult> {
  try {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Validate structure
    if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
      throw new Error('Invalid response structure: missing transactions array');
    }

    // Validate and clean transactions
    const transactions: ParsedTransaction[] = parsed.transactions.map((t: unknown) => {
      const tx = t as Record<string, unknown>;
      return {
        paidBy: String(tx.paidBy || ''),
        amount: Number(tx.amount || 0),
        description: String(tx.description || ''),
        participants: Array.isArray(tx.participants) 
          ? tx.participants.map(String) 
          : [String(tx.paidBy || '')],
        splitType: 'equal' as const,
      };
    }).filter((t: ParsedTransaction) => 
      t.paidBy && t.amount > 0 && t.description
    );

    return {
      transactions,
      confidence: 0.95,
      parsingMethod: 'llm',
    };
  } catch (error) {
    console.error('LLM parsing error:', error);
    
    return {
      transactions: [],
      confidence: 0,
      parsingMethod: 'llm',
      errors: [error instanceof Error ? error.message : 'Unknown LLM error'],
    };
  }
}

/**
 * Check if LLM is available (API key is configured)
 */
export function isLLMAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
