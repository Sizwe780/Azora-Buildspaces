"use client"

import { useFileSystem } from "@/lib/stores/file-system"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, MoreVertical, GitBranch, FileText, Settings, Image, Code, Database, Upload, FolderInput, Pencil, Copy, Search, X, ArrowLeftRight } from "lucide-react"
import { useState, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useVirtualList } from "@/lib/hooks/use-virtual-list"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { OutlineView } from "./outline-view"
import { TimelineView } from "./timeline-view"

interface FileNode {
    id: string
    name: string
    type: 'file' | 'directory'
    children?: string[]
    parentId?: string | null
    path: string
    isOpen?: boolean
    gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked'
}

const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'tsx':
        case 'ts':
        case 'jsx':
        case 'js':
            return <Code className="w-4 h-4 text-blue-400" />
        case 'json':
            return <Settings className="w-4 h-4 text-yellow-400" />
        case 'md':
            return <FileText className="w-4 h-4 text-gray-400" />
        case 'sql':
        case 'db':
            return <Database className="w-4 h-4 text-green-400" />
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'svg':
        case 'gif':
            return <Image className="w-4 h-4 text-purple-400" />
        default:
            return <File className="w-4 h-4 text-gray-400" />
    }
}

const getGitStatusColor = (status?: string) => {
    switch (status) {
        case 'modified': return 'bg-yellow-500'
        case 'added': return 'bg-green-500'
        case 'deleted': return 'bg-red-500'
        case 'untracked': return 'bg-blue-500'
        default: return 'transparent'
    }
}

