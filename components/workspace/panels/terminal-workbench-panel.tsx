"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Columns2, Plus, X, Edit2, Search, Settings, ChevronDown } from "lucide-react"
import { XTerminal } from "@/components/workspace/x-terminal"
import { Button } from "@/components/ui/button"

type ShellType = 'bash' | 'powershell'

interface TerminalSession {
  id: string
  name: string
  shell: ShellType
  env?: Record<string, string>
}

interface TerminalHistory {
  sessionId: string
  commands: string[]
}

const DEFAULT_SHELL_KEY = 'buildspaces.terminal.defaultShell'
const TERMINAL_LAYOUT_KEY = 'buildspaces.terminal.layout'

interface PersistedTerminalLayout {
  sessions: TerminalSession[]
  activeSessionId: string
  splitMode: boolean
  secondarySessionId: string | null
}

function detectDefaultShell(): ShellType {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(DEFAULT_SHELL_KEY)
    if (stored === 'bash' || stored === 'powershell') {
      return stored
    }
    return /Windows/i.test(navigator.userAgent) ? 'powershell' : 'bash'
  }
  return 'bash'
}

export function TerminalWorkbenchPanel() {
  const [sessions, setSessions] = useState<TerminalSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>('terminal-1')
  const [splitMode, setSplitMode] = useState(false)
  const [secondarySessionId, setSecondarySessionId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Listen for Ctrl+F toggle from terminal
  useEffect(() => {
    const handler = (e: Event) => {
      setShowSearch(prev => !prev)
    }
    window.addEventListener('terminal:toggleSearch', handler)
    return () => window.removeEventListener('terminal:toggleSearch', handler)
  }, [])

  // Listen for Elara AI terminal command execution
  useEffect(() => {
    const handler = (e: Event) => {
      const { command } = (e as CustomEvent).detail || {}
      if (command && typeof command === 'string') {
        // Dispatch the command to the active terminal session
        window.dispatchEvent(new CustomEvent('terminal:write', {
          detail: { sessionId: activeSessionId, data: command + '\r' },
        }))
      }
    }
    window.addEventListener('elara:run-terminal', handler)
    // Also listen for cross-room command events (e.g. from Spec Chamber)
    window.addEventListener('azora:run-command', handler)
    return () => {
      window.removeEventListener('elara:run-terminal', handler)
      window.removeEventListener('azora:run-command', handler)
    }
  }, [activeSessionId])
  const [showEnvEditor, setShowEnvEditor] = useState(false)
  const [envVars, setEnvVars] = useState<Record<string, string>>({})

  const renameSession = useCallback((id: string, newName: string) => {
    if (!newName.trim()) return
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name: newName.trim() } : s)))
    setRenamingId(null)
    setRenameValue("")
  }, [])

  // Load persistent command history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('buildspaces.terminal.history')
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as TerminalHistory[]
          // Terminal history loaded — available for up-arrow recall
          if (parsed.length > 0) {
            console.log(`[Terminal] Loaded ${parsed.length} history entries`)
          }
        } catch { /* ignore malformed data */ }
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TERMINAL_LAYOUT_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PersistedTerminalLayout
          if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
            setSessions(parsed.sessions)
            setActiveSessionId(parsed.activeSessionId || parsed.sessions[0].id)
            setSplitMode(Boolean(parsed.splitMode))
            setSecondarySessionId(parsed.secondarySessionId || null)
            return
          }
        } catch {
          // Ignore invalid persisted data and seed defaults below.
        }
      }
    }

    const shell = detectDefaultShell()
    setSessions([{ id: 'terminal-1', name: 'Terminal 1', shell }])
    setActiveSessionId('terminal-1')
  }, [])

  useEffect(() => {
    if (sessions.length === 0 || typeof window === 'undefined') return
    const payload: PersistedTerminalLayout = {
      sessions,
      activeSessionId,
      splitMode,
      secondarySessionId,
    }
    localStorage.setItem(TERMINAL_LAYOUT_KEY, JSON.stringify(payload))
  }, [activeSessionId, secondarySessionId, sessions, splitMode])

  useEffect(() => {
    if (!splitMode) return
    if (!secondarySessionId || secondarySessionId === activeSessionId) {
      const fallback = sessions.find((item: TerminalSession) => item.id !== activeSessionId)
      setSecondarySessionId(fallback?.id || null)
    }
  }, [activeSessionId, secondarySessionId, sessions, splitMode])

  const activeSession = useMemo(
    () => sessions.find((item: TerminalSession) => item.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]
  )

  const addTerminal = () => {
    const shell = detectDefaultShell()
    const nextIndex = sessions.length + 1
    const newSession: TerminalSession = {
      id: `terminal-${Date.now()}`,
      name: `Terminal ${nextIndex}`,
      shell,
    }
    setSessions((prev: TerminalSession[]) => [...prev, newSession])
    setActiveSessionId(newSession.id)
  }

  const closeTerminal = (id: string) => {
    setSessions((prev: TerminalSession[]) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((item: TerminalSession) => item.id !== id)
      if (activeSessionId === id) {
        setActiveSessionId(next[0]?.id || 'terminal-1')
      }
      if (secondarySessionId === id) {
        const replacement = next.find((item) => item.id !== activeSessionId)
        setSecondarySessionId(replacement?.id || null)
      }
      if (next.length < 2) {
        setSplitMode(false)
        setSecondarySessionId(null)
      }
      return next
    })
  }

  const setSessionShell = (sessionId: string, shell: ShellType) => {
    setSessions((prev: TerminalSession[]) => prev.map((item: TerminalSession) => (item.id === sessionId ? { ...item, shell } : item)))
    if (typeof window !== 'undefined') {
      localStorage.setItem(DEFAULT_SHELL_KEY, shell)
    }
  }

  const toggleSplitMode = () => {
    if (sessions.length < 2) return
    if (!splitMode) {
      const candidate = sessions.find((item: TerminalSession) => item.id !== activeSessionId)
      setSecondarySessionId(candidate?.id || null)
      setSplitMode(true)
      return
    }
    setSplitMode(false)
  }

  const cycleSecondarySession = () => {
    const candidates = sessions.filter((item: TerminalSession) => item.id !== activeSessionId)
    if (candidates.length === 0) return
    const idx = candidates.findIndex((item: TerminalSession) => item.id === secondarySessionId)
    const next = candidates[(idx + 1) % candidates.length]
    setSecondarySessionId(next.id)
  }

  const secondarySession = splitMode
    ? sessions.find((item: TerminalSession) => item.id === secondarySessionId && item.id !== activeSessionId) || null
    : null

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="h-9 border-b border-zinc-800 flex items-center justify-between px-2 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {sessions.map((session: TerminalSession) => (
            <button
              key={session.id}
              className={`h-7 px-2 rounded text-xs flex items-center gap-2 border ${
                session.id === activeSessionId
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-900 hover:text-zinc-200'
              }`}
              onClick={() => setActiveSessionId(session.id)}
              onDoubleClick={() => {
                setRenamingId(session.id)
                setRenameValue(session.name)
              }}
            >
              {renamingId === session.id ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renameSession(session.id, renameValue)
                    if (e.key === "Escape") setRenamingId(null)
                  }}
                  onBlur={() => renameSession(session.id, renameValue)}
                  className="w-20 bg-transparent text-xs border-b border-zinc-500 focus:outline-none"
                  autoFocus
                />
              ) : (
                <>
                  <span>{session.name}</span>
                  <span className="text-[10px] uppercase text-zinc-500">{session.shell}</span>
                </>
              )}
              {sessions.length > 1 && (
                <span
                  className="inline-flex"
                  onClick={(e: any) => {
                    e.stopPropagation()
                    closeTerminal(session.id)
                  }}
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={addTerminal}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px]"
            onClick={toggleSplitMode}
            disabled={sessions.length < 2}
            title="Split terminal"
          >
            <Columns2 className="w-3.5 h-3.5 mr-1" />
            {splitMode ? 'Split On' : 'Split Off'}
          </Button>
          {splitMode && sessions.length > 2 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-[11px]"
              onClick={cycleSecondarySession}
            >
              Pane: {secondarySession?.name || 'None'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-[11px]"
            onClick={() => activeSession && setSessionShell(activeSession.id, activeSession.shell === 'bash' ? 'powershell' : 'bash')}
            disabled={!activeSession}
          >
            Shell: {activeSession?.shell || 'bash'}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowSearch(!showSearch)} title="Search in terminal">
            <Search className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="h-8 border-b border-zinc-800 flex items-center gap-2 px-2">
          <Search className="w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) {
                window.dispatchEvent(new CustomEvent('terminal:search', {
                  detail: { action: 'findNext', query: e.target.value }
                }))
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery) {
                const action = e.shiftKey ? 'findPrevious' : 'findNext'
                window.dispatchEvent(new CustomEvent('terminal:search', {
                  detail: { action, query: searchQuery }
                }))
              }
              if (e.key === 'Escape') {
                window.dispatchEvent(new CustomEvent('terminal:search', { detail: { action: 'clearSearch' } }))
                setShowSearch(false)
                setSearchQuery("")
              }
            }}
            placeholder="Find in terminal... (Enter=Next, Shift+Enter=Prev)"
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
            autoFocus
          />
          <button onClick={() => {
            window.dispatchEvent(new CustomEvent('terminal:search', { detail: { action: 'clearSearch' } }))
            setShowSearch(false)
            setSearchQuery("")
          }}>
            <X className="w-3 h-3 text-zinc-400 hover:text-zinc-200" />
          </button>
        </div>
      )}

      <div className="flex-1 relative">
        {splitMode && secondarySession ? (
          <div className="h-full grid grid-cols-2">
            <div className="h-full border-r border-zinc-800">
              {activeSession && (
                <XTerminal
                  sessionId={activeSession.id}
                  shell={activeSession.shell}
                  onShellChange={(nextShell: ShellType) => setSessionShell(activeSession.id, nextShell)}
                />
              )}
            </div>
            <div className="h-full">
              <XTerminal
                sessionId={secondarySession.id}
                shell={secondarySession.shell}
                onShellChange={(nextShell: ShellType) => setSessionShell(secondarySession.id, nextShell)}
              />
            </div>
          </div>
        ) : (
          sessions.map((session: TerminalSession) => (
            <div key={session.id} className={session.id === activeSessionId ? 'h-full' : 'hidden'}>
              <XTerminal
                sessionId={session.id}
                shell={session.shell}
                onShellChange={(nextShell: ShellType) => setSessionShell(session.id, nextShell)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
