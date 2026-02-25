"use client";

/**
 * @file components/features/TextInput.tsx
 * @description Text input component with fixed message template format
 * @author SplitKar Team
 * @created 2026-02-24
 * @changeMarker [F-002-TI-001] Replaced LLM with fixed template format
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface TextInputProps {
  onSubmit: (text: string, useLLM: boolean) => void;
  isLoading?: boolean;
  participants: string[];
}

export function TextInput({ onSubmit, isLoading = false, participants }: TextInputProps) {
  const [text, setText] = useState('');
  const [showFormat, setShowFormat] = useState(false);

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim(), false);
    }
  };

  const charCount = text.length;
  const maxChars = 2000;

  return (
    <div className="w-full space-y-4">
      {/* Format Template Card */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-[#F5C518]">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Message Format Template</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs text-gray-400">Format:</p>
            <code className="text-xs text-white bg-[#0f0f0f] px-2 py-1 rounded block">
              [Payer] paid [Amount] for [Description] for [Participants]
            </code>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-400">Examples:</p>
            <ul className="text-xs text-gray-500 space-y-1">
              <li>• "Rajesh paid 1500 for team lunch for everyone"</li>
              <li>• "Aarav spent 800 for dinner for Aarav, Vihaan, Aditya"</li>
              <li>• "Mohan paid 500 for taxi for all"</li>
            </ul>
          </div>

          <div className="pt-2 border-t border-[#2a2a2a]">
            <p className="text-xs text-gray-500">
              <span className="text-[#F5C518]">Tip:</span> Use participant names from your group or keywords like 
              "everyone", "all", "group" to include all members.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Text Input Area */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your expense message here..."
          className="
            min-h-[120px] resize-none
            bg-[#1a1a1a] border-[#2a2a2a] text-white
            placeholder:text-gray-500
            focus:border-[#F5C518] focus:ring-[#F5C518]/20
            gotham-input
          "
          maxLength={maxChars}
          disabled={isLoading}
        />
        
        <div className="absolute bottom-3 right-3 text-xs text-gray-500">
          {charCount}/{maxChars}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!text.trim() || isLoading}
          className="
            btn-gold
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-2
          "
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Parse Message
            </>
          )}
        </Button>
      </div>

      {participants.length === 0 && (
        <Alert className="bg-amber-950/30 border-amber-800/50">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <AlertDescription className="text-amber-200 text-xs">
            Please set up your group participants first before adding transactions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
