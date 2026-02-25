"use client";

/**
 * @file components/features/DebugPanel.tsx
 * @description Debug panel for viewing logs and audit data
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Download, Trash2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { logger, LogEntry, LogCategory } from '@/lib/logger';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  parser: 'bg-blue-500',
  settlement: 'bg-green-500',
  transaction: 'bg-purple-500',
  participant: 'bg-orange-500',
  validation: 'bg-red-500',
  ui: 'bg-gray-500',
};

const levelColors: Record<string, string> = {
  debug: 'text-gray-400',
  info: 'text-blue-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogCategory | 'all'>('all');

  useEffect(() => {
    const unsubscribe = logger.subscribe(setLogs);
    return unsubscribe;
  }, []);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.category === filter);

  const exportLogs = () => {
    const json = logger.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `splitkar-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="w-full max-w-4xl max-h-[80vh] bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden flex flex-col"
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <Bug className="w-5 h-5 text-[#F5C518]" />
            <CardTitle className="text-white">Debug & Audit Logs</CardTitle>
            <Badge variant="secondary" className="bg-[#2a2a2a]">
              {logs.length} entries
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={exportLogs}
              className="text-gray-400 hover:text-white"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logger.clear()}
              className="text-gray-400 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="p-4 border-b border-[#2a2a2a] flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogCategory | 'all')}
            className="bg-[#2a2a2a] text-white text-sm rounded px-3 py-1.5 border border-[#333] focus:border-[#F5C518] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="parser">Parser</option>
            <option value="settlement">Settlement</option>
            <option value="transaction">Transaction</option>
            <option value="participant">Participant</option>
            <option value="validation">Validation</option>
            <option value="ui">UI</option>
          </select>
        </div>

        <CardContent className="flex-1 overflow-auto p-0">
          <div className="space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No logs yet. Actions will be logged here.
              </div>
            ) : (
              filteredLogs.slice().reverse().map((log) => (
                <div
                  key={log.id}
                  className="p-3 border-b border-[#2a2a2a] hover:bg-[#252525] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-mono ${levelColors[log.level]}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <Badge className={`${categoryColors[log.category]} text-white text-xs`}>
                      {log.category}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white mt-1">{log.message}</p>
                  {log.data && (
                    <pre className="mt-2 p-2 bg-[#0f0f0f] rounded text-xs text-gray-400 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                  {log.error && (
                    <div className="mt-2 p-2 bg-red-950/30 border border-red-800/50 rounded text-xs text-red-300">
                      {log.error.message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </motion.div>
    </motion.div>
  );
}
