"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { useFileSystem } from "@/lib/stores/file-system"
import {
    ChevronRight, ChevronDown, File, FolderClosed, FolderOpen,
    Code, Hash, Braces, Type as TypeIcon, Box
} from "lucide-react"

interface BreadcrumbSegment {
    id: string
    name: string
    type: "directory" | "file" | "symbol"
    children?: BreadcrumbSegment[]
}

interface EnhancedBreadcrumbBarProps {
    fileName: string
    fileMap: Record<string, any>
    activeFileId: string | null
    onOpenFile?: (fileId: string) => void
    symbols?: ParsedSymbol[]
    onNavigateSymbol?: (line: number) => void
}

export interface ParsedSymbol {
    name: string
    kind: "function" | "class" | "interface" | "variable" | "type" | "method" | "property" | "enum" | "const"
    line: number
    children?: ParsedSymbol[]
}

function getSymbolIcon(kind: string) {
    switch (kind) {
        case "function": case "method": return <Code className="w-3 h-3 text-purple-400" />
        case "class": return <Box className="w-3 h-3 text-amber-400" />
        case "interface": case "type": return <TypeIcon className="w-3 h-3 text-cyan-400" />
        case "variable": case "const": return <Hash className="w-3 h-3 text-blue-400" />
        case "enum": return <Braces className="w-3 h-3 text-green-400" />
        case "property": return <Hash className="w-3 h-3 text-[#8b949e]" />
        default: return <Code className="w-3 h-3 text-[#484f58]" />
    }
}

// Simple symbol parser for TypeScript/JavaScript files
export function parseSymbols(content: string, language: string): ParsedSymbol[] {
    if (!content || !["typescript", "javascript"].includes(language)) return []
    
    const symbols: ParsedSymbol[] = []
    const lines = content.split("\n")
    
    const patterns = [
        { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m, kind: "function" as const },
        { regex: /^(?:export\s+)?(?:default\s+)?class\s+(\w+)/m, kind: "class" as const },
        { regex: /^(?:export\s+)?interface\s+(\w+)/m, kind: "interface" as const },
        { regex: /^(?:export\s+)?type\s+(\w+)\s*=/m, kind: "type" as const },
        { regex: /^(?:export\s+)?enum\s+(\w+)/m, kind: "enum" as const },
        { regex: /^(?:export\s+)?const\s+(\w+)\s*[=:]/m, kind: "const" as const },
        { regex: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/m, kind: "method" as const },
    ]
    
    lines.forEach((line, idx) => {
        for (const { regex, kind } of patterns) {
            const match = line.match(regex)
            if (match && match[1]) {
                // Skip common non-symbol names
                if (["if", "for", "while", "switch", "return", "import", "from", "require"].includes(match[1])) continue
                symbols.push({ name: match[1], kind, line: idx + 1 })
                break
            }
        }
    })
    
    return symbols
}

