"use client";

/**
 * @file components/features/SettlementView.tsx
 * @description Settlement display with animated settlement lines, pagination, and sorting
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Wallet, Users, Receipt, TrendingDown, TrendingUp, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SettlementResult, Balance, Settlement } from '@/types';

interface SettlementViewProps {
  result: SettlementResult;
  onGeneratePDF: () => void;
  isGeneratingPDF?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function SettlementView({ result, onGeneratePDF, isGeneratingPDF = false }: SettlementViewProps) {
  const { settlements, balances, totalTransactions, totalAmount, optimizedTransactions } = result;
  const [currentPage, setCurrentPage] = useState(1);

  // Sort settlements by payer name alphabetically
  const sortedSettlements = useMemo(() => {
    return [...settlements].sort((a, b) => a.from.localeCompare(b.from));
  }, [settlements]);

  // Calculate pagination for settlements
  const totalPages = Math.ceil(sortedSettlements.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSettlements = sortedSettlements.slice(startIndex, endIndex);

  // Handle page changes
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Sort balances: creditors first, then debtors, then settled, all alphabetically within groups
  const sortedBalances = useMemo(() => {
    return [...balances].sort((a, b) => {
      // First sort by type (creditors > settled > debtors)
      const typeA = a.amount > 0.01 ? 2 : a.amount < -0.01 ? 0 : 1;
      const typeB = b.amount > 0.01 ? 2 : b.amount < -0.01 ? 0 : 1;
      if (typeA !== typeB) return typeB - typeA;
      // Then sort alphabetically by name
      return a.participant.localeCompare(b.participant);
    });
  }, [balances]);

  // Filter out near-zero balances for display (floating point tolerance)
  const creditors = balances.filter(b => b.amount > 0.01);
  const debtors = balances.filter(b => b.amount < -0.01);
  const settled = balances.filter(b => Math.abs(b.amount) <= 0.01);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Receipt className="w-5 h-5" />}
          label="Total Transactions"
          value={totalTransactions.toString()}
        />
        <SummaryCard
          icon={<Wallet className="w-5 h-5" />}
          label="Total Amount"
          value={`₹${totalAmount.toFixed(2)}`}
        />
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Participants"
          value={balances.length.toString()}
        />
        <SummaryCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="Optimized To"
          value={`${optimizedTransactions} payments`}
          highlight
        />
      </div>

      {/* Net Balances */}
      <Card className="gotham-card bg-[#1a1a1a] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#F5C518]" />
            Net Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedBalances.map((balance, index) => (
              <motion.div
                key={balance.participant}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`
                  p-3 rounded-lg border flex items-center justify-between
                  ${balance.amount > 0.01 
                    ? 'bg-emerald-950/30 border-emerald-800/50' 
                    : balance.amount < -0.01 
                      ? 'bg-red-950/30 border-red-800/50'
                      : 'bg-[#2a2a2a] border-[#333]'
                  }
                `}
              >
                <span className="font-medium text-white">{balance.participant}</span>
                <div className="flex items-center gap-1">
                  {balance.amount > 0.01 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  ) : balance.amount < -0.01 ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : null}
                  <span className={`
                    font-semibold
                    ${balance.amount > 0.01 ? 'text-emerald-400' : balance.amount < -0.01 ? 'text-red-400' : 'text-gray-400'}
                  `}>
                    {balance.amount > 0.01 ? '+' : ''}₹{Math.abs(balance.amount).toFixed(2)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Balance Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-800/50"></div>
              <span className="text-gray-400">Gets back (creditor)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-800/50"></div>
              <span className="text-gray-400">Owes money (debtor)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#2a2a2a] border border-[#333]"></div>
              <span className="text-gray-400">All settled</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settlement Instructions */}
      <Card className="gotham-card bg-[#1a1a1a] border-[#2a2a2a]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-[#F5C518]" />
            Settlement Instructions
            {settlements.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-[#F5C518]/20 text-[#F5C518] border-0">
                {settlements.length} total
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={onGeneratePDF}
            disabled={isGeneratingPDF}
            className="btn-gold flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4" />
                Export PDF
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              All settled! No payments needed.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedSettlements.map((settlement, index) => (
                <motion.div
                  key={`${settlement.from}-${settlement.to}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="
                    flex items-center justify-between p-4 
                    bg-[#2a2a2a]/50 rounded-lg border border-[#333]
                    hover:border-[#F5C518]/30 transition-colors
                  "
                >
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-white">{settlement.from}</p>
                      <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-0">
                        pays
                      </Badge>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#F5C518]" />
                    <div>
                      <p className="font-medium text-white">{settlement.to}</p>
                      <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-0">
                        receives
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#F5C518]">
                      ₹{settlement.amount.toFixed(2)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination Controls for Settlements */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between px-4 py-3 bg-[#0f0f0f]/50 rounded-lg border border-[#2a2a2a]">
              <div className="text-sm text-gray-400">
                Showing <span className="text-white font-medium">{startIndex + 1}</span> to{' '}
                <span className="text-white font-medium">{Math.min(endIndex, sortedSettlements.length)}</span> of{' '}
                <span className="text-white font-medium">{sortedSettlements.length}</span> settlements
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-[#F5C518] hover:bg-[#F5C518]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={`h-8 w-8 p-0 text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-[#F5C518] text-[#0f0f0f] hover:bg-[#F5C518]/90'
                          : 'text-gray-400 hover:text-[#F5C518] hover:bg-[#F5C518]/10'
                      }`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-[#F5C518] hover:bg-[#F5C518]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

function SummaryCard({ icon, label, value, highlight = false }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-4 rounded-xl border
        ${highlight 
          ? 'bg-[#F5C518]/10 border-[#F5C518]/30' 
          : 'bg-[#1a1a1a] border-[#2a2a2a]'
        }
      `}
    >
      <div className={`${highlight ? 'text-[#F5C518]' : 'text-gray-500'} mb-2`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-[#F5C518]' : 'text-white'}`}>
        {value}
      </p>
    </motion.div>
  );
}
