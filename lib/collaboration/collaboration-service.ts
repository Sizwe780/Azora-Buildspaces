// Live Collaboration Service for Code Chamber IDE
// Provides real-time multi-user editing, presence indicators, shared cursors, conflict resolution

import { create } from 'zustand'

export interface Collaborator {
  id: string
  name: string
  color: string
  avatar?: string
  cursorPosition?: { file: string; line: number; column: number }
  selection?: { file: string; startLine: number; startCol: number; endLine: number; endCol: number }
  lastActive: number
  isTyping: boolean
  status: 'online' | 'idle' | 'away' | 'offline'
}

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor' | 'selection' | 'edit' | 'chat' | 'voice-start' | 'voice-end'
  userId: string
  timestamp: number
  data?: any
}

export interface ConflictResolution {
  id: string
  file: string
  localChange: string
  remoteChange: string
  resolvedContent?: string
  status: 'pending' | 'resolved' | 'auto-merged'
}

export interface CollaborationState {
  collaborators: Collaborator[]
  isConnected: boolean
  roomId: string | null
  events: CollaborationEvent[]
  conflicts: ConflictResolution[]
  voiceEnabled: boolean
  videoEnabled: boolean

  // Actions
  connect: (roomId: string, userId: string, userName: string, userColor: string) => void
  disconnect: () => void
  updateCursor: (file: string, line: number, column: number) => void
  updateSelection: (file: string, startLine: number, startCol: number, endLine: number, endCol: number) => void
  sendEdit: (file: string, edit: { line: number; text: string }) => void
  resolveConflict: (id: string, content: string) => void
  toggleVoice: () => void
  toggleVideo: () => void
  addCollaborator: (collaborator: Collaborator) => void
  removeCollaborator: (userId: string) => void
  setTyping: (userId: string, isTyping: boolean) => void
}

export const useCollaboration = create<CollaborationState>((set, get) => ({
  collaborators: [],
  isConnected: false,
  roomId: null,
  events: [],
  conflicts: [],
  voiceEnabled: false,
  videoEnabled: false,

  connect: (roomId: string, userId: string, userName: string, userColor: string) => {
    set({ roomId, isConnected: true })

    // Add self as collaborator
    const self: Collaborator = {
      id: userId,
      name: userName,
      color: userColor,
      lastActive: Date.now(),
      isTyping: false,
      status: 'online',
    }
    set((state) => ({
      collaborators: [...state.collaborators.filter(c => c.id !== userId), self],
      events: [...state.events, { type: 'join', userId, timestamp: Date.now() }],
    }))

    // In production, connect to WebSocket/WebRTC here
    if (typeof window !== 'undefined') {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/collab/${roomId}`)
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            switch (msg.type) {
              case 'user-joined':
                get().addCollaborator(msg.user)
                break
              case 'user-left':
                get().removeCollaborator(msg.userId)
                break
              case 'cursor-update':
                set((state) => ({
                  collaborators: state.collaborators.map(c =>
                    c.id === msg.userId ? { ...c, cursorPosition: msg.cursor } : c
                  ),
                }))
                break
              case 'conflict':
                set((state) => ({
                  conflicts: [...state.conflicts, msg.conflict],
                }))
                break
            }
          } catch { /* ignore malformed messages */ }
        }
        ws.onclose = () => set({ isConnected: false })
        ;(window as any).__collabWs = ws
      } catch {
        // WebSocket not available
      }
    }
  },

  disconnect: () => {
    if (typeof window !== 'undefined' && (window as any).__collabWs) {
      (window as any).__collabWs.close()
    }
    set({ isConnected: false, roomId: null, collaborators: [] })
  },

  updateCursor: (file: string, line: number, column: number) => {
    const ws = typeof window !== 'undefined' ? (window as any).__collabWs : null
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'cursor', file, line, column }))
    }
  },

  updateSelection: (file: string, startLine: number, startCol: number, endLine: number, endCol: number) => {
    const ws = typeof window !== 'undefined' ? (window as any).__collabWs : null
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'selection', file, startLine, startCol, endLine, endCol }))
    }
  },

  sendEdit: (file: string, edit: { line: number; text: string }) => {
    const ws = typeof window !== 'undefined' ? (window as any).__collabWs : null
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type: 'edit', file, edit }))
    }
  },

  resolveConflict: (id: string, content: string) => {
    set((state) => ({
      conflicts: state.conflicts.map(c =>
        c.id === id ? { ...c, resolvedContent: content, status: 'resolved' as const } : c
      ),
    }))
  },

  toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),
  toggleVideo: () => set((state) => ({ videoEnabled: !state.videoEnabled })),

  addCollaborator: (collaborator: Collaborator) => {
    set((state) => ({
      collaborators: [...state.collaborators.filter(c => c.id !== collaborator.id), collaborator],
      events: [...state.events, { type: 'join', userId: collaborator.id, timestamp: Date.now() }],
    }))
  },

  removeCollaborator: (userId: string) => {
    set((state) => ({
      collaborators: state.collaborators.filter(c => c.id !== userId),
      events: [...state.events, { type: 'leave', userId, timestamp: Date.now() }],
    }))
  },

  setTyping: (userId: string, isTyping: boolean) => {
    set((state) => ({
      collaborators: state.collaborators.map(c =>
        c.id === userId ? { ...c, isTyping } : c
      ),
    }))
  },
}))
