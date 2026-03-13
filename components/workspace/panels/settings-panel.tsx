"use client"

/**
 * Settings Panel — VS Code-style editor settings UI
 *
 * Opens via Ctrl+, or the gear icon in the activity bar.
 * Applies changes to Monaco editor immediately (live preview).
 * Persists settings to localStorage under `azora-editor-settings-{projectId}`.
 */

import { useCallback, useEffect, useState, useRef } from "react"
import { X, Settings, Check, ChevronDown, Search, Keyboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/stores/workbench-store"
import dynamic from "next/dynamic"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

export interface EditorSettings {
    fontSize: number
    tabSize: number
    fontFamily: string
    wordWrap: "off" | "on" | "wordWrapColumn"
    minimap: boolean
    lineNumbers: "on" | "off" | "relative"
    renderWhitespace: "none" | "boundary" | "all"
    stickyScroll: boolean
    bracketPairColorization: boolean
    formatOnSave: boolean
    formatOnPaste: boolean
    codeActionsOnSave: {
        organizeImports: boolean
        fixAll: boolean
    }
    cursorBlinking: "blink" | "smooth" | "phase" | "solid"
    fontLigatures: boolean
}

const DEFAULTS: EditorSettings = {
    fontSize: 13,
    tabSize: 2,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    wordWrap: "off",
    minimap: true,
    lineNumbers: "on",
    renderWhitespace: "boundary",
    stickyScroll: true,
    bracketPairColorization: true,
    formatOnSave: true,
    formatOnPaste: true,
    codeActionsOnSave: {
        organizeImports: true,
        fixAll: false,
    },
    cursorBlinking: "smooth",
    fontLigatures: true,
}

const SETTINGS_KEY = (projectId: string) => `azora-editor-settings-${projectId}`

export function loadEditorSettings(projectId: string): EditorSettings {
    if (typeof window === "undefined") return DEFAULTS
    try {
        const raw = localStorage.getItem(SETTINGS_KEY(projectId))
        if (!raw) return DEFAULTS
        return { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {
        return DEFAULTS
    }
}

function saveEditorSettings(projectId: string, s: EditorSettings) {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(SETTINGS_KEY(projectId), JSON.stringify(s))
        // Notify editor panels that settings changed (replaces 2s polling)
        window.dispatchEvent(new CustomEvent('azora:settingsChanged'))
    } catch { }
}

interface SettingsPanelProps {
    projectId: string
    onClose: () => void
    onApply: (settings: EditorSettings) => void
}

export function SettingsPanel({ projectId, onClose, onApply }: SettingsPanelProps) {
    const [settings, setSettings] = useState<EditorSettings>(() => loadEditorSettings(projectId))
    const [saved, setSaved] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState<'ui' | 'keybindings' | 'json'>('ui')
    const { keybindings, setKeybinding, resetKeybinding, resetAllKeybindings } = useWorkbench()
    const [editingKey, setEditingKey] = useState<string | null>(null)
    const [keyCapture, setKeyCapture] = useState("")
    const [jsonError, setJsonError] = useState<string | null>(null)
    const jsonEditorValue = useRef(JSON.stringify(settings, null, 2))

    // Apply live as user changes values
    const update = useCallback(<K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value }
            onApply(next)
            return next
        })
    }, [onApply])

    const handleSave = () => {
        saveEditorSettings(projectId, settings)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handleReset = () => {
        setSettings(DEFAULTS)
        onApply(DEFAULTS)
    }

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [onClose])

    return (
        <div className="absolute inset-0 z-50 flex flex-col bg-[var(--ide-settings-bg)] border-l border-[var(--ide-settings-border)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between h-10 px-4 bg-[var(--ide-settings-panel-bg)] border-b border-[var(--ide-settings-border)] shrink-0">
                <div className="flex items-center gap-2 text-[13px] text-white font-medium">
                    <Settings className="w-4 h-4 text-[var(--ide-settings-muted)]" />
                    Settings
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="text-[11px] text-[var(--ide-settings-muted)] hover:text-white px-2 py-1 rounded hover:bg-[var(--ide-settings-surface)] transition-colors"
                    >
                        Reset to Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        className={cn(
                            "flex items-center gap-1.5 text-[11px] px-3 py-1 rounded transition-colors",
                            saved
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-[var(--ide-settings-accent)] text-white hover:bg-[var(--ide-settings-accent-hover)]"
                        )}
                    >
                        {saved ? <><Check className="w-3 h-3" /> Saved</> : "Save"}
                    </button>
                    <button onClick={onClose} className="p-1 rounded hover:bg-[var(--ide-settings-surface)] text-[var(--ide-settings-muted)] hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Tabs + Search */}
            <div className="flex items-center gap-0 border-b border-[var(--ide-settings-border)] bg-[var(--ide-settings-panel-bg)]">
                {(['ui', 'keybindings', 'json'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-[12px] transition-colors border-b-2",
                            activeTab === tab
                                ? "text-white border-[var(--ide-settings-accent)]"
                                : "text-[var(--ide-settings-muted)] border-transparent hover:text-white"
                        )}
                    >
                        {tab === 'ui' ? 'User Settings' : tab === 'keybindings' ? 'Keyboard Shortcuts' : 'JSON'}
                    </button>
                ))}
                <div className="flex-1" />
                <div className="relative mr-3">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--ide-settings-subtle)]" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search settings..."
                        className="bg-[var(--ide-settings-bg)] border border-[var(--ide-settings-surface)] rounded text-[12px] text-[var(--ide-settings-text)] pl-7 pr-3 py-1 w-48 focus:border-[var(--ide-settings-accent)] outline-none"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-[13px]">

                {activeTab === 'json' && (
                    <div className="h-full flex flex-col gap-2">
                        {jsonError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded px-3 py-1.5 text-[11px] text-red-400">
                                {jsonError}
                            </div>
                        )}
                        <div className="flex-1 min-h-[300px] border border-[var(--ide-settings-border)] rounded-md overflow-hidden">
                            <MonacoEditor
                                height="100%"
                                language="json"
                                theme="vs-dark"
                                defaultValue={jsonEditorValue.current}
                                onChange={(value) => {
                                    if (!value) return
                                    jsonEditorValue.current = value
                                    try {
                                        const parsed = JSON.parse(value)
                                        const merged = { ...DEFAULTS, ...parsed }
                                        setSettings(merged)
                                        onApply(merged)
                                        setJsonError(null)
                                    } catch {
                                        setJsonError('Invalid JSON — fix syntax errors to apply')
                                    }
                                }}
                                options={{
                                    fontSize: 12,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    minimap: { enabled: false },
                                    lineNumbers: "on",
                                    scrollBeyondLastLine: false,
                                    tabSize: 2,
                                    automaticLayout: true,
                                    folding: true,
                                    formatOnPaste: true,
                                }}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'keybindings' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ide-settings-subtle)]">Keyboard Shortcuts</h3>
                            {Object.keys(keybindings).length > 0 && (
                                <button onClick={resetAllKeybindings} className="text-[11px] text-[var(--ide-settings-muted)] hover:text-white px-2 py-1 rounded hover:bg-[var(--ide-settings-surface)]">
                                    Reset All
                                </button>
                            )}
                        </div>
                        <div className="space-y-0.5 rounded-md overflow-hidden border border-[var(--ide-settings-border)]">
                            {DEFAULT_KEYBINDINGS.filter(kb =>
                                !searchQuery || kb.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                kb.action.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(kb => {
                                const customShortcut = keybindings[kb.action]
                                return (
                                    <div key={kb.action} className="flex items-center justify-between px-4 py-2 bg-[var(--ide-settings-panel-bg)] hover:bg-[var(--ide-settings-bg)] transition-colors">
                                        <div className="flex items-center gap-2">
                                            <Keyboard className="w-3.5 h-3.5 text-[var(--ide-settings-subtle)]" />
                                            <span className="text-[var(--ide-settings-text)]">{kb.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {editingKey === kb.action ? (
                                                <input
                                                    autoFocus
                                                    className="bg-[var(--ide-settings-border)] border border-[var(--ide-settings-accent)] rounded text-[11px] text-white px-2 py-0.5 w-36 outline-none text-center"
                                                    placeholder="Press shortcut..."
                                                    value={keyCapture}
                                                    onKeyDown={(e) => {
                                                        e.preventDefault()
                                                        const parts: string[] = []
                                                        if (e.ctrlKey) parts.push('Ctrl')
                                                        if (e.shiftKey) parts.push('Shift')
                                                        if (e.altKey) parts.push('Alt')
                                                        if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
                                                        const shortcut = parts.join('+')
                                                        setKeyCapture(shortcut)
                                                        setKeybinding(kb.action, shortcut)
                                                        setEditingKey(null)
                                                        setKeyCapture('')
                                                    }}
                                                    onBlur={() => { setEditingKey(null); setKeyCapture('') }}
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setEditingKey(kb.action)}
                                                    className="text-[11px] text-[var(--ide-settings-muted)] hover:text-white px-2 py-0.5 rounded bg-[var(--ide-settings-border)] hover:bg-[var(--ide-settings-surface)] min-w-[80px] text-center transition-colors"
                                                >
                                                    {customShortcut || kb.defaultShortcut}
                                                </button>
                                            )}
                                            {customShortcut && (
                                                <button onClick={() => resetKeybinding(kb.action)} className="text-[10px] text-[var(--ide-settings-muted)] hover:text-white" title="Reset">×</button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'ui' && (<>

                {/* Editor */}
                <Section title="Editor">
                    <NumberSetting
                        label="Font Size"
                        value={settings.fontSize}
                        min={8} max={32}
                        onChange={v => update("fontSize", v)}
                    />
                    <NumberSetting
                        label="Tab Size"
                        value={settings.tabSize}
                        min={1} max={8}
                        onChange={v => update("tabSize", v)}
                    />
                    <SelectSetting
                        label="Font Family"
                        value={settings.fontFamily}
                        options={[
                            { value: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", label: "JetBrains Mono" },
                            { value: "'Fira Code', monospace", label: "Fira Code" },
                            { value: "'Cascadia Code', monospace", label: "Cascadia Code" },
                            { value: "Consolas, monospace", label: "Consolas" },
                            { value: "'Courier New', monospace", label: "Courier New" },
                        ]}
                        onChange={v => update("fontFamily", v as EditorSettings["fontFamily"])}
                    />
                    <SelectSetting
                        label="Word Wrap"
                        value={settings.wordWrap}
                        options={[
                            { value: "off", label: "Off" },
                            { value: "on", label: "On" },
                            { value: "wordWrapColumn", label: "At Column" },
                        ]}
                        onChange={v => update("wordWrap", v as EditorSettings["wordWrap"])}
                    />
                    <SelectSetting
                        label="Line Numbers"
                        value={settings.lineNumbers}
                        options={[
                            { value: "on", label: "On" },
                            { value: "off", label: "Off" },
                            { value: "relative", label: "Relative" },
                        ]}
                        onChange={v => update("lineNumbers", v as EditorSettings["lineNumbers"])}
                    />
                    <SelectSetting
                        label="Cursor Animation"
                        value={settings.cursorBlinking}
                        options={[
                            { value: "smooth", label: "Smooth" },
                            { value: "blink", label: "Blink" },
                            { value: "phase", label: "Phase" },
                            { value: "solid", label: "Solid" },
                        ]}
                        onChange={v => update("cursorBlinking", v as EditorSettings["cursorBlinking"])}
                    />
                    <SelectSetting
                        label="Render Whitespace"
                        value={settings.renderWhitespace}
                        options={[
                            { value: "boundary", label: "Boundary" },
                            { value: "none", label: "None" },
                            { value: "all", label: "All" },
                        ]}
                        onChange={v => update("renderWhitespace", v as EditorSettings["renderWhitespace"])}
                    />
                </Section>

                {/* Features */}
                <Section title="Features">
                    <ToggleSetting label="Minimap" value={settings.minimap} onChange={v => update("minimap", v)} />
                    <ToggleSetting label="Sticky Scroll" value={settings.stickyScroll} onChange={v => update("stickyScroll", v)} />
                    <ToggleSetting label="Bracket Pair Colorization" value={settings.bracketPairColorization} onChange={v => update("bracketPairColorization", v)} />
                    <ToggleSetting label="Font Ligatures" value={settings.fontLigatures} onChange={v => update("fontLigatures", v)} />
                    <ToggleSetting label="Format on Save" value={settings.formatOnSave} onChange={v => update("formatOnSave", v)} />
                    <ToggleSetting label="Format on Paste" value={settings.formatOnPaste} onChange={v => update("formatOnPaste", v)} />
                </Section>

                {/* Code Actions on Save */}
                <Section title="Code Actions on Save">
                    <ToggleSetting label="Organize Imports" value={settings.codeActionsOnSave?.organizeImports ?? true} onChange={v => update("codeActionsOnSave", { ...settings.codeActionsOnSave, organizeImports: v })} />
                    <ToggleSetting label="Fix All" value={settings.codeActionsOnSave?.fixAll ?? false} onChange={v => update("codeActionsOnSave", { ...settings.codeActionsOnSave, fixAll: v })} />
                </Section>

                </>)}
            </div>
        </div>
    )
}

// ─── Default Keybindings ────────────────────────────────────────────────

const DEFAULT_KEYBINDINGS = [
    { action: 'editor.action.quickOpen', label: 'Quick Open', defaultShortcut: 'Ctrl+P' },
    { action: 'editor.action.commandPalette', label: 'Command Palette', defaultShortcut: 'Ctrl+Shift+P' },
    { action: 'editor.action.goToLine', label: 'Go to Line', defaultShortcut: 'Ctrl+G' },
    { action: 'editor.action.goToDefinition', label: 'Go to Definition', defaultShortcut: 'F12' },
    { action: 'editor.action.peekDefinition', label: 'Peek Definition', defaultShortcut: 'Alt+F12' },
    { action: 'editor.action.goToReferences', label: 'Go to References', defaultShortcut: 'Shift+F12' },
    { action: 'editor.action.toggleSidebar', label: 'Toggle Sidebar', defaultShortcut: 'Ctrl+B' },
    { action: 'editor.action.togglePanel', label: 'Toggle Panel', defaultShortcut: 'Ctrl+J' },
    { action: 'editor.action.splitEditor', label: 'Split Editor', defaultShortcut: 'Ctrl+\\' },
    { action: 'editor.action.zenMode', label: 'Zen Mode', defaultShortcut: 'Ctrl+K Z' },
    { action: 'editor.action.save', label: 'Save', defaultShortcut: 'Ctrl+S' },
    { action: 'editor.action.find', label: 'Find', defaultShortcut: 'Ctrl+F' },
    { action: 'editor.action.replace', label: 'Replace', defaultShortcut: 'Ctrl+H' },
    { action: 'editor.action.findInFiles', label: 'Find in Files', defaultShortcut: 'Ctrl+Shift+F' },
    { action: 'editor.action.toggleComment', label: 'Toggle Line Comment', defaultShortcut: 'Ctrl+/' },
    { action: 'editor.action.blockComment', label: 'Toggle Block Comment', defaultShortcut: 'Ctrl+Shift+/' },
    { action: 'editor.action.formatDocument', label: 'Format Document', defaultShortcut: 'Shift+Alt+F' },
    { action: 'editor.action.startDebug', label: 'Start Debugging', defaultShortcut: 'F5' },
    { action: 'editor.action.newTerminal', label: 'New Terminal', defaultShortcut: 'Ctrl+Shift+`' },
    { action: 'editor.action.closeEditor', label: 'Close Editor', defaultShortcut: 'Ctrl+W' },
]

// ─── Section ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--ide-settings-subtle)] mb-3">{title}</h3>
            <div className="space-y-1 rounded-md overflow-hidden border border-[var(--ide-settings-border)]">
                {children}
            </div>
        </div>
    )
}

// ─── Setting Rows ────────────────────────────────────────────────────────

function ToggleSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--ide-settings-panel-bg)] hover:bg-[var(--ide-settings-bg)] transition-colors">
            <span className="text-[var(--ide-settings-text)]">{label}</span>
            <button
                onClick={() => onChange(!value)}
                className={cn(
                    "relative w-9 h-5 rounded-full transition-colors duration-200",
                    value ? "bg-[var(--ide-settings-accent)]" : "bg-[var(--ide-settings-surface)]"
                )}
            >
                <span className={cn(
                    "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                    value ? "translate-x-4" : "translate-x-0"
                )} />
            </button>
        </div>
    )
}

