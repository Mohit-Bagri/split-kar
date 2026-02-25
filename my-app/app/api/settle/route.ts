/**
 * @file app/api/settle/route.ts
 * @description API route for calculating settlements
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateSettlement, SettlementAuditEntry } from '@/lib/settlement';
import { logger } from '@/lib/logger';
import { Transaction } from '@/types';

const SettleRequestSchema = z.object({
  transactions: z.array(z.object({
    id: z.string(),
    paidBy: z.string(),
    amount: z.number().positive(),
    description: z.string(),
    participants: z.array(z.string()),
    splitType: z.enum(['equal', 'percentage', 'fixed', 'shares']),
    splitDetails: z.array(z.object({
      participant: z.string(),
      amount: z.number().optional(),
      percentage: z.number().optional(),
      shares: z.number().optional(),
    })),
    date: z.string().optional(),
    createdAt: z.string().transform(str => new Date(str)),
  })),
  allParticipants: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    logger.info('settlement', 'Settlement API called');
    
    const body = await request.json();
    const validated = SettleRequestSchema.parse(body);

    // Extract all unique participants if not provided
    const allParticipants = validated.allParticipants || Array.from(new Set(
      validated.transactions.flatMap((t: { paidBy: string; participants: string[] }) => [t.paidBy, ...t.participants])
    ));

    logger.debug('settlement', 'Processing settlement request', {
      transactionCount: validated.transactions.length,
      participantCount: allParticipants.length,
      participants: allParticipants
    });

    const result = calculateSettlement(validated.transactions as Transaction[], allParticipants);

    // Include audit trail in response
    const response = {
      ...result,
      audit: {
        timestamp: new Date().toISOString(),
        transactionCount: validated.transactions.length,
        participantCount: allParticipants.length,
        participants: allParticipants,
      }
    };

    logger.info('settlement', 'Settlement API completed successfully');
    return NextResponse.json(response);
  } catch (error) {
    logger.error('settlement', 'Settlement API error', error instanceof Error ? error : undefined);
    
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
