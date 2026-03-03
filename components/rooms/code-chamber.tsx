"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useFileSystem } from "@/lib/stores/file-system"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import dynamic from "next/dynamic"
import {
    Files, Search, GitBranch, Box, Play, Bug,
    ChevronRight, ChevronDown, X, FileCode, Plus,
    CheckCircle, Save,
    FolderOpen, File, FileText, Settings, Image, Code,
    Database, Sparkles, Wifi, WifiOff,
    Bot, SquareTerminal, CircleDot, FolderClosed,
    Trash2, RefreshCw, Globe, Zap, Eye, Pencil,
    AlertTriangle, XCircle, Copy, GripVertical
} from "lucide-react"
import { XTerminal } from "@/components/workspace/panels/x-terminal"
import * as Y from "yjs"
import { WebrtcProvider } from "y-webrtc"
import { MonacoBinding } from "y-monaco"
import { toast, Toaster } from "sonner"

// Sub-components
import { CommandPalette } from "./code-chamber/command-palette"
import { QuickOpen } from "./code-chamber/quick-open"
import { InlineEditWidget } from "./code-chamber/inline-edit-widget"
import { AIChatSidebar } from "./code-chamber/ai-chat-sidebar"
import { ProblemsPanel, type Diagnostic } from "./code-chamber/problems-panel"
import { OutputPanel, type OutputLine } from "./code-chamber/output-panel"
import { GitDiffViewer } from "./code-chamber/git-diff-viewer"
import { ExtensionsPanel } from "./code-chamber/extensions-panel"
import { LivePreviewPanel } from "./code-chamber/live-preview-panel"
import { SettingsPanel, type EditorSettings, DEFAULT_SETTINGS, loadSettings } from "./code-chamber/settings-panel"
import { NotificationCenter, type Notification } from "./code-chamber/notification-center"
import { DebugPanel } from "./code-chamber/debug-panel"
import { EnhancedBreadcrumbBar, parseSymbols, type ParsedSymbol } from "./code-chamber/enhanced-breadcrumb"
import { DraggableTabBar } from "./code-chamber/draggable-tabs"
import { applyDiagnosticDecorations, registerDiagnosticStyles } from "./code-chamber/editor-decorations"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

// ─── Types ──────────────────────────────────────────────────────────────
type SidebarView = "explorer" | "search" | "git" | "extensions" | "ai" | "settings"
type PanelView = "terminal" | "output" | "problems" | "debug" | "preview"

interface CodeChamberProps {
    id?: string
}

// ─── File Icon Helper ───────────────────────────────────────────────────
function getFileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase()
    switch (ext) {
        case "tsx": case "jsx": return <Code className="w-3.5 h-3.5 text-blue-400" />
        case "ts": case "js": return <FileCode className="w-3.5 h-3.5 text-yellow-400" />
        case "css": case "scss": return <FileText className="w-3.5 h-3.5 text-pink-400" />
        case "json": return <Settings className="w-3.5 h-3.5 text-amber-400" />
        case "md": return <FileText className="w-3.5 h-3.5 text-slate-400" />
        case "sql": return <Database className="w-3.5 h-3.5 text-green-400" />
        case "png": case "jpg": case "svg": return <Image className="w-3.5 h-3.5 text-purple-400" />
        default: return <File className="w-3.5 h-3.5 text-slate-500" />
    }
}

function getLanguage(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase()
    switch (ext) {
        case "tsx": return "typescript"
        case "jsx": return "javascript"
        case "ts": return "typescript"
        case "js": return "javascript"
        case "css": return "css"
        case "scss": return "scss"
        case "json": return "json"
        case "md": return "markdown"
        case "html": return "html"
        case "sql": return "sql"
        case "py": return "python"
        case "rs": return "rust"
        case "go": return "go"
        default: return "plaintext"
    }
}