function NumberSetting({ label, value, min, max, onChange }: {
    label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--ide-settings-panel-bg)] hover:bg-[var(--ide-settings-bg)] transition-colors">
            <span className="text-[var(--ide-settings-text)]">{label}</span>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onChange(Math.max(min, value - 1))}
                    className="w-6 h-6 rounded bg-[var(--ide-settings-border)] text-[var(--ide-settings-muted)] hover:text-white hover:bg-[var(--ide-settings-surface)] text-[14px] flex items-center justify-center transition-colors"
                >−</button>
                <span className="text-white w-6 text-center">{value}</span>
                <button
                    onClick={() => onChange(Math.min(max, value + 1))}
                    className="w-6 h-6 rounded bg-[var(--ide-settings-border)] text-[var(--ide-settings-muted)] hover:text-white hover:bg-[var(--ide-settings-surface)] text-[14px] flex items-center justify-center transition-colors"
                >+</button>
            </div>
        </div>
    )
}

function SelectSetting({ label, value, options, onChange }: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (v: string) => void
}) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--ide-settings-panel-bg)] hover:bg-[var(--ide-settings-bg)] transition-colors">
            <span className="text-[var(--ide-settings-text)]">{label}</span>
            <div className="relative">
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="appearance-none bg-[var(--ide-settings-border)] text-[var(--ide-settings-text)] text-[12px] px-3 pr-7 py-1 rounded border border-[var(--ide-settings-surface)] focus:border-[var(--ide-settings-accent)] outline-none cursor-pointer hover:border-[var(--ide-settings-subtle)] transition-colors"
                >
                    {options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--ide-settings-muted)] pointer-events-none" />
            </div>
        </div>
    )
}
