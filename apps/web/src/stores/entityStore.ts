// ============================================================
// Entity Store — Zustand state for AI city voice
// ============================================================

import { create } from 'zustand';

interface EntityState {
  /** Currently displayed AI monologue text */
  displayedText: string;
  /** Whether the AI is currently streaming */
  isStreaming: boolean;
  /** Conversation history for Q&A */
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;

  // Actions
  appendText: (text: string) => void;
  clearText: () => void;
  setStreaming: (streaming: boolean) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearHistory: () => void;
}

export const useEntityStore = create<EntityState>((set) => ({
  displayedText: '',
  isStreaming: false,
  conversationHistory: [],

  appendText: (text) =>
    set((state) => ({ displayedText: state.displayedText + text })),

  clearText: () => set({ displayedText: '' }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  addMessage: (role, content) =>
    set((state) => {
      const updated = [
        ...state.conversationHistory,
        { role, content, timestamp: Date.now() },
      ];
      return {
        conversationHistory: updated.length > 100 ? updated.slice(-100) : updated,
      };
    }),

  clearHistory: () => set({ conversationHistory: [] }),
}));
