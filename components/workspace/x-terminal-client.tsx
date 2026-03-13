"use client"

import { useEffect, useRef, useCallback } from "react"
import { Terminal } from "xterm"
import { FitAddon } from "xterm-addon-fit"
import { WebLinksAddon } from "xterm-addon-web-links"
import { SearchAddon } from "xterm-addon-search"
import "xterm/css/xterm.css"
import type { XTerminalProps } from "./x-terminal"
import { useWorkbenchRuntimeStore } from "@/lib/stores/workbench-runtime-store"
import { terminalTheme } from "@/lib/ide-terminal-theme"

const BUILTIN_COMPLETIONS = [
    'help',
    'clear',
    'cd',
    'history -c',
    'shell bash',
    'shell powershell',
    'alias',
    'unalias',
    'setenv',
    'unsetenv',
    'env',
    'profile export',
    'profile import ',
    'profile import --merge ',
    'profile import --replace ',
    'profile apply ',
    'profile apply --merge ',
    'profile apply --replace ',
    'profile diff ',
    'profile show',
    'profile show current-shell',
    'profile show all-shells',
    'profile copy bash',
    'profile copy powershell',
    'profile rename-alias ',
    'profile unset-all-env',
    'profile unset-all-env current-shell',
    'profile unset-all-env all-shells',
    'profile unset-all-aliases',
    'profile unset-all-aliases current-shell',
    'profile unset-all-aliases all-shells',
    'profile clean',
    'profile clean current-shell',
    'profile clean all-shells',
    'profile reset',
    'profile reset current-shell',
    'profile reset all-shells',
    'profile scope',
    'profile scope session',
    'profile scope workspace',
    'npm run dev',
    'npm test',
    'git status',
    'git add .',
    'git commit -m ""',
]

const ALIAS_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]{0,31}$/
const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/
const MAX_PROFILE_ALIASES = 64
const MAX_PROFILE_ENV_VARS = 64
const MAX_ENV_VALUE_LENGTH = 4096
const MAX_CWD_DEPTH = 64
const MAX_PROFILE_PAYLOAD_LENGTH = 32768
const PROFILE_EXPORT_PREFIX = 'BSPROFILE:'
const PROFILE_SCOPE_PREFIX = 'buildspaces.terminal.profile.scope.'
const SUPPORTED_SHELLS = ['bash', 'powershell'] as const
const PROFILE_SCOPES = ['session', 'workspace'] as const

type TerminalShell = (typeof SUPPORTED_SHELLS)[number]
type ProfileScope = (typeof PROFILE_SCOPES)[number]

interface TerminalProfile {
    aliases: Record<string, string>
    envVars: Record<string, string>
}

interface TerminalProfileStore {
    bash: TerminalProfile
    powershell: TerminalProfile
}

interface ExportedTerminalProfile {
    version: 1
    shell: TerminalShell
    profile: TerminalProfile
}

interface ProfileDiffSummary {
    aliasesAdded: string[]
    aliasesChanged: string[]
    aliasesRemoved: string[]
    envAdded: string[]
    envChanged: string[]
    envRemoved: string[]
}

interface ProfileApplyArgs {
    mode: 'replace' | 'merge'
    payload: string
}

function sanitizeProfile(input: unknown): TerminalProfile {
    const aliases: Record<string, string> = {}
    const envVars: Record<string, string> = {}

    if (input && typeof input === 'object' && !Array.isArray(input)) {
        const candidate = input as Partial<TerminalProfile>

        if (candidate.aliases && typeof candidate.aliases === 'object') {
            for (const [key, value] of Object.entries(candidate.aliases)) {
                if (Object.keys(aliases).length >= MAX_PROFILE_ALIASES) break
                if (!ALIAS_NAME_PATTERN.test(key)) continue
                if (typeof value !== 'string' || !value.trim()) continue
                aliases[key] = value
            }
        }

        if (candidate.envVars && typeof candidate.envVars === 'object') {
            for (const [key, value] of Object.entries(candidate.envVars)) {
                if (Object.keys(envVars).length >= MAX_PROFILE_ENV_VARS) break
                if (!ENV_KEY_PATTERN.test(key)) continue
                if (typeof value !== 'string') continue
                if (value.length > MAX_ENV_VALUE_LENGTH) continue
                envVars[key] = value
            }
        }
    }

    return { aliases, envVars }
}

function emptyProfileStore(): TerminalProfileStore {
    return {
        bash: { aliases: {}, envVars: {} },
        powershell: { aliases: {}, envVars: {} },
    }
}

function emptyTerminalProfile(): TerminalProfile {
    return { aliases: {}, envVars: {} }
}

function sanitizeProfileStore(input: unknown): TerminalProfileStore {
    const defaults = emptyProfileStore()
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return defaults
    }

    const candidate = input as Record<string, unknown>

    const hasShellBuckets = SUPPORTED_SHELLS.some((shell) => {
        const value = candidate[shell]
        return Boolean(value && typeof value === 'object' && !Array.isArray(value))
    })

    if (hasShellBuckets) {
        return {
            bash: sanitizeProfile(candidate.bash),
            powershell: sanitizeProfile(candidate.powershell),
        }
    }

    const legacy = sanitizeProfile(candidate)
    const legacyAliases = { ...legacy.aliases }
    const legacyEnvVars = { ...legacy.envVars }
    return {
        bash: legacy,
        powershell: { aliases: legacyAliases, envVars: legacyEnvVars },
    }
}

function encodeExportedProfile(payload: ExportedTerminalProfile): string {
    try {
        return btoa(JSON.stringify(payload))
    } catch {
        return ''
    }
}

function decodeImportedProfilePayload(rawPayload: string): TerminalProfile | null {
    const trimmed = rawPayload.trim()
    if (!trimmed || trimmed.length > MAX_PROFILE_PAYLOAD_LENGTH) {
        return null
    }

    const withoutPrefix = trimmed.startsWith(PROFILE_EXPORT_PREFIX)
        ? trimmed.slice(PROFILE_EXPORT_PREFIX.length).trim()
        : trimmed

    let decoded = withoutPrefix
    try {
        decoded = atob(withoutPrefix)
    } catch {
        decoded = withoutPrefix
    }

    try {
        const parsed = JSON.parse(decoded) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'profile' in (parsed as Record<string, unknown>)) {
            return sanitizeProfile((parsed as Record<string, unknown>).profile)
        }
        return sanitizeProfile(parsed)
    } catch {
        return null
    }
}

