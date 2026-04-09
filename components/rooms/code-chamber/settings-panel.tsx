"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Settings, Type, Palette, Code, ToggleLeft, ToggleRight } from "lucide-react"

export interface EditorSettings {
    fontSize: number
    fontFamily: string
    tabSize: number
    wordWrap: "on" | "off" | "wordWrapColumn"
    minimap: boolean
    lineNumbers: "on" | "off" | "relative"
    theme: string
    stickyScroll: boolean
    bracketPairColorization: boolean
    renderWhitespace: "none" | "boundary" | "all"
    cursorBlinking: "blink" | "smooth" | "phase" | "expand" | "solid"
    fontLigatures: boolean
}

export const DEFAULT_SETTINGS: EditorSettings = {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    tabSize: 2,
    wordWrap: "off",
    minimap: true,
    lineNumbers: "on",
    theme: "vs-dark",
    stickyScroll: true,
    bracketPairColorization: true,
    renderWhitespace: "boundary",
    cursorBlinking: "smooth",
    fontLigatures: true,
}

const FONT_FAMILIES = [
    { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
    { label: "Fira Code", value: "'Fira Code', monospace" },
    { label: "Cascadia Code", value: "'Cascadia Code', monospace" },
    { label: "Source Code Pro", value: "'Source Code Pro', monospace" },
    { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace" },
    { label: "Inconsolata", value: "'Inconsolata', monospace" },
]

const THEMES = [
    { label: "VS Dark", value: "vs-dark" },
    { label: "VS Light", value: "light" },
    { label: "High Contrast Dark", value: "hc-black" },
]

interface SettingsPanelProps {
    settings: EditorSettings
    onSettingsChange: (settings: EditorSettings) => void
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
    const [activeSection, setActiveSection] = useState("editor")

    const update = (key: keyof EditorSettings, value: any) => {
        const next = { ...settings, [key]: value }
        onSettingsChange(next)
        // Persist
        try {
            localStorage.setItem("code-chamber-settings", JSON.stringify(next))
        } catch {}
    }

    const sections = [
        { id: "editor", label: "Editor", icon: Code },
        { id: "appearance", label: "Appearance", icon: Palette },
        { id: "typography", label: "Typography", icon: Type },
    ]

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            <div className="h-9 flex items-center px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">
                <Settings className="w-3.5 h-3.5 mr-2" /> Settings
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Section Nav */}
                <div className="w-[140px] border-r border-[#1b1f27] py-2 shrink-0">
                    {sections.map((s) => {
                        const Icon = s.icon
                        return (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-4 py-2 text-[12px] transition-colors text-left",
                                    activeSection === s.id ? "bg-[#1f1f1f] text-white" : "text-[#8b949e] hover:text-foreground"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {s.label}
                            </button>
                        )
                    })}
                </div>

                {/* Settings Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {activeSection === "editor" && (
                        <>
                            <SettingRow label="Tab Size" description="The number of spaces a tab is equal to">
                                <div className="flex items-center gap-1">
                                    {[2, 4, 8].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => update("tabSize", size)}
                                            className={cn(
                                                "px-3 py-1 rounded text-[12px] border transition-colors",
                                                settings.tabSize === size ? "border-[#1f6feb] text-white bg-[#1f6feb]/10" : "border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                                            )}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </SettingRow>

                            <SettingRow label="Word Wrap" description="Controls how lines should wrap">
                                <select
                                    value={settings.wordWrap}
                                    onChange={(e) => update("wordWrap", e.target.value)}
                                    className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[12px] text-white outline-none focus:border-[#1f6feb]"
                                >
                                    <option value="off">Off</option>
                                    <option value="on">On</option>
                                    <option value="wordWrapColumn">Word Wrap Column</option>
                                </select>
                            </SettingRow>

                            <SettingRow label="Line Numbers" description="Controls the display of line numbers">
                                <select
                                    value={settings.lineNumbers}
                                    onChange={(e) => update("lineNumbers", e.target.value)}
                                    className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[12px] text-white outline-none focus:border-[#1f6feb]"
                                >
                                    <option value="on">On</option>
                                    <option value="off">Off</option>
                                    <option value="relative">Relative</option>
                                </select>
                            </SettingRow>

                            <SettingRow label="Render Whitespace" description="Controls how whitespace characters are shown">
                                <select
                                    value={settings.renderWhitespace}
                                    onChange={(e) => update("renderWhitespace", e.target.value)}
                                    className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[12px] text-white outline-none focus:border-[#1f6feb]"
                                >
                                    <option value="none">None</option>
                                    <option value="boundary">Boundary</option>
                                    <option value="all">All</option>
                                </select>
                            </SettingRow>

                            <ToggleSetting label="Minimap" description="Show the minimap (code outline)" checked={settings.minimap} onChange={(v) => update("minimap", v)} />
                            <ToggleSetting label="Sticky Scroll" description="Show sticky scroll at the top of the editor" checked={settings.stickyScroll} onChange={(v) => update("stickyScroll", v)} />
                            <ToggleSetting label="Bracket Pair Colorization" description="Colorize matching brackets" checked={settings.bracketPairColorization} onChange={(v) => update("bracketPairColorization", v)} />
                            <ToggleSetting label="Font Ligatures" description="Enable font ligatures (e.g. =>, !=)" checked={settings.fontLigatures} onChange={(v) => update("fontLigatures", v)} />
                        </>
                    )}

                    {activeSection === "appearance" && (
                        <>
                            <SettingRow label="Theme" description="Select the editor color theme">
                                <div className="flex flex-col gap-1">
                                    {THEMES.map((t) => (
                                        <button
                                            key={t.value}
                                            onClick={() => update("theme", t.value)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-md text-[12px] border transition-colors text-left",
                                                settings.theme === t.value ? "border-[#1f6feb] text-white bg-[#1f6feb]/10" : "border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                                            )}
                                        >
                                            <div className={cn("w-4 h-4 rounded-full", t.value === "vs-dark" ? "bg-[#1e1e1e] border border-[#30363d]" : t.value === "light" ? "bg-white border border-[#d0d7de]" : "bg-black border border-[#6e6e6e]")} />
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </SettingRow>

                            <SettingRow label="Cursor Blinking" description="Controls the cursor animation style">
                                <select
                                    value={settings.cursorBlinking}
                                    onChange={(e) => update("cursorBlinking", e.target.value)}
                                    className="bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[12px] text-white outline-none focus:border-[#1f6feb]"
                                >
                                    <option value="blink">Blink</option>
                                    <option value="smooth">Smooth</option>
                                    <option value="phase">Phase</option>
                                    <option value="expand">Expand</option>
                                    <option value="solid">Solid</option>
                                </select>
                            </SettingRow>
                        </>
                    )}

                    {activeSection === "typography" && (
                        <>
                            <SettingRow label="Font Size" description={`Current: ${settings.fontSize}px`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={10}
                                        max={24}
                                        value={settings.fontSize}
                                        onChange={(e) => update("fontSize", parseInt(e.target.value))}
                                        className="flex-1 accent-[#1f6feb]"
                                    />
                                    <span className="text-[12px] text-white w-8 text-right">{settings.fontSize}px</span>
                                </div>
                            </SettingRow>

                            <SettingRow label="Font Family" description="Select the editor font">
                                <div className="flex flex-col gap-1">
                                    {FONT_FAMILIES.map((f) => (
                                        <button
                                            key={f.value}
                                            onClick={() => update("fontFamily", f.value)}
                                            className={cn(
                                                "px-3 py-2 rounded-md text-[12px] border transition-colors text-left",
                                                settings.fontFamily === f.value ? "border-[#1f6feb] text-white bg-[#1f6feb]/10" : "border-[#30363d] text-[#8b949e] hover:border-[#484f58]"
                                            )}
                                            style={{ fontFamily: f.value }}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </SettingRow>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div>
                <div className="text-[13px] text-white font-medium">{label}</div>
                {description && <div className="text-[11px] text-[#484f58]">{description}</div>}
            </div>
            {children}
        </div>
    )
}

function ToggleSetting({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-[13px] text-white font-medium">{label}</div>
                {description && <div className="text-[11px] text-[#484f58]">{description}</div>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className="shrink-0"
            >
                {checked ? (
                    <ToggleRight className="w-8 h-8 text-[#1f6feb]" />
                ) : (
                    <ToggleLeft className="w-8 h-8 text-[#484f58]" />
                )}
            </button>
        </div>
    )
}

export function loadSettings(): EditorSettings {
    try {
        const saved = localStorage.getItem("code-chamber-settings")
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    } catch {}
    return DEFAULT_SETTINGS
}
