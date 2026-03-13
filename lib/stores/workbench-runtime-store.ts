import { create } from 'zustand'

export type RuntimeLogLevel = 'log' | 'info' | 'warn' | 'error'

export interface RuntimeLogEntry {
  id: string
  source: 'terminal' | 'debug' | 'system'
  level: RuntimeLogLevel
  message: string
  timestamp: number
}

interface WorkbenchRuntimeState {
  logs: RuntimeLogEntry[]
  addLog: (entry: Omit<RuntimeLogEntry, 'id' | 'timestamp'> & { timestamp?: number }) => void
  clearLogs: () => void
}

export const useWorkbenchRuntimeStore = create<WorkbenchRuntimeState>((set) => ({
  logs: [],
  addLog: (entry) =>
    set((state) => {
      const item: RuntimeLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        timestamp: entry.timestamp ?? Date.now(),
        source: entry.source,
        level: entry.level,
        message: entry.message,
      }

      const next = [...state.logs, item]
      return { logs: next.length > 1000 ? next.slice(next.length - 1000) : next }
    }),
  clearLogs: () => set({ logs: [] }),
}))
