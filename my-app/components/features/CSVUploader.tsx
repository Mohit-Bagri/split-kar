"use client";

/**
 * @file components/features/CSVUploader.tsx
 * @description CSV upload component with drag-drop and template download
 * @author SplitKar Team
 * @created 2026-02-24
 * @changeMarker [F-002-CU-001] Added CSV template download feature
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CSVUploaderProps {
  onUpload: (content: string) => void;
  isLoading?: boolean;
}

// CSV Template content
const CSV_TEMPLATE = `Date,Description,Amount,Paid By,Participants
2025-01-15,Team lunch,1500,Rajesh,"Rajesh,Aarav,Vihaan"
2025-01-16,Taxi to office,450,Mohan,"Mohan,Rohan,Krish"
2025-01-17,Office supplies,800,Anil,"Anil,Suresh,Vikram"`;

export function CSVUploader({ onUpload, isLoading = false }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onUpload(content);
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setFileName(null);
    setError(null);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'splitkar-transactions-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4">
      {/* Template Download Section */}
      <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#F5C518]/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#F5C518]" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">CSV Template</h4>
            <p className="text-xs text-gray-400">Download and fill with your transactions</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadTemplate}
          className="border-[#F5C518] text-[#F5C518] hover:bg-[#F5C518]/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Format Info */}
      <div className="p-3 bg-[#1a1a1a]/50 rounded-lg border border-[#2a2a2a]/50">
        <p className="text-xs text-gray-400 mb-2">Expected format:</p>
        <code className="text-xs text-[#F5C518] block">
          Date,Description,Amount,Paid By,Participants
        </code>
        <p className="text-xs text-gray-500 mt-1">
          Example: 2025-01-15,Team lunch,1500,Rajesh,"Rajesh,Aarav,Vihaan"
        </p>
      </div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          relative border-2 border-dashed rounded-xl p-8
          flex flex-col items-center justify-center gap-4
          transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-[#F5C518] bg-[#F5C518]/10' 
            : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#3a3a3a]'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !fileName && document.getElementById('csv-input')?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isLoading}
        />

        {fileName ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#F5C518]/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#F5C518]" />
            </div>
            <div>
              <p className="text-sm text-white font-medium">{fileName}</p>
              <p className="text-xs text-gray-400">Click to change file</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="ml-4 p-2 rounded-full hover:bg-[#2a2a2a] transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        ) : (
          <>
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center
              transition-all duration-200
              ${isDragging ? 'bg-[#F5C518]/20 scale-110' : 'bg-[#2a2a2a]'}
            `}>
              <Upload className={`
                w-8 h-8 transition-colors
                ${isDragging ? 'text-[#F5C518]' : 'text-gray-400'}
              `} />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-300 font-medium">
                Drop your CSV here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-gray-600">
              Supports .csv files up to 5MB
            </p>
          </>
        )}
      </motion.div>

      {error && (
        <Alert className="bg-red-950/30 border-red-800/50">
          <AlertDescription className="text-red-200 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