export function ExplorerView() {
    const {
        fileMap,
        openFile,
        activeFileId,
        createFile,
        createDirectory,
        deleteNode,
        rootId,
        renameNode,
        moveNode,
        closeFile: closeFileSystemFile,
        setActiveFile: setFileSystemActiveFile,
    } = useFileSystem()
    const {
        editorGroups,
        activeGroupId,
        closeFile: closeWorkbenchFile,
        setActiveFile: setWorkbenchActiveFile,
        currentGitBranch,
        dirtyFiles,
    } = useWorkbench()
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([rootId || '']))
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
    const [openEditorsExpanded, setOpenEditorsExpanded] = useState(true)
    const [explorerExpanded, setExplorerExpanded] = useState(true)
    const [outlineExpanded, setOutlineExpanded] = useState(false)
    const [timelineExpanded, setTimelineExpanded] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const [dragOverId, setDragOverId] = useState<string | null>(null)

    const handleStartRename = (fileId: string, currentName: string) => {
        setRenamingId(fileId)
        setRenameValue(currentName)
    }

    const handleRenameSubmit = async (fileId: string) => {
        if (renameValue.trim() && renameNode) {
            await renameNode(fileId, renameValue.trim())
        }
        setRenamingId(null)
        setRenameValue('')
    }

    const handleCopyPath = async (file: any) => {
        try {
            await navigator.clipboard.writeText(file.path)
        } catch (error) {
            console.error('Failed to copy path:', error)
        }
    }

    const handleUploadFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        for (const file of Array.from(files)) {
            const text = await file.text()
            await createFile(rootId || null, file.name, text)
        }
        // Reset input so same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = ""
    }, [createFile, rootId])

    const handleOpenFromDisk = () => {
        fileInputRef.current?.click()
    }

    const handleDuplicate = async (file: FileNode) => {
        if (file.type === 'file' && file.parentId !== undefined) {
            const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
            const baseName = file.name.replace(ext, '')
            const newName = `${baseName}-copy${ext}`
            const content = fileMap[file.id]?.content || ''
            await createFile(file.parentId, newName, content)
        }
    }

    // Get all open files across editor groups for the Open Editors section
    const allOpenFiles = editorGroups.flatMap(g => g.openFiles)
    const uniqueOpenFiles = [...new Set(allOpenFiles)]

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders)
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId)
        } else {
            newExpanded.add(folderId)
        }
        setExpandedFolders(newExpanded)
    }

    const openWorkspaceFile = useCallback((filePath: string) => {
        openFile(filePath)
        setFileSystemActiveFile(filePath)
        setWorkbenchActiveFile(filePath)
    }, [openFile, setFileSystemActiveFile, setWorkbenchActiveFile])

    const closeWorkspaceFile = useCallback((filePath: string) => {
        closeFileSystemFile(filePath)
        closeWorkbenchFile(filePath)
    }, [closeFileSystemFile, closeWorkbenchFile])

    // Flatten file tree for virtualization (supports 10k+ files)
    const flattenedTree = useMemo(() => {
        const result: { file: any; depth: number }[] = []
        const flatten = (parentId: string | null, depth: number) => {
            const children = Object.values(fileMap).filter((f: any) => f.parentId === parentId)
            // Sort: folders first, then alphabetical
            children.sort((a: any, b: any) => {
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
                return a.name.localeCompare(b.name)
            })
            for (const child of children) {
                result.push({ file: child, depth })
                if (child.type === 'directory' && expandedFolders.has(child.id)) {
                    flatten(child.id, depth + 1)
                }
            }
        }
        flatten(rootId || null, 0)
        return result
    }, [fileMap, expandedFolders, rootId])

    // Virtual list for large file trees
    const { containerRef: virtualContainerRef, handleScroll: virtualHandleScroll, totalHeight, virtualItems } = useVirtualList({
        itemCount: flattenedTree.length,
        itemHeight: 24,
        overscan: 10,
    })

    const renderFileTree = (parentId: string | null = null, depth = 0): React.ReactNode[] => {
        const children = Object.values(fileMap).filter(file => file.parentId === parentId)

        return children.map((file) => {
            const isExpanded = expandedFolders.has(file.id)
            const hasChildren = file.type === 'directory' && file.children && file.children.length > 0
            const filePath = file.path || file.id
            const isActive = activeFileId === filePath

            return (
                <div key={file.id}>
                    <ContextMenu>
                        <ContextMenuTrigger asChild>
                            <div
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', file.id)
                                    e.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    e.dataTransfer.dropEffect = 'move'
                                    if (file.type === 'directory') {
                                        setDragOverId(file.id)
                                    }
                                }}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setDragOverId(null)
                                    const draggedId = e.dataTransfer.getData('text/plain')
                                    if (draggedId && draggedId !== file.id && file.type === 'directory') {
                                        moveNode(draggedId, file.id)
                                        // Auto expand target folder
                                        setExpandedFolders(prev => new Set([...prev, file.id]))
                                    }
                                }}
                                className={`flex items-center gap-1 px-1.5 py-0.5 text-[12px] cursor-pointer select-none transition-colors group ${isActive
                                    ? "bg-accent/20 text-accent"
                                    : selectedFiles.has(file.id)
                                        ? "bg-blue-500/20 text-blue-400"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    } ${dragOverId === file.id ? "ring-1 ring-primary/50 bg-primary/10" : ""}`}
                                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                                onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        // Multi-select with Ctrl/Cmd
                                        setSelectedFiles(prev => {
                                            const newSelected = new Set(prev)
                                            if (newSelected.has(file.id)) {
                                                newSelected.delete(file.id)
                                            } else {
                                                newSelected.add(file.id)
                                            }
                                            return newSelected
                                        })
                                    } else {
                                        // Single select - clear previous selection
                                        setSelectedFiles(new Set([file.id]))
                                        if (file.type === 'directory') {
                                            toggleFolder(file.id)
                                        } else {
                                            openWorkspaceFile(filePath)
                                        }
                                    }
                                }}
                            >
                                {/* Expand/Collapse Icon */}
                                {file.type === 'directory' && (
                                    <div className="w-4 h-4 flex items-center justify-center">
                                        {hasChildren && (
                                            isExpanded ?
                                                <ChevronDown className="w-3 h-3" /> :
                                                <ChevronRight className="w-3 h-3" />
                                        )}
                                    </div>
                                )}

                                {/* File/Folder Icon */}
                                {file.type === 'directory' ? (
                                    isExpanded ?
                                        <FolderOpen className="w-4 h-4 text-blue-400" /> :
                                        <Folder className="w-4 h-4 text-blue-400" />
                                ) : (
                                    getFileIcon(file.name)
                                )}

                                {/* File Name (inline rename) */}
                                {renamingId === file.id ? (
                                    <Input
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRenameSubmit(file.id)
                                            if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') }
                                        }}
                                        onBlur={() => handleRenameSubmit(file.id)}
                                        autoFocus
                                        className="h-5 text-xs px-1 py-0 flex-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="truncate flex-1">{file.name}</span>
                                )}

                                {/* File Decorations */}
                                <div className="flex items-center gap-1 ml-auto">
                                    {/* Git Status Indicator */}
                                    {(file as any).gitStatus && (
                                        <div
                                            className={`w-1.5 h-1.5 rounded-full ${getGitStatusColor((file as any).gitStatus)}`}
                                            title={`Git: ${(file as any).gitStatus}`}
                                        />
                                    )}

                                    {/* Error/Warning Indicators */}
                                    {(file as any).hasErrors && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Contains errors" />
                                    )}

                                    {(file as any).hasWarnings && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" title="Contains warnings" />
                                    )}
                                </div>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            {file.type === 'directory' ? (
                                <>
                                    <ContextMenuItem onClick={() => createFile(file.id, 'new-file.txt')}>
                                        <File className="w-4 h-4 mr-2" />New File
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => createDirectory(file.id, 'new-folder')}>
                                        <Folder className="w-4 h-4 mr-2" />New Folder
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => handleStartRename(file.id, file.name)}>
                                        <Pencil className="w-4 h-4 mr-2" />Rename
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleCopyPath(file)}>
                                        <Copy className="w-4 h-4 mr-2" />Copy Path
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => handleCopyPath(file)}>
                                        <Copy className="w-4 h-4 mr-2" />Copy Path
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => {
                                        // In a real implementation, this would open search view with folder filter
                                        console.log('Search in folder:', file.path)
                                    }}>
                                        <Search className="w-4 h-4 mr-2" />Find in Folder
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => deleteNode(file.id)} className="text-red-600">
                                        Delete
                                    </ContextMenuItem>
                                </>
                            ) : (
                                <>
                                    <ContextMenuItem onClick={() => openWorkspaceFile(filePath)}>
                                        Open
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => handleStartRename(file.id, file.name)}>
                                        <Pencil className="w-4 h-4 mr-2" />Rename
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleDuplicate(file)}>
                                        <Copy className="w-4 h-4 mr-2" />Duplicate
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleCopyPath(file)}>
                                        <Copy className="w-4 h-4 mr-2" />Copy Path
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={async () => {
                                        try {
                                            const clipboardText = await navigator.clipboard.readText();
                                            // Dispatch an event to the editor-panel to handle diff logic, or read file directly
                                            const fileContentReq = await fetch(`/api/fs/read?path=${encodeURIComponent(file.path)}`);
                                            if (fileContentReq.ok) {
                                                const data = await fileContentReq.json();
                                                const { useWorkbench } = await import("@/lib/stores/workbench-store");
                                                useWorkbench.getState().openDiffEditor('Clipboard', file.name, clipboardText, data.content);
                                            }
                                        } catch (e) {
                                            console.error("Failed to compare with clipboard:", e);
                                        }
                                    }}>
                                        <ArrowLeftRight className="w-4 h-4 mr-2" />Compare with Clipboard
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => deleteNode(file.id)} className="text-red-600">
                                        Delete
                                    </ContextMenuItem>
                                </>
                            )}
                        </ContextMenuContent>
                    </ContextMenu>

                    {/* Render children if expanded */}
                    {file.type === 'directory' && isExpanded && hasChildren && (
                        <div>
                            {renderFileTree(file.id, depth + 1)}
                        </div>
                    )}
                </div>
            )
        })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Hidden file input for upload */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleUploadFiles}
                aria-label="Upload files"
            />

            {/* Header */}
            <div className="p-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between border-b border-border/30" role="heading" aria-level={1}>
                <span className="px-0.5">Explorer</span>
            </div>

            {/* Open Editors Section */}
            <div className="border-b border-border/30">
                <div
                    className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setOpenEditorsExpanded(!openEditorsExpanded)}
                >
                    {openEditorsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className="flex-1">Open Editors</span>
                    <span className="text-[10px] font-normal opacity-60">{uniqueOpenFiles.length}</span>
                </div>
                {openEditorsExpanded && uniqueOpenFiles.length > 0 && (
                    <div className="pb-1">
                        {uniqueOpenFiles.map((fileId) => {
                            const file = fileMap[fileId]
                            const name = file?.name || fileId.split('/').pop() || fileId
                            const isActive = activeFileId === fileId
                            const isDirty = dirtyFiles.has(fileId)
                            return (
                                <div
                                    key={fileId}
                                    className={`flex items-center gap-1.5 px-2 py-0.5 text-sm cursor-pointer group ${isActive ? "bg-accent/20 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        }`}
                                    style={{ paddingLeft: '20px' }}
                                    onClick={() => {
                                        openWorkspaceFile(fileId)
                                    }}
                                >
                                    {getFileIcon(name)}
                                    <span className="truncate flex-1">{name}</span>
                                    {isDirty && <span className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0" title="Unsaved changes" />}
                                    <button
                                        className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            closeWorkspaceFile(fileId)
                                        }}
                                        title="Close"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ─── EXPLORER Section (file tree) ─── */}
            <div className={`border-b border-border/30 ${explorerExpanded ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
                <div
                    className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors group/section"
                    onClick={() => setExplorerExpanded(!explorerExpanded)}
                >
                    {explorerExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className="flex-1">Explorer</span>
                    {explorerExpanded && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/section:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="w-5 h-5" onClick={handleOpenFromDisk} title="Upload files">
                                <Upload className="w-3 h-3" />
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-5 h-5">
                                        <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => createFile(rootId || null, 'new-file.txt')}>
                                        <File className="w-4 h-4 mr-2" />
                                        New File
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => createDirectory(rootId || null, 'new-folder')}>
                                        <Folder className="w-4 h-4 mr-2" />
                                        New Folder
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleOpenFromDisk}>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload Files
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-5 h-5">
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setOutlineExpanded(v => !v)}>
                                        {outlineExpanded ? 'Hide' : 'Show'} Outline
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTimelineExpanded(v => !v)}>
                                        {timelineExpanded ? 'Hide' : 'Show'} Timeline
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => {
                                        setExpandedFolders(new Set([rootId || '']))
                                    }}>
                                        Collapse All
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
                {explorerExpanded && (
                    <>
                        {/* Git Status Summary */}
                        <div className="px-2 py-1">
                            <div className="flex items-center gap-2 text-[11px]">
                                <GitBranch className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{currentGitBranch}</span>
                            </div>
                        </div>

                        {/* File Tree — virtualized for 10k+ files */}
                        <div
                            ref={virtualContainerRef}
                            className="flex-1 overflow-auto"
                            onScroll={virtualHandleScroll}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                            onDrop={(e) => {
                                e.preventDefault()
                                setDragOverId(null)
                                const draggedId = e.dataTransfer.getData('text/plain')
                                if (draggedId) {
                                    moveNode(draggedId, rootId || null)
                                }
                            }}
                        >
                            {flattenedTree.length > 500 ? (
                                /* Virtualized rendering for large trees */
                                <div style={{ height: totalHeight, position: 'relative' }}>
                                    {virtualItems.map(({ index, start }) => {
                                        const { file, depth } = flattenedTree[index]
                                        const filePath = file.path || file.id
                                        const isActive = activeFileId === filePath
                                        const isExpanded = expandedFolders.has(file.id)
                                        const hasChildren = file.type === 'directory' && file.children && file.children.length > 0

                                        return (
                                            <div
                                                key={file.id}
                                                className={`flex items-center gap-1.5 px-2 text-sm cursor-pointer select-none transition-colors ${isActive
                                                    ? "bg-accent/20 text-accent"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                    }`}
                                                style={{ position: 'absolute', top: start, left: 0, right: 0, height: 24, paddingLeft: `${depth * 12 + 8}px` }}
                                                onClick={() => {
                                                    if (file.type === 'directory') {
                                                        toggleFolder(file.id)
                                                    } else {
                                                        openWorkspaceFile(filePath)
                                                    }
                                                }}
                                            >
                                                {file.type === 'directory' && (
                                                    <div className="w-4 h-4 flex items-center justify-center">
                                                        {hasChildren && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                                                    </div>
                                                )}
                                                {file.type === 'directory' ? (
                                                    isExpanded ? <FolderOpen className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-blue-400" />
                                                ) : (
                                                    getFileIcon(file.name)
                                                )}
                                                <span className="truncate flex-1">{file.name}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                /* Standard recursive rendering for smaller trees */
                                renderFileTree()
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ─── OUTLINE Section ─── */}
            <div className={`border-b border-border/30 ${outlineExpanded ? 'min-h-[120px] max-h-[40%] flex flex-col' : ''}`}>
                <div
                    className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors group/section"
                    onClick={() => setOutlineExpanded(!outlineExpanded)}
                >
                    {outlineExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className="flex-1">Outline</span>
                    {outlineExpanded && (
                        <div className="opacity-0 group-hover/section:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-5 h-5">
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setOutlineExpanded(false)}>Hide Outline</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
                {outlineExpanded && (
                    <div className="flex-1 overflow-auto">
                        <OutlineView
                            activeFile={activeFileId}
                            onNavigateToLine={(file, line) => {
                                window.dispatchEvent(new CustomEvent('azora:navigateToLine', { detail: { file, line } }))
                            }}
                        />
                    </div>
                )}
            </div>

            {/* ─── TIMELINE Section ─── */}
            <div className={`${timelineExpanded ? 'min-h-[120px] max-h-[40%] flex flex-col' : ''}`}>
                <div
                    className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/30 transition-colors group/section"
                    onClick={() => setTimelineExpanded(!timelineExpanded)}
                >
                    {timelineExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span className="flex-1">Timeline</span>
                    {timelineExpanded && (
                        <div className="opacity-0 group-hover/section:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="w-5 h-5">
                                        <MoreVertical className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setTimelineExpanded(false)}>Hide Timeline</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>
                {timelineExpanded && (
                    <div className="flex-1 overflow-auto">
                        <TimelineView
                            activeFile={activeFileId}
                            onNavigateToFile={(file) => openWorkspaceFile(file)}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
