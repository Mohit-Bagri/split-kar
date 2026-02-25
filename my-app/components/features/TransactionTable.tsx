"use client";

/**
 * @file components/features/TransactionTable.tsx
 * @description Transaction preview table with editable rows, pagination, and delete confirmation
 * @author SplitKar Team
 * @created 2026-02-24
 * @changeMarker [F-002-TT-001] Added delete confirmation dialog
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Users, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Transaction } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const splitTypeLabels: Record<string, string> = {
  equal: 'Equal',
  percentage: 'Percentage',
  fixed: 'Fixed',
  shares: 'Shares',
};

const ITEMS_PER_PAGE = 10;

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
        <p className="text-gray-500">No transactions yet</p>
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  // Handle page changes
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Handle delete confirmation
  const handleDeleteClick = (id: string) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction) {
      setTransactionToDelete(transaction);
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      onDelete(transactionToDelete.id);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-xl border border-[#2a2a2a] overflow-hidden bg-[#1a1a1a]">
          <div className="overflow-x-auto">
            <Table className="gotham-table">
              <TableHeader>
                <TableRow className="border-b-[#2a2a2a] hover:bg-transparent">
                  <TableHead className="text-[#F5C518] w-[200px]">Description</TableHead>
                  <TableHead className="text-[#F5C518]">Paid By</TableHead>
                  <TableHead className="text-[#F5C518] text-right">Amount</TableHead>
                  <TableHead className="text-[#F5C518]">Split Type</TableHead>
                  <TableHead className="text-[#F5C518]">Participants</TableHead>
                  <TableHead className="text-[#F5C518] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b-[#2a2a2a] hover:bg-[#F5C518]/5 transition-colors"
                  >
                    <TableCell className="font-medium text-white">
                      {transaction.description}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {transaction.paidBy}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-[#F5C518]">
                      ₹{transaction.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className="bg-[#2a2a2a] text-gray-300 hover:bg-[#333]"
                      >
                        {splitTypeLabels[transaction.splitType]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-sm text-gray-400">
                          {transaction.participants.length}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(transaction.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-[#F5C518] hover:bg-[#F5C518]/10"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(transaction.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
            <div className="text-sm text-gray-400">
              Showing <span className="text-white font-medium">{startIndex + 1}</span> to{' '}
              <span className="text-white font-medium">{Math.min(endIndex, transactions.length)}</span> of{' '}
              <span className="text-white font-medium">{transactions.length}</span> transactions
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
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Transaction?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              This action cannot be undone. Are you sure you want to delete this transaction?
            </DialogDescription>
          </DialogHeader>
          
          {transactionToDelete && (
            <div className="bg-[#0f0f0f] rounded-lg p-4 my-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Description:</span>
                <span className="text-white">{transactionToDelete.description}</span>
                <span className="text-gray-500">Paid By:</span>
                <span className="text-white">{transactionToDelete.paidBy}</span>
                <span className="text-gray-500">Amount:</span>
                <span className="text-[#F5C518]">₹{transactionToDelete.amount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <Alert className="bg-red-950/30 border-red-800/50">
            <AlertDescription className="text-red-200 text-sm">
              This will permanently remove the transaction and recalculate all settlements.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelDelete}
              className="border-[#333] text-gray-300 hover:bg-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
