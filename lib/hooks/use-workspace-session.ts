/**
 * useWorkspaceSession — Durable per-project IDE session restore
 *
 * Persists and restores layout state (sidebar, panel, open files, active file)
 * across page refreshes using localStorage. Each project gets its own session key
 * to avoid state bleed between projects.
 *
 * Usage:
 *   const { session, saveSession } = useWorkspaceSession(projectId)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface SessionLayout {
    sidebarView: string
    sidebarVisible: boolean
    panelView: string
    panelVisible: boolean
}

export interface WorkspaceSession {
    projectId: string
    layout: SessionLayout
    openFiles?: string[]
    activeFileId?: string | null
    savedAt: number
}

const SESSION_PREFIX = 'azora-session-'
const DEBOUNCE_MS = 2000

function sessionKey(projectId: string) {
    return `${SESSION_PREFIX}${projectId}`
}

function loadSession(projectId: string): WorkspaceSession | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(sessionKey(projectId))
        if (!raw) return null
        const parsed = JSON.parse(raw) as WorkspaceSession
        // Only restore recent sessions (within 7 days)
        if (Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) return null
        return parsed
    } catch {
        return null
    }
}

function persistSession(session: WorkspaceSession) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(sessionKey(session.projectId), JSON.stringify(session))
    } catch {
        // localStorage may be full or unavailable — swallow
    }
}

export function useWorkspaceSession(projectId: string | null | undefined) {
    const [session, setSession] = useState<WorkspaceSession | null>(null)
    const [sessionLoaded, setSessionLoaded] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Load saved session on mount (once projectId is known)
    useEffect(() => {
        if (!projectId) return
        const saved = loadSession(projectId)
        setSession(saved)
        setSessionLoaded(true)
    }, [projectId])

    // Debounced save — call this whenever layout state changes
    const saveSession = useCallback(
        (layout: SessionLayout, openFiles?: string[], activeFileId?: string | null) => {
            if (!projectId) return
            if (debounceRef.current) clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
                const s: WorkspaceSession = {
                    projectId,
                    layout,
                    openFiles,
                    activeFileId,
                    savedAt: Date.now(),
                }
                persistSession(s)
                setSession(s)
            }, DEBOUNCE_MS)
        },
        [projectId]
    )

    // Flush on unmount / page unload
    useEffect(() => {
        const flush = () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
                debounceRef.current = null
            }
        }
        window.addEventListener('beforeunload', flush)
        return () => {
            flush()
            window.removeEventListener('beforeunload', flush)
        }
    }, [])

    return { session, sessionLoaded, saveSession }
}
