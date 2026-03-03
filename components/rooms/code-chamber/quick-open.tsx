"use client"

import { useState, useEffect, useMemo } from "react"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useFileSystem } from "@/lib/stores/file-system"
import { FileCode, FileText, Settings, Database, File, Code, Image } from "lucide-react"

interface QuickOpenProps {
    open: boolean
    onClose: () => void
    onOpenFile: (fileId: string) => void
}

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

function buildFilePath(fileMap: Record<string, any>, nodeId: string): string {
    const node = fileMap[nodeId]
    if (!node) return ""
    const parts: string[] = [node.name]
    let currentId = node.parentId
    while (currentId && fileMap[currentId]) {
        const parent = fileMap[currentId]
        if (parent.parentId) parts.unshift(parent.name)
        currentId = parent.parentId
    }
    return parts.join("/")
}

export function QuickOpen({ open, onClose, onOpenFile }: QuickOpenProps) {
    const { fileMap, openFiles, activeFileId } = useFileSystem()
    const [search, setSearch] = useState("")

    useEffect(() => {
        if (open) setSearch("")
    }, [open])

    const allFiles = useMemo(() => {
        const files: { id: string; name: string; path: string }[] = []
        Object.entries(fileMap).forEach(([id, node]) => {
            if (node.type === "file") {
                files.push({ id, name: node.name, path: buildFilePath(fileMap, id) })
            }
        })
        // Sort: recently opened first, then alphabetically
        const openSet = new Set(openFiles)
        files.sort((a, b) => {
            const aOpen = openSet.has(a.id) ? 0 : 1
            const bOpen = openSet.has(b.id) ? 0 : 1
            if (aOpen !== bOpen) return aOpen - bOpen
            return a.name.localeCompare(b.name)
        })
        return files
    }, [fileMap, openFiles])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative w-full max-w-[560px] mx-4" onClick={(e) => e.stopPropagation()}>
                <Command className="rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/60 overflow-hidden">
                    <CommandInput
                        placeholder="Search files by name..."
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
                            No files found.
                        </CommandEmpty>
                        {allFiles.map((file) => {
                            const isRecent = openFiles.includes(file.id)
                            return (
                                <CommandItem
                                    key={file.id}
                                    value={file.path}
                                    onSelect={() => {
                                        onOpenFile(file.id)
                                        onClose()
                                    }}
                                    className="flex items-center gap-3 px-3 py-2 mx-1 rounded-md text-[13px] text-[#c9d1d9] cursor-pointer aria-selected:bg-[#1f6feb]/20 aria-selected:text-white hover:bg-[#1f1f1f]"
                                >
                                    {getFileIcon(file.name)}
                                    <span className="flex-1 truncate">{file.name}</span>
                                    <span className="text-[11px] text-[#484f58] truncate max-w-[200px]">{file.path}</span>
                                    {isRecent && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f6feb]/20 text-[#58a6ff] shrink-0">open</span>
                                    )}
                                </CommandItem>
                            )
                        })}
                    </CommandList>
                </Command>
            </div>
        </div>
    )
}
