"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
    Search, Download, Trash2, CheckCircle, Star, Loader2, RefreshCw,
    Code, Paintbrush, Bug, FileText, Box, Zap
} from "lucide-react"

interface Extension {
    id: string
    name: string
    publisher: string
    description: string
    version: string
    downloads?: number
    rating?: number
    category: string
    installed: boolean
}

export function ExtensionsPanel() {
    const [extensions, setExtensions] = useState<Extension[]>([])
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState<"installed" | "marketplace">("installed")
    const [isLoading, setIsLoading] = useState(false)
    const [installing, setInstalling] = useState<string | null>(null)

    const fetchExtensions = useCallback(async (query?: string) => {
        setIsLoading(true)
        try {
            const url = query
                ? `/api/code-chamber/extensions?search=${encodeURIComponent(query)}`
                : "/api/code-chamber/extensions"
            const res = await fetch(url)
            if (res.ok) {
                const data = await res.json()
                if (data.extensions) {
                    setExtensions(data.extensions)
                }
            }
        } catch (e) {
            // Use fallback data
            setExtensions(getDefaultExtensions())
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchExtensions()
    }, [fetchExtensions])

    useEffect(() => {
        const debounce = setTimeout(() => {
            if (search) fetchExtensions(search)
        }, 300)
        return () => clearTimeout(debounce)
    }, [search, fetchExtensions])

    const handleInstall = async (extId: string) => {
        setInstalling(extId)
        try {
            const res = await fetch("/api/code-chamber/extensions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "install", extensionId: extId }),
            })
            if (res.ok) {
                setExtensions((prev) =>
                    prev.map((e) => (e.id === extId ? { ...e, installed: true } : e))
                )
            }
        } catch {
            // Optimistic update
            setExtensions((prev) =>
                prev.map((e) => (e.id === extId ? { ...e, installed: true } : e))
            )
        } finally {
            setInstalling(null)
        }
    }

    const handleUninstall = async (extId: string) => {
        setInstalling(extId)
        try {
            const res = await fetch("/api/code-chamber/extensions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "uninstall", extensionId: extId }),
            })
            if (res.ok) {
                setExtensions((prev) =>
                    prev.map((e) => (e.id === extId ? { ...e, installed: false } : e))
                )
            }
        } catch {
            setExtensions((prev) =>
                prev.map((e) => (e.id === extId ? { ...e, installed: false } : e))
            )
        } finally {
            setInstalling(null)
        }
    }

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "ai": return <Zap className="w-8 h-8 text-emerald-400" />
            case "theme": return <Paintbrush className="w-8 h-8 text-purple-400" />
            case "linter": return <Bug className="w-8 h-8 text-amber-400" />
            case "formatter": return <FileText className="w-8 h-8 text-cyan-400" />
            case "language": return <Code className="w-8 h-8 text-blue-400" />
            default: return <Box className="w-8 h-8 text-[#484f58]" />
        }
    }

    const filteredExtensions = extensions.filter((e) => {
        if (activeTab === "installed") return e.installed
        return true
    })

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-9 flex items-center px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] shrink-0">
                Extensions
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#484f58]" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search extensions..."
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-md pl-8 pr-3 py-1.5 text-[13px] text-white placeholder:text-[#484f58] outline-none focus:border-[#1f6feb] transition-colors"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 px-3 mb-2">
                <button
                    onClick={() => setActiveTab("installed")}
                    className={cn(
                        "px-3 py-1 text-[11px] font-medium rounded-l-md border border-[#30363d] transition-colors",
                        activeTab === "installed" ? "bg-[#30363d] text-white" : "text-[#484f58] hover:text-[#8b949e]"
                    )}
                >
                    Installed ({extensions.filter((e) => e.installed).length})
                </button>
                <button
                    onClick={() => setActiveTab("marketplace")}
                    className={cn(
                        "px-3 py-1 text-[11px] font-medium rounded-r-md border border-[#30363d] border-l-0 transition-colors",
                        activeTab === "marketplace" ? "bg-[#30363d] text-white" : "text-[#484f58] hover:text-[#8b949e]"
                    )}
                >
                    Marketplace
                </button>
                <button
                    onClick={() => fetchExtensions(search || undefined)}
                    className="ml-auto p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors"
                >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading && filteredExtensions.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-[#484f58] animate-spin" />
                    </div>
                ) : filteredExtensions.length === 0 ? (
                    <div className="text-center py-8">
                        <Box className="w-8 h-8 mx-auto mb-2 text-[#484f58]/40" />
                        <p className="text-[13px] text-[#484f58]">
                            {activeTab === "installed" ? "No extensions installed" : "No extensions found"}
                        </p>
                    </div>
                ) : (
                    filteredExtensions.map((ext) => (
                        <div
                            key={ext.id}
                            className="flex items-start gap-3 px-3 py-2.5 hover:bg-[#1f1f1f] transition-colors"
                        >
                            <div className="mt-0.5 shrink-0">{getCategoryIcon(ext.category)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-medium text-white truncate">{ext.name}</span>
                                    <span className="text-[10px] text-[#484f58]">v{ext.version}</span>
                                    {ext.installed && <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />}
                                </div>
                                <div className="text-[11px] text-[#484f58] truncate">{ext.publisher}</div>
                                <div className="text-[12px] text-[#8b949e] mt-0.5 line-clamp-2">{ext.description}</div>
                                <div className="flex items-center gap-3 mt-1.5">
                                    {ext.rating !== undefined && (
                                        <div className="flex items-center gap-0.5 text-[10px] text-[#8b949e]">
                                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                            {ext.rating.toFixed(1)}
                                        </div>
                                    )}
                                    {ext.downloads !== undefined && (
                                        <div className="flex items-center gap-0.5 text-[10px] text-[#8b949e]">
                                            <Download className="w-3 h-3" />
                                            {ext.downloads > 1000 ? `${(ext.downloads / 1000).toFixed(1)}k` : ext.downloads}
                                        </div>
                                    )}
                                    {ext.installed ? (
                                        <button
                                            onClick={() => handleUninstall(ext.id)}
                                            disabled={installing === ext.id}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                        >
                                            {installing === ext.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                            Uninstall
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleInstall(ext.id)}
                                            disabled={installing === ext.id}
                                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#238636] hover:bg-[#2ea043] text-white transition-colors disabled:opacity-40"
                                        >
                                            {installing === ext.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                            Install
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function getDefaultExtensions(): Extension[] {
    return [
        { id: "elara-ai", name: "Elara AI", publisher: "Azora", description: "AI-powered code assistant with inline completions, refactoring, and chat", version: "2.1.0", downloads: 45200, rating: 4.8, category: "ai", installed: true },
        { id: "ubuntu-theme", name: "Ubuntu Dark Theme", publisher: "Azora", description: "Official dark theme optimized for Code Chamber", version: "1.5.0", downloads: 32100, rating: 4.7, category: "theme", installed: true },
        { id: "eslint", name: "ESLint", publisher: "Microsoft", description: "Integrates ESLint JavaScript linting into Code Chamber", version: "3.0.5", downloads: 128000, rating: 4.6, category: "linter", installed: true },
        { id: "prettier", name: "Prettier", publisher: "Prettier", description: "Code formatter using prettier", version: "10.1.0", downloads: 112000, rating: 4.5, category: "formatter", installed: true },
        { id: "tailwindcss", name: "Tailwind CSS IntelliSense", publisher: "Tailwind Labs", description: "Intelligent Tailwind CSS tooling for Code Chamber", version: "4.0.2", downloads: 89000, rating: 4.7, category: "language", installed: true },
        { id: "git-lens", name: "GitLens", publisher: "GitKraken", description: "Supercharge Git — Visualize code authorship via blame annotations", version: "15.2.0", downloads: 95000, rating: 4.6, category: "ai", installed: false },
        { id: "docker", name: "Docker", publisher: "Microsoft", description: "Makes it easy to create, manage, and debug containerized applications", version: "2.0.0", downloads: 67000, rating: 4.4, category: "language", installed: false },
        { id: "python", name: "Python", publisher: "Microsoft", description: "Rich Python language support with IntelliSense, linting, debugging", version: "2024.1.0", downloads: 156000, rating: 4.7, category: "language", installed: false },
        { id: "rust-analyzer", name: "rust-analyzer", publisher: "rust-lang", description: "Rust language support for Code Chamber", version: "0.4.0", downloads: 43000, rating: 4.8, category: "language", installed: false },
        { id: "github-copilot", name: "GitHub Copilot", publisher: "GitHub", description: "AI pair programming assistant", version: "1.180.0", downloads: 230000, rating: 4.5, category: "ai", installed: false },
    ]
}