export function EnhancedBreadcrumbBar({ fileName, fileMap, activeFileId, onOpenFile, symbols, onNavigateSymbol }: EnhancedBreadcrumbBarProps) {
    const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
    const [symbolDropdownOpen, setSymbolDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Build real path from parent chain
    const pathSegments = useMemo((): { id: string; name: string; parentId: string | null }[] => {
        if (!activeFileId || !fileMap[activeFileId]) {
            if (!fileName) return []
            return fileName.split("/").map((part, i) => ({ id: `path-${i}`, name: part, parentId: i > 0 ? `path-${i - 1}` : null }))
        }
        const parts: { id: string; name: string; parentId: string | null }[] = []
        let currentId: string | null = activeFileId
        while (currentId && fileMap[currentId]) {
            const node: { name: string; parentId?: string | null } = fileMap[currentId]
            parts.unshift({ id: currentId, name: node.name, parentId: node.parentId || null })
            currentId = node.parentId || null
        }
        return parts.filter(p => p.parentId !== null || parts.length === 1) // Skip root unless single
    }, [activeFileId, fileMap, fileName])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(null)
                setSymbolDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Get sibling files/folders for a given segment
    type SiblingNode = { id: string; name: string; type: string }
    const getSiblings = (segmentId: string): SiblingNode[] => {
        const node = fileMap[segmentId]
        if (!node || !node.parentId) return []
        const parent = fileMap[node.parentId]
        if (!parent || !parent.children) return []
        const result: SiblingNode[] = []
        for (const childId of parent.children as string[]) {
            const child = fileMap[childId]
            if (child) {
                result.push({ id: childId, name: String(child.name), type: String(child.type) })
            }
        }
        result.sort((a, b) => {
            if (a.type === "directory" && b.type !== "directory") return -1
            if (a.type !== "directory" && b.type === "directory") return 1
            return a.name.localeCompare(b.name)
        })
        return result
    }

    if (pathSegments.length === 0) return null

    return (
        <div ref={dropdownRef} className="h-7 flex items-center px-4 gap-0.5 bg-[#010409] border-b border-[#1b1f27] text-[12px] text-[#484f58] select-none shrink-0 overflow-x-auto scrollbar-none">
            {pathSegments.map((segment, i) => {
                const isLast = i === pathSegments.length - 1
                const siblings = getSiblings(segment.id)
                const isDropdownOpen = dropdownOpen === segment.id

                return (
                    <span key={segment.id} className="flex items-center gap-0.5 shrink-0 relative">
                        {i > 0 && <ChevronRight className="w-3 h-3 text-[#30363d]" />}
                        <button
                            onClick={() => setDropdownOpen(isDropdownOpen ? null : segment.id)}
                            className={cn(
                                "flex items-center gap-1 px-1 py-0.5 rounded hover:bg-[#1f1f1f] transition-colors",
                                isLast && "text-[#c9d1d9]",
                                isDropdownOpen && "bg-[#1f1f1f]"
                            )}
                        >
                            {isLast && fileMap[segment.id]?.type === "file" ? (
                                <File className="w-3 h-3 text-[#484f58]" />
                            ) : null}
                            <span>{segment.name}</span>
                            {siblings.length > 1 && <ChevronDown className="w-2.5 h-2.5 text-[#30363d]" />}
                        </button>

                        {/* Sibling dropdown */}
                        {isDropdownOpen && siblings.length > 1 && (
                            <div className="absolute top-full left-0 mt-1 min-w-[180px] max-h-[300px] overflow-y-auto rounded-md border border-[#30363d] bg-[#161b22] shadow-xl shadow-black/40 py-1 z-50">
                                {siblings.map((sibling) => {
                                    const isCurrent = sibling.id === segment.id
                                    return (
                                        <button
                                            key={sibling.id}
                                            onClick={() => {
                                                if (sibling.type === "file" && onOpenFile) onOpenFile(sibling.id)
                                                setDropdownOpen(null)
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors",
                                                isCurrent ? "bg-[#1f6feb]/10 text-white" : "text-[#c9d1d9] hover:bg-[#1f1f1f]"
                                            )}
                                        >
                                            {sibling.type === "directory" ? (
                                                <FolderClosed className="w-3 h-3 text-[#768390] shrink-0" />
                                            ) : (
                                                <File className="w-3 h-3 text-[#484f58] shrink-0" />
                                            )}
                                            <span className="truncate">{sibling.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </span>
                )
            })}

            {/* Symbol breadcrumb */}
            {symbols && symbols.length > 0 && (
                <span className="flex items-center gap-0.5 shrink-0 relative ml-1">
                    <ChevronRight className="w-3 h-3 text-[#30363d]" />
                    <button
                        onClick={() => setSymbolDropdownOpen(!symbolDropdownOpen)}
                        className={cn(
                            "flex items-center gap-1 px-1 py-0.5 rounded hover:bg-[#1f1f1f] transition-colors text-[#8b949e]",
                            symbolDropdownOpen && "bg-[#1f1f1f]"
                        )}
                    >
                        <Code className="w-3 h-3 text-purple-400" />
                        <span>Symbols</span>
                        <ChevronDown className="w-2.5 h-2.5 text-[#30363d]" />
                    </button>

                    {symbolDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 min-w-[220px] max-h-[320px] overflow-y-auto rounded-md border border-[#30363d] bg-[#161b22] shadow-xl shadow-black/40 py-1 z-50">
                            {symbols.map((sym, i) => (
                                <button
                                    key={`${sym.name}-${sym.line}`}
                                    onClick={() => {
                                        onNavigateSymbol?.(sym.line)
                                        setSymbolDropdownOpen(false)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#c9d1d9] hover:bg-[#1f1f1f] transition-colors text-left"
                                >
                                    {getSymbolIcon(sym.kind)}
                                    <span className="truncate flex-1">{sym.name}</span>
                                    <span className="text-[10px] text-[#484f58] shrink-0">Ln {sym.line}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </span>
            )}
        </div>
    )
}
