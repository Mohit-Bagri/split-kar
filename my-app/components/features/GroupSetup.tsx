"use client";

/**
 * @file components/features/GroupSetup.tsx
 * @description Group setup component for defining participants
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Upload, Download, Plus, X, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';

interface GroupSetupProps {
  participants: string[];
  onParticipantsChange: (participants: string[]) => void;
  onContinue: () => void;
}

const MAX_PARTICIPANTS = 50;

// Template CSV content for download
const NAMES_TEMPLATE = `name
Mohit
Pankaj
Dhruv
Rudra`;

export function GroupSetup({ participants, onParticipantsChange, onContinue }: GroupSetupProps) {
  const [activeTab, setActiveTab] = useState('manual');
  const [inputText, setInputText] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Download template CSV
  const downloadTemplate = () => {
    logger.info('participant', 'Downloading names template CSV');
    const blob = new Blob([NAMES_TEMPLATE], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'splitkar-names-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Handle comma-separated input
  const handleManualInput = (text: string) => {
    setInputText(text);
    const names = text
      .split(/[,\n]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0)
      .slice(0, MAX_PARTICIPANTS);
    logger.info('participant', 'Manual input parsed', { count: names.length, names });
    onParticipantsChange(names);
  };

  // Handle CSV upload
  const handleCSVUpload = async (file: File) => {
    logger.info('participant', 'CSV upload started', { filename: file.name });
    setCsvError(null);
    
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a CSV file');
      logger.warn('participant', 'Invalid file type uploaded', { filename: file.name });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      
      try {
        const response = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'names', content }),
        });

        if (!response.ok) {
          throw new Error('Failed to parse names');
        }

        const result = await response.json();
        
        if (result.names.length > MAX_PARTICIPANTS) {
          setCsvError(`Maximum ${MAX_PARTICIPANTS} participants allowed. Only first ${MAX_PARTICIPANTS} will be used.`);
          onParticipantsChange(result.names.slice(0, MAX_PARTICIPANTS));
          logger.warn('participant', 'Participant limit exceeded', {
            requested: result.names.length,
            allowed: MAX_PARTICIPANTS
          });
        } else if (result.names.length === 0) {
          setCsvError('No names found in CSV. Please use the template format.');
          logger.error('participant', 'No names found in uploaded CSV');
        } else {
          onParticipantsChange(result.names);
          logger.info('participant', 'Participants loaded from CSV', {
            count: result.names.length,
            names: result.names
          });
        }
      } catch (err) {
        setCsvError('Failed to parse CSV. Please use the template format.');
        logger.error('participant', 'Failed to parse names CSV', err instanceof Error ? err : undefined);
      }
    };
    reader.readAsText(file);
  };

  // Add single participant
  const addParticipant = (name: string) => {
    if (name.trim() && !participants.includes(name.trim()) && participants.length < MAX_PARTICIPANTS) {
      onParticipantsChange([...participants, name.trim()]);
      logger.info('participant', 'Single participant added', { name: name.trim() });
    }
  };

  // Remove participant
  const removeParticipant = (index: number) => {
    const removedName = participants[index];
    onParticipantsChange(participants.filter((_, i) => i !== index));
    logger.info('participant', 'Participant removed', { name: removedName, index });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCSVUpload(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 mb-4">
          <Users className="w-4 h-4 text-[#F5C518]" />
          <span className="text-sm text-[#F5C518]">Step 1: Set Up Your Group</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Who's in your group?</h2>
        <p className="text-gray-400">Add up to {MAX_PARTICIPANTS} participants</p>
      </div>

      {/* Participant Count */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-[#F5C518]">{participants.length}</p>
          <p className="text-xs text-gray-500">Participants</p>
        </div>
        <div className="h-10 w-px bg-[#2a2a2a]" />
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-600">{MAX_PARTICIPANTS}</p>
          <p className="text-xs text-gray-500">Max</p>
        </div>
      </div>

      {/* Input Methods */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-[#2a2a2a]">
          <TabsTrigger 
            value="manual"
            className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]"
          >
            Type Names
          </TabsTrigger>
          <TabsTrigger 
            value="csv"
            className="data-[state=active]:bg-[#F5C518] data-[state=active]:text-[#0f0f0f]"
          >
            Upload CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4 space-y-4">
          <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-4">
              <label className="text-sm text-gray-400 mb-2 block">
                Enter names separated by commas or new lines
              </label>
              <textarea
                value={inputText}
                onChange={(e) => handleManualInput(e.target.value)}
                placeholder="e.g., Mohit, Pankaj, Dhruv, Rudra"
                className="
                  w-full h-24 p-3 rounded-lg resize-none
                  bg-[#0f0f0f] border border-[#2a2a2a] text-white
                  placeholder:text-gray-600
                  focus:border-[#F5C518] focus:outline-none
                "
              />
              <p className="text-xs text-gray-500 mt-2">
                {participants.length} / {MAX_PARTICIPANTS} participants
              </p>
            </CardContent>
          </Card>

          {/* Quick Add */}
          <div className="flex gap-2">
            <Input
              placeholder="Add one name..."
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addParticipant((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                const input = document.querySelector('input[placeholder="Add one name..."]') as HTMLInputElement;
                addParticipant(input.value);
                input.value = '';
              }}
              className="border-[#F5C518] text-[#F5C518] hover:bg-[#F5C518]/10"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="csv" className="mt-4 space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#F5C518]" />
              <div>
                <p className="text-sm font-medium text-white">Names Template</p>
                <p className="text-xs text-gray-500">Download and fill with your names</p>
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

          {csvError && (
            <Alert className="bg-amber-950/30 border-amber-800/50">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <AlertDescription className="text-amber-200 text-sm">
                {csvError}
              </AlertDescription>
            </Alert>
          )}

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('names-csv-input')?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-all duration-300
              ${isDragging 
                ? 'border-[#F5C518] bg-[#F5C518]/5' 
                : 'border-[#2a2a2a] hover:border-[#F5C518]/50 hover:bg-[#1a1a1a]'
              }
            `}
          >
            <input
              id="names-csv-input"
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleCSVUpload(e.target.files[0])}
              className="hidden"
            />
            <Upload className="w-10 h-10 mx-auto text-[#F5C518] mb-3" />
            <p className="text-white font-medium mb-1">Drop your CSV here</p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <p className="text-xs text-gray-600 mt-2">
              Must match template format (single column: "name")
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Participants List */}
      {participants.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Participants ({participants.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onParticipantsChange([])}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {participants.map((name, index) => (
              <motion.div
                key={`${name}-${index}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="
                  flex items-center gap-2 px-3 py-1.5 
                  bg-[#2a2a2a] rounded-full text-sm text-white
                  border border-[#333]
                "
              >
                <span>{name}</span>
                <button
                  onClick={() => removeParticipant(index)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add More Names Field - Only visible when CSV tab is active */}
      {activeTab === 'csv' && participants.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-4"
        >
          <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#F5C518]" />
            Want to add more names?
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Type names separated by commas... (e.g., John, Jane, Bob)"
              className="bg-[#0f0f0f] border-[#333] text-white flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  const newNames = value
                    .split(/[,]+/)
                    .map(n => n.trim())
                    .filter(n => n.length > 0 && !participants.includes(n));
                  
                  if (newNames.length > 0) {
                    const updated = [...participants, ...newNames].slice(0, MAX_PARTICIPANTS);
                    onParticipantsChange(updated);
                    logger.info('participant', 'Additional names added via input', {
                      newNames,
                      totalCount: updated.length
                    });
                  }
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                const input = document.querySelector('input[placeholder="Type names separated by commas... (e.g., John, Jane, Bob)"]') as HTMLInputElement;
                const value = input.value;
                const newNames = value
                  .split(/[,]+/)
                  .map(n => n.trim())
                  .filter(n => n.length > 0 && !participants.includes(n));
                
                if (newNames.length > 0) {
                  const updated = [...participants, ...newNames].slice(0, MAX_PARTICIPANTS);
                  onParticipantsChange(updated);
                  logger.info('participant', 'Additional names added via button', {
                    newNames,
                    totalCount: updated.length
                  });
                }
                input.value = '';
              }}
              className="border-[#F5C518] text-[#F5C518] hover:bg-[#F5C518]/10 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Tip: You can add multiple names at once by separating them with commas
          </p>
        </motion.div>
      )}

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={participants.length < 2}
        className="w-full btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue with {participants.length} participants
        <Users className="w-4 h-4 ml-2" />
      </Button>

      {participants.length < 2 && (
        <p className="text-center text-sm text-gray-500">
          Add at least 2 participants to continue
        </p>
      )}
    </div>
  );
}
