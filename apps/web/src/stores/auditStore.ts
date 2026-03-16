// ============================================================
// auditStore — Tracks operator actions for the Audit Log
// ============================================================

import { create } from 'zustand';

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: string;
  detail: string;
}

interface AuditState {
  logs: AuditEntry[];
  logAction: (action: string, detail: string) => void;
  clearLogs: () => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  logs: [
    {
      id: `sys-${Date.now()}`,
      timestamp: Date.now() - 5000,
      action: 'SYSTEM_START',
      detail: 'Session initiated. Security protocols active.'
    }
  ],
  logAction: (action, detail) => set((s) => ({
    logs: [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: Date.now(),
        action,
        detail
      },
      ...s.logs
    ].slice(0, 100) // Keep last 100
  })),
  clearLogs: () => set({ logs: [] })
}));
