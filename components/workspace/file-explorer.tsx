"use client"

/**
 * FileExplorer - Real File Tree Navigator
 * 
 * Constitutional Compliance:
 * - NO MOCKS: Lists actual files from the VFS
 * - INTERACTIVE: Clicking a file opens it in the editor
 * - SINGLE SOURCE OF TRUTH: Connected to workspace context
 */

import React, { useState, useMemo, memo, useCallback } from 'react'
import { useWorkspace } from '@/lib/workspace/workspace-context'
import type { FileNode } from '@/lib/workspace/file-system'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Search,
  X,
  Copy,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useWorkbench } from '@/lib/stores/workbench-store'
import { cn } from '@/lib/utils'

// ─── Module-level file icon helper ──────────────────
function getFileIconElement(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx': case 'ts': case 'jsx': case 'js':
      return <FileCode className="w-4 h-4 text-blue-400" />
    case 'json':
      return <FileJson className="w-4 h-4 text-yellow-400" />
    case 'md':
      return <FileText className="w-4 h-4 text-muted-foreground" />
    case 'png': case 'jpg': case 'svg': case 'gif':
      return <ImageIcon className="w-4 h-4 text-purple-400" />
    default:
      return <File className="w-4 h-4 text-muted-foreground" />
  }
}

// ─── Memoized File Node ─────────────────────────────
interface FileNodeItemProps {
  node: FileNode
  depth: number
  isExpanded: boolean
  isSelected: boolean
  isDragOver: boolean
  isDragSource: boolean
  activeFile: string | null
  expandedDirs: Set<string>
  selectedFiles: Set<string>
  dragOverPath: string | null
  dragSourcePath: string | null
  onToggleDir: (path: string) => void
  onFileClick: (node: FileNode, e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent, path: string) => void
  onDragOverDir: (e: React.DragEvent, path: string) => void
  onDragOverFile: (e: React.DragEvent, path: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDropDir: (e: React.DragEvent, path: string) => void
  onDropFile: (e: React.DragEvent, path: string) => void
  onDragEnd: () => void
  onCopyPath: (path: string) => void
  onCopyRelativePath: (path: string) => void
}

const MemoizedFileNode = memo(function FileNodeItem({
  node, depth, isExpanded, isSelected, isDragOver, isDragSource,
  expandedDirs, selectedFiles, dragOverPath, dragSourcePath, activeFile,
  onToggleDir, onFileClick, onDragStart, onDragOverDir, onDragOverFile,
  onDragLeave, onDropDir, onDropFile, onDragEnd, onCopyPath, onCopyRelativePath,
}: FileNodeItemProps) {
  const indent = depth * 12

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => onToggleDir(node.path)}
          draggable
          onDragStart={(e) => onDragStart(e, node.path)}
          onDragOver={(e) => onDragOverDir(e, node.path)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDropDir(e, node.path)}
          onDragEnd={onDragEnd}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1 hover:bg-white/5 text-left text-sm text-gray-300 rounded transition-colors",
            isDragOver && "bg-blue-500/20 outline outline-1 outline-blue-500/50",
            isDragSource && "opacity-40"
          )}
          style={{ paddingLeft: `${indent + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <MemoizedFileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                isExpanded={expandedDirs.has(child.path)}
                isSelected={selectedFiles.has(child.path)}
                isDragOver={dragOverPath === child.path}
                isDragSource={dragSourcePath === child.path}
                activeFile={activeFile}
                expandedDirs={expandedDirs}
                selectedFiles={selectedFiles}
                dragOverPath={dragOverPath}
                dragSourcePath={dragSourcePath}
                onToggleDir={onToggleDir}
                onFileClick={onFileClick}
                onDragStart={onDragStart}
                onDragOverDir={onDragOverDir}
                onDragOverFile={onDragOverFile}
                onDragLeave={onDragLeave}
                onDropDir={onDropDir}
                onDropFile={onDropFile}
                onDragEnd={onDragEnd}
                onCopyPath={onCopyPath}
                onCopyRelativePath={onCopyRelativePath}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group relative">
      <button
        onClick={(e) => onFileClick(node, e)}
        draggable
        onDragStart={(e) => onDragStart(e, node.path)}
        onDragOver={(e) => onDragOverFile(e, node.path)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDropFile(e, node.path)}
        onDragEnd={onDragEnd}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1 hover:bg-white/5 text-left text-sm text-gray-300 rounded transition-colors group",
          isSelected && "bg-blue-500/20 text-blue-300",
          isDragSource && "opacity-40"
        )}
        style={{ paddingLeft: `${indent + 28}px` }}
      >
        {getFileIconElement(node.name)}
        <span className="truncate group-hover:text-white">{node.name}</span>
      </button>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="w-4 h-4 p-0 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onCopyPath(node.path) }} title="Copy path">
          <Copy className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="w-4 h-4 p-0 hover:bg-white/10" onClick={(e) => { e.stopPropagation(); onCopyRelativePath(node.path) }} title="Copy relative path">
          <Copy className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
})

export function FileExplorer() {
  const { fileTree, openFile, refreshFileTree, projectName, isLoadingProject } = useWorkspace()
  const { editorGroups, activeGroupId, closeFile } = useWorkbench()
  const activeGroup = editorGroups.find((g: any) => g.id === activeGroupId) || editorGroups[0]
  const openFiles = activeGroup?.openFiles || []
  const activeFile = activeGroup?.activeFile || null
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [showOpenEditors, setShowOpenEditors] = useState(true)
  const [dragSourcePath, setDragSourcePath] = useState<string | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)

  const toggleDirectory = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Filter files based on search query
  const filteredFileTree = useMemo(() => {
    if (!searchQuery.trim()) return fileTree

    const filterNode = (node: FileNode): FileNode | null => {
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase())

      if (node.type === 'file') {
        return matchesSearch ? node : null
      }

      if (node.children) {
        const filteredChildren = node.children
          .map(filterNode)
          .filter((child): child is FileNode => child !== null)

        if (filteredChildren.length > 0 || matchesSearch) {
          return { ...node, children: filteredChildren }
        }
      }

      return null
    }

    return fileTree.map(filterNode).filter((node): node is FileNode => node !== null)
  }, [fileTree, searchQuery])

  const getFileIcon = getFileIconElement

  const handleFileClick = (node: FileNode, event: React.MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      // Multi-select
      setSelectedFiles(prev => {
        const next = new Set(prev)
        if (next.has(node.path)) {
          next.delete(node.path)
        } else {
          next.add(node.path)
        }
        return next
      })
    } else if (event.shiftKey && selectedFiles.size > 0) {
      // Range select - simplified implementation
      const allFiles = getAllFiles(filteredFileTree)
      const lastSelected = Array.from(selectedFiles)[selectedFiles.size - 1]
      const lastIndex = allFiles.findIndex(f => f.path === lastSelected)
      const currentIndex = allFiles.findIndex(f => f.path === node.path)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeFiles = allFiles.slice(start, end + 1)
        setSelectedFiles(new Set(rangeFiles.map(f => f.path)))
      }
    } else {
      // Single select and open
      setSelectedFiles(new Set([node.path]))
      if (node.type === 'file') {
        openFile(node.path)
      }
    }
  }

  const getAllFiles = (nodes: FileNode[]): FileNode[] => {
    const files: FileNode[] = []
    for (const node of nodes) {
      if (node.type === 'file') {
        files.push(node)
      } else if (node.children) {
        files.push(...getAllFiles(node.children))
      }
    }
    return files
  }

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path)
  }

  const copyRelativePath = (path: string) => {
    // Remove leading slash if present
    const relativePath = path.startsWith('/') ? path.slice(1) : path
    navigator.clipboard.writeText(relativePath)
  }

  // Drag-and-drop handlers for file reorganization
  const handleDragStart = (e: React.DragEvent, path: string) => {
    e.dataTransfer.setData('text/plain', path)
    e.dataTransfer.effectAllowed = 'move'
    setDragSourcePath(path)
  }

  const handleDragOver = (e: React.DragEvent, targetPath: string, isDir: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    // Only allow drop on directories
    setDragOverPath(isDir ? targetPath : targetPath.split('/').slice(0, -1).join('/') || '/')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverPath(null)
  }

  const handleDrop = useCallback(async (e: React.DragEvent, targetPath: string, isDir: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverPath(null)
    setDragSourcePath(null)

    const sourcePath = e.dataTransfer.getData('text/plain')
    if (!sourcePath) return

    // Determine target directory
    const targetDir = isDir ? targetPath : targetPath.split('/').slice(0, -1).join('/') || '/'

    // Don't move into the same directory
    const sourceDir = sourcePath.split('/').slice(0, -1).join('/') || '/'
    if (sourceDir === targetDir) return

    // Don't move a directory into itself
    if (targetDir.startsWith(sourcePath + '/')) return

    const fileName = sourcePath.split('/').pop()
    if (!fileName) return
    const newPath = targetDir === '/' ? `/${fileName}` : `${targetDir}/${fileName}`

    try {
      await fetch('/api/fs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'move',
          path: sourcePath,
          newPath,
        })
      })
      refreshFileTree()
    } catch (error) {
      console.error('Failed to move file:', error)
    }
  }, [refreshFileTree])

  const handleDragEnd = () => {
    setDragSourcePath(null)
    setDragOverPath(null)
  }

  const handleDragOverDir = useCallback((e: React.DragEvent, path: string) => {
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'
    setDragOverPath(path)
  }, [])

  const handleDragOverFile = useCallback((e: React.DragEvent, path: string) => {
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'
    setDragOverPath(path.split('/').slice(0, -1).join('/') || '/')
  }, [])

  const handleDropDir = useCallback((e: React.DragEvent, path: string) => { handleDrop(e, path, true) }, [handleDrop])
  const handleDropFile = useCallback((e: React.DragEvent, path: string) => { handleDrop(e, path, false) }, [handleDrop])

  const renderFileNode = (node: FileNode, depth: number = 0) => (
    <MemoizedFileNode
      key={node.path}
      node={node}
      depth={depth}
      isExpanded={expandedDirs.has(node.path)}
      isSelected={selectedFiles.has(node.path)}
      isDragOver={dragOverPath === node.path}
      isDragSource={dragSourcePath === node.path}
      activeFile={activeFile}
      expandedDirs={expandedDirs}
      selectedFiles={selectedFiles}
      dragOverPath={dragOverPath}
      dragSourcePath={dragSourcePath}
      onToggleDir={toggleDirectory}
      onFileClick={handleFileClick}
      onDragStart={handleDragStart}
      onDragOverDir={handleDragOverDir}
      onDragOverFile={handleDragOverFile}
      onDragLeave={handleDragLeave}
      onDropDir={handleDropDir}
      onDropFile={handleDropFile}
      onDragEnd={handleDragEnd}
      onCopyPath={copyPath}
      onCopyRelativePath={copyRelativePath}
    />
  )

  if (isLoadingProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--ide-border)]">
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          {projectName || 'Explorer'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshFileTree}
            className="h-6 w-6 p-0 hover:bg-white/10"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-white/10"
            title="New file"
          >
            <Plus className="w-3 h-3 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[var(--ide-border)]">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="h-7 pl-7 pr-7 text-xs bg-[var(--ide-input-bg)] border-[var(--ide-input-border)] focus:border-blue-400"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 hover:bg-white/10"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Open Editors Section */}
      {showOpenEditors && openFiles.length > 0 && (
        <>
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--ide-border)]/50">
            <span className="text-xs font-medium text-gray-300">OPEN EDITORS</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOpenEditors(false)}
              className="h-4 w-4 p-0 hover:bg-white/10"
              title="Hide open editors"
            >
              <EyeOff className="w-3 h-3" />
            </Button>
          </div>
          <div className="px-1 py-1 space-y-0.5">
            {openFiles.map((file) => (
              <div key={file} className="group relative">
                <button
                  onClick={() => openFile(file)}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1 text-left text-xs text-gray-300 rounded transition-colors hover:bg-white/5",
                    activeFile === file && "bg-blue-500/20 text-blue-300"
                  )}
                >
                  {getFileIcon(file.split('/').pop() || '')}
                  <span className="truncate">{file.split('/').pop()}</span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeFile(file)
                  }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-white/10"
                  title="Close"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          <Separator className="bg-[var(--ide-border)]" />
        </>
      )}

      {!showOpenEditors && openFiles.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[var(--ide-border)]/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOpenEditors(true)}
            className="h-6 px-2 text-xs hover:bg-white/10"
          >
            <Eye className="w-3 h-3 mr-1" />
            Show Open Editors ({openFiles.length})
          </Button>
        </div>
      )}

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {filteredFileTree.length === 0 ? (
            <div className="flex items-center justify-center h-full px-4 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No files match your search' : 'No files in project'}
              </p>
            </div>
          ) : (
            <div className="px-1">
              {filteredFileTree.map(node => renderFileNode(node))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Selection Actions */}
      {selectedFiles.size > 0 && (
        <div className="px-3 py-2 border-t border-[var(--ide-border)] bg-[var(--ide-sidebar-bg)]">
          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>{selectedFiles.size} selected</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles(new Set())}
                className="h-6 px-2 hover:bg-white/10"
              >
                Clear
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const paths = Array.from(selectedFiles).join('\n')
                  navigator.clipboard.writeText(paths)
                }}
                className="h-6 px-2 hover:bg-white/10"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Paths
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
