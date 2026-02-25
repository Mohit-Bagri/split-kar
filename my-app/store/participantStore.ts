/**
 * @file store/participantStore.ts
 * @description Zustand store for participant/group state
 * @author SplitKar Team
 * @created 2026-02-24
 */

import { create } from 'zustand';

interface ParticipantState {
  participants: string[];
  isGroupSetupComplete: boolean;
  
  // Actions
  setParticipants: (participants: string[]) => void;
  addParticipant: (name: string) => void;
  removeParticipant: (index: number) => void;
  completeGroupSetup: () => void;
  resetGroup: () => void;
  
  // Utilities
  normalizeName: (name: string) => string | null;
  isValidParticipant: (name: string) => boolean;
}

export const useParticipantStore = create<ParticipantState>((set, get) => ({
  participants: [],
  isGroupSetupComplete: false,

  setParticipants: (participants) => set({ participants }),
  
  addParticipant: (name) => {
    const trimmed = name.trim();
    if (trimmed && !get().participants.includes(trimmed)) {
      set((state) => ({ 
        participants: [...state.participants, trimmed] 
      }));
    }
  },
  
  removeParticipant: (index) =>
    set((state) => ({
      participants: state.participants.filter((_, i) => i !== index),
    })),
  
  completeGroupSetup: () => set({ isGroupSetupComplete: true }),
  
  resetGroup: () => set({ 
    participants: [], 
    isGroupSetupComplete: false 
  }),

  /**
   * Normalize a name against the participant list (case-insensitive)
   * Returns the canonical name or null if not found
   */
  normalizeName: (name) => {
    const lowerName = name.toLowerCase().trim();
    const match = get().participants.find(p => 
      p.toLowerCase() === lowerName
    );
    return match || null;
  },

  /**
   * Check if a name is a valid participant
   */
  isValidParticipant: (name) => {
    return get().normalizeName(name) !== null;
  },
}));
