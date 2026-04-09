"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useFileSystem } from "@/lib/stores/file-system"
import { Loader2 } from "lucide-react"

const MonacoDiffEditor = dynamic(
    () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
    { ssr: false }
)

interface GitDiffViewerProps {
    fileName: string
    workspaceId: string
}

export function GitDiffViewer({ fileName, workspaceId }: GitDiffViewerProps) {
    const { fileMap, readFile } = useFileSystem()
    const [originalContent, setOriginalContent] = useState<string>("")
    const [modifiedContent, setModifiedContent] = useState<string>("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const loadDiff = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Fetch the original (committed) version from the git API
                const res = await fetch(
                    `/api/fs?operation=gitShow&path=${encodeURIComponent(fileName)}&workspaceId=${encodeURIComponent(workspaceId)}`
                )

                if (res.ok) {
                    const data = await res.json()
                    setOriginalContent(data.content || "")
                } else {
                    // File is new (untracked), no original version
                    setOriginalContent("")
                }

                // Get current file content from the file system store
                const fileId = Object.keys(fileMap).find(
                    (id) => fileMap[id]?.name === fileName || fileMap[id]?.name === fileName.split("/").pop()
                )
                if (fileId) {
                    setModifiedContent(readFile(fileId) || "")
                }
            } catch (e) {
                setError("Failed to load diff")
                setOriginalContent("")
            } finally {
                setIsLoading(false)
            }
        }

        loadDiff()
    }, [fileName, workspaceId, fileMap, readFile])

    const getLanguage = (name: string) => {
        const ext = name.split(".").pop()?.toLowerCase()
        switch (ext) {
            case "tsx": case "ts": return "typescript"
            case "jsx": case "js": return "javascript"
            case "css": return "css"
            case "json": return "json"
            case "md": return "markdown"
            case "html": return "html"
            case "py": return "python"
            default: return "plaintext"
        }
    }

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <Loader2 className="w-5 h-5 text-[#484f58] animate-spin" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-background">
                <p className="text-[13px] text-[#484f58]">{error}</p>
            </div>
        )
    }

    return (
        <div className="h-full bg-background">
            <div className="flex items-center justify-between px-3 py-1 border-b border-[#1b1f27] text-[11px] text-[#8b949e] shrink-0">
                <span>Original (committed)</span>
                <span className="text-white font-medium">{fileName}</span>
                <span>Modified (working tree)</span>
            </div>
            <div className="h-[calc(100%-28px)]">
                <MonacoDiffEditor
                    original={originalContent}
                    modified={modifiedContent}
                    language={getLanguage(fileName)}
                    theme="vs-dark"
                    options={{
                        readOnly: true,
                        renderSideBySide: true,
                        minimap: { enabled: false },
                        fontSize: 12,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        renderOverviewRuler: true,
                        originalEditable: false,
                    }}
                />
            </div>
        </div>
    )
}
