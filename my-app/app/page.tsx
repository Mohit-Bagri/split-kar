"use client";

/**
 * @file app/page.tsx
 * @description Main page component for SplitKar
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, FileText, ArrowRight, RotateCcw, ChevronLeft, Zap, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

import { CSVUploader } from '@/components/features/CSVUploader';
import { TextInput } from '@/components/features/TextInput';
import { TransactionTable } from '@/components/features/TransactionTable';
import { SettlementView } from '@/components/features/SettlementView';
import { SplitModal } from '@/components/features/SplitModal';
import { GroupSetup } from '@/components/features/GroupSetup';

import { useTransactionStore } from '@/store/transactionStore';
import { useUIStore } from '@/store/uiStore';
import { useParticipantStore } from '@/store/participantStore';
import { Transaction, ParseResult } from '@/types';
import { toTransactions } from '@/lib/parser';
import { logger } from '@/lib/logger';

export default function Home() {
  // Store hooks
  const {
    transactions,
    settlementResult,
    isLoading,
    error,
    addTransaction,
    setTransactions,
    updateTransaction,
    removeTransaction,
    setError,
    setAllParticipants,
    clearAll,
    calculateSettlement,
  } = useTransactionStore();

  const {
    currentView,
    showSplitModal,
    selectedTransactionId,
    isParsing,
    isGeneratingPDF,
    setView,
    openSplitModal,
    closeSplitModal,
    setParsing,
    setGeneratingPDF,
  } = useUIStore();

  const {
    participants,
    isGroupSetupComplete,
    setParticipants,
    completeGroupSetup,
    resetGroup,
  } = useParticipantStore();

  // Local state
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState('csv');

  // Check if LLM is available on mount
  useEffect(() => {
    logger.info('ui', 'Application mounted');
    
    const checkLLM = async () => {
      try {
        const response = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', content: 'test' }),
        });
        if (response.ok) {
          setLlmAvailable(true);
          logger.info('ui', 'LLM is available');
        }
      } catch {
        setLlmAvailable(false);
        logger.info('ui', 'LLM is not available');
      }
    };
    checkLLM();
  }, []);

  // Handle group setup completion
  const handleGroupSetupComplete = () => {
    logger.info('ui', 'Group setup completed', { participants });
    setAllParticipants(participants); // Store participants for settlement calculation
    completeGroupSetup();
    setView('input');
  };

  // Handle CSV upload
  const handleCSVUpload = async (content: string) => {
    logger.info('ui', 'CSV upload started', { participantCount: participants.length });
    setParsing(true);
    setError(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'csv',
          content,
          participants, // Pass participant list for normalization
        }),
      });

      const result: ParseResult = await response.json();
      
      // DEBUG: Log raw response
      logger.info('ui', 'DEBUG - Raw parse response', {
        transactionCount: result.transactions?.length,
        errors: result.errors,
        confidence: result.confidence,
        parsingMethod: result.parsingMethod,
        hasValidation: !!result.validation,
        validationValid: result.validation?.valid,
      });
      
      // Handle validation errors
      if (result.validation && !result.validation.valid) {
        const errorMessage = result.validation.errors?.length > 0
          ? result.validation.errors.join('\n')
          : 'Unknown validation error';
        const logData: Record<string, unknown> = {};
        if (result.validation.unmatchedNames?.length) {
          logData.unmatchedNames = result.validation.unmatchedNames;
        }
        if (result.validation.suggestions) {
          logData.suggestions = result.validation.suggestions;
        }
        logger.error('ui', `CSV validation failed: ${errorMessage}`, new Error(errorMessage),
          Object.keys(logData).length > 0 ? logData : undefined
        );
        setError(`CSV validation failed:\n${errorMessage}`);
        setParsing(false);
        return;
      }

      if (!response.ok) {
        throw new Error(result.errors?.[0] || 'Failed to parse CSV');
      }
      
      if (result.transactions.length === 0) {
        setError('No transactions found in CSV');
        return;
      }

      // Log validation warnings if any
      if (result.validation?.suggestions && Object.keys(result.validation.suggestions).length > 0) {
        logger.warn('ui', 'CSV name corrections applied', result.validation.suggestions);
      }

      const newTransactions = toTransactions(result.transactions);
      
      // Show warning if some rows were skipped
      const skippedCount = result.errors?.filter(e => e.includes('skipped')).length || 0;
      if (skippedCount > 0 || (result.errors && result.errors.some(e => e.includes('⚠️')))) {
        const warningMessage = result.errors?.find(e => e.includes('⚠️')) ||
          `⚠️ Warning: Some rows were skipped during import.`;
        logger.warn('ui', 'CSV partially parsed with warnings', {
          totalRows: result.transactions.length + skippedCount,
          parsedRows: result.transactions.length,
          warnings: result.errors
        });
        // Show warning but continue with import
        alert(warningMessage.replace(/\n/g, '\n'));
      }
      
      logger.info('ui', 'CSV parsed successfully', {
        transactionCount: newTransactions.length,
        validation: result.validation
      });
      setTransactions(newTransactions);
      setView('preview');
    } catch (err) {
      logger.error('ui', 'CSV upload failed', err instanceof Error ? err : undefined);
      setError(err instanceof Error ? err.message : 'Failed to parse CSV');
    } finally {
      setParsing(false);
    }
  };

  // Handle text parse
  const handleTextParse = async (text: string, useLLM: boolean) => {
    setParsing(true);
    setError(null);

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'text', 
          content: text, 
          useLLM,
          participants, // Pass participant list for normalization
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to parse text');
      }

      const result: ParseResult = await response.json();
      
      if (result.transactions.length === 0) {
        setError(result.errors?.[0] || 'No transactions found in text. Try: "Mohit paid 500 for dinner"');
        return;
      }

      const newTransactions = toTransactions(result.transactions);
      setTransactions(newTransactions);
      setView('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse text');
    } finally {
      setParsing(false);
    }
  };

  // Handle settlement calculation
  const handleCalculateSettlement = async () => {
    await calculateSettlement();
    setView('settlement');
  };

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    if (!settlementResult) return;

    setGeneratingPDF(true);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'SplitKar Settlement Report',
          transactions: transactions.map(t => ({
            ...t,
            createdAt: t.createdAt.toISOString(),
          })),
          balances: settlementResult.balances,
          settlements: settlementResult.settlements,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'splitkar-report.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Handle start over - reset everything
  const handleStartOver = () => {
    clearAll();
    resetGroup();
    setView('setup');
  };

  // Get selected transaction for split modal
  const selectedTransaction = selectedTransactionId
    ? transactions.find(t => t.id === selectedTransactionId) || null
    : null;

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F5C518] flex items-center justify-center">
              <Calculator className="w-6 h-6 text-[#0f0f0f]" />
            </div>
            <div>
              <h1 className="text-xl font-bold gold-glow">SPLITकर</h1>
              <p className="text-xs text-gray-500">Settle smart. Split sharp.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentView !== 'setup' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartOver}
                className="text-gray-400 hover:text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Start Over
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Group Setup View */}
          {currentView === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GroupSetup
                participants={participants}
                onParticipantsChange={setParticipants}
                onContinue={handleGroupSetupComplete}
              />
            </motion.div>
          )}

          {/* Input View (CSV/Text) */}
          {currentView === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              {/* Participants Badge */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30">
                  <span className="text-sm text-[#F5C518]">
                    {participants.length} participants: {participants.slice(0, 3).join(', ')}
                    {participants.length > 3 && ` +${participants.length - 3} more`}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('setup')}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Edit
                </Button>
              </div>

              {/* Hero */}
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  Add your{' '}
                  <span className="text-[#F5C518] gold-glow">expenses</span>
                </h2>
                <p className="text-gray-400">
                  Upload a CSV or describe expenses in natural language.
                </p>
              </div>

              {/* Input Methods */}
              <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
                <CardContent className="p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2 bg-[#2a2a2a] mb-6">
                      <TabsTrigger 
                        value="csv"
                        className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        CSV Upload
                      </TabsTrigger>
                      <TabsTrigger 
                        value="text"
                        className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]"
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        Text Input
                      </TabsTrigger>
                    </TabsList>

                    {error && (
                      <Alert className="mb-6 bg-red-950/50 border-red-800">
                        <AlertDescription className="text-red-200">{error}</AlertDescription>
                      </Alert>
                    )}

                    <TabsContent value="csv">
                      <CSVUploader 
                        onUpload={handleCSVUpload}
                        isLoading={isParsing}
                      />
                    </TabsContent>

                    <TabsContent value="text">
                      <TextInput
                        onSubmit={handleTextParse}
                        isLoading={isParsing}
                        participants={participants}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

            </motion.div>
          )}

          {/* Preview View */}
          {currentView === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView('input')}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-[#2a2a2a]" />
                  <h2 className="text-xl font-semibold">Review Transactions</h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Create a new empty transaction and open split modal
                      const newId = crypto.randomUUID();
                      addTransaction({
                        id: newId,
                        description: 'New Transaction',
                        amount: 0,
                        paidBy: participants[0] || '',
                        participants: [...participants],
                        date: new Date().toISOString().split('T')[0],
                        splitType: 'equal',
                        splitDetails: participants.map(p => ({ participant: p, amount: 0 })),
                        createdAt: new Date(),
                      });
                      openSplitModal(newId);
                    }}
                    className="border-[#F5C518] text-[#F5C518] hover:bg-[#F5C518]/10 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Transaction
                  </Button>
                  <Button
                    onClick={handleCalculateSettlement}
                    disabled={transactions.length === 0 || isLoading}
                    className="btn-gold flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        Calculate Settlement
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert className="mb-6 bg-red-950/50 border-red-800">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <TransactionTable
                transactions={transactions}
                onEdit={openSplitModal}
                onDelete={removeTransaction}
              />
            </motion.div>
          )}

          {/* Settlement View */}
          {currentView === 'settlement' && settlementResult && (
            <motion.div
              key="settlement"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setView('preview')}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-[#2a2a2a]" />
                  <h2 className="text-xl font-semibold">Settlement Results</h2>
                </div>
              </div>

              {error && (
                <Alert className="mb-6 bg-red-950/50 border-red-800">
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <SettlementView
                result={settlementResult}
                onGeneratePDF={handleGeneratePDF}
                isGeneratingPDF={isGeneratingPDF}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Split Modal */}
      <SplitModal
        transaction={selectedTransaction}
        isOpen={showSplitModal}
        onClose={closeSplitModal}
        onSave={updateTransaction}
      />

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] mt-20">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>SPLITकर — Built for precision splitting</p>
        </div>
      </footer>
    </main>
  );
}
