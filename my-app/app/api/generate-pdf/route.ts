/**
 * @file app/api/generate-pdf/route.ts
 * @description API route for generating PDF reports with dark theme
 * @author SplitKar Team
 * @created 2026-02-24
 * @changeMarker [F-002-PDF-002] Updated to dark theme with bright text
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const GeneratePDFRequestSchema = z.object({
  title: z.string().default('SplitKar Report'),
  transactions: z.array(z.object({
    id: z.string(),
    paidBy: z.string(),
    amount: z.number(),
    description: z.string(),
    participants: z.array(z.string()),
    splitType: z.enum(['equal', 'percentage', 'fixed', 'shares']),
    createdAt: z.string().optional(),
    splitDetails: z.array(z.any()).optional(),
  })),
  balances: z.array(z.object({
    participant: z.string(),
    amount: z.number(),
  })),
  settlements: z.array(z.object({
    from: z.string(),
    to: z.string(),
    amount: z.number(),
  })),
});

// Dark theme color palette
const COLORS = {
  background: rgb(0.06, 0.06, 0.08),      // Deep dark background
  surface: rgb(0.1, 0.1, 0.12),           // Slightly lighter for cards
  textPrimary: rgb(0.95, 0.95, 0.97),     // Bright white text
  textSecondary: rgb(0.75, 0.75, 0.77),   // Light gray text
  textMuted: rgb(0.55, 0.55, 0.57),       // Muted text
  border: rgb(0.2, 0.2, 0.22),            // Subtle borders
  gold: rgb(0.96, 0.77, 0.09),            // Gold accent
  green: rgb(0.4, 0.9, 0.4),              // Bright green for positive
  red: rgb(1, 0.45, 0.45),                // Bright red for negative
};

// Helper to format currency
const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toFixed(2)}`;
};

// Helper to draw footer on a page
const drawFooter = (
  page: any,
  font: any,
  width: number,
  height: number
) => {
  const footerY = 30;
  
  // Draw separator line
  page.drawLine({
    start: { x: 50, y: footerY + 15 },
    end: { x: width - 50, y: footerY + 15 },
    thickness: 0.5,
    color: COLORS.border,
  });
  
  // Footer text
  const prefixText = 'Made in India by ';
  const nameText = 'MOHIT BAGRI';
  
  page.drawText(prefixText, {
    x: 50,
    y: footerY,
    font,
    size: 8,
    color: COLORS.textMuted,
  });
  
  const prefixWidth = font.widthOfTextAtSize(prefixText, 8);
  
  page.drawText(nameText, {
    x: 50 + prefixWidth,
    y: footerY,
    font,
    size: 8,
    color: COLORS.gold,
  });
  
  const urlText = 'mohitbagri-portfolio.vercel.app';
  const urlWidth = font.widthOfTextAtSize(urlText, 8);
  page.drawText(urlText, {
    x: width - 50 - urlWidth,
    y: footerY,
    font,
    size: 8,
    color: COLORS.gold,
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = GeneratePDFRequestSchema.parse(body);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 612;
    const pageHeight = 792;
    const leftMargin = 50;
    const rightMargin = pageWidth - 50;
    
    // Create first page with dark background
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    // Fill background with dark color
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: COLORS.background,
    });
    
    let y = pageHeight - 50;
    
    // Helper to add new page with dark background
    const addNewPage = () => {
      drawFooter(page, font, pageWidth, pageHeight);
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      
      // Fill background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: COLORS.background,
      });
      
      y = pageHeight - 50;
      return page;
    };
    
    const checkNewPage = (requiredSpace: number = 50) => {
      if (y < requiredSpace + 80) {
        addNewPage();
      }
    };
    
    // Header
    page.drawText(validated.title, {
      x: leftMargin,
      y,
      font: boldFont,
      size: 24,
      color: COLORS.gold,
    });
    
    y -= 30;
    
    page.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: leftMargin,
      y,
      font,
      size: 12,
      color: COLORS.textMuted,
    });
    
    y -= 40;
    
    // Summary
    page.drawText('Summary', {
      x: leftMargin,
      y,
      font: boldFont,
      size: 16,
      color: COLORS.textPrimary,
    });
    
    y -= 25;
    
    const totalAmount = validated.transactions.reduce((sum, t) => sum + t.amount, 0);
    
    page.drawText(`Total Transactions: ${validated.transactions.length}`, {
      x: leftMargin,
      y,
      font,
      size: 12,
      color: COLORS.textSecondary,
    });
    
    y -= 20;
    
    page.drawText(`Total Amount: ${formatCurrency(totalAmount)}`, {
      x: leftMargin,
      y,
      font,
      size: 12,
      color: COLORS.textSecondary,
    });
    
    y -= 20;
    
    page.drawText(`Participants: ${validated.balances.length}`, {
      x: leftMargin,
      y,
      font,
      size: 12,
      color: COLORS.textSecondary,
    });
    
    y -= 40;
    
    // Settlement Instructions Section
    if (validated.settlements.length > 0) {
      checkNewPage(150);
      
      page.drawText('Settlement Instructions', {
        x: leftMargin,
        y,
        font: boldFont,
        size: 16,
        color: COLORS.textPrimary,
      });
      
      y -= 25;
      
      for (const s of validated.settlements) {
        checkNewPage(30);
        
        page.drawText(`${s.from} owes ${s.to}:`, {
          x: leftMargin,
          y,
          font,
          size: 11,
          color: COLORS.textSecondary,
        });
        
        page.drawText(formatCurrency(s.amount), {
          x: 250,
          y,
          font: boldFont,
          size: 11,
          color: COLORS.gold,
        });
        
        y -= 20;
      }
      
      y -= 25;
    }
    
    // Balance Summary Section
    if (validated.balances.length > 0) {
      checkNewPage(150);
      
      page.drawText('Balance Summary', {
        x: leftMargin,
        y,
        font: boldFont,
        size: 16,
        color: COLORS.textPrimary,
      });
      
      y -= 25;
      
      for (const balance of validated.balances) {
        checkNewPage(30);
        
        const isPositive = balance.amount > 0;
        const amountText = formatCurrency(Math.abs(balance.amount));
        
        page.drawText(balance.participant, {
          x: leftMargin,
          y,
          font,
          size: 11,
          color: COLORS.textSecondary,
        });
        
        page.drawText(isPositive ? `gets back ${amountText}` : `owes ${amountText}`, {
          x: 150,
          y,
          font,
          size: 11,
          color: isPositive ? COLORS.green : COLORS.red,
        });
        
        y -= 18;
      }
      
      y -= 25;
    }
    
    // Transactions Section
    if (validated.transactions.length > 0) {
      checkNewPage(100);
      
      page.drawText('Transactions', {
        x: leftMargin,
        y,
        font: boldFont,
        size: 16,
        color: COLORS.textPrimary,
      });
      
      y -= 25;
      
      // Table header
      page.drawText('Description', { x: leftMargin, y, font: boldFont, size: 10, color: COLORS.textPrimary });
      page.drawText('Paid By', { x: 220, y, font: boldFont, size: 10, color: COLORS.textPrimary });
      page.drawText('Amount', { x: rightMargin - 80, y, font: boldFont, size: 10, color: COLORS.textPrimary });
      
      y -= 15;
      
      // Draw header separator
      page.drawLine({
        start: { x: leftMargin, y: y + 10 },
        end: { x: rightMargin, y: y + 10 },
        thickness: 1,
        color: COLORS.border,
      });
      
      y -= 10;
      
      for (const tx of validated.transactions) {
        checkNewPage(30);
        
        page.drawText(tx.description, { x: leftMargin, y, font, size: 10, color: COLORS.textSecondary });
        page.drawText(tx.paidBy, { x: 220, y, font, size: 10, color: COLORS.textSecondary });
        page.drawText(formatCurrency(tx.amount), { x: rightMargin - 80, y, font, size: 10, color: COLORS.textSecondary });
        
        y -= 18;
      }
    }
    
    // Draw footer on the last page
    drawFooter(page, font, pageWidth, pageHeight);
    
    const pdfBytes = await pdfDoc.save();
    
    return new Response(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="splitkar-report.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'PDF generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