// ═══════════════════════════════════════════════════════════════════════
// ACTIVITY BAR — VS Code left rail
// ═══════════════════════════════════════════════════════════════════════
function IDEActivityBar({
    activeView,
    onViewChange,
    sidebarVisible,
    diagnosticCounts,
}: {
    activeView: SidebarView
    onViewChange: (v: SidebarView) => void
    sidebarVisible: boolean
    diagnosticCounts: { errors: number; warnings: number }
}) {
    const items: { view: SidebarView; icon: typeof Files; label: string; shortcut: string; badge?: number }[] = [
        { view: "explorer", icon: Files, label: "Explorer", shortcut: "Ctrl+Shift+E" },
        { view: "search", icon: Search, label: "Search", shortcut: "Ctrl+Shift+F" },
        { view: "git", icon: GitBranch, label: "Source Control", shortcut: "Ctrl+Shift+G" },
        { view: "extensions", icon: Box, label: "Extensions", shortcut: "Ctrl+Shift+X" },
        { view: "ai", icon: Sparkles, label: "Elara AI", shortcut: "Ctrl+Shift+I" },
    ]

    return (
        <div className="w-12 flex flex-col items-center py-1 bg-[#0d1117] border-r border-[#1b1f27] shrink-0 select-none">
            {items.map((item) => {
                const Icon = item.icon
                const isActive = activeView === item.view && sidebarVisible
                return (
                    <Tooltip key={item.view}>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => onViewChange(item.view)}
                                className={cn(
                                    "w-12 h-11 flex items-center justify-center relative transition-colors",
                                    isActive ? "text-white" : "text-[#484f58] hover:text-[#8b949e]"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r" />
                                )}
                                <Icon className="w-[22px] h-[22px]" strokeWidth={1.5} />
                                {item.view === "git" && diagnosticCounts.errors > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">
                                        {diagnosticCounts.errors > 9 ? "9+" : diagnosticCounts.errors}
                                    </span>
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs bg-[#161b22] border-[#30363d] text-[#c9d1d9]">
                            {item.label} <span className="text-[#484f58] ml-2">{item.shortcut}</span>
                        </TooltipContent>
                    </Tooltip>
                )
            })}

            <div className="flex-1" />

            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => onViewChange("settings")}
                        className={cn(
                            "w-12 h-11 flex items-center justify-center transition-colors",
                            activeView === "settings" && sidebarVisible ? "text-white" : "text-[#484f58] hover:text-[#8b949e]"
                        )}
                    >
                        <Settings className="w-[22px] h-[22px]" strokeWidth={1.5} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs bg-[#161b22] border-[#30363d] text-[#c9d1d9]">Settings <span className="text-[#484f58] ml-2">Ctrl+,</span></TooltipContent>
            </Tooltip>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// EXPLORER SIDEBAR — Zustand file-system store with rename & context menu
// ═══════════════════════════════════════════════════════════════════════
function ExplorerSidebar() {
    const { fileMap, openFile, activeFileId, rootId, createFile, createDirectory, deleteNode, renameNode } = useFileSystem()
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [newFileName, setNewFileName] = useState("")
    const [creatingIn, setCreatingIn] = useState<string | null>(null)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)

    useEffect(() => {
        if (rootId) setExpanded(prev => new Set(prev).add(rootId))
    }, [rootId])

    const toggle = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleCreate = async (parentId: string) => {
        if (!newFileName.trim()) { setCreatingIn(null); return }
        const isDir = newFileName.endsWith("/")
        if (isDir) {
            await createDirectory(parentId, newFileName.slice(0, -1))
        } else {
            const newId = await createFile(parentId, newFileName, "")
            openFile(newId)
        }
        setNewFileName("")
        setCreatingIn(null)
        toast.success(`Created ${newFileName}`)
    }

    const handleRename = async (nodeId: string) => {
        if (!renameValue.trim() || !renameNode) {
            setRenamingId(null)
            return
        }
        try {
            await renameNode(nodeId, renameValue)
            toast.success(`Renamed to ${renameValue}`)
        } catch {
            toast.error("Rename failed")
        }
        setRenamingId(null)
    }

    const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault()
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
    }

    const copyPath = (nodeId: string) => {
        const node = fileMap[nodeId]
        if (node) {
            navigator.clipboard.writeText(node.name)
            toast.success("Path copied to clipboard")
        }
        setContextMenu(null)
    }

    const renderNode = (nodeId: string, depth: number): React.ReactNode => {
        const node = fileMap[nodeId]
        if (!node) return null
        const isDir = node.type === "directory"
        const isOpen = expanded.has(nodeId)
        const isActive = activeFileId === nodeId
        const isRenaming = renamingId === nodeId

        // Sort children: directories first, then alphabetical
        const sortedChildren = isDir && node.children
            ? [...node.children].sort((a, b) => {
                const aNode = fileMap[a]
                const bNode = fileMap[b]
                if (!aNode || !bNode) return 0
                if (aNode.type === "directory" && bNode.type !== "directory") return -1
                if (aNode.type !== "directory" && bNode.type === "directory") return 1
                return aNode.name.localeCompare(bNode.name)
            })
            : []

        return (
            <div key={nodeId}>
                <div
                    className={cn(
                        "flex items-center gap-1 px-1 py-[3px] cursor-pointer text-[13px] leading-[22px] group select-none",
                        isActive ? "bg-[#1f6feb26] text-white" : "text-[#c9d1d9] hover:bg-[#1f1f1f]"
                    )}
                    style={{ paddingLeft: `${depth * 16 + 4}px` }}
                    onClick={() => (isDir ? toggle(nodeId) : openFile(nodeId))}
                    onContextMenu={(e) => handleContextMenu(e, nodeId)}
                    onDoubleClick={() => {
                        if (!isDir) {
                            setRenamingId(nodeId)
                            setRenameValue(node.name)
                        }
                    }}
                >
                    {isDir ? (
                        <>
                            {isOpen ? <ChevronDown className="w-4 h-4 shrink-0 text-[#484f58]" /> : <ChevronRight className="w-4 h-4 shrink-0 text-[#484f58]" />}
                            {isOpen ? <FolderOpen className="w-4 h-4 shrink-0 text-[#54aeff]" /> : <FolderClosed className="w-4 h-4 shrink-0 text-[#768390]" />}
                        </>
                    ) : (
                        <>
                            <span className="w-4 shrink-0" />
                            {getFileIcon(node.name)}
                        </>
                    )}

                    {isRenaming ? (
                        <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleRename(nodeId)
                                if (e.key === "Escape") setRenamingId(null)
                            }}
                            onBlur={() => handleRename(nodeId)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 bg-[#0d1117] border border-[#1f6feb] rounded px-1.5 py-0 text-[13px] text-white outline-none ml-1"
                        />
                    ) : (
                        <span className="truncate ml-1 flex-1">{node.name}</span>
                    )}

                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        {isDir && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setCreatingIn(nodeId)
                                    setExpanded(prev => new Set(prev).add(nodeId))
                                }}
                                className="p-0.5 rounded hover:bg-[#30363d]"
                            >
                                <Plus className="w-3.5 h-3.5 text-[#8b949e]" />
                            </button>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setRenamingId(nodeId)
                                setRenameValue(node.name)
                            }}
                            className="p-0.5 rounded hover:bg-[#30363d]"
                        >
                            <Pencil className="w-3 h-3 text-[#8b949e]" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); deleteNode(nodeId); toast.success(`Deleted ${node.name}`) }}
                            className="p-0.5 rounded hover:bg-[#30363d]"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-[#8b949e]" />
                        </button>
                    </div>
                </div>

                {creatingIn === nodeId && (
                    <div className="flex items-center gap-1 px-1 py-[3px]" style={{ paddingLeft: `${(depth + 1) * 16 + 4}px` }}>
                        <File className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                        <input
                            autoFocus
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate(nodeId)
                                if (e.key === "Escape") { setCreatingIn(null); setNewFileName("") }
                            }}
                            onBlur={() => handleCreate(nodeId)}
                            className="flex-1 bg-[#0d1117] border border-[#1f6feb] rounded px-1.5 py-0.5 text-[13px] text-white outline-none"
                            placeholder="filename (end with / for folder)"
                        />
                    </div>
                )}

                {isDir && isOpen && sortedChildren.map(childId => renderNode(childId, depth + 1))}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117] text-[#c9d1d9]" onClick={() => setContextMenu(null)}>
            <div className="h-9 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">
                <span>Explorer</span>
                <div className="flex items-center gap-1">
                    <button onClick={() => rootId && setCreatingIn(rootId)} className="p-1 rounded hover:bg-[#30363d] transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded hover:bg-[#30363d] transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                {rootId ? (
                    fileMap[rootId]?.children?.map(childId => renderNode(childId, 0))
                ) : (
                    <div className="p-4 text-center text-[13px] text-[#484f58]">No project loaded</div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-[#161b22] border border-[#30363d] rounded-md shadow-xl shadow-black/40 py-1 min-w-[160px]"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {fileMap[contextMenu.nodeId]?.type === "directory" && (
                        <>
                            <ContextMenuItem label="New File" onClick={() => { setCreatingIn(contextMenu.nodeId); setContextMenu(null) }} />
                            <ContextMenuItem label="New Folder" onClick={() => { setNewFileName("/"); setCreatingIn(contextMenu.nodeId); setContextMenu(null) }} />
                            <div className="h-px bg-[#1b1f27] my-1" />
                        </>
                    )}
                    <ContextMenuItem label="Rename" shortcut="F2" onClick={() => { setRenamingId(contextMenu.nodeId); setRenameValue(fileMap[contextMenu.nodeId]?.name || ""); setContextMenu(null) }} />
                    <ContextMenuItem label="Copy Path" onClick={() => copyPath(contextMenu.nodeId)} />
                    <div className="h-px bg-[#1b1f27] my-1" />
                    <ContextMenuItem label="Delete" danger onClick={() => { deleteNode(contextMenu.nodeId); toast.success("Deleted"); setContextMenu(null) }} />
                </div>
            )}
        </div>
    )
}

function ContextMenuItem({ label, shortcut, danger, onClick }: { label: string; shortcut?: string; danger?: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 text-[12px] transition-colors text-left",
                danger ? "text-red-400 hover:bg-red-500/10" : "text-[#c9d1d9] hover:bg-[#1f1f1f]"
            )}
        >
            <span>{label}</span>
            {shortcut && <kbd className="text-[10px] text-[#484f58] font-mono ml-4">{shortcut}</kbd>}
        </button>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// SEARCH SIDEBAR with find & replace
