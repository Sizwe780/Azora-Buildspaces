// AI Code Intelligence Service for Code Chamber IDE
// Provides context-aware completion, error prediction, code generation, AI search, code explanation

import { create } from 'zustand'

export type AIFeature =
  | 'completion'
  | 'error-prediction'
  | 'code-generation'
  | 'code-explanation'
  | 'code-review'
  | 'refactoring-suggestion'
  | 'test-generation'
  | 'documentation'
  | 'search'
  | 'chat'

export interface AICompletion {
  id: string
  text: string
  insertText: string
  confidence: number
  source: 'model' | 'snippet' | 'history'
  description?: string
}

export interface AICodeSuggestion {
  id: string
  type: AIFeature
  title: string
  description: string
  code?: string
  filePath?: string
  line?: number
  confidence: number
  accepted?: boolean
}

export interface AIConversation {
  id: string
  messages: AIMessage[]
  context?: { file: string; selection?: string }
  createdAt: number
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  codeBlocks?: { language: string; code: string }[]
}

export interface AIIntelligenceState {
  isEnabled: boolean
  isProcessing: boolean
  activeFeatures: Set<AIFeature>
  completions: AICompletion[]
  suggestions: AICodeSuggestion[]
  conversations: AIConversation[]
  activeConversation: string | null
  model: string
  temperature: number

  // Actions
  toggleFeature: (feature: AIFeature) => void
  requestCompletion: (context: { file: string; content: string; line: number; column: number }) => Promise<AICompletion[]>
  requestExplanation: (code: string, language: string) => Promise<string>
  requestCodeGeneration: (prompt: string, language: string) => Promise<string>
  requestTestGeneration: (code: string, language: string) => Promise<string>
  requestDocumentation: (code: string, language: string) => Promise<string>
  predictErrors: (content: string, language: string) => Promise<AICodeSuggestion[]>
  sendMessage: (conversationId: string, message: string) => Promise<void>
  createConversation: (context?: { file: string; selection?: string }) => string
  acceptSuggestion: (id: string) => void
  dismissSuggestion: (id: string) => void
  setModel: (model: string) => void
}

const AI_SETTINGS_KEY = 'buildspaces.ai.settings'

