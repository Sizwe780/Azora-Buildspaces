"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import {
    Files, Search, GitBranch, Play, Bug, Save, Settings, Globe, Sparkles,
    SquareTerminal, FileCode, Code, RefreshCw, Paintbrush, FileText, Zap,
    Copy, Scissors, ClipboardPaste, Undo2, Redo2, WrapText, AlignLeft,
    SplitSquareHorizontal, Eye, Download, Upload, FolderOpen, X, Hash, Maximize
} from "lucide-react"

interface CommandPaletteProps {
    open: boolean
    onClose: () => void
    onAction: (action: string, payload?: any) => void
    activeFileName?: string
}

interface PaletteCommand {
    id: string
    label: string
    description?: string
    icon: React.ReactNode
    shortcut?: string
    group: string
    action: string
    payload?: any
}

export function CommandPalette({ open, onClose, onAction, activeFileName }: CommandPaletteProps) {
    const [search, setSearch] = useState("")

    useEffect(() => {
        if (open) setSearch("")
    }, [open])

    const commands: PaletteCommand[] = [
        // File
        { id: "new-file", label: "New File", icon: <FileCode className="w-4 h-4" />, group: "File", action: "newFile", shortcut: "Ctrl+N" },
        { id: "save", label: "Save", icon: <Save className="w-4 h-4" />, group: "File", action: "save", shortcut: "Ctrl+S" },
        { id: "save-all", label: "Save All", icon: <Save className="w-4 h-4" />, group: "File", action: "saveAll", shortcut: "Ctrl+Shift+S" },
        { id: "open-file", label: "Quick Open File", icon: <Files className="w-4 h-4" />, group: "File", action: "quickOpen", shortcut: "Ctrl+P" },
        // Edit
        { id: "undo", label: "Undo", icon: <Undo2 className="w-4 h-4" />, group: "Edit", action: "undo", shortcut: "Ctrl+Z" },
        { id: "redo", label: "Redo", icon: <Redo2 className="w-4 h-4" />, group: "Edit", action: "redo", shortcut: "Ctrl+Shift+Z" },
        { id: "find-replace", label: "Find and Replace", icon: <Search className="w-4 h-4" />, group: "Edit", action: "findReplace", shortcut: "Ctrl+H" },
        { id: "toggle-word-wrap", label: "Toggle Word Wrap", icon: <WrapText className="w-4 h-4" />, group: "Edit", action: "toggleWordWrap", shortcut: "Alt+Z" },
        // View
        { id: "toggle-sidebar", label: "Toggle Sidebar", icon: <SplitSquareHorizontal className="w-4 h-4" />, group: "View", action: "toggleSidebar", shortcut: "Ctrl+B" },
        { id: "toggle-terminal", label: "Toggle Terminal", icon: <SquareTerminal className="w-4 h-4" />, group: "View", action: "toggleTerminal", shortcut: "Ctrl+`" },
        { id: "show-explorer", label: "Show Explorer", icon: <Files className="w-4 h-4" />, group: "View", action: "showExplorer", shortcut: "Ctrl+Shift+E" },
        { id: "show-search", label: "Show Search", icon: <Search className="w-4 h-4" />, group: "View", action: "showSearch", shortcut: "Ctrl+Shift+F" },
        { id: "show-git", label: "Show Source Control", icon: <GitBranch className="w-4 h-4" />, group: "View", action: "showGit", shortcut: "Ctrl+Shift+G" },
        { id: "show-extensions", label: "Show Extensions", icon: <FolderOpen className="w-4 h-4" />, group: "View", action: "showExtensions", shortcut: "Ctrl+Shift+X" },
        { id: "show-problems", label: "Show Problems", icon: <Bug className="w-4 h-4" />, group: "View", action: "showProblems", shortcut: "Ctrl+Shift+M" },
        { id: "show-output", label: "Show Output", icon: <AlignLeft className="w-4 h-4" />, group: "View", action: "showOutput" },
        { id: "show-settings", label: "Open Settings", icon: <Settings className="w-4 h-4" />, group: "View", action: "showSettings", shortcut: "Ctrl+," },
        { id: "show-preview", label: "Open Live Preview", icon: <Eye className="w-4 h-4" />, group: "View", action: "showPreview" },
        // AI
        { id: "ai-chat", label: "Open AI Chat", icon: <Sparkles className="w-4 h-4" />, group: "AI", action: "showAI", shortcut: "Ctrl+Shift+I" },
        { id: "ai-inline", label: "AI Inline Edit", icon: <Zap className="w-4 h-4" />, group: "AI", action: "aiInlineEdit", shortcut: "Ctrl+K" },
        { id: "ai-explain", label: "AI Explain Selection", icon: <FileText className="w-4 h-4" />, group: "AI", action: "aiExplain" },
        { id: "ai-lint", label: "AI Lint Current File", icon: <Bug className="w-4 h-4" />, group: "AI", action: "aiLint" },
        { id: "ai-docgen", label: "AI Generate Documentation", icon: <FileText className="w-4 h-4" />, group: "AI", action: "aiDocgen" },
        // Run
        { id: "run", label: "Run Project", icon: <Play className="w-4 h-4" />, group: "Run", action: "run", shortcut: "F5" },
        { id: "deploy", label: "Deploy", icon: <Globe className="w-4 h-4" />, group: "Run", action: "deploy" },
        { id: "show-debug", label: "Show Debug Console", icon: <Bug className="w-4 h-4" />, group: "Run", action: "showDebug" },
        // Format
        { id: "format", label: "Format Document", icon: <Paintbrush className="w-4 h-4" />, group: "Format", action: "formatDocument", shortcut: "Shift+Alt+F" },
        // Window
        { id: "zen-mode", label: "Toggle Zen Mode", icon: <Maximize className="w-4 h-4" />, group: "Window", action: "zenMode", shortcut: "Ctrl+Shift+Z" },
        { id: "close-tab", label: "Close Tab", icon: <X className="w-4 h-4" />, group: "Window", action: "closeTab", shortcut: "Ctrl+W" },
        { id: "close-all", label: "Close All Tabs", icon: <X className="w-4 h-4" />, group: "Window", action: "closeAllTabs" },
        // Go
        { id: "go-to-line", label: "Go to Line", icon: <Hash className="w-4 h-4" />, group: "Go", action: "goToLine", shortcut: "Ctrl+G" },
        { id: "go-to-symbol", label: "Go to Symbol", icon: <Code className="w-4 h-4" />, group: "Go", action: "goToSymbol", shortcut: "Ctrl+Shift+O" },
    ]

    const groups = Array.from(new Set(commands.map(c => c.group)))

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-[640px] mx-4" onClick={(e) => e.stopPropagation()}>
                <Command className="rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/60 overflow-hidden">
                    <CommandInput
                        placeholder="Type a command or search..."
                        value={search}
                        onValueChange={setSearch}
                        className="h-12 text-[14px] text-white border-b border-[#30363d] bg-transparent placeholder:text-[#484f58]"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Escape") onClose()
                        }}
                    />
                    <CommandList className="max-h-[360px] overflow-y-auto py-1">
                        <CommandEmpty className="py-6 text-center text-[13px] text-[#484f58]">
                            No commands found.
                        </CommandEmpty>
                        {groups.map((group, gi) => (
                            <div key={group}>
                                {gi > 0 && <CommandSeparator className="bg-[#1b1f27]" />}
                                <CommandGroup heading={group} className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#484f58] [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                                    {commands.filter(c => c.group === group).map((cmd) => (
                                        <CommandItem
                                            key={cmd.id}
                                            value={`${cmd.label} ${cmd.description || ""}`}
                                            onSelect={() => {
                                                onAction(cmd.action, cmd.payload)
                                                onClose()
                                            }}
                                            className="flex items-center gap-3 px-3 py-2 mx-1 rounded-md text-[13px] text-foreground cursor-pointer aria-selected:bg-[#1f6feb]/20 aria-selected:text-white hover:bg-[#1f1f1f]"
                                        >
                                            <span className="text-[#8b949e]">{cmd.icon}</span>
                                            <span className="flex-1">{cmd.label}</span>
                                            {cmd.shortcut && (
                                                <kbd className="px-1.5 py-0.5 rounded bg-background border border-[#30363d] text-[10px] text-[#484f58] font-mono shrink-0">
                                                    {cmd.shortcut}
                                                </kbd>
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </div>
                        ))}
                    </CommandList>
                </Command>
            </div>
        </div>
    )
}