function parseProfileApplyArgs(rawArgs: string): ProfileApplyArgs {
    const trimmed = rawArgs.trim()
    let mode: 'replace' | 'merge' = 'replace'
    let payload = trimmed

    if (trimmed.startsWith('--merge ')) {
        mode = 'merge'
        payload = trimmed.slice('--merge'.length).trim()
    } else if (trimmed === '--merge') {
        payload = ''
    } else if (trimmed.startsWith('--replace ')) {
        mode = 'replace'
        payload = trimmed.slice('--replace'.length).trim()
    } else if (trimmed === '--replace') {
        payload = ''
    }

    return { mode, payload }
}

function buildProfileDiff(currentProfile: TerminalProfile, nextProfile: TerminalProfile): ProfileDiffSummary {
    const aliasesAdded: string[] = []
    const aliasesChanged: string[] = []
    const aliasesRemoved: string[] = []
    const envAdded: string[] = []
    const envChanged: string[] = []
    const envRemoved: string[] = []

    const currentAliasKeys = new Set(Object.keys(currentProfile.aliases))
    const nextAliasKeys = new Set(Object.keys(nextProfile.aliases))
    for (const key of nextAliasKeys) {
        if (!currentAliasKeys.has(key)) {
            aliasesAdded.push(key)
            continue
        }
        if (currentProfile.aliases[key] !== nextProfile.aliases[key]) {
            aliasesChanged.push(key)
        }
    }
    for (const key of currentAliasKeys) {
        if (!nextAliasKeys.has(key)) {
            aliasesRemoved.push(key)
        }
    }

    const currentEnvKeys = new Set(Object.keys(currentProfile.envVars))
    const nextEnvKeys = new Set(Object.keys(nextProfile.envVars))
    for (const key of nextEnvKeys) {
        if (!currentEnvKeys.has(key)) {
            envAdded.push(key)
            continue
        }
        if (currentProfile.envVars[key] !== nextProfile.envVars[key]) {
            envChanged.push(key)
        }
    }
    for (const key of currentEnvKeys) {
        if (!nextEnvKeys.has(key)) {
            envRemoved.push(key)
        }
    }

    return {
        aliasesAdded,
        aliasesChanged,
        aliasesRemoved,
        envAdded,
        envChanged,
        envRemoved,
    }
}

