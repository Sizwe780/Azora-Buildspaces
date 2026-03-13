"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useRoomEvents } from "@/lib/hooks/use-room-events"
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
    CheckCircle, Save, Star,
    FolderOpen, File, FileText, Settings, Image, Code,
    Database, Sparkles, Wifi, WifiOff,
    Bot, SquareTerminal, CircleDot, FolderClosed,
    Trash2, RefreshCw, Globe, Zap, Download, Upload, ToggleLeft, ToggleRight,
    Pencil, Copy, FolderPlus, ChevronsDownUp, TerminalSquare, Loader2
} from "lucide-react"
import { XTerminal } from "@/components/workspace/panels/x-terminal"
import * as Y from "yjs"
// Dynamic imports for browser-only modules
const getWebrtcProvider = () => import("y-webrtc").then(m => m.WebrtcProvider)
const getMonacoBinding = () => import("y-monaco").then(m => m.MonacoBinding)
import { useWorkspaceSession } from "@/lib/hooks/use-workspace-session"
import { SettingsPanel, loadEditorSettings, type EditorSettings } from "@/components/workspace/panels/settings-panel"
import { projectTemplates } from "@/lib/templates/project-templates"
import { CommandPalette } from "@/components/workspace/layout/command-palette"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { ProblemsView } from "@/components/workspace/panels/problems-view"
import { useSession } from "next-auth/react"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
type SidebarView = "explorer" | "search" | "git" | "extensions" | "ai"
type PanelView = "terminal" | "output" | "problems" | "debug" | "diagnostics" | "history" | "ai-actions"

export type { PanelView, SidebarView }

interface Diagnostic {
    line: number
    column?: number
    severity: 'error' | 'warning' | 'info' | 'hint'
    message: string
    rule: string
    fix?: string
}

interface LintResult {
    diagnostics: Diagnostic[]
    summary: { errors: number; warnings: number; info: number; score: number }
}

interface CodeChamberProps {
    id?: string
}