// ═══════════════════════════════════════════════════════════════════════
function SearchSidebar() {
    const [query, setQuery] = useState("")
    const [replace, setReplace] = useState("")
    const [showReplace, setShowReplace] = useState(false)
    const { fileMap, openFile, readFile, writeFile } = useFileSystem()
    const [results, setResults] = useState<{ fileId: string; line: number; text: string }[]>([])

    useEffect(() => {
        if (!query.trim()) { setResults([]); return }
        const matches: typeof results = []
        Object.entries(fileMap).forEach(([id, node]) => {
            if (node.type !== "file" || !node.content) return
            node.content.split("\n").forEach((line, idx) => {
                if (line.toLowerCase().includes(query.toLowerCase())) {
                    matches.push({ fileId: id, line: idx + 1, text: line.trim() })
                }
            })
        })
        setResults(matches.slice(0, 100))
    }, [query, fileMap])

    const handleReplaceAll = () => {
        if (!query.trim() || !replace) return
        let count = 0
        Object.entries(fileMap).forEach(([id, node]) => {
            if (node.type !== "file" || !node.content) return
            if (node.content.includes(query)) {
                const newContent = node.content.split(query).join(replace)
                writeFile(id, newContent)
                count++
            }
        })
        toast.success(`Replaced in ${count} file(s)`)
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-9 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">
                <span>Search</span>
                <button onClick={() => setShowReplace(!showReplace)} className="p-1 rounded hover:bg-[#30363d] transition-colors">
                    <ChevronRight className={cn("w-3.5 h-3.5 transition-transform", showReplace && "rotate-90")} />
                </button>
            </div>
            <div className="px-3 pb-2 space-y-1.5">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                />
                {showReplace && (
                    <div className="flex items-center gap-1">
                        <input
                            value={replace}
                            onChange={(e) => setReplace(e.target.value)}
                            placeholder="Replace..."
                            className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                        />
                        <button
                            onClick={handleReplaceAll}
                            disabled={!query.trim() || !replace}
                            className="px-2 py-1.5 rounded-md text-[11px] bg-[#238636] hover:bg-[#2ea043] text-white transition-colors disabled:opacity-40 shrink-0"
                        >
                            All
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto px-2">
                {results.length === 0 && query && <p className="text-[13px] text-[#484f58] px-2 py-4 text-center">No results</p>}
                {query && results.length > 0 && <p className="text-[11px] text-[#484f58] px-2 py-1">{results.length} results</p>}
                {results.map((r, i) => (
                    <button key={`${r.fileId}-${r.line}-${i}`} className="w-full text-left px-2 py-1.5 text-[13px] hover:bg-[#1f1f1f] rounded transition-colors" onClick={() => openFile(r.fileId)}>
                        <div className="text-[#c9d1d9] truncate">{highlightMatch(r.text, query)}</div>
                        <div className="text-[11px] text-[#484f58]">{fileMap[r.fileId]?.name}:{r.line}</div>
                    </button>
                ))}
            </div>
        </div>
    )
}

function highlightMatch(text: string, query: string) {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
        <>
            {text.slice(0, idx)}
            <span className="bg-[#e2b714]/30 text-[#e2b714] rounded px-0.5">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// GIT SIDEBAR — with real diff viewer
// ═══════════════════════════════════════════════════════════════════════
function GitSidebar({ workspaceId }: { workspaceId: string }) {
    const { fileMap } = useFileSystem()
    const [commitMsg, setCommitMsg] = useState("")
    const [showDiff, setShowDiff] = useState<string | null>(null)
    const [changedFiles, setChangedFiles] = useState<{ name: string; status: string }[]>([])
    const [recentCommits, setRecentCommits] = useState<{ hash: string; message: string; date: string }[]>([])
    const [currentBranch, setCurrentBranch] = useState("main")
    const [isCommitting, setIsCommitting] = useState(false)
    const [gitError, setGitError] = useState<string | null>(null)

    useEffect(() => {
        if (!workspaceId) return
        const fetchGitStatus = async () => {
            try {
                const statusRes = await fetch(`/api/fs?operation=gitStatus&path=.&workspaceId=${encodeURIComponent(workspaceId)}`)
                if (statusRes.ok) {
                    const data = await statusRes.json()
                    setCurrentBranch(data.branch || "main")
                    if (data.status) {
                        const files = data.status.split('\n').filter((l: string) => l.trim()).map((l: string) => ({
                            name: l.substring(3).trim(),
                            status: l.substring(0, 2).trim() || "M"
                        }))
                        setChangedFiles(files)
                    } else { setChangedFiles([]) }
                    setGitError(null)
                }
            } catch { setGitError("Not a git repository") }
        }
        const fetchGitLog = async () => {
            try {
                const logRes = await fetch(`/api/fs?operation=gitLog&path=.&workspaceId=${encodeURIComponent(workspaceId)}&limit=5`)
                if (logRes.ok) {
                    const data = await logRes.json()
                    if (data.commits) {
                        setRecentCommits(data.commits.map((c: any) => ({
                            hash: c.hash?.substring(0, 7) || '',
                            message: c.message || '',
                            date: c.date || ''
                        })))
                    }
                }
            } catch {}
        }
        fetchGitStatus()
        fetchGitLog()
        const interval = setInterval(() => { fetchGitStatus(); fetchGitLog() }, 10000)
        return () => clearInterval(interval)
    }, [workspaceId])

    const handleCommit = async () => {
        if (!commitMsg.trim() || !workspaceId) return
        setIsCommitting(true)
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitAdd', path: '.', files: ['.'], workspaceId }) })
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitCommit', path: '.', message: commitMsg, workspaceId }) })
            setCommitMsg("")
            toast.success("Changes committed successfully")
            // Refresh
            const statusRes = await fetch(`/api/fs?operation=gitStatus&path=.&workspaceId=${encodeURIComponent(workspaceId)}`)
            if (statusRes.ok) {
                const data = await statusRes.json()
                setChangedFiles(data.status ? data.status.split('\n').filter((l: string) => l.trim()).map((l: string) => ({
                    name: l.substring(3).trim(), status: l.substring(0, 2).trim() || "M"
                })) : [])
            }
        } catch (e) {
            toast.error("Commit failed")
        } finally { setIsCommitting(false) }
    }

    const handleStageAll = async () => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitAdd', path: '.', files: ['.'], workspaceId }) })
            toast.success("All changes staged")
        } catch { toast.error("Stage failed") }
    }

    const handleInitGit = async () => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitInit', path: '.', workspaceId }) })
            setGitError(null)
            toast.success("Git repository initialized")
        } catch { toast.error("Git init failed") }
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-9 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">
                <span>Source Control</span>
                <span className="text-[10px] font-normal normal-case text-[#58a6ff]">{currentBranch}</span>
            </div>
            <div className="px-3 pb-3">
                <input
                    value={commitMsg}
                    onChange={e => setCommitMsg(e.target.value)}
                    onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleCommit() }}
                    placeholder="Message (Ctrl+Enter to commit)"
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                />
                <button
                    onClick={handleCommit}
                    className="w-full mt-2 py-1.5 rounded-md text-[12px] font-medium bg-[#238636] hover:bg-[#2ea043] text-white transition-colors disabled:opacity-40"
                    disabled={!commitMsg.trim() || isCommitting}
                >
                    {isCommitting ? "Committing..." : "Commit"}
                </button>
            </div>

            <div className="px-3 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">Changes ({changedFiles.length})</div>
                    <button onClick={handleStageAll} className="text-[11px] text-[#58a6ff] hover:underline">Stage All</button>
                </div>

                {changedFiles.length === 0 ? (
                    <div className="text-[13px] text-[#484f58] text-center py-8">
                        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No changes detected</p><p className="text-[11px] mt-1">Working tree clean</p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {changedFiles.map(f => (
                            <div key={f.name}>
                                <button
                                    onClick={() => setShowDiff(showDiff === f.name ? null : f.name)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#1f1f1f] group transition-colors"
                                >
                                    <span className={`text-[11px] font-bold w-4 shrink-0 ${f.status === "A" || f.status === "?" ? "text-emerald-400" : f.status === "D" ? "text-red-400" : "text-amber-400"}`}>
                                        {f.status === "?" ? "U" : f.status}
                                    </span>
                                    {getFileIcon(f.name)}
                                    <span className="text-[13px] text-[#c9d1d9] truncate flex-1 text-left">{f.name}</span>
                                </button>
                                {showDiff === f.name && (
                                    <div className="mx-1 mb-1 h-[200px] rounded overflow-hidden border border-[#30363d]">
                                        <GitDiffViewer fileName={f.name} workspaceId={workspaceId} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-[#1b1f27]">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] mb-2">Recent Commits</div>
                    {gitError ? (
                        <div className="text-center py-4">
                            <p className="text-[13px] text-[#484f58] mb-2">No git repository</p>
                            <button onClick={handleInitGit} className="px-3 py-1.5 rounded-md text-[12px] bg-[#238636] hover:bg-[#2ea043] text-white transition-colors">Initialize Repository</button>
                        </div>
                    ) : recentCommits.length > 0 ? recentCommits.map((c, i) => (
                        <div key={c.hash || i} className="flex items-start gap-2 px-1 py-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#1f6feb] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[9px] font-bold text-white">{c.hash?.charAt(0)?.toUpperCase() || "?"}</span>
                            </div>
                            <div className="min-w-0">
                                <div className="text-[12px] text-[#c9d1d9] truncate">{c.message}</div>
                                <div className="text-[10px] text-[#484f58]">{c.hash} {'\u00B7'} {currentBranch}</div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-[13px] text-[#484f58] text-center py-4">No commits yet</div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// PANEL TABS
// ═══════════════════════════════════════════════════════════════════════
function PanelTabs({ activePanel, onPanelChange, onClose, diagnosticCounts }: {
    activePanel: PanelView
    onPanelChange: (v: PanelView) => void
    onClose: () => void
    diagnosticCounts: { errors: number; warnings: number }
}) {
    const tabs: { view: PanelView; label: string; badge?: number }[] = [
        { view: "problems", label: "PROBLEMS", badge: diagnosticCounts.errors + diagnosticCounts.warnings },
        { view: "output", label: "OUTPUT" },
        { view: "debug", label: "DEBUG CONSOLE" },
        { view: "terminal", label: "TERMINAL" },
        { view: "preview", label: "PREVIEW" },
    ]
    return (
        <div className="flex items-center justify-between h-9 border-t border-[#1b1f27] bg-[#0d1117] px-2 select-none shrink-0">
            <div className="flex items-center">
                {tabs.map((tab) => (
                    <button key={tab.view} onClick={() => onPanelChange(tab.view)} className={cn("px-3 h-9 text-[11px] font-medium uppercase tracking-wider border-t-2 transition-colors flex items-center gap-1.5", activePanel === tab.view ? "border-[#1f6feb] text-white" : "border-transparent text-[#484f58] hover:text-[#8b949e]")}>
                        {tab.label}
                        {tab.badge !== undefined && tab.badge > 0 && (
                            <span className="px-1.5 py-0 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold">{tab.badge}</span>
                        )}
                    </button>
                ))}
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-[#30363d] text-[#484f58] hover:text-[#8b949e] transition-colors"><X className="w-4 h-4" /></button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// STATUS BAR — enhanced with real data
// ═══════════════════════════════════════════════════════════════════════
function IDEStatusBar({
    activeFile,
    onTogglePanel,
    cursorLine,
    cursorCol,
    diagnosticCounts,
    gitBranch,
    connectedUsers,
    onGoToLine,
    isZenMode,
    onToggleZenMode,
    notifications,
    onDismissNotification,
    onDismissAllNotifications,
    onMarkNotificationRead,
    onMarkAllNotificationsRead,
}: {
    activeFile: string | null
    panelVisible: boolean
    onTogglePanel: () => void
    cursorLine: number
    cursorCol: number
    diagnosticCounts: { errors: number; warnings: number }
    gitBranch: string
    connectedUsers: number
    onGoToLine: () => void
    isZenMode: boolean
    onToggleZenMode: () => void
    notifications: Notification[]
    onDismissNotification: (id: string) => void
    onDismissAllNotifications: () => void
    onMarkNotificationRead: (id: string) => void
    onMarkAllNotificationsRead: () => void
}) {
    const lang = activeFile ? getLanguage(activeFile) : "plaintext"
    return (
        <div className="h-6 bg-[#1f6feb] flex items-center justify-between px-3 text-[11px] text-white/80 select-none shrink-0">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    <GitBranch className="w-3 h-3" /><span>{gitBranch}</span>
                </div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    {diagnosticCounts.errors > 0 ? (
                        <XCircle className="w-3 h-3 text-red-300" />
                    ) : diagnosticCounts.warnings > 0 ? (
                        <AlertTriangle className="w-3 h-3 text-amber-300" />
                    ) : (
                        <CheckCircle className="w-3 h-3" />
                    )}
                    <span>{diagnosticCounts.errors} errors, {diagnosticCounts.warnings} warnings</span>
                </div>
                {connectedUsers > 1 && (
                    <div className="flex items-center gap-1.5">
                        <Wifi className="w-3 h-3 text-emerald-300" />
                        <span>{connectedUsers} connected</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3">
                <button onClick={onGoToLine} className="cursor-pointer hover:text-white transition-colors">
                    Ln {cursorLine}, Col {cursorCol}
                </button>
                <span className="cursor-pointer hover:text-white transition-colors">Spaces: 2</span>
                <span className="cursor-pointer hover:text-white transition-colors">UTF-8</span>
                <span className="cursor-pointer hover:text-white transition-colors">LF</span>
                <span className="cursor-pointer hover:text-white transition-colors capitalize">{lang}</span>
                <button
                    onClick={onToggleZenMode}
                    className={cn("cursor-pointer hover:text-white transition-colors", isZenMode && "text-white")}
                    title="Toggle Zen Mode (Ctrl+Shift+Z)"
                >
                    <Eye className="w-3 h-3" />
                </button>
                <NotificationCenter
                    notifications={notifications}
                    onDismiss={onDismissNotification}
                    onDismissAll={onDismissAllNotifications}
                    onMarkRead={onMarkNotificationRead}
                    onMarkAllRead={onMarkAllNotificationsRead}
                />
                <button onClick={onTogglePanel} className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    <SquareTerminal className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// WELCOME TAB
// ═══════════════════════════════════════════════════════════════════════
function WelcomeTab({ onProjectSelect }: { onProjectSelect: (id: string) => void }) {
    return (
        <div className="h-full overflow-y-auto bg-[#0d1117]">
            <div className="max-w-3xl mx-auto py-16 px-8">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Code className="w-8 h-8 text-black" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white text-balance">Code Chamber</h1>
                        <p className="text-[#8b949e] text-sm mt-1">Your AI-powered development workspace</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-12">
                    <button onClick={() => onProjectSelect("nextjs-app")} className="group flex items-center gap-4 p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb]/50 transition-all text-left">
                        <Plus className="w-8 h-8 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                        <div><div className="text-white font-medium">New Project</div><div className="text-[13px] text-[#8b949e]">Start from a template</div></div>
                    </button>
                    <button className="group flex items-center gap-4 p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb]/50 transition-all text-left">
                        <GitBranch className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <div><div className="text-white font-medium">Clone Repository</div><div className="text-[13px] text-[#8b949e]">Clone from Git URL</div></div>
                    </button>
                </div>

                <div className="mb-12">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-4">Quick Start Templates</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { name: "Next.js App", desc: "React + TypeScript", id: "nextjs-app" },
                            { name: "Express API", desc: "Node.js REST API", id: "express-api" },
                            { name: "Python ML", desc: "Machine learning", id: "python-ml" },
                            { name: "Solidity DApp", desc: "Web3 + Hardhat", id: "solidity-dapp" },
                            { name: "React Native", desc: "Mobile app", id: "react-native" },
                            { name: "Rust CLI", desc: "Command line tool", id: "rust-cli" },
                        ].map((t) => (
                            <button key={t.id} onClick={() => onProjectSelect(t.id)} className="flex items-center gap-3 p-4 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb]/50 transition-all text-left group">
                                <Code className="w-6 h-6 text-emerald-400 shrink-0" />
                                <div>
                                    <div className="text-[13px] font-medium text-white group-hover:text-[#58a6ff] transition-colors">{t.name}</div>
                                    <div className="text-[11px] text-[#484f58]">{t.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-4">Keyboard Shortcuts</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                        {[
                            ["Ctrl+P", "Quick Open File"],
                            ["Ctrl+Shift+P", "Command Palette"],
                            ["Ctrl+K", "AI Inline Edit"],
                            ["Ctrl+S", "Save File"],
                            ["Ctrl+Shift+F", "Search in Files"],
                            ["Ctrl+`", "Toggle Terminal"],
                            ["Ctrl+B", "Toggle Sidebar"],
                            ["Ctrl+,", "Settings"],
                        ].map(([key, label]) => (
                            <div key={key} className="flex items-center justify-between py-1.5">
                                <span className="text-[#c9d1d9]">{label}</span>
                                <kbd className="px-2 py-0.5 rounded bg-[#161b22] border border-[#30363d] text-[11px] text-[#8b949e] font-mono">{key}</kbd>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN CODE CHAMBER — industry-grade cloud IDE workbench
// ═══════════════════════════════════════════════════════════════════════
export function CodeChamber({ id }: CodeChamberProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const projectId = useMemo(() => {
        if (id && id.trim().length > 0) return id
        const queryProject = searchParams?.get('projectId') || searchParams?.get('project')
        if (queryProject) return queryProject
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('citadel-active-project')
            if (stored) return stored
        }
        const parts = pathname?.split("/").filter(Boolean) ?? []
        return parts[parts.length - 1] || "default"
    }, [id, pathname, searchParams])

    useEffect(() => {
        if (typeof window !== 'undefined' && projectId) {
            localStorage.setItem('citadel-active-project', projectId)
        }
    }, [projectId])

    const { rootId, activeFileId, openFiles, fileMap, loadProject, openFile, closeFile, setActiveFile, readFile, writeFile, saveProject, workspaceId } = useFileSystem()

    const [sidebarView, setSidebarView] = useState<SidebarView>("explorer")
    const [sidebarVisible, setSidebarVisible] = useState(true)
    const [panelView, setPanelView] = useState<PanelView>("terminal")
    const [panelVisible, setPanelVisible] = useState(true)
    const [cursorLine, setCursorLine] = useState(1)
    const [cursorCol, setCursorCol] = useState(1)

    // Command palette / quick open
    const [showCommandPalette, setShowCommandPalette] = useState(false)
    const [showQuickOpen, setShowQuickOpen] = useState(false)

    // Inline edit
    const [showInlineEdit, setShowInlineEdit] = useState(false)
    const [inlineEditCode, setInlineEditCode] = useState("")
    const [inlineEditPos, setInlineEditPos] = useState({ top: 0, left: 0 })

    // Diagnostics
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
    const [isLinting, setIsLinting] = useState(false)

    // Output log
    const [outputLines, setOutputLines] = useState<OutputLine[]>([
        { id: "init", timestamp: Date.now(), text: "Code Chamber initialized. Ready for output.", type: "system", source: "System" }
    ])

    // Editor settings
    const [editorSettings, setEditorSettings] = useState<EditorSettings>(DEFAULT_SETTINGS)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setEditorSettings(loadSettings())
        }
    }, [])

    // Git branch tracking
    const [gitBranch, setGitBranch] = useState("main")

    // Connected users
    const [connectedUsers, setConnectedUsers] = useState(1)

    // Notifications
    const [notifications, setNotifications] = useState<Notification[]>([])

    // Zen mode
    const [isZenMode, setIsZenMode] = useState(false)

    // Parsed symbols for breadcrumbs
    const [symbols, setSymbols] = useState<ParsedSymbol[]>([])

    // Decoration IDs for cleanup
    const decorationIdsRef = useRef<string[]>([])

    // Tab order tracking
    const [tabOrder, setTabOrder] = useState<string[]>([])

    // Modified files tracking
    const [modifiedFiles, setModifiedFiles] = useState<Set<string>>(new Set())

    // Yjs Collaboration State
    const [yDoc, setYDoc] = useState<Y.Doc | null>(null)
    const [provider, setProvider] = useState<WebrtcProvider | null>(null)
    const [binding, setBinding] = useState<MonacoBinding | null>(null)
    const [editorInstance, setEditorInstance] = useState<any>(null)
    const monacoRef = useRef<any>(null)

    // Initialize Yjs Doc and Provider per file
    useEffect(() => {
        if (!activeFileId || !projectId) return
        const doc = new Y.Doc()
        const roomName = `azora-buildspaces-${projectId}-${activeFileId.replace(/[^a-zA-Z0-9-]/g, '-')}`
        const webrtcProvider = new WebrtcProvider(roomName, doc, {
            signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com', 'wss://y-webrtc-signaling-us.herokuapp.com']
        })
        setYDoc(doc)
        setProvider(webrtcProvider)

        // Track connected users
        const updateUsers = () => {
            const users = webrtcProvider.awareness.getStates().size
            setConnectedUsers(Math.max(1, users))
        }
        webrtcProvider.awareness.on('change', updateUsers)
        updateUsers()

        return () => {
            webrtcProvider.awareness.off('change', updateUsers)
            webrtcProvider.destroy()
            doc.destroy()
            setYDoc(null)
            setProvider(null)
            setBinding(null)
        }
    }, [activeFileId, projectId])

    // Bind Monaco to Yjs
    useEffect(() => {
        if (!editorInstance || !yDoc || !provider || !activeFileId) return
        const type = yDoc.getText(activeFileId)
        const model = editorInstance.getModel()
        if (!model) return
        const localContent = readFile(activeFileId)
        if (type.length === 0 && localContent) { type.insert(0, localContent) }
        const monacoBinding = new MonacoBinding(type, model, new Set([editorInstance]), provider.awareness)
        setBinding(monacoBinding)
        return () => { monacoBinding.destroy(); setBinding(null) }
    }, [editorInstance, yDoc, provider, activeFileId, readFile])

    // Fetch git branch
    useEffect(() => {
        if (!workspaceId) return
        const fetchBranch = async () => {
            try {
                const res = await fetch(`/api/fs?operation=gitStatus&path=.&workspaceId=${encodeURIComponent(workspaceId)}`)
                if (res.ok) { const data = await res.json(); setGitBranch(data.branch || "main") }
            } catch {}
        }
        fetchBranch()
        const interval = setInterval(fetchBranch, 15000)
        return () => clearInterval(interval)
    }, [workspaceId])

    useEffect(() => { if (projectId) loadProject(projectId) }, [projectId, loadProject])

    // Add output line helper
    const addOutput = useCallback((text: string, type: OutputLine["type"] = "info", source?: string) => {
        setOutputLines(prev => [...prev, { id: `out-${Date.now()}-${Math.random()}`, timestamp: Date.now(), text, type, source }])
    }, [])

    // Notification helpers
    const addNotification = useCallback((type: Notification["type"], title: string, message?: string, source?: string) => {
        setNotifications(prev => [{
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type, title, message, timestamp: Date.now(), read: false, source,
        }, ...prev].slice(0, 50)) // Keep max 50
    }, [])
    const dismissNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id))
    }, [])
    const dismissAllNotifications = useCallback(() => setNotifications([]), [])
    const markNotificationRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }, [])
    const markAllNotificationsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }, [])

    // ─── Lint file via API ───────────────────────────────────────────
    const lintFile = useCallback(async (fileId: string) => {
        const node = fileMap[fileId]
        if (!node || node.type !== "file") return
        setIsLinting(true)
        try {
            const content = readFile(fileId) || ""
            const res = await fetch("/api/code-chamber/lint", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: content, language: getLanguage(node.name), filename: node.name }),
            })
            if (res.ok) {
                const data = await res.json()
                if (data.diagnostics) {
                    const newDiags: Diagnostic[] = data.diagnostics.map((d: any, i: number) => ({
                        severity: d.severity || "warning",
                        message: d.message,
                        line: d.line || 1,
                        column: d.column,
                        rule: d.rule,
                        file: node.name,
                        fileId,
                    }))
                    // Replace diagnostics for this file, keep others
                    setDiagnostics(prev => [
                        ...prev.filter(d => d.fileId !== fileId),
                        ...newDiags,
                    ])
                    const errors = newDiags.filter(d => d.severity === "error").length
                    const warnings = newDiags.filter(d => d.severity === "warning").length
                    if (errors + warnings > 0) {
                        toast.warning(`Found ${errors} error(s), ${warnings} warning(s)`)
                        addNotification(errors > 0 ? "error" : "warning", `Lint: ${errors} error(s), ${warnings} warning(s)`, `File: ${node.name}`, "Linter")
                    } else {
                        toast.success("No issues found")
                        addNotification("success", "Lint passed", `No issues in ${node.name}`, "Linter")
                    }
                }
            }
        } catch {
            toast.error("Lint failed - check your connection")
        } finally { setIsLinting(false) }
    }, [fileMap, readFile, addNotification])

    // Parse symbols when active file changes
    useEffect(() => {
        if (!activeFileId) { setSymbols([]); return }
        const content = readFile(activeFileId) || ""
        const lang = getLanguage(fileMap[activeFileId]?.name || "")
        const parsed = parseSymbols(content, lang)
        setSymbols(parsed)
    }, [activeFileId, fileMap, readFile])

    // Sync tab order with open files
    useEffect(() => {
        setTabOrder(prev => {
            const existing = prev.filter(id => openFiles.includes(id))
            const newIds = openFiles.filter(id => !existing.includes(id))
            return [...existing, ...newIds]
        })
    }, [openFiles])

    // Apply diagnostic decorations to editor
    useEffect(() => {
        if (!editorInstance || !monacoRef.current || !activeFileId) return
        // Clean up old decorations
        if (decorationIdsRef.current.length > 0) {
            editorInstance.deltaDecorations(decorationIdsRef.current, [])
        }
        decorationIdsRef.current = applyDiagnosticDecorations(editorInstance, monacoRef.current, diagnostics, activeFileId)
    }, [diagnostics, editorInstance, activeFileId])

    // Register diagnostic styles once
    useEffect(() => { registerDiagnosticStyles() }, [])

    // ─── Keyboard Shortcuts ──────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey

            // Command Palette: Ctrl+Shift+P
            if (isMod && e.shiftKey && e.key === "P") { e.preventDefault(); setShowCommandPalette(true); return }
            // Quick Open: Ctrl+P
            if (isMod && !e.shiftKey && e.key === "p") { e.preventDefault(); setShowQuickOpen(true); return }
            // Toggle Terminal: Ctrl+`
            if (isMod && e.key === "`") { e.preventDefault(); setPanelVisible(p => !p); return }
            // Toggle Sidebar: Ctrl+B
            if (isMod && e.key === "b") { e.preventDefault(); setSidebarVisible(s => !s); return }
            // Save: Ctrl+S
            if (isMod && !e.shiftKey && e.key === "s") {
                e.preventDefault()
                if (activeFileId) {
                    const c = readFile(activeFileId)
                    if (c !== undefined) { writeFile(activeFileId, c); toast.success("File saved") }
                }
                return
            }
            // Save All: Ctrl+Shift+S
            if (isMod && e.shiftKey && e.key === "S") { e.preventDefault(); saveProject(); toast.success("All files saved"); return }
            // Settings: Ctrl+,
            if (isMod && e.key === ",") { e.preventDefault(); setSidebarView("settings"); setSidebarVisible(true); return }
            // Search: Ctrl+Shift+F
            if (isMod && e.shiftKey && e.key === "F") { e.preventDefault(); setSidebarView("search"); setSidebarVisible(true); return }
            // Explorer: Ctrl+Shift+E
            if (isMod && e.shiftKey && e.key === "E") { e.preventDefault(); setSidebarView("explorer"); setSidebarVisible(true); return }
            // Git: Ctrl+Shift+G
            if (isMod && e.shiftKey && e.key === "G") { e.preventDefault(); setSidebarView("git"); setSidebarVisible(true); return }
            // AI: Ctrl+Shift+I
            if (isMod && e.shiftKey && e.key === "I") { e.preventDefault(); setSidebarView("ai"); setSidebarVisible(true); return }
            // AI Inline Edit: Ctrl+K
            if (isMod && e.key === "k") {
                e.preventDefault()
                if (editorInstance) {
                    const sel = editorInstance.getSelection()
                    const selectedText = editorInstance.getModel()?.getValueInRange(sel) || ""
                    const coords = editorInstance.getScrolledVisiblePosition(sel?.getStartPosition())
                    const editorDom = editorInstance.getDomNode()
                    const rect = editorDom?.getBoundingClientRect() || { top: 200, left: 200 }
                    setInlineEditCode(selectedText)
                    setInlineEditPos({ top: rect.top + (coords?.top || 0) + 20, left: rect.left + (coords?.left || 0) })
                    setShowInlineEdit(true)
                }
                return
            }
            // Zen Mode: Ctrl+Shift+Z (toggle)
            if (isMod && e.shiftKey && e.key === "Z") { e.preventDefault(); setIsZenMode(z => !z); return }
            // Escape to exit Zen Mode
            if (e.key === "Escape" && isZenMode) { e.preventDefault(); setIsZenMode(false); return }
            // Close tab: Ctrl+W
            if (isMod && e.key === "w") {
                e.preventDefault()
                if (activeFileId) closeFile(activeFileId)
                return
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [activeFileId, readFile, writeFile, saveProject, editorInstance, isZenMode, closeFile])

    const activeFileName = activeFileId ? fileMap[activeFileId]?.name || "" : ""
    const activeFileContent = activeFileId ? readFile(activeFileId) || "" : ""

    const diagnosticCounts = useMemo(() => ({
        errors: diagnostics.filter(d => d.severity === "error").length,
        warnings: diagnostics.filter(d => d.severity === "warning").length,
    }), [diagnostics])

    // ─── Editor Mount ────────────────────────────────────────────────
    const handleEditorMount = useCallback((editor: any, monaco: any) => {
        setEditorInstance(editor)
        monacoRef.current = monaco

        editor.onDidChangeCursorPosition((e: any) => {
            setCursorLine(e.position.lineNumber)
            setCursorCol(e.position.column)
        })

        // Register inline AI completion provider
        const disposable = monaco.languages.registerInlineCompletionsProvider("*", {
            provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
                const textBeforeCursor = model.getValueInRange({
                    startLineNumber: Math.max(1, position.lineNumber - 20),
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                })
                if (textBeforeCursor.trim().length < 10) return { items: [] }
                try {
                    const resp = await fetch("/api/code-chamber/complete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            prefix: textBeforeCursor,
                            language: model.getLanguageId(),
                            filename: activeFileName,
                        }),
                        signal: token.onCancellationRequested ? AbortSignal.timeout(5000) : undefined,
                    })
                    if (!resp.ok) return { items: [] }
                    const data = await resp.json()
                    if (!data.completion) return { items: [] }
                    return {
                        items: [{
                            insertText: data.completion,
                            range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column },
                        }],
                    }
                } catch { return { items: [] } }
            },
            freeInlineCompletions: () => {},
        })

        // AI Explain Selection action
        editor.addAction({
            id: "elara-explain",
            label: "Elara: Explain Selection",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI],
            contextMenuGroupId: "1_modification",
            contextMenuOrder: 1.5,
            run: async (ed: any) => {
                const selection = ed.getSelection()
                const selectedText = ed.getModel()?.getValueInRange(selection)
                if (!selectedText) { toast.info("Select some code first"); return }
                setSidebarView("ai")
                setSidebarVisible(true)
            },
        })

        // AI Inline Edit action
        editor.addAction({
            id: "elara-inline-edit",
            label: "Elara: Inline Edit (Ctrl+K)",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK],
            contextMenuGroupId: "1_modification",
            contextMenuOrder: 1.6,
            run: async (ed: any) => {
                const sel = ed.getSelection()
                const selectedText = ed.getModel()?.getValueInRange(sel) || ""
                const coords = ed.getScrolledVisiblePosition(sel?.getStartPosition())
                const editorDom = ed.getDomNode()
                const rect = editorDom?.getBoundingClientRect() || { top: 200, left: 200 }
                setInlineEditCode(selectedText)
                setInlineEditPos({ top: rect.top + (coords?.top || 0) + 20, left: rect.left + (coords?.left || 0) })
                setShowInlineEdit(true)
            },
        })

        // Lint on save
        editor.addAction({
            id: "elara-lint",
            label: "Elara: Lint File",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM],
            run: () => { if (activeFileId) lintFile(activeFileId) },
        })

        return () => disposable.dispose()
    }, [activeFileName, activeFileId, lintFile])

    const handleEditorChange = useCallback((value: string | undefined) => {
        if (activeFileId && value !== undefined) {
            writeFile(activeFileId, value)
            setModifiedFiles(prev => new Set(prev).add(activeFileId))
        }
    }, [activeFileId, writeFile])

    const handleSidebarViewChange = useCallback((v: SidebarView) => {
        if (sidebarView === v && sidebarVisible) setSidebarVisible(false)
        else { setSidebarView(v); if (!sidebarVisible) setSidebarVisible(true) }
    }, [sidebarView, sidebarVisible])

    // ─── Command Palette action handler ──────────────────────────────
    const handleCommandAction = useCallback((action: string) => {
        switch (action) {
            case "quickOpen": setShowQuickOpen(true); break
            case "save": if (activeFileId) { writeFile(activeFileId, readFile(activeFileId) || ""); toast.success("File saved") }; break
            case "saveAll": saveProject(); toast.success("All files saved"); break
            case "toggleSidebar": setSidebarVisible(s => !s); break
            case "toggleTerminal": setPanelVisible(p => !p); break
            case "showExplorer": setSidebarView("explorer"); setSidebarVisible(true); break
            case "showSearch": setSidebarView("search"); setSidebarVisible(true); break
            case "showGit": setSidebarView("git"); setSidebarVisible(true); break
            case "showExtensions": setSidebarView("extensions"); setSidebarVisible(true); break
            case "showAI": setSidebarView("ai"); setSidebarVisible(true); break
            case "showSettings": setSidebarView("settings"); setSidebarVisible(true); break
            case "showProblems": setPanelVisible(true); setPanelView("problems"); break
            case "showOutput": setPanelVisible(true); setPanelView("output"); break
            case "showPreview": setPanelVisible(true); setPanelView("preview"); break
            case "run": setPanelVisible(true); setPanelView("terminal"); break
            case "aiInlineEdit":
                if (editorInstance) {
                    const sel = editorInstance.getSelection()
                    const selectedText = editorInstance.getModel()?.getValueInRange(sel) || ""
                    const coords = editorInstance.getScrolledVisiblePosition(sel?.getStartPosition())
                    const editorDom = editorInstance.getDomNode()
                    const rect = editorDom?.getBoundingClientRect() || { top: 200, left: 200 }
                    setInlineEditCode(selectedText)
                    setInlineEditPos({ top: rect.top + (coords?.top || 0) + 20, left: rect.left + (coords?.left || 0) })
                    setShowInlineEdit(true)
                }
                break
            case "aiLint": if (activeFileId) lintFile(activeFileId); break
            case "aiExplain": setSidebarView("ai"); setSidebarVisible(true); break
            case "aiDocgen": setSidebarView("ai"); setSidebarVisible(true); break
            case "deploy":
                (async () => {
                    if (!projectId) return
                    addOutput("Starting deployment...", "info", "Deploy")
                    try {
                        const res = await fetch("/api/deploy", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ projectId, environment: "development", buildType: "preview" })
                        })
                        const data = await res.json()
                        if (data.error) { toast.error(`Deploy failed: ${data.error}`); addOutput(`Deploy failed: ${data.error}`, "error", "Deploy") }
                        else { toast.success(`Deploy initiated: ${data.status || 'success'}`); addOutput(`Deploy success: ${data.status || 'completed'}`, "success", "Deploy") }
                    } catch (e: any) { toast.error(`Deploy error: ${e.message}`); addOutput(`Deploy error: ${e.message}`, "error", "Deploy") }
                })()
                break
            case "formatDocument":
                if (editorInstance) {
                    editorInstance.getAction("editor.action.formatDocument")?.run()
                    toast.success("Document formatted")
                }
                break
            case "findReplace":
                if (editorInstance) { editorInstance.getAction("editor.action.startFindReplaceAction")?.run() }
                break
            case "toggleWordWrap":
                setEditorSettings(prev => {
                    const next = { ...prev, wordWrap: prev.wordWrap === "on" ? "off" as const : "on" as const }
                    try { localStorage.setItem("code-chamber-settings", JSON.stringify(next)) } catch {}
                    return next
                })
                break
            case "undo": editorInstance?.trigger("keyboard", "undo", null); break
            case "redo": editorInstance?.trigger("keyboard", "redo", null); break
            case "newFile": setSidebarView("explorer"); setSidebarVisible(true); break
            case "zenMode": setIsZenMode(z => !z); break
            case "closeTab": if (activeFileId) closeFile(activeFileId); break
            case "closeAllTabs": openFiles.forEach(f => closeFile(f)); break
            case "showDebug": setPanelVisible(true); setPanelView("debug"); break
            case "goToLine": editorInstance?.getAction("editor.action.gotoLine")?.run(); break
            case "goToSymbol": editorInstance?.getAction("editor.action.quickOutline")?.run(); break
        }
    }, [activeFileId, readFile, writeFile, saveProject, editorInstance, projectId, lintFile, addOutput])

    const handleInlineApply = useCallback((newCode: string) => {
        if (editorInstance && activeFileId) {
            const selection = editorInstance.getSelection()
            if (selection && !selection.isEmpty()) {
                editorInstance.executeEdits("ai-inline-edit", [{
                    range: selection,
                    text: newCode,
                }])
            } else {
                // Insert at cursor
                const position = editorInstance.getPosition()
                if (position) {
                    editorInstance.executeEdits("ai-inline-edit", [{
                        range: { startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber, endColumn: position.column },
                        text: newCode,
                    }])
                }
            }
            toast.success("AI edit applied")
        }
    }, [editorInstance, activeFileId])

    const handleNavigateToDiagnostic = useCallback((fileId: string, line: number) => {
        openFile(fileId)
        setTimeout(() => {
            if (editorInstance) {
                editorInstance.revealLineInCenter(line)
                editorInstance.setPosition({ lineNumber: line, column: 1 })
                editorInstance.focus()
            }
        }, 100)
    }, [openFile, editorInstance])

    const renderSidebar = () => {
        switch (sidebarView) {
            case "explorer": return <ExplorerSidebar />
            case "search": return <SearchSidebar />
            case "git": return <GitSidebar workspaceId={workspaceId || ""} />
            case "extensions": return <ExtensionsPanel />
            case "ai": return <AIChatSidebar onApplyCode={(fileId, content) => { writeFile(fileId, content); toast.success("Code applied to file") }} />
            case "settings": return <SettingsPanel settings={editorSettings} onSettingsChange={setEditorSettings} />
            default: return <ExplorerSidebar />
        }
    }

    const renderPanel = () => {
        switch (panelView) {
            case "terminal": return <div className="h-full bg-[#0d1117]"><XTerminal /></div>
            case "problems": return <ProblemsPanel diagnostics={diagnostics} isLinting={isLinting} onLintFile={lintFile} onNavigate={handleNavigateToDiagnostic} />
            case "output": return <OutputPanel lines={outputLines} onClear={() => setOutputLines([])} />
            case "debug": return <DebugPanel projectId={projectId} onNavigate={handleNavigateToDiagnostic} />
            case "preview": return <LivePreviewPanel projectId={projectId} />
            default: return null
        }
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="h-full w-full flex flex-col bg-[#0d1117] overflow-hidden">
                <Toaster
                    position="bottom-right"
                    theme="dark"
                    toastOptions={{
                        className: "!bg-[#161b22] !border-[#30363d] !text-[#c9d1d9]",
                    }}
                />

                {/* Command Palette */}
                <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} onAction={handleCommandAction} activeFileName={activeFileName} />

                {/* Quick Open */}
                <QuickOpen open={showQuickOpen} onClose={() => setShowQuickOpen(false)} onOpenFile={(fileId) => openFile(fileId)} />

                {/* Inline Edit Widget */}
                <InlineEditWidget
                    open={showInlineEdit}
                    onClose={() => setShowInlineEdit(false)}
                    onApply={handleInlineApply}
                    selectedCode={inlineEditCode}
                    language={getLanguage(activeFileName)}
                    filename={activeFileName}
                    cursorPosition={inlineEditPos}
                />

                {/* Zen Mode — Full-screen distraction-free editor */}
                {isZenMode && activeFileId && (
                    <div className="fixed inset-0 z-40 bg-[#0d1117] flex flex-col">
                        {/* Zen mode header bar (subtle) */}
                        <div className="h-8 flex items-center justify-between px-6 bg-[#0d1117] opacity-0 hover:opacity-100 transition-opacity duration-300 shrink-0">
                            <span className="text-[12px] text-[#484f58]">{activeFileName} — Zen Mode</span>
                            <button
                                onClick={() => setIsZenMode(false)}
                                className="text-[11px] text-[#484f58] hover:text-white px-2 py-0.5 rounded hover:bg-[#30363d] transition-colors"
                            >
                                Exit Zen Mode (Esc)
                            </button>
                        </div>
                        <div className="flex-1 max-w-4xl w-full mx-auto">
                            <MonacoEditor
                                height="100%"
                                path={`zen-${activeFileId}`}
                                language={getLanguage(activeFileName)}
                                theme={editorSettings.theme}
                                value={activeFileContent}
                                onChange={handleEditorChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: editorSettings.fontSize + 2,
                                    lineNumbers: "off",
                                    scrollBeyondLastLine: true,
                                    automaticLayout: true,
                                    tabSize: editorSettings.tabSize,
                                    wordWrap: "on",
                                    padding: { top: 40, bottom: 40 },
                                    fontFamily: editorSettings.fontFamily,
                                    fontLigatures: editorSettings.fontLigatures,
                                    cursorBlinking: "smooth",
                                    cursorSmoothCaretAnimation: "on",
                                    smoothScrolling: true,
                                    renderLineHighlight: "none",
                                    folding: false,
                                    glyphMargin: false,
                                    guides: { bracketPairs: false, indentation: false },
                                    overviewRulerLanes: 0,
                                    hideCursorInOverviewRuler: true,
                                    scrollbar: { vertical: "hidden", horizontal: "hidden" },
                                    lineDecorationsWidth: 0,
                                    lineNumbersMinChars: 0,
                                    renderWhitespace: "none",
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Title Bar */}
                <div className="h-9 flex items-center justify-between px-3 bg-[#010409] border-b border-[#1b1f27] shrink-0 select-none">
                    <div className="flex items-center gap-3 text-[13px]">
                        <div className="flex items-center gap-2 text-[#c9d1d9]">
                            <Code className="w-4 h-4 text-emerald-400" />
                            <span className="font-medium">Code Chamber</span>
                        </div>
                        <span className="text-[#30363d]">|</span>
                        <span className="text-[#8b949e] truncate max-w-[300px]">{activeFileName || "No file open"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[#8b949e] hover:text-white hover:bg-[#30363d] gap-1.5"
                            onClick={() => { setPanelVisible(true); setPanelView("terminal") }}>
                            <Play className="w-3 h-3 text-emerald-400" />Run
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[#8b949e] hover:text-white hover:bg-[#30363d] gap-1.5"
                            onClick={() => handleCommandAction("deploy")}>
                            <Globe className="w-3 h-3 text-[#54aeff]" />Deploy
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[#8b949e] hover:text-white hover:bg-[#30363d] gap-1.5"
                            onClick={() => { saveProject(); toast.success("All files saved") }}>
                            <Save className="w-3 h-3 text-amber-400" />Save All
                        </Button>
                    </div>
                </div>

                {/* Workbench */}
                <div className="flex-1 flex overflow-hidden min-h-0">
                    <IDEActivityBar
                        activeView={sidebarView}
                        onViewChange={handleSidebarViewChange}
                        sidebarVisible={sidebarVisible}
                        diagnosticCounts={diagnosticCounts}
                    />

                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        <ResizablePanelGroup direction="horizontal" className="flex-1">
                            {sidebarVisible && (
                                <>
                                    <ResizablePanel defaultSize={20} minSize={12} maxSize={40} className="min-w-[200px]">
                                        {renderSidebar()}
                                    </ResizablePanel>
                                    <ResizableHandle className="w-px bg-[#1b1f27] hover:bg-[#1f6feb] transition-colors data-[resize-handle-active]:bg-[#1f6feb]" />
                                </>
                            )}

                            <ResizablePanel defaultSize={sidebarVisible ? 80 : 100}>
                                <ResizablePanelGroup direction="vertical">
                                    <ResizablePanel defaultSize={panelVisible ? 65 : 100} minSize={30}>
                                        <div className="h-full flex flex-col bg-[#0d1117]">
                                            {/* Draggable Editor Tabs */}
                                            <DraggableTabBar
                                                tabs={(tabOrder.length > 0 ? tabOrder : openFiles)
                                                    .filter(fId => openFiles.includes(fId))
                                                    .map(fId => ({
                                                        id: fId,
                                                        name: fileMap[fId]?.name || "untitled",
                                                        icon: getFileIcon(fileMap[fId]?.name || ""),
                                                        hasErrors: diagnostics.some(d => d.fileId === fId && d.severity === "error"),
                                                        isModified: modifiedFiles.has(fId),
                                                    }))}
                                                activeTabId={activeFileId}
                                                onSelect={setActiveFile}
                                                onClose={closeFile}
                                                onReorder={(tabs) => setTabOrder(tabs.map(t => t.id))}
                                                getFileIcon={getFileIcon}
                                            />

                                            {/* Enhanced Breadcrumb bar with symbol navigation */}
                                            {activeFileName && (
                                                <EnhancedBreadcrumbBar
                                                    fileName={activeFileName}
                                                    fileMap={fileMap}
                                                    activeFileId={activeFileId}
                                                    onOpenFile={(fileId) => openFile(fileId)}
                                                    symbols={symbols}
                                                    onNavigateSymbol={(line) => {
                                                        if (editorInstance) {
                                                            editorInstance.revealLineInCenter(line)
                                                            editorInstance.setPosition({ lineNumber: line, column: 1 })
                                                            editorInstance.focus()
                                                        }
                                                    }}
                                                />
                                            )}

                                            {/* Editor / Welcome */}
                                            <div className="flex-1 min-h-0 relative">
                                                {activeFileId ? (
                                                    <>
                                                        {provider && connectedUsers > 1 && (
                                                            <div className="absolute top-2 right-6 z-10 flex items-center gap-2 px-2 py-1 rounded-md bg-[#161b22] border border-[#30363d] text-[11px] text-[#8b949e] shadow-sm">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span>{connectedUsers} collaborators</span>
                                                            </div>
                                                        )}
                                                        <MonacoEditor
                                                            height="100%"
                                                            path={activeFileId}
                                                            language={getLanguage(activeFileName)}
                                                            theme={editorSettings.theme}
                                                            value={activeFileContent}
                                                            onChange={handleEditorChange}
                                                            onMount={handleEditorMount}
                                                            options={{
                                                                minimap: { enabled: editorSettings.minimap, maxColumn: 80 },
                                                                fontSize: editorSettings.fontSize,
                                                                lineNumbers: editorSettings.lineNumbers,
                                                                scrollBeyondLastLine: false,
                                                                automaticLayout: true,
                                                                tabSize: editorSettings.tabSize,
                                                                wordWrap: editorSettings.wordWrap,
                                                                padding: { top: 8 },
                                                                fontFamily: editorSettings.fontFamily,
                                                                fontLigatures: editorSettings.fontLigatures,
                                                                cursorBlinking: editorSettings.cursorBlinking,
                                                                cursorSmoothCaretAnimation: "on",
                                                                smoothScrolling: true,
                                                                renderLineHighlight: "all",
                                                                bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
                                                                guides: { bracketPairs: true },
                                                                suggest: { showMethods: true, showFunctions: true },
                                                                stickyScroll: { enabled: editorSettings.stickyScroll },
                                                                renderWhitespace: editorSettings.renderWhitespace,
                                                            }}
                                                        />
                                                    </>
                                                ) : (
                                                    <WelcomeTab onProjectSelect={(templateId) => loadProject(templateId)} />
                                                )}
                                            </div>
                                        </div>
                                    </ResizablePanel>

                                    {panelVisible && (
                                        <>
                                            <ResizableHandle className="h-px bg-[#1b1f27] hover:bg-[#1f6feb] transition-colors data-[resize-handle-active]:bg-[#1f6feb]" />
                                            <ResizablePanel defaultSize={35} minSize={10} maxSize={80}>
                                                <div className="h-full flex flex-col">
                                                    <PanelTabs activePanel={panelView} onPanelChange={setPanelView} onClose={() => setPanelVisible(false)} diagnosticCounts={diagnosticCounts} />
                                                    <div className="flex-1 overflow-hidden">{renderPanel()}</div>
                                                </div>
                                            </ResizablePanel>
                                        </>
                                    )}
                                </ResizablePanelGroup>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </div>
                </div>

                {/* Status Bar */}
                <IDEStatusBar
                    activeFile={activeFileName}
                    panelVisible={panelVisible}
                    onTogglePanel={() => setPanelVisible(!panelVisible)}
                    cursorLine={cursorLine}
                    cursorCol={cursorCol}
                    diagnosticCounts={diagnosticCounts}
                    gitBranch={gitBranch}
                    connectedUsers={connectedUsers}
                    onGoToLine={() => {
                        if (editorInstance) {
                            editorInstance.getAction("editor.action.gotoLine")?.run()
                        }
                    }}
                    isZenMode={isZenMode}
                    onToggleZenMode={() => setIsZenMode(z => !z)}
                    notifications={notifications}
                    onDismissNotification={dismissNotification}
                    onDismissAllNotifications={dismissAllNotifications}
                    onMarkNotificationRead={markNotificationRead}
                    onMarkAllNotificationsRead={markAllNotificationsRead}
                />
            </div>
        </TooltipProvider>
    )
}

export default CodeChamber