export default function XTerminalClient({ onData, socket, sessionId = 'terminal-1', shell, onShellChange }: XTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const commandBufferRef = useRef<string>("")
    const cursorPositionRef = useRef<number>(0)
    const isExecutingRef = useRef<boolean>(false)
    const workspaceIdRef = useRef<string>("default")
    const commandHistoryRef = useRef<string[]>([])
    const historyIndexRef = useRef<number>(-1)
    const cwdRef = useRef<string>('')
    const reverseSearchQueryRef = useRef<string>('')
    const reverseSearchMatchesRef = useRef<string[]>([])
    const reverseSearchPointerRef = useRef<number>(-1)
    const historyKey = `buildspaces.terminal.history.${sessionId}`
    const profileKey = `buildspaces.terminal.profile.${sessionId}`
    const profileScopeKey = `${PROFILE_SCOPE_PREFIX}${sessionId}`
    const cwdKey = `buildspaces.terminal.cwd.${sessionId}`
    const defaultShell: TerminalShell = typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent) ? 'powershell' : 'bash'
    const activeShellRef = useRef<TerminalShell>(shell === 'bash' || shell === 'powershell' ? shell : defaultShell)
    const profileScopeRef = useRef<ProfileScope>('session')
    const profileRef = useRef<TerminalProfileStore>(emptyProfileStore())
    const addLog = useWorkbenchRuntimeStore((state: ReturnType<typeof useWorkbenchRuntimeStore.getState>) => state.addLog)

    // Get workspace ID from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('citadel-active-project')
            if (stored) workspaceIdRef.current = stored
        }
    }, [])

    useEffect(() => {
        if (shell !== 'bash' && shell !== 'powershell') return
        activeShellRef.current = shell
    }, [shell])

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const raw = localStorage.getItem(historyKey)
            if (!raw) {
                commandHistoryRef.current = []
                historyIndexRef.current = -1
                return
            }
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
                commandHistoryRef.current = parsed.filter((item) => typeof item === 'string').slice(-200)
                historyIndexRef.current = commandHistoryRef.current.length
            }
        } catch {
            commandHistoryRef.current = []
            historyIndexRef.current = -1
        }
    }, [historyKey])

    const getWorkspaceProfileKey = useCallback(() => {
        const workspaceId = workspaceIdRef.current || 'default'
        return `buildspaces.terminal.profile.workspace.${workspaceId}`
    }, [])

    const getProfileStorageKey = useCallback((scope: ProfileScope = profileScopeRef.current) => {
        if (scope === 'workspace') {
            return getWorkspaceProfileKey()
        }
        return profileKey
    }, [getWorkspaceProfileKey, profileKey])

    const loadProfileForScope = useCallback((scope: ProfileScope) => {
        if (typeof window === 'undefined') return
        try {
            const raw = localStorage.getItem(getProfileStorageKey(scope))
            if (!raw) {
                profileRef.current = emptyProfileStore()
                return
            }

            const parsed = JSON.parse(raw)
            profileRef.current = sanitizeProfileStore(parsed)
        } catch {
            profileRef.current = emptyProfileStore()
        }
    }, [getProfileStorageKey])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const persistedScope = localStorage.getItem(profileScopeKey)
        if (persistedScope === 'workspace' || persistedScope === 'session') {
            profileScopeRef.current = persistedScope
        } else {
            profileScopeRef.current = 'session'
        }

        loadProfileForScope(profileScopeRef.current)
    }, [loadProfileForScope, profileScopeKey])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const raw = localStorage.getItem(cwdKey)
        if (!raw || typeof raw !== 'string') {
            cwdRef.current = ''
            return
        }

        const clean = raw.replace(/\\/g, '/').replace(/^\/+/, '').trim()
        if (!clean) {
            cwdRef.current = ''
            return
        }

        const segments = clean.split('/').filter(Boolean)
        cwdRef.current = segments.slice(0, MAX_CWD_DEPTH).join('/')
    }, [cwdKey])

    const persistHistory = useCallback(() => {
        if (typeof window === 'undefined') return
        localStorage.setItem(historyKey, JSON.stringify(commandHistoryRef.current.slice(-200)))
    }, [historyKey])

    const persistProfile = useCallback(() => {
        if (typeof window === 'undefined') return
        localStorage.setItem(getProfileStorageKey(profileScopeRef.current), JSON.stringify(profileRef.current))
    }, [getProfileStorageKey])

    const persistProfileScope = useCallback(() => {
        if (typeof window === 'undefined') return
        localStorage.setItem(profileScopeKey, profileScopeRef.current)
    }, [profileScopeKey])

    const getActiveProfile = useCallback((): TerminalProfile => {
        const activeShell = activeShellRef.current
        if (activeShell === 'bash' || activeShell === 'powershell') {
            return profileRef.current[activeShell]
        }
        return { aliases: {}, envVars: {} }
    }, [])

    const persistCwd = useCallback(() => {
        if (typeof window === 'undefined') return
        localStorage.setItem(cwdKey, cwdRef.current)
    }, [cwdKey])

    const getPromptPrefix = useCallback(() => {
        const display = cwdRef.current ? `~/${cwdRef.current}` : '~'
        return `${display} $ `
    }, [])

    const writePrompt = useCallback((term: Terminal) => {
        term.write(getPromptPrefix())
    }, [getPromptPrefix])

    const renderPromptLine = useCallback((term: Terminal, value: string, cursorPosition?: number) => {
        const nextCursor = typeof cursorPosition === 'number' ? Math.max(0, Math.min(value.length, cursorPosition)) : value.length
        const prompt = getPromptPrefix()
        commandBufferRef.current = value
        cursorPositionRef.current = nextCursor

        term.write(`\r\x1b[2K${prompt}${value}`)
        const tailCount = value.length - nextCursor
        if (tailCount > 0) {
            term.write(`\x1b[${tailCount}D`)
        }
    }, [getPromptPrefix])

    const redrawInput = useCallback((term: Terminal, nextValue: string) => {
        renderPromptLine(term, nextValue, nextValue.length)
    }, [renderPromptLine])

    const clearReverseSearchState = useCallback(() => {
        reverseSearchQueryRef.current = ''
        reverseSearchMatchesRef.current = []
        reverseSearchPointerRef.current = -1
    }, [])

    const resolveClientCwd = useCallback((current: string, target: string): string | null => {
        const nextTarget = (target || '~').trim()
        if (!nextTarget || nextTarget === '~' || nextTarget === '/') return ''

        const start = nextTarget.startsWith('/') ? [] : current.split('/').filter(Boolean)
        const parts = nextTarget.replace(/^~\/?/, '').replace(/^\/+/, '').split('/').filter(Boolean)

        for (const part of parts) {
            if (part === '.') continue
            if (part === '..') {
                if (start.length > 0) start.pop()
                continue
            }
            if (part.includes('\\') || part.includes('\0')) return null
            start.push(part)
            if (start.length > MAX_CWD_DEPTH) {
                return null
            }
        }

        return start.join('/')
    }, [])

    const expandAlias = useCallback((input: string): string => {
        const trimmed = input.trim()
        if (!trimmed) return trimmed

        const firstSpace = trimmed.indexOf(' ')
        const aliasName = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace)
        const remainder = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim()
        const aliasValue = getActiveProfile().aliases[aliasName]

        if (!aliasValue) return trimmed
        if (aliasValue.includes('$*')) {
            return aliasValue.replace('$*', remainder).trim()
        }

        return remainder ? `${aliasValue} ${remainder}` : aliasValue
    }, [getActiveProfile])

    const fetchDynamicCompletions = useCallback(async (prefix: string): Promise<string[]> => {
        try {
            const res = await fetch(`/api/workbench/runtime?action=completions&prefix=${encodeURIComponent(prefix)}`, { cache: 'no-store' })
            if (!res.ok) return []
            const data = await res.json()
            if (!Array.isArray(data.completions)) return []
            return data.completions.filter((item: unknown) => typeof item === 'string') as string[]
        } catch {
            return []
        }
    }, [])

    const handleTabCompletion = useCallback(async (term: Terminal) => {
        const prefix = commandBufferRef.current
        const dynamic = await fetchDynamicCompletions(prefix)
        const localMatches = BUILTIN_COMPLETIONS.filter((item) => item.startsWith(prefix))
        const aliasMatches = Object.keys(getActiveProfile().aliases)
            .filter((item) => item.startsWith(prefix))
        const matches = Array.from(new Set([...dynamic, ...localMatches, ...aliasMatches]))

        if (matches.length === 1) {
            redrawInput(term, matches[0])
            historyIndexRef.current = commandHistoryRef.current.length
            return
        }

        if (matches.length > 1) {
            term.write(`\r\n${matches.slice(0, 20).join('    ')}\r\n`)
            renderPromptLine(term, commandBufferRef.current, cursorPositionRef.current)
        }
    }, [fetchDynamicCompletions, getActiveProfile, redrawInput, renderPromptLine])

    const handleReverseSearch = useCallback((term: Terminal) => {
        const query = (reverseSearchQueryRef.current || commandBufferRef.current).trim()
        const history = commandHistoryRef.current
        if (history.length === 0) {
            term.write('\r\n(no history)\r\n')
            renderPromptLine(term, commandBufferRef.current, cursorPositionRef.current)
            return
        }

        if (reverseSearchQueryRef.current !== query || reverseSearchMatchesRef.current.length === 0) {
            reverseSearchQueryRef.current = query
            reverseSearchMatchesRef.current = history.filter((item: string) => item.includes(query)).reverse()
            reverseSearchPointerRef.current = -1
        }

        const matches = reverseSearchMatchesRef.current
        if (matches.length === 0) {
            term.write(`\r\n(reverse-i-search) \"${query}\": no matches\r\n`)
            renderPromptLine(term, commandBufferRef.current, cursorPositionRef.current)
            return
        }

        reverseSearchPointerRef.current = (reverseSearchPointerRef.current + 1) % matches.length
        const match = matches[reverseSearchPointerRef.current]
        redrawInput(term, match)
        historyIndexRef.current = commandHistoryRef.current.length
    }, [redrawInput, renderPromptLine])

    const executeCommand = useCallback(async (command: string) => {
        const term = xtermRef.current
        if (!term || isExecutingRef.current) return

        isExecutingRef.current = true

        // Handle built-in commands
        const trimmed = command.trim()
        if (!trimmed) {
            term.write('\r\n')
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'clear') {
            term.clear()
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'help') {
            term.write('\r\n\x1b[36mBuildspaces Terminal\x1b[0m — Commands run in workspace directory\r\n')
            term.write('  \x1b[33mclear\x1b[0m     Clear terminal\r\n')
            term.write('  \x1b[33mhelp\x1b[0m      Show this help\r\n')
            term.write('  \x1b[33mcd [path]\x1b[0m Change current working directory\r\n')
            term.write('  \x1b[33mshell <bash|powershell>\x1b[0m  Switch shell\r\n')
            term.write('  \x1b[33malias [name=value]\x1b[0m  List or define aliases (current shell)\r\n')
            term.write('  \x1b[33munalias <name>\x1b[0m  Remove alias\r\n')
            term.write('  \x1b[33msetenv KEY=value\x1b[0m  Set per-shell env var\r\n')
            term.write('  \x1b[33munsetenv <KEY>\x1b[0m  Remove env var\r\n')
            term.write('  \x1b[33menv\x1b[0m       List current-shell env vars\r\n')
            term.write('  \x1b[33mprofile export\x1b[0m  Export current shell profile\r\n')
            term.write('  \x1b[33mprofile import [--merge|--replace] <payload>\x1b[0m  Import into current shell\r\n')
            term.write('  \x1b[33mprofile apply [--merge|--replace] <payload>\x1b[0m  Alias of profile import\r\n')
            term.write('  \x1b[33mprofile diff <payload>\x1b[0m  Preview changes for current shell\r\n')
            term.write('  \x1b[33mprofile show [current-shell|all-shells]\x1b[0m  Show profile snapshot\r\n')
            term.write('  \x1b[33mprofile copy <bash|powershell>\x1b[0m  Copy profile to target shell\r\n')
            term.write('  \x1b[33mprofile rename-alias <old> <new>\x1b[0m  Rename alias in current shell\r\n')
            term.write('  \x1b[33mprofile unset-all-env [current-shell|all-shells]\x1b[0m  Clear env vars only\r\n')
            term.write('  \x1b[33mprofile unset-all-aliases [current-shell|all-shells]\x1b[0m  Clear aliases only\r\n')
            term.write('  \x1b[33mprofile clean [current-shell|all-shells]\x1b[0m  Clear aliases and env vars\r\n')
            term.write('  \x1b[33mprofile reset [current-shell|all-shells]\x1b[0m  Clear profile data\r\n')
            term.write('  \x1b[33mprofile scope [session|workspace]\x1b[0m  Get/set profile scope\r\n')
            term.write('  \x1b[33mCtrl+R\x1b[0m reverse-search history\r\n')
            term.write('  Any other command is executed in the workspace shell.\r\n\r\n')
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile scope') {
            term.write(`\r\ncurrent profile scope: ${profileScopeRef.current}\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed.startsWith('profile scope ')) {
            const requestedScope = trimmed.slice('profile scope '.length).trim().toLowerCase()
            if (requestedScope !== 'session' && requestedScope !== 'workspace') {
                term.write('\r\n\x1b[31mUsage: profile scope [session|workspace]\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            profileScopeRef.current = requestedScope
            persistProfileScope()
            loadProfileForScope(requestedScope)
            term.write(`\r\n\x1b[32mProfile scope set to ${requestedScope}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile export') {
            const activeShell = activeShellRef.current
            const payload = encodeExportedProfile({
                version: 1,
                shell: activeShell,
                profile: getActiveProfile(),
            })

            if (!payload) {
                term.write('\r\n\x1b[31mFailed to export profile\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            term.write('\r\n')
            term.write(`${PROFILE_EXPORT_PREFIX}${payload}\r\n`)
            term.write('\x1b[2mCopy this token and run profile import/apply <payload> (or --merge) in another session.\x1b[0m\r\n')
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (
            trimmed === 'profile import'
            || trimmed.startsWith('profile import ')
            || trimmed === 'profile apply'
            || trimmed.startsWith('profile apply ')
        ) {
            const isApplyAlias = trimmed === 'profile apply' || trimmed.startsWith('profile apply ')
            const rawArgs = isApplyAlias
                ? trimmed.slice('profile apply'.length).trim()
                : trimmed.slice('profile import'.length).trim()
            const { mode, payload } = parseProfileApplyArgs(rawArgs)

            if (!payload) {
                const usageCommand = isApplyAlias ? 'profile apply' : 'profile import'
                term.write(`\r\n\x1b[31mUsage: ${usageCommand} [--merge|--replace] <payload>\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const importedProfile = decodeImportedProfilePayload(payload)
            if (!importedProfile) {
                term.write('\r\n\x1b[31mInvalid profile payload\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const nextProfile = mode === 'merge'
                ? sanitizeProfile({
                    aliases: { ...activeProfile.aliases, ...importedProfile.aliases },
                    envVars: { ...activeProfile.envVars, ...importedProfile.envVars },
                })
                : importedProfile

            profileRef.current = {
                ...profileRef.current,
                [activeShell]: nextProfile,
            }
            persistProfile()

            const aliasCount = Object.keys(nextProfile.aliases).length
            const envCount = Object.keys(nextProfile.envVars).length
            const actionLabel = isApplyAlias ? 'Applied' : 'Imported'
            term.write(`\r\n\x1b[32m${actionLabel} profile (${mode}) for ${activeShell}: ${aliasCount} aliases, ${envCount} env vars\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile diff' || trimmed.startsWith('profile diff ')) {
            const payload = trimmed.slice('profile diff'.length).trim()
            if (!payload) {
                term.write('\r\n\x1b[31mUsage: profile diff <payload>\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const importedProfile = decodeImportedProfilePayload(payload)
            if (!importedProfile) {
                term.write('\r\n\x1b[31mInvalid profile payload\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const diff = buildProfileDiff(activeProfile, importedProfile)
            const totalChanges = diff.aliasesAdded.length
                + diff.aliasesChanged.length
                + diff.aliasesRemoved.length
                + diff.envAdded.length
                + diff.envChanged.length
                + diff.envRemoved.length

            term.write(`\r\n\x1b[36mProfile diff for ${activeShell}\x1b[0m\r\n`)
            if (totalChanges === 0) {
                term.write('No changes detected.\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const renderGroup = (label: string, items: string[]) => {
                if (items.length === 0) return
                term.write(`${label}: ${items.length}\r\n`)
                for (const key of items.slice(0, 20)) {
                    term.write(`  - ${key}\r\n`)
                }
                if (items.length > 20) {
                    term.write(`  ... +${items.length - 20} more\r\n`)
                }
            }

            renderGroup('Aliases added', diff.aliasesAdded)
            renderGroup('Aliases changed', diff.aliasesChanged)
            renderGroup('Aliases removed', diff.aliasesRemoved)
            renderGroup('Env vars added', diff.envAdded)
            renderGroup('Env vars changed', diff.envChanged)
            renderGroup('Env vars removed', diff.envRemoved)

            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile show' || trimmed.startsWith('profile show ')) {
            const target = trimmed === 'profile show'
                ? 'current-shell'
                : trimmed.slice('profile show '.length).trim().toLowerCase()

            if (target !== 'current-shell' && target !== 'all-shells') {
                term.write('\r\n\x1b[31mUsage: profile show [current-shell|all-shells]\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const renderKeyList = (label: string, keys: string[]) => {
                term.write(`${label}: ${keys.length}\r\n`)
                for (const key of keys.slice(0, 20)) {
                    term.write(`  - ${key}\r\n`)
                }
                if (keys.length > 20) {
                    term.write(`  ... +${keys.length - 20} more\r\n`)
                }
            }

            term.write(`\r\n\x1b[36mProfile snapshot (${target})\x1b[0m\r\n`)
            term.write(`Scope: ${profileScopeRef.current}\r\n`)

            if (target === 'all-shells') {
                term.write(`Active shell: ${activeShellRef.current}\r\n`)
                for (const shellName of ['bash', 'powershell'] as const) {
                    const shellProfile = profileRef.current[shellName]
                    const aliasKeys = Object.keys(shellProfile.aliases).sort((a, b) => a.localeCompare(b))
                    const envKeys = Object.keys(shellProfile.envVars).sort((a, b) => a.localeCompare(b))
                    term.write(`\r\n${shellName}\r\n`)
                    renderKeyList('Aliases', aliasKeys)
                    renderKeyList('Env vars', envKeys)
                }
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const aliasKeys = Object.keys(activeProfile.aliases).sort((a, b) => a.localeCompare(b))
            const envKeys = Object.keys(activeProfile.envVars).sort((a, b) => a.localeCompare(b))
            term.write(`Shell: ${activeShell}\r\n`)
            renderKeyList('Aliases', aliasKeys)
            renderKeyList('Env vars', envKeys)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile reset' || trimmed.startsWith('profile reset ')) {
            const target = trimmed === 'profile reset'
                ? 'current-shell'
                : trimmed.slice('profile reset '.length).trim().toLowerCase()

            if (target !== 'current-shell' && target !== 'all-shells') {
                term.write('\r\n\x1b[31mUsage: profile reset [current-shell|all-shells]\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            if (target === 'all-shells') {
                const aliasCount = Object.keys(profileRef.current.bash.aliases).length + Object.keys(profileRef.current.powershell.aliases).length
                const envCount = Object.keys(profileRef.current.bash.envVars).length + Object.keys(profileRef.current.powershell.envVars).length
                profileRef.current = emptyProfileStore()
                persistProfile()
                term.write(`\r\n\x1b[32mProfile reset (all-shells): removed ${aliasCount} aliases, ${envCount} env vars\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const aliasCount = Object.keys(activeProfile.aliases).length
            const envCount = Object.keys(activeProfile.envVars).length
            profileRef.current = {
                ...profileRef.current,
                [activeShell]: emptyTerminalProfile(),
            }
            persistProfile()
            term.write(`\r\n\x1b[32mProfile reset (${activeShell}): removed ${aliasCount} aliases, ${envCount} env vars\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile copy' || trimmed.startsWith('profile copy ')) {
            const targetRaw = trimmed === 'profile copy' ? '' : trimmed.slice('profile copy '.length).trim().toLowerCase()
            if (targetRaw !== 'bash' && targetRaw !== 'powershell') {
                term.write('\r\n\x1b[31mUsage: profile copy <bash|powershell>\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const sourceShell = activeShellRef.current
            const targetShell: TerminalShell = targetRaw
            if (sourceShell === targetShell) {
                term.write(`\r\n\x1b[33mSource and target are both ${sourceShell}; nothing changed.\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const sourceProfile = getActiveProfile()
            const copiedProfile: TerminalProfile = {
                aliases: { ...sourceProfile.aliases },
                envVars: { ...sourceProfile.envVars },
            }

            profileRef.current = {
                ...profileRef.current,
                [targetShell]: copiedProfile,
            }
            persistProfile()

            const aliasCount = Object.keys(copiedProfile.aliases).length
            const envCount = Object.keys(copiedProfile.envVars).length
            term.write(`\r\n\x1b[32mCopied profile ${sourceShell} -> ${targetShell}: ${aliasCount} aliases, ${envCount} env vars\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile rename-alias' || trimmed.startsWith('profile rename-alias ')) {
            const rawArgs = trimmed === 'profile rename-alias'
                ? ''
                : trimmed.slice('profile rename-alias '.length).trim()
            const [oldAlias, newAlias, ...extraArgs] = rawArgs.split(/\s+/).filter(Boolean)

            if (!oldAlias || !newAlias || extraArgs.length > 0) {
                term.write('\r\n\x1b[31mUsage: profile rename-alias <old> <new>\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            if (!ALIAS_NAME_PATTERN.test(oldAlias) || !ALIAS_NAME_PATTERN.test(newAlias)) {
                term.write('\r\n\x1b[31mAlias names must match [A-Za-z_][A-Za-z0-9_-]{0,31}\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            if (oldAlias === newAlias) {
                term.write(`\r\n\x1b[33mAlias name unchanged: ${oldAlias}\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const aliases = { ...activeProfile.aliases }

            if (!(oldAlias in aliases)) {
                term.write(`\r\n\x1b[31mAlias not found: ${oldAlias}\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            if (newAlias in aliases) {
                term.write(`\r\n\x1b[31mAlias already exists: ${newAlias}\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const aliasValue = aliases[oldAlias]
            delete aliases[oldAlias]
            aliases[newAlias] = aliasValue

            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    aliases,
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mAlias renamed: ${oldAlias} -> ${newAlias}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile unset-all-env' || trimmed.startsWith('profile unset-all-env ')) {
            const target = trimmed === 'profile unset-all-env'
                ? 'current-shell'
                : trimmed.slice('profile unset-all-env '.length).trim().toLowerCase()

            if (target !== 'current-shell' && target !== 'all-shells') {
                term.write('\r\n\x1b[31mUsage: profile unset-all-env [current-shell|all-shells]\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            if (target === 'all-shells') {
                const removedEnvCount = Object.keys(profileRef.current.bash.envVars).length + Object.keys(profileRef.current.powershell.envVars).length
                profileRef.current = {
                    ...profileRef.current,
                    bash: {
                        ...profileRef.current.bash,
                        envVars: {},
                    },
                    powershell: {
                        ...profileRef.current.powershell,
                        envVars: {},
                    },
                }
                persistProfile()
                term.write(`\r\n\x1b[32mCleared env vars (all-shells): removed ${removedEnvCount}\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const removedEnvCount = Object.keys(activeProfile.envVars).length
            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    envVars: {},
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mCleared env vars (${activeShell}): removed ${removedEnvCount}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile unset-all-aliases' || trimmed.startsWith('profile unset-all-aliases ')) {
            const target = trimmed === 'profile unset-all-aliases'
                ? 'current-shell'
                : trimmed.slice('profile unset-all-aliases '.length).trim().toLowerCase()

            if (target !== 'current-shell' && target !== 'all-shells') {
                term.write('\r\n\x1b[31mUsage: profile unset-all-aliases [current-shell|all-shells]\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            if (target === 'all-shells') {
                const removedAliasCount = Object.keys(profileRef.current.bash.aliases).length + Object.keys(profileRef.current.powershell.aliases).length
                profileRef.current = {
                    ...profileRef.current,
                    bash: {
                        ...profileRef.current.bash,
                        aliases: {},
                    },
                    powershell: {
                        ...profileRef.current.powershell,
                        aliases: {},
                    },
                }
                persistProfile()
                term.write(`\r\n\x1b[32mCleared aliases (all-shells): removed ${removedAliasCount}\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const removedAliasCount = Object.keys(activeProfile.aliases).length
            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    aliases: {},
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mCleared aliases (${activeShell}): removed ${removedAliasCount}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'profile clean' || trimmed.startsWith('profile clean ')) {
            const target = trimmed === 'profile clean'
                ? 'current-shell'
                : trimmed.slice('profile clean '.length).trim().toLowerCase()

            if (target !== 'current-shell' && target !== 'all-shells') {
                term.write('\r\n\x1b[31mUsage: profile clean [current-shell|all-shells]\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            if (target === 'all-shells') {
                const removedAliasCount = Object.keys(profileRef.current.bash.aliases).length + Object.keys(profileRef.current.powershell.aliases).length
                const removedEnvCount = Object.keys(profileRef.current.bash.envVars).length + Object.keys(profileRef.current.powershell.envVars).length

                profileRef.current = {
                    ...profileRef.current,
                    bash: { aliases: {}, envVars: {} },
                    powershell: { aliases: {}, envVars: {} },
                }
                persistProfile()
                term.write(`\r\n\x1b[32mProfile clean (all-shells): removed ${removedAliasCount} aliases, ${removedEnvCount} env vars\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            const activeProfile = getActiveProfile()
            const removedAliasCount = Object.keys(activeProfile.aliases).length
            const removedEnvCount = Object.keys(activeProfile.envVars).length

            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    aliases: {},
                    envVars: {},
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mProfile clean (${activeShell}): removed ${removedAliasCount} aliases, ${removedEnvCount} env vars\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
            const target = trimmed === 'cd' ? '~' : trimmed.slice(2).trim()
            const nextCwd = resolveClientCwd(cwdRef.current, target)
            if (nextCwd === null) {
                term.write('\r\n\x1b[31mInvalid path\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            cwdRef.current = nextCwd
            persistCwd()
            term.write(`\r\n\x1b[32mcwd: ${cwdRef.current ? `~/${cwdRef.current}` : '~'}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed.startsWith('shell ')) {
            const selected = trimmed.replace(/^shell\s+/i, '').trim().toLowerCase()
            if (selected === 'bash' || selected === 'powershell') {
                activeShellRef.current = selected
                const msg = `Shell switched to ${selected}`
                addLog({ source: 'terminal', level: 'info', message: msg })
                onShellChange?.(selected)
                term.write(`\r\n\x1b[32m${msg}\x1b[0m\r\n`)
                writePrompt(term)
            } else {
                term.write('\r\n\x1b[31mInvalid shell. Use bash or powershell.\x1b[0m\r\n')
                writePrompt(term)
            }
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'history -c') {
            commandHistoryRef.current = []
            historyIndexRef.current = 0
            persistHistory()
            term.write('\r\n\x1b[32mCommand history cleared\x1b[0m\r\n')
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'alias') {
            const aliases = getActiveProfile().aliases
            const names = Object.keys(aliases).sort((a, b) => a.localeCompare(b))
            if (names.length === 0) {
                term.write('\r\n(no aliases)\r\n')
                writePrompt(term)
            } else {
                term.write('\r\n')
                for (const name of names) {
                    term.write(`${name}=${aliases[name]}\r\n`)
                }
                writePrompt(term)
            }
            isExecutingRef.current = false
            return
        }

        if (trimmed.startsWith('alias ')) {
            const payload = trimmed.slice('alias '.length).trim()
            const sepIndex = payload.indexOf('=')
            if (sepIndex <= 0) {
                term.write('\r\n\x1b[31mUsage: alias name=value\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const aliasName = payload.slice(0, sepIndex).trim()
            const aliasValue = payload.slice(sepIndex + 1).trim()
            if (!ALIAS_NAME_PATTERN.test(aliasName)) {
                term.write('\r\n\x1b[31mInvalid alias name\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }
            if (!aliasValue) {
                term.write('\r\n\x1b[31mAlias value cannot be empty\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }
            const activeProfile = getActiveProfile()
            if (!activeProfile.aliases[aliasName] && Object.keys(activeProfile.aliases).length >= MAX_PROFILE_ALIASES) {
                term.write('\r\n\x1b[31mAlias limit reached\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    aliases: {
                        ...activeProfile.aliases,
                        [aliasName]: aliasValue,
                    },
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mAlias set: ${aliasName}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed.startsWith('unalias ')) {
            const aliasName = trimmed.slice('unalias '.length).trim()
            if (!aliasName) {
                term.write('\r\n\x1b[31mUsage: unalias <name>\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeProfile = getActiveProfile()
            const aliases = { ...activeProfile.aliases }
            if (!(aliasName in aliases)) {
                term.write(`\r\n\x1b[31mAlias not found: ${aliasName}\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            delete aliases[aliasName]
            const activeShell = activeShellRef.current
            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    aliases,
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mAlias removed: ${aliasName}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed === 'env') {
            const envVars = getActiveProfile().envVars
            const keys = Object.keys(envVars).sort((a, b) => a.localeCompare(b))
            if (keys.length === 0) {
                term.write('\r\n(no env vars)\r\n')
                writePrompt(term)
            } else {
                term.write('\r\n')
                for (const key of keys) {
                    term.write(`${key}=${envVars[key]}\r\n`)
                }
                writePrompt(term)
            }
            isExecutingRef.current = false
            return
        }

        if (trimmed.startsWith('setenv ')) {
            const payload = trimmed.slice('setenv '.length).trim()
            const sepIndex = payload.indexOf('=')
            if (sepIndex <= 0) {
                term.write('\r\n\x1b[31mUsage: setenv KEY=value\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const key = payload.slice(0, sepIndex).trim()
            const value = payload.slice(sepIndex + 1)
            if (!ENV_KEY_PATTERN.test(key)) {
                term.write('\r\n\x1b[31mInvalid env key\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }
            if (value.length > MAX_ENV_VALUE_LENGTH) {
                term.write('\r\n\x1b[31mEnv value exceeds max length\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }
            const activeProfile = getActiveProfile()
            if (!(key in activeProfile.envVars) && Object.keys(activeProfile.envVars).length >= MAX_PROFILE_ENV_VARS) {
                term.write('\r\n\x1b[31mEnv var limit reached\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeShell = activeShellRef.current
            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    envVars: {
                        ...activeProfile.envVars,
                        [key]: value,
                    },
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mEnv var set: ${key}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        if (trimmed.startsWith('unsetenv ')) {
            const key = trimmed.slice('unsetenv '.length).trim()
            if (!key) {
                term.write('\r\n\x1b[31mUsage: unsetenv <KEY>\x1b[0m\r\n')
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            const activeProfile = getActiveProfile()
            const envVars = { ...activeProfile.envVars }
            if (!(key in envVars)) {
                term.write(`\r\n\x1b[31mEnv var not found: ${key}\x1b[0m\r\n`)
                writePrompt(term)
                isExecutingRef.current = false
                return
            }

            delete envVars[key]
            const activeShell = activeShellRef.current
            profileRef.current = {
                ...profileRef.current,
                [activeShell]: {
                    ...activeProfile,
                    envVars,
                },
            }
            persistProfile()
            term.write(`\r\n\x1b[32mEnv var removed: ${key}\x1b[0m\r\n`)
            writePrompt(term)
            isExecutingRef.current = false
            return
        }

        const history = commandHistoryRef.current
        if (history[history.length - 1] !== trimmed) {
            history.push(trimmed)
            commandHistoryRef.current = history.slice(-200)
        }
        historyIndexRef.current = commandHistoryRef.current.length
        clearReverseSearchState()
        persistHistory()

        const commandForExecution = expandAlias(trimmed)
        addLog({ source: 'terminal', level: 'log', message: `$ ${trimmed}` })
        if (commandForExecution !== trimmed) {
            term.write(`\r\n\x1b[2m↪ ${commandForExecution}\x1b[0m`)
            addLog({ source: 'terminal', level: 'info', message: `alias expansion: ${commandForExecution}` })
        }

        term.write('\r\n')

        try {
            const res = await fetch('/api/workbench/runtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'exec',
                    command: commandForExecution,
                    workspaceId: workspaceIdRef.current,
                    shell: activeShellRef.current,
                    env: getActiveProfile().envVars,
                    cwd: cwdRef.current,
                    sessionId,
                })
            })

            if (res.ok) {
                const data = await res.json()
                if (data.stdout) {
                    // Convert \n to \r\n for xterm
                    const output = data.stdout.replace(/\n/g, '\r\n')
                    term.write(output)
                    addLog({ source: 'terminal', level: 'log', message: data.stdout })
                    if (!output.endsWith('\r\n')) term.write('\r\n')
                }
                if (data.stderr) {
                    const errOutput = data.stderr.replace(/\n/g, '\r\n')
                    term.write(`\x1b[31m${errOutput}\x1b[0m`)
                    addLog({ source: 'terminal', level: 'error', message: data.stderr })
                    if (!errOutput.endsWith('\r\n')) term.write('\r\n')
                }
            } else {
                const errData = await res.json().catch(() => ({ error: 'Unknown error' }))
                addLog({ source: 'terminal', level: 'error', message: String(errData.error || 'Unknown error') })
                term.write(`\x1b[31mError: ${errData.error}\x1b[0m\r\n`)
            }
        } catch (e: any) {
            addLog({ source: 'terminal', level: 'error', message: e.message })
            term.write(`\x1b[31mFailed to execute command: ${e.message}\x1b[0m\r\n`)
        }

        writePrompt(term)
        isExecutingRef.current = false
    }, [addLog, clearReverseSearchState, expandAlias, getActiveProfile, loadProfileForScope, onShellChange, persistCwd, persistHistory, persistProfile, persistProfileScope, resolveClientCwd, sessionId, writePrompt])

    useEffect(() => {
        if (!terminalRef.current || xtermRef.current) return

        // Guard: only call fitAddon.fit() when the container actually has
        // non-zero dimensions. xterm 5.x's Viewport._innerRefresh crashes
        // with "Cannot read properties of undefined (reading 'dimensions')"
        // when the render service is initialised against a 0×0 element.
        const safeFit = () => {
            if (!fitAddonRef.current || !xtermRef.current) return
            const el = terminalRef.current
            if (!el || el.offsetWidth === 0 || el.offsetHeight === 0) return
            try { fitAddonRef.current.fit() } catch { /* ignore transient races */ }
        }

        let initRo: ResizeObserver | null = null
        let cleanupFn: (() => void) | null = null

        // Defer the entire term.open() call until the container has real
        // dimensions. If it already has them, the observer fires immediately.
        const initTerminal = (container: HTMLElement) => {
            // Disconnect the init observer first so we don't re-enter.
            initRo?.disconnect()

            try {
                const term = new Terminal({
                    cursorBlink: true,
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    theme: terminalTheme,
                    allowProposedApi: true,
                })

                const fitAddon = new FitAddon()
                const webLinksAddon = new WebLinksAddon()
                const searchAddon = new SearchAddon()

                term.loadAddon(fitAddon)
                term.loadAddon(webLinksAddon)
                term.loadAddon(searchAddon)

                // open() is now called only when offsetWidth/offsetHeight > 0,
                // so the render service gets real dimensions immediately.
                term.open(container)

                // Monkey-patch xterm 5.3.0 Viewport._innerRefresh bug:
                // It reads `this._renderService.dimensions` without null-checking
                // `_renderService`, so if xterm's internal RAF fires before the
                // render service is set, it crashes. Guard it here.
                try {
                    const _vp = (term as any)._core?._viewport
                    if (_vp && typeof _vp._innerRefresh === 'function') {
                        const _origIR = _vp._innerRefresh.bind(_vp)
                        _vp._innerRefresh = function (this: typeof _vp) {
                            if (!(this as any)._renderService) return
                            _origIR()
                        }
                    }
                } catch { /* best-effort patch — ignore if xterm internals changed */ }

                xtermRef.current = term
                fitAddonRef.current = fitAddon

                // One rAF so the browser completes its first layout pass before
                // we ask xterm to recompute column/row counts.
                requestAnimationFrame(safeFit)

                // Expose searchAddon for find-in-terminal
                ;(term as any)._searchAddon = searchAddon

                term.write(`\x1b[36m⚡ Buildspaces Terminal (${sessionId})\x1b[0m\r\n`)
                term.write(`\x1b[2mType commands to run in your workspace using ${activeShellRef.current}. Type "help" for info.\x1b[0m\r\n\r\n`)
                writePrompt(term)

                // Copy selection to clipboard on Ctrl+Shift+C or right-click
                term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
                    if (e.key === 'c' && e.ctrlKey && e.shiftKey) {
                        const sel = term.getSelection()
                        if (sel) {
                            navigator.clipboard.writeText(sel).catch(() => {})
                            return false
                        }
                    }
                    // Ctrl+F: Find in terminal
                    if (e.key === 'f' && e.ctrlKey && !e.shiftKey && e.type === 'keydown') {
                        window.dispatchEvent(new CustomEvent('terminal:toggleSearch', { detail: { sessionId } }))
                        return false
                    }
                    return true
                })

                // Listen for search queries from the terminal panel
                const handleSearch = (ev: Event) => {
                    const detail = (ev as CustomEvent).detail
                    if (!detail) return
                    const sa = (term as any)._searchAddon as SearchAddon | undefined
                    if (!sa) return
                    if (detail.action === 'findNext') {
                        sa.findNext(detail.query || '', { regex: false, wholeWord: false, caseSensitive: false })
                    } else if (detail.action === 'findPrevious') {
                        sa.findPrevious(detail.query || '', { regex: false, wholeWord: false, caseSensitive: false })
                    } else if (detail.action === 'clearSearch') {
                        sa.clearDecorations()
                    }
                }
                window.addEventListener('terminal:search', handleSearch)

                term.onData((data: string) => {
                    if (onData) onData(data)

                    // If WebSocket is connected, let the socket handle everything
                    if (socket) return

                    // Local command execution mode
                    if (data === '\r') {
                        // Enter pressed — execute command
                        const cmd = commandBufferRef.current
                        commandBufferRef.current = ""
                        cursorPositionRef.current = 0
                        executeCommand(cmd)
                    } else if (data === '\u001b[A') {
                        const history = commandHistoryRef.current
                        if (history.length === 0) return
                        historyIndexRef.current = Math.max(0, (historyIndexRef.current <= 0 ? history.length : historyIndexRef.current) - 1)
                        const recalled = history[historyIndexRef.current] || ''
                        redrawInput(term, recalled)
                    } else if (data === '\u001b[B') {
                        const history = commandHistoryRef.current
                        if (history.length === 0) return
                        historyIndexRef.current = Math.min(history.length, historyIndexRef.current + 1)
                        const recalled = historyIndexRef.current >= history.length ? '' : (history[historyIndexRef.current] || '')
                        redrawInput(term, recalled)
                    } else if (data === '\u001b[D') {
                        // Left arrow
                        if (cursorPositionRef.current > 0) {
                            cursorPositionRef.current -= 1
                            term.write('\x1b[D')
                        }
                    } else if (data === '\u001b[C') {
                        // Right arrow
                        if (cursorPositionRef.current < commandBufferRef.current.length) {
                            cursorPositionRef.current += 1
                            term.write('\x1b[C')
                        }
                    } else if (data === '\t') {
                        void handleTabCompletion(term)
                    } else if (data === '\u001b[3~') {
                        // Delete key
                        const current = commandBufferRef.current
                        const cursor = cursorPositionRef.current
                        if (cursor < current.length) {
                            const next = current.slice(0, cursor) + current.slice(cursor + 1)
                            renderPromptLine(term, next, cursor)
                        }
                    } else if (data === '\u007F') {
                        // Backspace
                        const current = commandBufferRef.current
                        const cursor = cursorPositionRef.current
                        if (cursor > 0 && current.length > 0) {
                            const next = current.slice(0, cursor - 1) + current.slice(cursor)
                            renderPromptLine(term, next, cursor - 1)
                        }
                    } else if (data === '\u0003') {
                        // Ctrl+C
                        commandBufferRef.current = ""
                        cursorPositionRef.current = 0
                        historyIndexRef.current = commandHistoryRef.current.length
                        clearReverseSearchState()
                        term.write('^C\r\n')
                        writePrompt(term)
                    } else if (data === '\u000C') {
                        // Ctrl+L — clear
                        commandBufferRef.current = ""
                        cursorPositionRef.current = 0
                        clearReverseSearchState()
                        term.clear()
                        writePrompt(term)
                    } else if (data === '\u0012') {
                        // Ctrl+R => reverse search through history
                        handleReverseSearch(term)
                    } else if (data === '\u0001') {
                        // Ctrl+A => start of line
                        if (cursorPositionRef.current > 0) {
                            term.write(`\x1b[${cursorPositionRef.current}D`)
                            cursorPositionRef.current = 0
                        }
                    } else if (data === '\u0005') {
                        // Ctrl+E => end of line
                        const moveRight = commandBufferRef.current.length - cursorPositionRef.current
                        if (moveRight > 0) {
                            term.write(`\x1b[${moveRight}C`)
                            cursorPositionRef.current = commandBufferRef.current.length
                        }
                    } else if (data === '\u0016') {
                        // Ctrl+V => paste from clipboard
                        navigator.clipboard.readText().then(text => {
                            if (text) {
                                const sanitized = text.replace(/\r\n?/g, '\n').split('\n')[0] // Single line paste
                                const current = commandBufferRef.current
                                const cursor = cursorPositionRef.current
                                const next = current.slice(0, cursor) + sanitized + current.slice(cursor)
                                renderPromptLine(term, next, cursor + sanitized.length)
                            }
                        }).catch(() => { /* clipboard access denied */ })
                    } else if (data.charCodeAt(0) >= 32) {
                        // Regular character (insert mode)
                        const current = commandBufferRef.current
                        const cursor = cursorPositionRef.current
                        const next = current.slice(0, cursor) + data + current.slice(cursor)
                        renderPromptLine(term, next, cursor + data.length)
                        historyIndexRef.current = commandHistoryRef.current.length
                        clearReverseSearchState()
                    }
                })

                window.addEventListener('resize', safeFit)

                // Watch the container for panel resizes (not just window resize).
                const panelRo = typeof ResizeObserver !== 'undefined'
                    ? new ResizeObserver(safeFit)
                    : null
                panelRo?.observe(container)

                cleanupFn = () => {
                    window.removeEventListener('resize', safeFit)
                    window.removeEventListener('terminal:search', handleSearch)
                    panelRo?.disconnect()
                    try { term.dispose() } catch { /* ignore */ }
                    xtermRef.current = null
                    fitAddonRef.current = null
                }
            } catch (error) {
                console.error("Failed to initialize terminal:", error)
            }
        }

        // If the container already has real dimensions start immediately,
        // otherwise wait for the first non-zero resize (e.g. panel slide-in).
        const container = terminalRef.current
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            initTerminal(container)
        } else {
            initRo = typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(() => {
                    if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                        initTerminal(container)
                    }
                })
                : null
            initRo?.observe(container)
        }

        return () => {
            initRo?.disconnect()
            cleanupFn?.()
        }
    }, [clearReverseSearchState, executeCommand, handleReverseSearch, handleTabCompletion, onData, sessionId, socket, writePrompt])

    // Handle WebSocket messages
    useEffect(() => {
        if (!socket || !xtermRef.current) return

        const handleMessage = (event: MessageEvent) => {
            xtermRef.current?.write(event.data)
        }

        socket.addEventListener('message', handleMessage)
        return () => { socket.removeEventListener('message', handleMessage) }
    }, [socket])

    return <div ref={terminalRef} className="h-full w-full overflow-hidden bg-zinc-950" />
}