export const useAIIntelligence = create<AIIntelligenceState>((set, get) => ({
  isEnabled: true,
  isProcessing: false,
  activeFeatures: new Set(['completion', 'error-prediction', 'code-explanation', 'search', 'chat'] as AIFeature[]),
  completions: [],
  suggestions: [],
  conversations: [],
  activeConversation: null,
  model: 'gpt-4',
  temperature: 0.3,

  toggleFeature: (feature: AIFeature) => {
    set((state) => {
      const next = new Set(state.activeFeatures)
      if (next.has(feature)) next.delete(feature)
      else next.add(feature)
      return { activeFeatures: next }
    })
  },

  requestCompletion: async (context) => {
    if (!get().activeFeatures.has('completion')) return []
    set({ isProcessing: true })

    try {
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...context,
          model: get().model,
          temperature: get().temperature,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const completions: AICompletion[] = (data.completions || []).map((c: any, i: number) => ({
          id: `comp-${Date.now()}-${i}`,
          text: c.text || c.label,
          insertText: c.insertText || c.text,
          confidence: c.confidence || 0.8,
          source: c.source || 'model',
          description: c.description,
        }))
        set({ completions, isProcessing: false })
        return completions
      }
    } catch { /* AI service not available */ }

    set({ isProcessing: false })
    return []
  },

  requestExplanation: async (code: string, language: string) => {
    set({ isProcessing: true })
    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, model: get().model }),
      })
      if (response.ok) {
        const data = await response.json()
        set({ isProcessing: false })
        return data.explanation || 'No explanation available.'
      }
    } catch { /* ignore */ }
    set({ isProcessing: false })
    return 'AI service unavailable. Please check your API configuration.'
  },

  requestCodeGeneration: async (prompt: string, language: string) => {
    set({ isProcessing: true })
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, language, model: get().model, temperature: get().temperature }),
      })
      if (response.ok) {
        const data = await response.json()
        set({ isProcessing: false })
        return data.code || ''
      }
    } catch { /* ignore */ }
    set({ isProcessing: false })
    return '// Code generation unavailable'
  },

  requestTestGeneration: async (code: string, language: string) => {
    set({ isProcessing: true })
    try {
      const response = await fetch('/api/ai/generate-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, model: get().model }),
      })
      if (response.ok) {
        const data = await response.json()
        set({ isProcessing: false })
        return data.tests || ''
      }
    } catch { /* ignore */ }
    set({ isProcessing: false })
    return '// Test generation unavailable'
  },

  requestDocumentation: async (code: string, language: string) => {
    set({ isProcessing: true })
    try {
      const response = await fetch('/api/ai/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, model: get().model }),
      })
      if (response.ok) {
        const data = await response.json()
        set({ isProcessing: false })
        return data.documentation || ''
      }
    } catch { /* ignore */ }
    set({ isProcessing: false })
    return '// Documentation generation unavailable'
  },

  predictErrors: async (content: string, language: string) => {
    if (!get().activeFeatures.has('error-prediction')) return []
    set({ isProcessing: true })

    try {
      const response = await fetch('/api/ai/predict-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, language, model: get().model }),
      })
      if (response.ok) {
        const data = await response.json()
        const suggestions: AICodeSuggestion[] = (data.predictions || []).map((p: any, i: number) => ({
          id: `pred-${Date.now()}-${i}`,
          type: 'error-prediction' as AIFeature,
          title: p.title || 'Potential issue',
          description: p.description || '',
          code: p.fix,
          filePath: p.file,
          line: p.line,
          confidence: p.confidence || 0.7,
        }))
        set((state) => ({ suggestions: [...state.suggestions, ...suggestions], isProcessing: false }))
        return suggestions
      }
    } catch { /* ignore */ }

    set({ isProcessing: false })
    return []
  },

  sendMessage: async (conversationId: string, message: string) => {
    set((state) => ({
      conversations: state.conversations.map(conv =>
        conv.id === conversationId
          ? {
            ...conv,
            messages: [...conv.messages, { role: 'user' as const, content: message, timestamp: Date.now() }],
          }
          : conv
      ),
      isProcessing: true,
    }))

    try {
      const conv = get().conversations.find(c => c.id === conversationId)
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conv?.messages || [],
          context: conv?.context,
          model: get().model,
          temperature: get().temperature,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        set((state) => ({
          conversations: state.conversations.map(c =>
            c.id === conversationId
              ? {
                ...c,
                messages: [...c.messages, {
                  role: 'assistant' as const,
                  content: data.response || 'No response.',
                  timestamp: Date.now(),
                  codeBlocks: data.codeBlocks,
                }],
              }
              : c
          ),
          isProcessing: false,
        }))
      }
    } catch {
      set((state) => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId
            ? {
              ...c,
              messages: [...c.messages, {
                role: 'assistant' as const,
                content: 'AI service is currently unavailable. Please check your configuration.',
                timestamp: Date.now(),
              }],
            }
            : c
        ),
        isProcessing: false,
      }))
    }
  },

  createConversation: (context) => {
    const id = `conv-${Date.now()}`
    set((state) => ({
      conversations: [...state.conversations, {
        id,
        messages: [],
        context,
        createdAt: Date.now(),
      }],
      activeConversation: id,
    }))
    return id
  },

  acceptSuggestion: (id: string) => {
    set((state) => ({
      suggestions: state.suggestions.map(s => s.id === id ? { ...s, accepted: true } : s),
    }))
  },

  dismissSuggestion: (id: string) => {
    set((state) => ({
      suggestions: state.suggestions.filter(s => s.id !== id),
    }))
  },

  setModel: (model: string) => {
    set({ model })
    if (typeof window !== 'undefined') {
      localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({ model, temperature: get().temperature }))
    }
  },
}))