// ΓöÇΓöÇΓöÇ File Icon Helper ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ACTIVITY BAR ΓÇö VS Code left rail
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function IDEActivityBar({
    activeView,
    onViewChange,
    sidebarVisible,
    onSettingsOpen,
}: {
    activeView: SidebarView
    onViewChange: (v: SidebarView) => void
    sidebarVisible: boolean
    onSettingsOpen: () => void
}) {
    const items: { view: SidebarView; icon: typeof Files; label: string; shortcut: string }[] = [
        { view: "explorer", icon: Files, label: "Explorer", shortcut: "ΓçºΓîÿE" },
        { view: "search", icon: Search, label: "Search", shortcut: "ΓçºΓîÿF" },
        { view: "git", icon: GitBranch, label: "Source Control", shortcut: "ΓîâΓçºG" },
        { view: "extensions", icon: Box, label: "Extensions", shortcut: "ΓçºΓîÿX" },
        { view: "ai", icon: Sparkles, label: "Elara AI", shortcut: "ΓçºΓîÿI" },
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
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                            {item.label} <span className="text-[#484f58] ml-2">{item.shortcut}</span>
                        </TooltipContent>
                    </Tooltip>
                )
            })}

            <div className="flex-1" />

            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onSettingsOpen}
                        className="w-12 h-11 flex items-center justify-center text-[#484f58] hover:text-[#8b949e] transition-colors"
                    >
                        <Settings className="w-[22px] h-[22px]" strokeWidth={1.5} />
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Settings (Ctrl+,)</TooltipContent>
            </Tooltip>
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// EXPLORER SIDEBAR ΓÇö VS Code-grade file tree
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function ExplorerSidebar() {
    const { fileMap, openFile, activeFileId, rootId, createFile, createDirectory, deleteNode, renameNode, loadProject, workspaceId } = useFileSystem()
    const [expanded, setExpanded] = useState<Set<string>>(new Set())
    const [newFileName, setNewFileName] = useState("")
    const [creatingIn, setCreatingIn] = useState<string | null>(null)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null)

    useEffect(() => {
        if (rootId) setExpanded(prev => new Set(prev).add(rootId))
    }, [rootId])

    // Close context menu on outside click
    useEffect(() => {
        if (!contextMenu) return
        const handler = () => setContextMenu(null)
        window.addEventListener("click", handler)
        return () => window.removeEventListener("click", handler)
    }, [contextMenu])

    const toggle = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const collapseAll = () => setExpanded(rootId ? new Set([rootId]) : new Set())

    const handleRefresh = () => {
        if (workspaceId) loadProject(workspaceId)
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
    }

    const handleRename = async (id: string) => {
        const trimmed = renameValue.trim()
        if (trimmed && trimmed !== fileMap[id]?.name) {
            await renameNode(id, trimmed)
        }
        setRenamingId(null)
        setRenameValue("")
    }

    const handleDelete = async (id: string) => {
        await deleteNode(id)
        setDeleteConfirm(null)
    }

    const handleContextMenu = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({ x: e.clientX, y: e.clientY, nodeId })
    }

    const copyPath = (nodeId: string) => {
        const node = fileMap[nodeId]
        if (node) navigator.clipboard.writeText(node.path)
        setContextMenu(null)
    }

    const renderNode = (nodeId: string, depth: number): React.ReactNode => {
        const node = fileMap[nodeId]
        if (!node) return null
        const isDir = node.type === "directory"
        const isOpen = expanded.has(nodeId)
        const isActive = activeFileId === nodeId
        const isRenaming = renamingId === nodeId

        return (
            <div key={nodeId}>
                <div
                    className={cn(
                        "flex items-center gap-1 px-1 py-[3px] cursor-pointer text-[13px] leading-[22px] group select-none",
                        isActive ? "bg-[#1f6feb26] text-white" : "text-[#c9d1d9] hover:bg-[#1f1f1f]"
                    )}
                    style={{ paddingLeft: `${depth * 16 + 4}px` }}
                    onClick={() => (isDir ? toggle(nodeId) : openFile(nodeId))}
                    onContextMenu={(e: React.MouseEvent) => handleContextMenu(e, nodeId)}
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRenameValue(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent) => {
                                if (e.key === "Enter") handleRename(nodeId)
                                if (e.key === "Escape") { setRenamingId(null); setRenameValue("") }
                                e.stopPropagation()
                            }}
                            onBlur={() => handleRename(nodeId)}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="flex-1 bg-[#0d1117] border border-[#1f6feb] rounded px-1.5 py-0 text-[13px] text-white outline-none ml-1 min-w-0"
                        />
                    ) : (
                        <span className="truncate ml-1 flex-1">{node.name}</span>
                    )}

                    {!isRenaming && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            {isDir && (
                                <button
                                    onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation()
                                        setCreatingIn(nodeId)
                                        setExpanded(prev => new Set(prev).add(nodeId))
                                    }}
                                    className="p-0.5 rounded hover:bg-[#30363d]"
                                    title="New File"
                                >
                                    <Plus className="w-3.5 h-3.5 text-[#8b949e]" />
                                </button>
                            )}
                            <button
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRenamingId(nodeId); setRenameValue(node.name) }}
                                className="p-0.5 rounded hover:bg-[#30363d]"
                                title="Rename"
                            >
                                <Pencil className="w-3.5 h-3.5 text-[#8b949e]" />
                            </button>
                            <button
                                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteConfirm(nodeId) }}
                                className="p-0.5 rounded hover:bg-[#30363d]"
                                title="Delete"
                            >
                                <Trash2 className="w-3.5 h-3.5 text-[#8b949e]" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === nodeId && (
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1c1c1c] border-y border-[#30363d]" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
                        <span className="text-[12px] text-[#f85149] flex-1 truncate">Delete "{node.name}"?</span>
                        <button onClick={() => handleDelete(nodeId)} className="px-2 py-0.5 text-[11px] rounded bg-[#da3633] text-white hover:bg-[#f85149]">Yes</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2 py-0.5 text-[11px] rounded bg-[#30363d] text-[#c9d1d9] hover:bg-[#484f58]">No</button>
                    </div>
                )}

                {creatingIn === nodeId && (
                    <div className="flex items-center gap-1 px-1 py-[3px]" style={{ paddingLeft: `${(depth + 1) * 16 + 4}px` }}>
                        <File className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />
                        <input
                            autoFocus
                            value={newFileName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFileName(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent) => {
                                if (e.key === "Enter") handleCreate(nodeId)
                                if (e.key === "Escape") { setCreatingIn(null); setNewFileName("") }
                            }}
                            onBlur={() => handleCreate(nodeId)}
                            className="flex-1 bg-[#0d1117] border border-[#1f6feb] rounded px-1.5 py-0.5 text-[13px] text-white outline-none"
                            placeholder="filename (end with / for folder)"
                        />
                    </div>
                )}

                {isDir && isOpen && node.children?.map(childId => renderNode(childId, depth + 1))}
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117] text-[#c9d1d9]">
            <div className="h-9 flex items-center justify-between px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">
                <span>Explorer</span>
                <div className="flex items-center gap-1">
                    <button onClick={() => rootId && setCreatingIn(rootId)} className="p-1 rounded hover:bg-[#30363d] transition-colors" title="New File">
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (rootId) { setCreatingIn(rootId); setNewFileName("folder-name/") } }} className="p-1 rounded hover:bg-[#30363d] transition-colors" title="New Folder">
                        <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleRefresh} className="p-1 rounded hover:bg-[#30363d] transition-colors" title="Refresh">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={collapseAll} className="p-1 rounded hover:bg-[#30363d] transition-colors" title="Collapse All">
                        <ChevronsDownUp className="w-3.5 h-3.5" />
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
                    className="fixed z-[9999] bg-[#1c2128] border border-[#30363d] rounded-lg shadow-xl py-1 min-w-[180px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    {fileMap[contextMenu.nodeId]?.type === "directory" && (
                        <>
                            <button
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#c9d1d9] hover:bg-[#1f6feb33] transition-colors text-left"
                                onClick={() => { setCreatingIn(contextMenu.nodeId); setExpanded((prev: Set<string>) => new Set(prev).add(contextMenu.nodeId)); setContextMenu(null) }}
                            >
                                <Plus className="w-3.5 h-3.5 text-[#8b949e]" />New File
                            </button>
                            <button
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#c9d1d9] hover:bg-[#1f6feb33] transition-colors text-left"
                                onClick={() => { setCreatingIn(contextMenu.nodeId); setNewFileName("folder-name/"); setExpanded((prev: Set<string>) => new Set(prev).add(contextMenu.nodeId)); setContextMenu(null) }}
                            >
                                <FolderPlus className="w-3.5 h-3.5 text-[#8b949e]" />New Folder
                            </button>
                            <div className="my-1 border-t border-[#30363d]" />
                        </>
                    )}
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#c9d1d9] hover:bg-[#1f6feb33] transition-colors text-left"
                        onClick={() => { setRenamingId(contextMenu.nodeId); setRenameValue(fileMap[contextMenu.nodeId]?.name || ""); setContextMenu(null) }}
                    >
                        <Pencil className="w-3.5 h-3.5 text-[#8b949e]" />Rename
                        <span className="ml-auto text-[11px] text-[#484f58]">F2</span>
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#f85149] hover:bg-[#1f6feb33] transition-colors text-left"
                        onClick={() => { setDeleteConfirm(contextMenu.nodeId); setContextMenu(null) }}
                    >
                        <Trash2 className="w-3.5 h-3.5" />Delete
                        <span className="ml-auto text-[11px] text-[#484f58]">Del</span>
                    </button>
                    <div className="my-1 border-t border-[#30363d]" />
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#c9d1d9] hover:bg-[#1f6feb33] transition-colors text-left"
                        onClick={() => copyPath(contextMenu.nodeId)}
                    >
                        <Copy className="w-3.5 h-3.5 text-[#8b949e]" />Copy Path
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-[#c9d1d9] hover:bg-[#1f6feb33] transition-colors text-left"
                        onClick={() => { navigator.clipboard.writeText(fileMap[contextMenu.nodeId]?.name || ""); setContextMenu(null) }}
                    >
                        <Copy className="w-3.5 h-3.5 text-[#8b949e]" />Copy Name
                    </button>
                </div>
            )}
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// SEARCH SIDEBAR
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function SearchSidebar() {
    const [query, setQuery] = useState("")
    const { fileMap, openFile } = useFileSystem()
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
        setResults(matches.slice(0, 50))
    }, [query, fileMap])

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-9 flex items-center px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">Search</div>
            <div className="px-3 pb-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                />
            </div>
            <div className="flex-1 overflow-y-auto px-2">
                {results.length === 0 && query && <p className="text-[13px] text-[#484f58] px-2 py-4 text-center">No results</p>}
                {results.map((r, i) => (
                    <button key={`${r.fileId}-${r.line}-${i}`} className="w-full text-left px-2 py-1.5 text-[13px] hover:bg-[#1f1f1f] rounded transition-colors" onClick={() => openFile(r.fileId)}>
                        <div className="text-[#c9d1d9] truncate">{r.text}</div>
                        <div className="text-[11px] text-[#484f58]">{fileMap[r.fileId]?.name}:{r.line}</div>
                    </button>
                ))}
            </div>
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// GIT SIDEBAR ΓÇö with changed-files list & diff viewer
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ∩┐╜∩┐╜ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function GitSidebar() {
    const { fileMap, workspaceId } = useFileSystem()
    const [commitMsg, setCommitMsg] = useState("")
    const [showDiff, setShowDiff] = useState<string | null>(null)
    const [diffContent, setDiffContent] = useState<Record<string, string>>({})
    const [changedFiles, setChangedFiles] = useState<{ name: string; status: string }[]>([])
    const [recentCommits, setRecentCommits] = useState<{ hash: string; message: string; date: string }[]>([])
    const [currentBranch, setCurrentBranch] = useState("main")
    const [isCommitting, setIsCommitting] = useState(false)
    const [gitError, setGitError] = useState<string | null>(null)

    // Fetch real git status
    useEffect(() => {
        if (!workspaceId) return
        const fetchGitStatus = async () => {
            try {
                const statusRes = await fetch(
                    `/api/fs?operation=gitStatus&path=.&workspaceId=${encodeURIComponent(workspaceId)}`
                )
                if (statusRes.ok) {
                    const data = await statusRes.json()
                    setCurrentBranch(data.branch || "main")
                    if (data.status) {
                        const files = data.status
                            .split('\n')
                            .filter((l: string) => l.trim())
                            .map((l: string) => ({
                                name: l.substring(3).trim(),
                                status: l.substring(0, 2).trim() || "M"
                            }))
                        setChangedFiles(files)
                    } else {
                        setChangedFiles([])
                    }
                    setGitError(null)
                }
            } catch {
                setGitError("Not a git repository")
            }
        }

        const fetchGitLog = async () => {
            try {
                const logRes = await fetch(
                    `/api/fs?operation=gitLog&path=.&workspaceId=${encodeURIComponent(workspaceId)}&limit=5`
                )
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
            } catch { /* no git log */ }
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
            await fetch('/api/fs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation: 'gitAdd', path: '.', files: ['.'], workspaceId })
            })
            await fetch('/api/fs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation: 'gitCommit', path: '.', message: commitMsg, workspaceId })
            })
            setCommitMsg("")
            // Refresh
            const statusRes = await fetch(
                `/api/fs?operation=gitStatus&path=.&workspaceId=${encodeURIComponent(workspaceId)}`
            )
            if (statusRes.ok) {
                const data = await statusRes.json()
                setChangedFiles(data.status ? data.status.split('\n').filter((l: string) => l.trim()).map((l: string) => ({
                    name: l.substring(3).trim(), status: l.substring(0, 2).trim() || "M"
                })) : [])
            }
        } catch (e) {
            console.error("Commit failed:", e)
        } finally {
            setIsCommitting(false)
        }
    }

    const handleInitGit = async () => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation: 'gitInit', path: '.', workspaceId })
            })
            setGitError(null)
        } catch (e) {
            console.error("Git init failed:", e)
        }
    }

    const handleStageFile = async (fileName: string) => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitAdd', path: '.', files: [fileName], workspaceId }) })
        } catch { /* stage error */ }
    }

    const handleDiscardFile = async (fileName: string) => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'exec', command: `git checkout -- "${fileName}"`, workspaceId }) })
        } catch { /* discard error */ }
    }

    const handlePush = async () => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitPush', path: '.', workspaceId }) })
        } catch { /* push error */ }
    }

    const handlePull = async () => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitPull', path: '.', workspaceId }) })
        } catch { /* pull error */ }
    }

    const handleShowDiff = async (fileName: string) => {
        if (showDiff === fileName) { setShowDiff(null); return }
        setShowDiff(fileName)
        if (!diffContent[fileName] && workspaceId) {
            try {
                const res = await fetch(`/api/fs?operation=gitDiff&path=${encodeURIComponent(fileName)}&workspaceId=${encodeURIComponent(workspaceId)}`)
                if (res.ok) {
                    const data = await res.json()
                    setDiffContent((prev: Record<string, string>) => ({ ...prev, [fileName]: data.diff || 'No diff available' }))
                }
            } catch { setDiffContent((prev: Record<string, string>) => ({ ...prev, [fileName]: 'Failed to load diff' })) }
        }
    }

    const handleStageAll = async () => {
        if (!workspaceId) return
        try {
            await fetch('/api/fs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'gitAdd', path: '.', files: ['.'], workspaceId }) })
        } catch { /* stage all error */ }
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-9 flex items-center justify-between px-4 shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">Source Control</span>
                <div className="flex items-center gap-1">
                    <button onClick={handlePull} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors" title="Pull">
                        <Download className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handlePush} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors" title="Push">
                        <Upload className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
            <div className="px-3 pb-3">
                <input
                    value={commitMsg}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCommitMsg(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleCommit() }}
                    placeholder="Message (ΓîÿEnter to commit)"
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
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
                        Changes ({changedFiles.length})
                    </div>
                    <button onClick={handleStageAll} className="text-[11px] text-[#58a6ff] hover:underline">Stage All</button>
                </div>

                {changedFiles.length === 0 ? (
                    <div className="text-[13px] text-[#484f58] text-center py-8">
                        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p>No changes detected</p>
                        <p className="text-[11px] mt-1">Working tree clean</p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {changedFiles.map(f => (
                            <div key={f.name}>
                                <div className="flex items-center group">
                                    <button
                                        onClick={() => handleShowDiff(f.name)}
                                        className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-l hover:bg-[#1f1f1f] transition-colors min-w-0"
                                    >
                                        <span className={`text-[11px] font-bold w-4 shrink-0 ${f.status === "A" ? "text-emerald-400" : f.status === "D" ? "text-red-400" : "text-amber-400"}`}>
                                            {f.status}
                                        </span>
                                        {getFileIcon(f.name)}
                                        <span className="text-[13px] text-[#c9d1d9] truncate flex-1 text-left">{f.name}</span>
                                    </button>
                                    <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleStageFile(f.name)} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-emerald-400" title="Stage">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => handleDiscardFile(f.name)} className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-red-400" title="Discard">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                {showDiff === f.name && (
                                    <div className="mx-2 mb-1 p-2 rounded bg-[#161b22] border border-[#30363d] font-mono text-[11px] max-h-[200px] overflow-y-auto">
                                        {(diffContent[f.name] || 'Loading...').split('\n').map((line: string, idx: number) => (
                                            <div key={idx} className={line.startsWith('+') ? 'text-emerald-400 bg-emerald-900/10' : line.startsWith('-') ? 'text-red-400 bg-red-900/10' : line.startsWith('@@') ? 'text-[#58a6ff]' : 'text-[#8b949e]'}>
                                                {line || ' '}
                                            </div>
                                        ))}
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
                            <button onClick={handleInitGit} className="px-3 py-1.5 rounded-md text-[12px] bg-[#238636] hover:bg-[#2ea043] text-white transition-colors">
                                Initialize Repository
                            </button>
                        </div>
                    ) : recentCommits.length > 0 ? recentCommits.map((c, i) => (
                        <div key={c.hash || i} className="flex items-start gap-2 px-1 py-1.5">
                            <div className="w-5 h-5 rounded-full bg-[#1f6feb] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-[9px] font-bold text-white">{c.hash?.charAt(0)?.toUpperCase() || "?"}</span>
                            </div>
                            <div className="min-w-0">
                                <div className="text-[12px] text-[#c9d1d9] truncate">{c.message}</div>
                                <div className="text-[10px] text-[#484f58]">{c.hash} ┬╖ {currentBranch}</div>
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

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// EXTENSIONS SIDEBAR ΓÇö API-driven
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
interface ExtensionItem {
    id: string
    name: string
    publisher: string
    description: string
    version: string
    downloads: number
    rating: number
    installed: boolean
    enabled?: boolean
    verified?: boolean
    icon?: string
}

function ExtensionsSidebar() {
    const [query, setQuery] = useState("")
    const [extensions, setExtensions] = useState<ExtensionItem[]>([])
    const [installed, setInstalled] = useState<ExtensionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [installing, setInstalling] = useState<string | null>(null)
    const [tab, setTab] = useState<"featured" | "installed">("featured")

    // Fetch featured + installed once on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [featRes, instRes] = await Promise.all([
                    fetch("/api/code-chamber/extensions?action=featured"),
                    fetch("/api/code-chamber/extensions?action=installed"),
                ])
                if (featRes.ok) {
                    const d = await featRes.json()
                    setExtensions(d.extensions || [])
                }
                if (instRes.ok) {
                    const d = await instRes.json()
                    setInstalled(d.extensions || [])
                }
            } catch { /* ignore */ } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // Debounced search
    useEffect(() => {
        if (!query.trim()) return
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`/api/code-chamber/extensions?action=search&q=${encodeURIComponent(query)}`)
                if (res.ok) {
                    const d = await res.json()
                    setExtensions(d.extensions || [])
                    setTab("featured")
                }
            } catch { /* ignore */ }
        }, 400)
        return () => clearTimeout(t)
    }, [query])

    const handleInstall = async (id: string) => {
        setInstalling(id)
        try {
            const res = await fetch("/api/code-chamber/extensions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "install", extensionId: id })
            })
            if (res.ok) {
                setInstalled(prev => [...prev, extensions.find(e => e.id === id) || installed.find(e => e.id === id)].filter(Boolean) as ExtensionItem[])
                setExtensions(prev => prev.map(e => e.id === id ? { ...e, installed: true, enabled: true } : e))
            }
        } catch { /* ignore */ } finally {
            setInstalling(null)
        }
    }

    const handleUninstall = async (id: string) => {
        setInstalling(id)
        try {
            await fetch("/api/code-chamber/extensions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "uninstall", extensionId: id })
            })
            setInstalled(prev => prev.filter(e => e.id !== id))
            setExtensions(prev => prev.map(e => e.id === id ? { ...e, installed: false } : e))
        } catch { /* ignore */ } finally {
            setInstalling(null)
        }
    }

    const handleToggle = async (id: string, currentlyEnabled: boolean) => {
        try {
            await fetch("/api/code-chamber/extensions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: currentlyEnabled ? "disable" : "enable", extensionId: id })
            })
            setInstalled(prev => prev.map(e => e.id === id ? { ...e, enabled: !currentlyEnabled } : e))
        } catch { /* ignore */ }
    }

    const displayList = tab === "installed" ? installed : extensions

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-9 flex items-center px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">Extensions</div>
            <div className="px-3 pb-2 space-y-2">
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search extensions..."
                    className="w-full bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                />
                <div className="flex items-center gap-1">
                    {(["featured", "installed"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} className={cn(
                            "px-3 py-0.5 rounded text-[11px] font-medium transition-colors capitalize",
                            tab === t ? "bg-[#1f6feb]/20 text-[#58a6ff]" : "text-[#484f58] hover:text-[#8b949e]"
                        )}>
                            {t === "installed" ? `Installed (${installed.length})` : "Featured"}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-[13px] text-[#484f58] text-center py-8">Loading extensions...</div>
                ) : displayList.length === 0 ? (
                    <div className="text-[13px] text-[#484f58] text-center py-8">
                        {tab === "installed" ? "No extensions installed" : "No results"}
                    </div>
                ) : displayList.map((ext) => {
                    const isInstalled = installed.some(i => i.id === ext.id)
                    const instData = installed.find(i => i.id === ext.id)
                    const isBusy = installing === ext.id
                    return (
                        <div key={ext.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-[#1f1f1f] transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1f6feb]/30 to-[#388bfd]/10 flex items-center justify-center text-lg shrink-0">
                                {ext.icon ? <span>{ext.icon}</span> : <Box className="w-4 h-4 text-[#58a6ff]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-medium text-white truncate">{ext.name}</span>
                                    {ext.verified && <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />}
                                </div>
                                <div className="text-[11px] text-[#484f58] truncate">{ext.publisher}</div>
                                <div className="text-[12px] text-[#8b949e] truncate">{ext.description}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// ELARA AI SIDEBAR
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function AISidebar() {
    const { fileMap, openFiles, readFile, writeFile } = useFileSystem()
    const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
        { role: "assistant", content: "Hi! I'm Elara, your AI coding assistant. I can help you write, debug, and understand code. What would you like to work on?" },
    ])
    const [input, setInput] = useState("")
    const [isRefactoring, setIsRefactoring] = useState(false)

    const send = async () => {
        if (!input.trim() || isRefactoring) return
        const userPrompt = input
        setMessages(prev => [...prev, { role: "user", content: userPrompt }])
        setInput("")
        setIsRefactoring(true)

        try {
            // Gather context from open files
            const filesContext = openFiles.map(id => ({
                path: fileMap[id]?.name || id,
                content: readFile(id) || ""
            }))

            const res = await fetch("/api/code-chamber/refactor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: userPrompt, files: filesContext })
            })

            if (res.ok) {
                const data = await res.json()
                if (data.changes && data.changes.length > 0) {
                    let changeLog = "I've applied the following changes:\n"
                    data.changes.forEach((change: any) => {
                        // Find the file id by name
                        const fileId = Object.keys(fileMap).find(id => fileMap[id]?.name === change.path)
                        if (fileId && change.content !== null) {
                            writeFile(fileId, change.content)
                            changeLog += `- Updated \`${change.path}\`\n`
                        } else if (change.content === null) {
                            changeLog += `- Deleted \`${change.path}\`\n`
                        } else {
                            // The backend now returns actual file creations and the
                            // editor will create the file in the virtual filesystem.
                            changeLog += `- Created \`${change.path}\`\n`
                        }
                    })
                    setMessages(prev => [...prev, { role: "assistant", content: changeLog }])
                } else {
                    setMessages(prev => [...prev, { role: "assistant", content: "No changes were needed based on your request." }])
                }
            } else {
                setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error while trying to refactor the code." }])
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, an unexpected error occurred." }])
        } finally {
            setIsRefactoring(false)
        }
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-9 flex items-center px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">
                <Sparkles className="w-3.5 h-3.5 mr-2 text-emerald-400" />Elara AI
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={cn("text-[13px] leading-relaxed", msg.role === "user" ? "text-white" : "text-[#c9d1d9]")}>
                        <div className="flex items-center gap-2 mb-1">
                            {msg.role === "assistant" ? (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-black" /></div>
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-[#30363d] flex items-center justify-center shrink-0"><span className="text-[10px] font-bold text-white">Y</span></div>
                            )}
                            <span className="text-[11px] font-medium text-[#8b949e]">{msg.role === "assistant" ? "Elara" : "You"}</span>
                        </div>
                        <div className="pl-7 whitespace-pre-wrap">{msg.content}</div>
                    </div>
                ))}
                {isRefactoring && (
                    <div className="text-[13px] text-[#8b949e] pl-7 animate-pulse">Elara is thinking and refactoring...</div>
                )}
            </div>
            <div className="p-3 border-t border-[#1b1f27]">
                <div className="flex items-center gap-2">
                    <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask Elara to refactor..." disabled={isRefactoring} className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-1.5 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors disabled:opacity-50" />
                    <Button size="sm" onClick={send} disabled={isRefactoring} className="h-7 bg-[#238636] hover:bg-[#2ea043] border-0 text-white disabled:opacity-50">Send</Button>
                </div>
            </div>
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// PANEL TABS
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function PanelTabs({ activePanel, onPanelChange, onClose, errorCount, warningCount }: {
    activePanel: PanelView
    onPanelChange: (v: PanelView) => void
    onClose: () => void
    errorCount?: number
    warningCount?: number
}) {
    const tabs: { view: PanelView; label: string }[] = [
        { view: "problems", label: "PROBLEMS" },
        { view: "output", label: "OUTPUT" },
        { view: "debug", label: "DEBUG CONSOLE" },
        { view: "diagnostics", label: "DIAGNOSTICS" },
        { view: "history", label: "VERSION HISTORY" },
        { view: "ai-actions", label: "AI ACTIONS" },
        { view: "terminal", label: "TERMINAL" },
    ]
    return (
        <div className="flex items-center justify-between h-9 border-t border-[#1b1f27] bg-[#0d1117] px-2 select-none shrink-0">
            <div className="flex items-center">
                {tabs.map((tab) => (
                    <button key={tab.view} onClick={() => onPanelChange(tab.view)} className={cn("px-3 h-9 text-[11px] font-medium uppercase tracking-wider border-t-2 transition-colors flex items-center gap-1.5", activePanel === tab.view ? "border-[#1f6feb] text-white" : "border-transparent text-[#484f58] hover:text-[#8b949e]")}>
                        {tab.label}
                        {tab.view === 'problems' && (errorCount || 0) + (warningCount || 0) > 0 && (
                            <span className="flex items-center gap-1 ml-1">
                                {errorCount ? <span className="text-[10px] bg-red-500/20 text-red-400 px-1 rounded">{errorCount}</span> : null}
                                {warningCount ? <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1 rounded">{warningCount}</span> : null}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-[#30363d] text-[#484f58] hover:text-[#8b949e] transition-colors"><X className="w-4 h-4" /></button>
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// BREADCRUMB BAR
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function BreadcrumbBar({ fileName }: { fileName: string }) {
    if (!fileName) return null
    const parts = fileName.split("/")
    return (
        <div className="h-7 flex items-center px-4 gap-1 bg-[#010409] border-b border-[#1b1f27] text-[12px] text-[#484f58] select-none shrink-0">
            <span className="hover:text-[#8b949e] cursor-pointer">src</span>
            {parts.map((part, i) => (
                <span key={i} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-[#30363d]" />
                    <span className={cn("hover:text-[#8b949e] cursor-pointer", i === parts.length - 1 && "text-[#c9d1d9]")}>
                        {part}
                    </span>
                </span>
            ))}
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// STATUS BAR
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function IDEStatusBar({
    activeFile,
    onTogglePanel,
    cursorLine,
    cursorCol,
    errorCount = 0,
    warningCount = 0,
    gitBranch = "main",
}: {
    activeFile: string | null
    panelVisible: boolean
    onTogglePanel: () => void
    cursorLine: number
    cursorCol: number
    errorCount?: number
    warningCount?: number
    gitBranch?: string
}) {
    const lang = activeFile ? getLanguage(activeFile) : "plaintext"
    return (
        <div className="h-6 bg-[#1f6feb] flex items-center justify-between px-3 text-[11px] text-white/80 select-none shrink-0">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    <GitBranch className="w-3 h-3" /><span>{gitBranch}</span>
                </div>
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                    <CircleDot className="w-3 h-3" />
                    <span>{errorCount} error{errorCount !== 1 ? 's' : ''}, {warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="cursor-pointer hover:text-white transition-colors">
                    Ln {cursorLine}, Col {cursorCol}
                </span>
                <span className="cursor-pointer hover:text-white transition-colors">Spaces: 2</span>
                <span className="cursor-pointer hover:text-white transition-colors">UTF-8</span>
                <span className="cursor-pointer hover:text-white transition-colors">LF</span>
                <span className="cursor-pointer hover:text-white transition-colors capitalize">{lang}</span>
                <button onClick={onTogglePanel} className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                    <SquareTerminal className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// WELCOME TAB ΓÇö real workflows
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
function WelcomeTab({ onProjectSelect }: { onProjectSelect: (id: string) => void }) {
    const [showClone, setShowClone] = useState(false)
    const [cloneUrl, setCloneUrl] = useState("")
    const [cloneName, setCloneName] = useState("")
    const [cloneLoading, setCloneLoading] = useState(false)
    const [cloneError, setCloneError] = useState<string | null>(null)

    const [showNew, setShowNew] = useState(false)
    const [newName, setNewName] = useState("")

    // Recent projects from localStorage
    const [recentProjects, setRecentProjects] = useState<string[]>([])
    useEffect(() => {
        try {
            const saved = localStorage.getItem("citadel-recent-projects")
            if (saved) setRecentProjects(JSON.parse(saved).slice(0, 5))
        } catch { /* ignore */ }
    }, [])

    const handleClone = async () => {
        if (!cloneUrl.trim()) return
        setCloneLoading(true)
        setCloneError(null)
        const name = cloneName.trim() || cloneUrl.split("/").pop()?.replace(".git", "") || `repo-${Date.now()}`
        try {
            const res = await fetch("/api/fs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ operation: "gitClone", url: cloneUrl.trim(), path: ".", workspaceId: name })
            })
            if (res.ok) {
                // Save to recent
                const updated = [name, ...recentProjects.filter((r: string) => r !== name)].slice(0, 5)
                localStorage.setItem("citadel-recent-projects", JSON.stringify(updated))
                onProjectSelect(name)
            } else {
                const data = await res.json().catch(() => ({}))
                setCloneError(data.error || "Clone failed")
            }
        } catch (e: any) {
            setCloneError(e.message || "Network error")
        } finally {
            setCloneLoading(false)
        }
    }

    const handleNewEmpty = () => {
        const name = newName.trim() || `project-${Date.now()}`
        const updated = [name, ...recentProjects.filter((r: string) => r !== name)].slice(0, 5)
        localStorage.setItem("citadel-recent-projects", JSON.stringify(updated))
        onProjectSelect(name)
    }

    return (
        <div className="h-full overflow-y-auto bg-[#0d1117]">
            <div className="max-w-3xl mx-auto py-16 px-8">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Code className="w-8 h-8 text-black" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Code Chamber</h1>
                        <p className="text-[#8b949e] text-sm mt-1">Your AI-powered development workspace</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-4 mb-12">
                    <button onClick={() => setShowNew(true)} className="group flex items-center gap-4 p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb]/50 transition-all text-left">
                        <Plus className="w-8 h-8 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                        <div><div className="text-white font-medium">New Project</div><div className="text-[13px] text-[#8b949e]">Start empty</div></div>
                    </button>
                    <button onClick={() => setShowClone(true)} className="group flex items-center gap-4 p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb]/50 transition-all text-left">
                        <GitBranch className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <div><div className="text-white font-medium">Clone Repo</div><div className="text-[13px] text-[#8b949e]">From Git URL</div></div>
                    </button>
                    <button onClick={() => onProjectSelect(`workspace-${Date.now()}`)} className="group flex items-center gap-4 p-5 rounded-xl bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb]/50 transition-all text-left">
                        <FolderOpen className="w-8 h-8 text-amber-400 group-hover:text-amber-300 transition-colors" />
                        <div><div className="text-white font-medium">Open Folder</div><div className="text-[13px] text-[#8b949e]">Empty workspace</div></div>
                    </button>
                </div>

                {/* Clone Repository Dialog */}
                {showClone && (
                    <div className="mb-8 p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">Clone Repository</h3>
                            <button onClick={() => { setShowClone(false); setCloneError(null) }} className="text-[#484f58] hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <input
                            value={cloneUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloneUrl(e.target.value)}
                            placeholder="https://github.com/user/repo.git"
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleClone()}
                        />
                        <input
                            value={cloneName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCloneName(e.target.value)}
                            placeholder="Workspace name (optional, derived from URL)"
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                        />
                        {cloneError && <div className="text-[12px] text-red-400">{cloneError}</div>}
                        <button onClick={handleClone} disabled={cloneLoading || !cloneUrl.trim()} className="w-full py-2 rounded-md text-[13px] font-medium bg-[#238636] hover:bg-[#2ea043] text-white transition-colors disabled:opacity-40">
                            {cloneLoading ? "Cloning..." : "Clone"}
                        </button>
                    </div>
                )}

                {/* New Empty Project Dialog */}
                {showNew && (
                    <div className="mb-8 p-5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-white">New Project</h3>
                            <button onClick={() => setShowNew(false)} className="text-[#484f58] hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <input
                            value={newName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                            placeholder="my-awesome-project"
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-white placeholder-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                            onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && handleNewEmpty()}
                        />
                        <button onClick={handleNewEmpty} className="w-full py-2 rounded-md text-[13px] font-medium bg-[#1f6feb] hover:bg-[#388bfd] text-white transition-colors">
                            Create Project
                        </button>
                    </div>
                )}

                {/* Recent Projects */}
                {recentProjects.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-4">Recent Projects</h2>
                        <div className="space-y-1">
                            {recentProjects.map((name: string) => (
                                <button key={name} onClick={() => onProjectSelect(name)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[#161b22] transition-colors text-left group">
                                    <FolderOpen className="w-4 h-4 text-[#8b949e] group-hover:text-[#58a6ff] shrink-0" />
                                    <span className="text-[13px] text-[#c9d1d9] group-hover:text-white truncate">{name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Start Templates ΓÇö dynamic from projectTemplates */}
                <div className="mb-12">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-4">Quick Start Templates</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {projectTemplates.map((t) => (
                            <button key={t.id} onClick={() => onProjectSelect(t.id)} className="flex items-center gap-3 p-4 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#1f6feb]/50 transition-all text-left group">
                                <span className="text-2xl">{t.icon}</span>
                                <div>
                                    <div className="text-[13px] font-medium text-white group-hover:text-[#58a6ff] transition-colors">{t.name}</div>
                                    <div className="text-[11px] text-[#484f58]">{t.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8b949e] mb-4">Keyboard Shortcuts</h2>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[13px]">
                        {[["Ctrl+P", "Quick Open File"], ["Ctrl+Shift+P", "Command Palette"], ["Ctrl+S", "Save File"], ["Ctrl+Shift+F", "Search in Files"], ["Ctrl+`", "Toggle Terminal"], ["Ctrl+B", "Toggle Sidebar"], ["Ctrl+,", "Settings"], ["F2", "Rename"]].map(([key, label]) => (
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

// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
// MAIN CODE CHAMBER ΓÇö self-contained VS Code-grade IDE workbench
// ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
export function CodeChamber({ id }: CodeChamberProps) {
    const { emit, ROOM_EVENTS } = useRoomEvents('code-chamber')
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

    const { rootId, activeFileId, openFiles, fileMap, loadProject, openFile, closeFile, setActiveFile, restoreSessionState, readFile, writeFile, saveProject, workspaceId } = useFileSystem()

    const [sidebarView, setSidebarView] = useState<SidebarView>("explorer")
    const [sidebarVisible, setSidebarVisible] = useState(true)
    const [panelView, setPanelView] = useState<PanelView>("terminal")
    const [panelVisible, setPanelVisible] = useState(true)
    const [cursorLine, setCursorLine] = useState(1)
    const [cursorCol, setCursorCol] = useState(1)
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
    const [lintSummary, setLintSummary] = useState<LintResult['summary'] | null>(null)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [editorSettings, setEditorSettings] = useState<EditorSettings>(() => loadEditorSettings(projectId))
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
    const [quickOpenOpen, setQuickOpenOpen] = useState(false)
    const [quickOpenQuery, setQuickOpenQuery] = useState("")
    const lintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const monacoRef = useRef<any>(null)

    // ΓöÇΓöÇΓöÇ User session and additional state ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const _codeSession = useSession()
    const userSession = _codeSession?.data ?? null
    const { session, sessionLoaded, saveSession } = useWorkspaceSession(projectId)
    const [codeDiagnostics, setCodeDiagnostics] = useState<any[]>([])
    const [codeSettings, setCodeSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('code-chamber-settings')
            return saved ? JSON.parse(saved) : { autoSave: true, showMinimap: true, theme: 'vs-dark' }
        }
        return { autoSave: true, showMinimap: true, theme: 'vs-dark' }
    })
    const [codeVersions, setCodeVersions] = useState<any[]>([])

    // ΓöÇΓöÇΓöÇ Settings event listener ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    useEffect(() => {
        const handleSettingsChange = () => {
            const saved = localStorage.getItem('code-chamber-settings')
            if (saved) {
                setCodeSettings(JSON.parse(saved))
            }
        }
        window.addEventListener('azora:settingsChanged', handleSettingsChange)
        return () => window.removeEventListener('azora:settingsChanged', handleSettingsChange)
    }, [])

    // ΓöÇΓöÇΓöÇ Version management ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const createCodeVersion = () => {
        const version = {
            id: `v${Date.now()}`,
            timestamp: new Date().toISOString(),
            files: Object.keys(fileMap).reduce((acc, fileId) => {
                const file = fileMap[fileId]
                if (file && file.content) {
                    acc[file.path] = file.content
                }
                return acc
            }, {} as Record<string, string>),
            author: userSession?.user?.name || 'Anonymous',
            description: `Version created at ${new Date().toLocaleString()}`
        }
        setCodeVersions(prev => [version, ...prev.slice(0, 49)]) // Keep max 50 versions
    }

    const restoreCodeVersion = (versionId: string) => {
        const version = codeVersions.find(v => v.id === versionId)
        if (version) {
            // Restore files from version
            Object.entries(version.files).forEach(([path, content]) => {
                const fileId = Object.keys(fileMap).find(id => fileMap[id]?.path === path)
                if (fileId) {
                    writeFile(fileId, content as string)
                }
            })
            setCodeDiagnostics(prev => [...prev, {
                id: 'version-restored',
                message: `Restored version: ${versionId}`,
                severity: 'info',
                source: 'version-control',
                line: 0,
                column: 0
            }])
        }
    }

    // ΓöÇΓöÇΓöÇ Settings update function ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const updateCodeSettings = (newSettings: Partial<typeof codeSettings>) => {
        const updated = { ...codeSettings, ...newSettings }
        setCodeSettings(updated)
        localStorage.setItem('code-chamber-settings', JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent('azora:settingsChanged', { detail: updated }))
    }

    // Apply saved session layout once loaded
    useEffect(() => {
        if (!sessionLoaded || !session) return
        setSidebarView(session.layout.sidebarView as SidebarView)
        setSidebarVisible(session.layout.sidebarVisible)
        setPanelView(session.layout.panelView as PanelView)
        setPanelVisible(session.layout.panelVisible)
        
        if (session.openFiles && session.openFiles.length > 0) {
            restoreSessionState(session.openFiles, session.activeFileId || null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionLoaded])

    // Auto-save session whenever layout or open files change
    useEffect(() => {
        if (!sessionLoaded) return
        saveSession({ sidebarView, sidebarVisible, panelView, panelVisible }, openFiles, activeFileId)
    }, [sidebarView, sidebarVisible, panelView, panelVisible, openFiles, activeFileId, saveSession, sessionLoaded])

    // Yjs Collaboration State
    const [yDoc, setYDoc] = useState<Y.Doc | null>(null)
    const [provider, setProvider] = useState<any>(null)
    const [binding, setBinding] = useState<any>(null)
    const [editorInstance, setEditorInstance] = useState<any>(null)

    /* ΓöÇΓöÇ Phase 1: Live Share Presence ΓöÇΓöÇ */
    const COLLAB_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#82E0AA', '#F0B27A', '#85C1E9']
    const [liveSharePeers, setLiveSharePeers] = useState<{clientId: number; name: string; color: string; cursor?: {line: number; col: number}; file?: string}[]>([])
    const [isLiveShareActive, setIsLiveShareActive] = useState(false)
    const [liveShareLink, setLiveShareLink] = useState('')

    /* ΓöÇΓöÇ Phase 1: AI Code Actions ΓöÇΓöÇ */
    const [aiActionResult, setAiActionResult] = useState('')
    const [isAiActionRunning, setIsAiActionRunning] = useState(false)
    const [aiActionType, setAiActionType] = useState<'explain' | 'fix' | 'refactor' | 'test' | 'doc'>('explain')

    const runAiCodeAction = async (action: typeof aiActionType, code: string) => {
        if (isAiActionRunning || !code.trim()) return
        setIsAiActionRunning(true)
        setAiActionResult('')
        setAiActionType(action)
        try {
            const resp = await fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: `/${action}`, message: code, activeFile: activeFileName }),
            })
            if (resp.ok) {
                const data = await resp.json()
                setAiActionResult(data.content || data.result || 'No result')
            } else {
                setAiActionResult(`Action failed: ${resp.status}`)
            }
        } catch (error) {
            setAiActionResult(`Error: ${error}`)
        } finally {
            setIsAiActionRunning(false)
        }
    }

    // Initialize Yjs Doc and Provider per file
    useEffect(() => {
        if (!activeFileId || !projectId) return
        let cancelled = false

        const doc = new Y.Doc()
        // Unique room name per project and file
        const roomName = `azora-buildspaces-${projectId}-${activeFileId.replace(/[^a-zA-Z0-9-]/g, '-')}`
        let webrtcProvider: any = null

        getWebrtcProvider().then(WebrtcProvider => {
            if (cancelled) return

            webrtcProvider = new WebrtcProvider(roomName, doc, {
                signaling: [
                    'wss://signaling.yjs.dev',
                    'wss://y-webrtc-signaling-eu.herokuapp.com',
                    'wss://y-webrtc-signaling-us.herokuapp.com'
                ]
            })

            setYDoc(doc)
            setProvider(webrtcProvider)

            /* Phase 1: Track awareness / presence for Live Share */
            const awarenessHandler = () => {
                const states = webrtcProvider.awareness.getStates()
                const peers: typeof liveSharePeers = []
                states.forEach((state: any, clientId: number) => {
                    if (clientId === webrtcProvider.awareness.clientID) return
                    peers.push({
                        clientId,
                        name: state?.user?.name || `User ${clientId % 100}`,
                        color: COLLAB_COLORS[clientId % COLLAB_COLORS.length],
                        cursor: state?.cursor,
                        file: state?.file,
                    })
                })
                setLiveSharePeers(peers)
                setIsLiveShareActive(peers.length > 0)
            }
            webrtcProvider.awareness.on('change', awarenessHandler)

            // Set own awareness state
            webrtcProvider.awareness.setLocalStateField('user', {
                name: userSession?.user?.name || 'Anonymous',
                color: COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)],
            })

            // Generate Live Share link
            setLiveShareLink(`${typeof window !== 'undefined' ? window.location.origin : ''}/workspace/${projectId}?share=${roomName}`)
        }).catch(() => {
            // WebRTC provider not available ΓÇö continue without collab
        })

        return () => {
            cancelled = true
            webrtcProvider?.destroy()
            doc.destroy()
            setYDoc(null)
            setProvider(null)
            setBinding(null)
        }
    }, [activeFileId, projectId])

    // Bind Monaco to Yjs
    useEffect(() => {
        if (!editorInstance || !yDoc || !provider || !activeFileId) return
        let cancelled = false
        let localBinding: any = null

        const type = yDoc.getText(activeFileId)
        const model = editorInstance.getModel()

        if (!model) return

        // If the Yjs document is empty but we have local content, initialize it
        const localContent = readFile(activeFileId)
        if (type.length === 0 && localContent) {
            type.insert(0, localContent)
        }

        getMonacoBinding().then(MonacoBinding => {
            if (cancelled) return
            localBinding = new MonacoBinding(type, model, new Set([editorInstance]), provider.awareness)
            setBinding(localBinding)
        }).catch(() => {
            // Monaco binding not available
        })

        return () => {
            cancelled = true
            localBinding?.destroy()
            setBinding(null)
        }
    }, [editorInstance, yDoc, provider, activeFileId, readFile])

    useEffect(() => { if (projectId) loadProject(projectId) }, [projectId, loadProject])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ctrl+Tab / Ctrl+Shift+Tab — cycle through open files
            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault()
                if (openFiles.length > 1 && activeFileId) {
                    const idx = openFiles.indexOf(activeFileId)
                    const next = e.shiftKey
                        ? (idx - 1 + openFiles.length) % openFiles.length
                        : (idx + 1) % openFiles.length
                    setActiveFile(openFiles[next])
                }
                return
            }
            if ((e.metaKey || e.ctrlKey) && e.key === "`") { e.preventDefault(); setPanelVisible(p => !p) }
            if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); setSidebarVisible(s => !s) }
            if ((e.metaKey || e.ctrlKey) && e.key === ",") { e.preventDefault(); setSettingsOpen((o: boolean) => !o) }
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "P") { e.preventDefault(); setCommandPaletteOpen(true) }
            if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "p") { e.preventDefault(); setQuickOpenOpen(true); setQuickOpenQuery("") }
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault()
                if (activeFileId) { const c = readFile(activeFileId); if (c !== undefined) writeFile(activeFileId, c) }
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [activeFileId, openFiles, setActiveFile, readFile, writeFile])

    const activeFileName = activeFileId ? fileMap[activeFileId]?.name || "" : ""
    const activeFileContent = activeFileId ? readFile(activeFileId) || "" : ""

    const handleEditorMount = useCallback((editor: any, monaco: any) => {
        setEditorInstance(editor)
        monacoRef.current = monaco

        // Apply persisted editor settings immediately on mount
        editor.updateOptions({
            fontSize: editorSettings.fontSize,
            tabSize: editorSettings.tabSize,
            fontFamily: editorSettings.fontFamily,
            wordWrap: editorSettings.wordWrap,
            minimap: { enabled: editorSettings.minimap },
            lineNumbers: editorSettings.lineNumbers,
            renderWhitespace: editorSettings.renderWhitespace,
            stickyScroll: { enabled: editorSettings.stickyScroll },
            bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
            cursorBlinking: editorSettings.cursorBlinking,
            fontLigatures: editorSettings.fontLigatures,
        })

        // Track cursor position for status bar
        editor.onDidChangeCursorPosition((e: any) => {
            setCursorLine(e.position.lineNumber)
            setCursorCol(e.position.column)
        })

        // Register inline AI completion provider (like Cursor/Copilot ghost text)
        const disposable = monaco.languages.registerInlineCompletionsProvider("*", {
            provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
                // Only trigger after typing pauses (debounce in the provider itself)
                const lineContent = model.getLineContent(position.lineNumber)
                const textBeforeCursor = model.getValueInRange({
                    startLineNumber: Math.max(1, position.lineNumber - 20),
                    startColumn: 1,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                })

                // Don't trigger on empty lines or very short context
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
                            range: {
                                startLineNumber: position.lineNumber,
                                startColumn: position.column,
                                endLineNumber: position.lineNumber,
                                endColumn: position.column,
                            },
                        }],
                    }
                } catch {
                    return { items: [] }
                }
            },
            freeInlineCompletions: () => { },
        })

        // Add Ctrl+Shift+I shortcut for "Explain Selection"
        editor.addAction({
            id: "elara-explain",
            label: "Elara: Explain Selection",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI],
            contextMenuGroupId: "1_modification",
            contextMenuOrder: 1.5,
            run: async (ed: any) => {
                const selection = ed.getSelection()
                const selectedText = ed.getModel()?.getValueInRange(selection)
                if (!selectedText) return
                // The AI sidebar would pick this up ΓÇö for now show inline
                const decoration = ed.createDecorationsCollection([{
                    range: selection,
                    options: {
                        className: "elara-highlight",
                        glyphMarginClassName: "elara-glyph",
                        after: { content: " ≡ƒºá Analyzing...", inlineClassName: "elara-inline-hint" },
                    },
                }])
                setTimeout(() => decoration.clear(), 3000)
            },
        })

        // Cleanup
        return () => disposable.dispose()
    }, [activeFileName])

    const handleEditorChange = useCallback((value: string | undefined) => {
        if (activeFileId && value !== undefined) {
            writeFile(activeFileId, value)
            // Debounced lint on change
            if (lintTimeoutRef.current) clearTimeout(lintTimeoutRef.current)
            lintTimeoutRef.current = setTimeout(async () => {
                if (!value || !activeFileName) return
                try {
                    const res = await fetch('/api/code-chamber/lint', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: value, language: getLanguage(activeFileName), filename: activeFileName })
                    })
                    if (!res.ok) return
                    const data: LintResult = await res.json()
                    setDiagnostics(data.diagnostics || [])
                    setLintSummary(data.summary || null)
                    // Push markers into Monaco model
                    if (monacoRef.current && editorInstance) {
                        const model = editorInstance.getModel()
                        if (model) {
                            const markers = (data.diagnostics || []).map((d: Diagnostic) => ({
                                startLineNumber: d.line,
                                endLineNumber: d.line,
                                startColumn: d.column || 1,
                                endColumn: d.column ? d.column + 12 : model.getLineLength(d.line) + 1,
                                message: `${d.message} (${d.rule})`,
                                severity: d.severity === 'error'
                                    ? monacoRef.current.MarkerSeverity.Error
                                    : d.severity === 'warning'
                                        ? monacoRef.current.MarkerSeverity.Warning
                                        : monacoRef.current.MarkerSeverity.Info,
                            }))
                            monacoRef.current.editor.setModelMarkers(model, 'elara-lint', markers)
                        }
                    }
                } catch { /* lint errors are non-fatal */ }
            }, 1500)
        }
    }, [activeFileId, activeFileName, writeFile, editorInstance])

    const handleSidebarViewChange = useCallback((v: SidebarView) => {
        if (sidebarView === v && sidebarVisible) setSidebarVisible(false)
        else { setSidebarView(v); if (!sidebarVisible) setSidebarVisible(true) }
    }, [sidebarView, sidebarVisible])

    const renderSidebar = () => {
        switch (sidebarView) {
            case "explorer": return <ExplorerSidebar />
            case "search": return <SearchSidebar />
            case "git": return <GitSidebar />
            case "extensions": return <ExtensionsSidebar />
            case "ai": return <AISidebar />
            default: return <ExplorerSidebar />
        }
    }

    const renderPanel = () => {
        switch (panelView) {
            case "terminal": return <div className="h-full bg-[#0d1117]"><XTerminal /></div>
            case "problems": return (
                <div className="h-full bg-[#0d1117] overflow-y-auto">
                    {diagnostics.length === 0 ? (
                        <div className="text-[13px] text-[#484f58] text-center py-8">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                            <p>No problems detected</p>
                            <p className="text-[11px] mt-1">{lintSummary ? `Quality score: ${lintSummary.score}/100` : 'Save a file to lint it'}</p>
                        </div>
                    ) : (
                        <div className="py-1">
                            {diagnostics.map((d, i) => (
                                <div key={i} className={cn(
                                    "flex items-start gap-3 px-4 py-2 hover:bg-[#1f1f1f] cursor-pointer transition-colors border-l-2",
                                    d.severity === 'error' ? 'border-red-500' : d.severity === 'warning' ? 'border-yellow-500' : 'border-blue-500'
                                )}>
                                    <div className={cn("text-[11px] font-bold uppercase shrink-0 mt-0.5",
                                        d.severity === 'error' ? 'text-red-400' : d.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                    )}>{d.severity === 'error' ? 'ΓùÅ' : d.severity === 'warning' ? 'Γû▓' : 'Γä╣'}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] text-[#c9d1d9]">{d.message}</div>
                                        <div className="text-[11px] text-[#484f58] mt-0.5">
                                            {activeFileName}:{d.line}{d.column ? `:${d.column}` : ''} ┬╖ {d.rule}
                                        </div>
                                        {d.fix && <div className="text-[11px] text-emerald-400 mt-0.5">≡ƒÆí {d.fix}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
            case "output": return <div className="h-full bg-[#0d1117] p-4 font-mono text-[13px] text-[#c9d1d9]"><div className="text-[#8b949e]">[Output] Ready.</div></div>
            case "debug": return <div className="h-full bg-[#0d1117] p-4"><div className="text-[13px] text-[#484f58] text-center py-8"><Bug className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No debug session active</p><p className="text-[11px] mt-1">Start debugging with F5</p></div></div>
            case "diagnostics": return (
                <div className="h-full bg-[#0d1117] overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-medium text-white">System Diagnostics</h3>
                            <Button size="sm" variant="outline" onClick={() => setCodeDiagnostics([])} className="h-6 text-[11px]">Clear</Button>
                        </div>
                        {codeDiagnostics.length === 0 ? (
                            <div className="text-[13px] text-[#484f58] text-center py-8">
                                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                                <p>All systems operational</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {codeDiagnostics.map((diag: any, i: number) => (
                                    <div key={i} className={cn(
                                        "flex items-start gap-3 p-3 rounded border",
                                        diag.severity === 'error' ? 'border-red-500/20 bg-red-500/5' : 
                                        diag.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 
                                        'border-blue-500/20 bg-blue-500/5'
                                    )}>
                                        <div className={cn("text-[11px] font-bold uppercase shrink-0 mt-0.5",
                                            diag.severity === 'error' ? 'text-red-400' : 
                                            diag.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                        )}>
                                            {diag.severity === 'error' ? 'ΓùÅ' : diag.severity === 'warning' ? 'Γû▓' : 'Γä╣'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] text-[#c9d1d9]">{diag.message}</div>
                                            <div className="text-[11px] text-[#484f58] mt-0.5">
                                                {diag.source} ┬╖ {new Date(diag.timestamp || Date.now()).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
            case "history": return (
                <div className="h-full bg-[#0d1117] overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-medium text-white">Version History</h3>
                            <Button size="sm" onClick={createCodeVersion} className="h-6 text-[11px] bg-[#238636] hover:bg-[#2ea043]">Create Version</Button>
                        </div>
                        {codeVersions.length === 0 ? (
                            <div className="text-[13px] text-[#484f58] text-center py-8">
                                <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p>No versions saved yet</p>
                                <p className="text-[11px] mt-1">Create your first version to start tracking changes</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {codeVersions.map((version: any, i: number) => (
                                    <div key={version.id} className="flex items-center gap-3 p-3 rounded border border-[#30363d] hover:border-[#1f6feb]/50 transition-colors">
                                        <Star className="w-4 h-4 text-amber-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[13px] text-[#c9d1d9] font-medium">{version.description}</div>
                                            <div className="text-[11px] text-[#484f58]">
                                                {version.author} ┬╖ {new Date(version.timestamp).toLocaleString()} ┬╖ {Object.keys(version.files).length} files
                                            </div>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => restoreCodeVersion(version.id)} className="h-6 text-[11px]">Restore</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )
            case "ai-actions": return (
                <div className="h-full bg-[#0d1117] overflow-y-auto">
                    <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-medium text-white flex items-center gap-2">
                                <Bot className="w-4 h-4 text-purple-400" />
                                AI Code Actions
                            </h3>
                            {aiActionResult && (
                                <Button size="sm" variant="outline" onClick={() => { setAiActionResult(''); setAiActionType('explain'); }} className="h-6 text-[11px]">Clear</Button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(['explain', 'fix', 'refactor', 'test', 'doc'] as const).map((action) => (
                                <Button
                                    key={action}
                                    size="sm"
                                    variant="outline"
                                    disabled={isAiActionRunning || !activeFileId}
                                    onClick={() => {
                                        const sel = editorInstance?.getModel()?.getValueInRange(editorInstance?.getSelection() || { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }) || '';
                                        const code = sel || editorInstance?.getValue() || '';
                                        runAiCodeAction(action, code);
                                        setPanelView('ai-actions');
                                    }}
                                    className={cn("h-7 text-[11px] capitalize", aiActionType === action && isAiActionRunning && "border-purple-500/50")}
                                >
                                    {isAiActionRunning && aiActionType === action ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : null}
                                    {action}
                                </Button>
                            ))}
                        </div>
                        {isAiActionRunning && (
                            <div className="flex items-center gap-2 text-[13px] text-purple-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Running {aiActionType} action...
                            </div>
                        )}
                        {aiActionResult && !isAiActionRunning && (
                            <div className="rounded border border-[#30363d] bg-[#161b22] overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]">
                                    <span className="text-[11px] text-purple-400 uppercase font-medium">{aiActionType} Result</span>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(aiActionResult)}
                                        className="text-[11px] text-[#8b949e] hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <Copy className="w-3 h-3" /> Copy
                                    </button>
                                </div>
                                <pre className="p-3 text-[13px] text-[#c9d1d9] font-mono whitespace-pre-wrap overflow-x-auto max-h-[300px]">{aiActionResult}</pre>
                            </div>
                        )}
                        {!aiActionResult && !isAiActionRunning && (
                            <div className="text-[13px] text-[#484f58] text-center py-8">
                                <Bot className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p>Select code and run an action</p>
                                <p className="text-[11px] mt-1">Or run on the entire file with no selection</p>
                            </div>
                        )}
                    </div>
                </div>
            )
            default: return null
        }
    }

    return (
        <TooltipProvider delayDuration={300}>
            <div className="h-full w-full flex flex-col bg-[#0d1117] overflow-hidden">
                {/* Title Bar */}
                <div className="h-9 flex items-center justify-between px-3 bg-[#010409] border-b border-[#1b1f27] shrink-0 select-none">
                    <div className="flex items-center gap-3 text-[13px]">
                        <div className="flex items-center gap-2 text-[#c9d1d9]">
                            <Code className="w-4 h-4 text-emerald-400" />
                            <span className="font-medium">Code Chamber</span>
                        </div>
                        <span className="text-[#30363d]">ΓÇö</span>
                        <span className="text-[#8b949e] truncate max-w-[300px]">{activeFileName || "No file open"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[#8b949e] hover:text-white hover:bg-[#30363d] gap-1.5"
                            onClick={() => { setPanelVisible(true); setPanelView("terminal") }}>
                            <Play className="w-3 h-3 text-emerald-400" />Run
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[#8b949e] hover:text-white hover:bg-[#30363d] gap-1.5"
                            onClick={async () => {
                                if (!projectId) return
                                try {
                                    const res = await fetch("/api/deploy", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            action: "deploy",
                                            projectId,
                                            projectName: projectId,
                                            environment: "development",
                                            buildType: "preview",
                                        })
                                    })
                                    const data = await res.json()
                                    if (!res.ok && !data?.status) {
                                        alert(`Deploy failed: ${data.error || 'Unknown error'}`)
                                    } else if (data?.status === 'not_ready') {
                                        alert(data?.message || 'Deploy backend is not ready yet')
                                    } else {
                                        alert(`Deploy initiated: ${data.status || 'success'}`)
                                    }
                                } catch (e: any) {
                                    alert(`Deploy error: ${e.message}`)
                                }
                            }}>
                            <Globe className="w-3 h-3 text-[#54aeff]" />Deploy
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-[#8b949e] hover:text-white hover:bg-[#30363d] gap-1.5"
                            onClick={() => saveProject()}>
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
                        onSettingsOpen={() => setSettingsOpen((o: boolean) => !o)}
                    />

                    <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
                        {/* Settings panel overlay */}
                        {settingsOpen && (
                            <SettingsPanel
                                projectId={projectId}
                                onClose={() => setSettingsOpen(false)}
                                onApply={(s) => {
                                    setEditorSettings(s)
                                    if (editorInstance) {
                                        editorInstance.updateOptions({
                                            fontSize: s.fontSize,
                                            tabSize: s.tabSize,
                                            fontFamily: s.fontFamily,
                                            wordWrap: s.wordWrap,
                                            minimap: { enabled: s.minimap },
                                            lineNumbers: s.lineNumbers,
                                            renderWhitespace: s.renderWhitespace,
                                            stickyScroll: { enabled: s.stickyScroll },
                                            bracketPairColorization: { enabled: s.bracketPairColorization },
                                            cursorBlinking: s.cursorBlinking,
                                            fontLigatures: s.fontLigatures,
                                        })
                                    }
                                }}
                            />
                        )}
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
                                            {/* Editor Tabs */}
                                            <div role="tablist" aria-label="Open files" className="flex items-center bg-[#010409] border-b border-[#1b1f27] overflow-x-auto shrink-0 scrollbar-none min-h-[35px]">
                                                {openFiles.map((fId) => {
                                                    const file = fileMap[fId]
                                                    if (!file) return null
                                                    const isActive = activeFileId === fId
                                                    return (
                                                        <button 
                                                            key={fId} 
                                                            role="tab"
                                                            aria-selected={isActive}
                                                            aria-controls={`editor-panel-${fId}`}
                                                            onClick={() => setActiveFile(fId)} 
                                                            className={cn("group flex items-center gap-2 h-[35px] px-3 text-[13px] border-r border-[#1b1f27] transition-colors shrink-0", isActive ? "bg-[#0d1117] text-white border-t-2 border-t-[#1f6feb]" : "bg-[#010409] text-[#8b949e] hover:text-[#c9d1d9] border-t-2 border-t-transparent")}
                                                        >
                                                            {getFileIcon(file.name)}
                                                            <span>{file.name}</span>
                                                            <button onClick={(e) => { e.stopPropagation(); closeFile(fId) }} className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#30363d] transition-all"><X className="w-3 h-3" /></button>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            {/* Breadcrumb bar */}
                                            {activeFileName && <BreadcrumbBar fileName={activeFileName} />}

                                            {/* Editor / Welcome */}
                                            <div className="flex-1 min-h-0 relative">
                                                {activeFileId ? (
                                                    <>
                                                        {provider && (
                                                            <div className="absolute top-2 right-6 z-10 flex items-center gap-2 px-2 py-1 rounded-md bg-[#161b22] border border-[#30363d] text-[11px] text-[#8b949e] shadow-sm">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span>Live Collaboration Active</span>
                                                                {liveSharePeers.length > 0 && (
                                                                    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[#30363d]">
                                                                        {liveSharePeers.slice(0, 4).map((peer) => (
                                                                            <div
                                                                                key={peer.clientId}
                                                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                                                                style={{ backgroundColor: peer.color }}
                                                                                title={peer.name}
                                                                            >
                                                                                {peer.name.charAt(0).toUpperCase()}
                                                                            </div>
                                                                        ))}
                                                                        {liveSharePeers.length > 4 && (
                                                                            <span className="text-[10px] text-[#8b949e]">+{liveSharePeers.length - 4}</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {isLiveShareActive && liveShareLink && (
                                                                    <button
                                                                        onClick={() => { navigator.clipboard.writeText(liveShareLink); }}
                                                                        className="ml-2 pl-2 border-l border-[#30363d] hover:text-white transition-colors"
                                                                        title="Copy share link"
                                                                    >
                                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                        <ErrorBoundary fallback={() => <div className="h-full flex items-center justify-center text-red-400">Editor failed to load</div>}>
                                                            <MonacoEditor
                                                                height="100%"
                                                                path={activeFileId}
                                                                language={getLanguage(activeFileName)}
                                                                theme="vs-dark"
                                                                value={activeFileContent}
                                                                onChange={handleEditorChange}
                                                                onMount={handleEditorMount}
                                                                options={{
                                                                    minimap: { enabled: true, maxColumn: 80 },
                                                                    fontSize: 13,
                                                                    lineNumbers: "on",
                                                                    scrollBeyondLastLine: false,
                                                                    automaticLayout: true,
                                                                    tabSize: 2,
                                                                    wordWrap: "off",
                                                                    padding: { top: 8 },
                                                                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                                                    fontLigatures: true,
                                                                    cursorBlinking: "smooth",
                                                                    cursorSmoothCaretAnimation: "on",
                                                                    smoothScrolling: true,
                                                                    renderLineHighlight: "all",
                                                                    bracketPairColorization: { enabled: true },
                                                                    guides: { bracketPairs: true },
                                                                    suggest: { showMethods: true, showFunctions: true },
                                                                    stickyScroll: { enabled: true },
                                                                    renderWhitespace: "boundary",
                                                                }}
                                                            />
                                                        </ErrorBoundary>
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
                                                    <PanelTabs
                                                        activePanel={panelView}
                                                        onPanelChange={setPanelView}
                                                        onClose={() => setPanelVisible(false)}
                                                        errorCount={lintSummary?.errors}
                                                        warningCount={lintSummary?.warnings}
                                                    />
                                                    <div className="flex-1 overflow-hidden">
                                                        <ErrorBoundary fallback={() => <div className="h-full flex items-center justify-center text-red-400">Panel failed to load</div>}>
                                                            {renderPanel()}
                                                        </ErrorBoundary>
                                                    </div>
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
                    errorCount={diagnostics.filter((d: Diagnostic) => d.severity === 'error').length}
                    warningCount={diagnostics.filter((d: Diagnostic) => d.severity === 'warning').length}
                />
            </div>

            {/* Command Palette (Ctrl+Shift+P) */}
            <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

            {/* Quick Open (Ctrl+P) ΓÇö file fuzzy search */}
            {quickOpenOpen && (
                <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" onClick={() => setQuickOpenOpen(false)}>
                    <div className="w-[520px] bg-[#1c2128] border border-[#30363d] rounded-lg shadow-2xl overflow-hidden" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <input
                            autoFocus
                            value={quickOpenQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuickOpenQuery(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Escape") setQuickOpenOpen(false) }}
                            placeholder="Search files by name..."
                            className="w-full bg-transparent border-b border-[#30363d] px-4 py-3 text-[14px] text-white placeholder-[#484f58] outline-none"
                        />
                        <div className="max-h-[300px] overflow-y-auto">
                            {Object.values(fileMap)
                                .filter((n: any) => n.type === "file" && n.name.toLowerCase().includes(quickOpenQuery.toLowerCase()))
                                .slice(0, 15)
                                .map((n: any) => (
                                    <button
                                        key={n.id}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-[#c9d1d9] hover:bg-[#1f6feb33] transition-colors text-left"
                                        onClick={() => { openFile(n.id); setQuickOpenOpen(false) }}
                                    >
                                        {getFileIcon(n.name)}
                                        <span className="flex-1 truncate">{n.name}</span>
                                        <span className="text-[11px] text-[#484f58] truncate max-w-[200px]">{n.path}</span>
                                    </button>
                                ))}
                            {Object.values(fileMap).filter((n: any) => n.type === "file" && n.name.toLowerCase().includes(quickOpenQuery.toLowerCase())).length === 0 && (
                                <div className="px-4 py-6 text-center text-[13px] text-[#484f58]">No files found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </TooltipProvider>
    )
}

export default CodeChamber

