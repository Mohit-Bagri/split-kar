/**
 * @file store/uiStore.ts
 * @description Zustand store for UI state management
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { create } from 'zustand';

type View = 'setup' | 'input' | 'preview' | 'settlement';

interface UIState {
  currentView: View;
  showSplitModal: boolean;
  selectedTransactionId: string | null;
  isParsing: boolean;
  isGeneratingPDF: boolean;
  
  // Actions
  setView: (view: View) => void;
  openSplitModal: (transactionId: string) => void;
  closeSplitModal: () => void;
  setParsing: (parsing: boolean) => void;
  setGeneratingPDF: (generating: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'setup',
  showSplitModal: false,
  selectedTransactionId: null,
  isParsing: false,
  isGeneratingPDF: false,

  setView: (view) => set({ currentView: view }),
  
  openSplitModal: (transactionId) => set({ 
    showSplitModal: true, 
    selectedTransactionId: transactionId 
  }),
  
  closeSplitModal: () => set({ 
    showSplitModal: false, 
    selectedTransactionId: null 
  }),
  
  setParsing: (parsing) => set({ isParsing: parsing }),
  
  setGeneratingPDF: (generating) => set({ isGeneratingPDF: generating }),
}));
