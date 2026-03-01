"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Download,
  Trash2,
  Star,
  CheckCircle2,
  Loader2,
  Package,
  Palette,
  Code,
  Bug,
  FileCode,
  Terminal,
  Braces,
  Globe,
  Puzzle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Extension {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  publisher: string
  rating: number
  downloads: number
  category: ExtCategory
  installed: boolean
  icon?: string
  tags?: string[]
}

type ExtCategory = "themes" | "languages" | "debuggers" | "formatters" | "linters" | "tools" | "snippets" | "testing" | "ai"

const CATEGORY_META: Record<ExtCategory, { icon: React.ReactNode; label: string }> = {
  themes: { icon: <Palette className="w-3 h-3" />, label: "Themes" },
  languages: { icon: <Code className="w-3 h-3" />, label: "Languages" },
  debuggers: { icon: <Bug className="w-3 h-3" />, label: "Debuggers" },
  formatters: { icon: <FileCode className="w-3 h-3" />, label: "Formatters" },
  linters: { icon: <Braces className="w-3 h-3" />, label: "Linters" },
  tools: { icon: <Terminal className="w-3 h-3" />, label: "Tools" },
  snippets: { icon: <Puzzle className="w-3 h-3" />, label: "Snippets" },
  testing: { icon: <Bug className="w-3 h-3" />, label: "Testing" },
  ai: { icon: <Globe className="w-3 h-3" />, label: "AI" },
}

// ═══════════════════════════════════════════════════════════
// BUILT-IN EXTENSIONS CATALOG
// ═══════════════════════════════════════════════════════════

const EXTENSIONS_CATALOG: Extension[] = [
  // Installed
  { id: "buildspaces.typescript", name: "typescript", displayName: "TypeScript Language Support", description: "Rich TypeScript & JavaScript language features including IntelliSense, debugging, and refactoring", version: "5.4.2", publisher: "Buildspaces", rating: 4.9, downloads: 1200000, category: "languages", installed: true, tags: ["typescript", "javascript"] },
  { id: "buildspaces.python", name: "python", displayName: "Python Language Support", description: "Comprehensive Python language support with linting, debugging, and IntelliSense", version: "2024.2.1", publisher: "Buildspaces", rating: 4.8, downloads: 980000, category: "languages", installed: true, tags: ["python"] },
  { id: "buildspaces.prettier", name: "prettier", displayName: "Prettier – Code Formatter", description: "Opinionated code formatter supporting multiple languages", version: "3.2.5", publisher: "Buildspaces", rating: 4.7, downloads: 1500000, category: "formatters", installed: true, tags: ["formatter"] },
  { id: "buildspaces.eslint", name: "eslint", displayName: "ESLint", description: "Integrates ESLint into the editor for JavaScript and TypeScript linting", version: "9.0.0", publisher: "Buildspaces", rating: 4.8, downloads: 1300000, category: "linters", installed: true, tags: ["linter", "javascript"] },
  { id: "buildspaces.github-copilot", name: "github-copilot", displayName: "AI Code Assistant", description: "AI-powered code completion, chat, and code generation", version: "1.180.0", publisher: "Buildspaces", rating: 4.6, downloads: 890000, category: "ai", installed: true, tags: ["ai", "copilot"] },
  // Not installed - Marketplace
  { id: "buildspaces.rust-analyzer", name: "rust-analyzer", displayName: "rust-analyzer", description: "Rust language support via rust-analyzer for smart completions and diagnostics", version: "0.4.1875", publisher: "Buildspaces", rating: 4.9, downloads: 450000, category: "languages", installed: false, tags: ["rust"] },
  { id: "buildspaces.go", name: "go", displayName: "Go Language Support", description: "Rich Go language support including debugging, testing, and IntelliSense", version: "0.41.2", publisher: "Buildspaces", rating: 4.7, downloads: 520000, category: "languages", installed: false, tags: ["go", "golang"] },
  { id: "buildspaces.docker", name: "docker", displayName: "Docker", description: "Build, manage, and deploy containerized applications", version: "1.29.0", publisher: "Buildspaces", rating: 4.6, downloads: 670000, category: "tools", installed: false, tags: ["docker", "containers"] },
  { id: "buildspaces.tailwind", name: "tailwind-intellisense", displayName: "Tailwind CSS IntelliSense", description: "Intelligent Tailwind CSS class name completion", version: "0.10.5", publisher: "Buildspaces", rating: 4.8, downloads: 780000, category: "tools", installed: false, tags: ["css", "tailwind"] },
  { id: "buildspaces.jest", name: "jest", displayName: "Jest Runner", description: "Run and debug Jest tests from the editor", version: "6.2.0", publisher: "Buildspaces", rating: 4.5, downloads: 340000, category: "testing", installed: false, tags: ["testing", "jest"] },
  { id: "buildspaces.gitlens", name: "gitlens", displayName: "GitLens — Git Supercharged", description: "Supercharge Git with rich visualizations and code authorship", version: "15.0.4", publisher: "Buildspaces", rating: 4.7, downloads: 920000, category: "tools", installed: false, tags: ["git"] },
  { id: "buildspaces.dracula", name: "dracula-theme", displayName: "Dracula Official", description: "A dark theme for many editors and terminals", version: "2.24.3", publisher: "Buildspaces", rating: 4.8, downloads: 1100000, category: "themes", installed: false, tags: ["theme", "dark"] },
  { id: "buildspaces.one-dark", name: "one-dark-pro", displayName: "One Dark Pro", description: "Atom's iconic One Dark theme for VS Code", version: "3.16.0", publisher: "Buildspaces", rating: 4.7, downloads: 980000, category: "themes", installed: false, tags: ["theme", "dark"] },
  { id: "buildspaces.debug-adapter", name: "debug-adapter", displayName: "Multi-Language Debug Adapter", description: "Debug support for Node.js, Python, Go, Rust, and more", version: "1.5.0", publisher: "Buildspaces", rating: 4.6, downloads: 280000, category: "debuggers", installed: false, tags: ["debugging"] },
  { id: "buildspaces.snippets-pro", name: "snippets-pro", displayName: "Snippets Pro", description: "Advanced code snippets with AI-powered suggestions", version: "2.1.0", publisher: "Buildspaces", rating: 4.4, downloads: 210000, category: "snippets", installed: false, tags: ["snippets"] },
]

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function ExtensionsMarketplaceView() {
  const [query, setQuery] = useState("")
  const [extensions, setExtensions] = useState<Extension[]>(EXTENSIONS_CATALOG)
  const [selectedCategory, setSelectedCategory] = useState<ExtCategory | "all">("all")
  const [installing, setInstalling] = useState<string | null>(null)
  const [showInstalled, setShowInstalled] = useState(true)
  const [showMarketplace, setShowMarketplace] = useState(true)

  const handleInstall = useCallback(async (extId: string) => {
    setInstalling(extId)
    // Simulate installation
    await new Promise(r => setTimeout(r, 1500))
    setExtensions(prev => prev.map(e => e.id === extId ? { ...e, installed: true } : e))
    setInstalling(null)
  }, [])

  const handleUninstall = useCallback(async (extId: string) => {
    setExtensions(prev => prev.map(e => e.id === extId ? { ...e, installed: false } : e))
  }, [])

  const filtered = extensions.filter(e => {
    const matchesQuery = !query ||
      e.displayName.toLowerCase().includes(query.toLowerCase()) ||
      e.description.toLowerCase().includes(query.toLowerCase()) ||
      e.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || e.category === selectedCategory
    return matchesQuery && matchesCategory
  })

  const installed = filtered.filter(e => e.installed)
  const marketplace = filtered.filter(e => !e.installed)

  const formatDownloads = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`
    return n.toString()
  }

  const getInitialColor = (name: string) => {
    const colors = [
      "from-emerald-500 to-teal-500", "from-blue-500 to-indigo-500",
      "from-purple-500 to-pink-500", "from-amber-500 to-orange-500",
      "from-rose-500 to-red-500", "from-cyan-500 to-blue-500",
    ]
    return colors[name.charCodeAt(0) % colors.length]
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Extensions Marketplace</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search extensions..." className="pl-8 h-8 text-sm" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {/* Category filter */}
        <div className="flex flex-wrap gap-1 mt-2">
          <button onClick={() => setSelectedCategory("all")} className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${selectedCategory === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
            All
          </button>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <button key={key} onClick={() => setSelectedCategory(key as ExtCategory)} className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded transition-colors ${selectedCategory === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
              {meta.icon}
              {meta.label}
            </button>
          ))}
        </div>
      </div>

      {/* Extensions List */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* Installed */}
        {installed.length > 0 && (
          <>
            <button onClick={() => setShowInstalled(!showInstalled)} className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/30">
              {showInstalled ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Installed ({installed.length})
            </button>
            <AnimatePresence>
              {showInstalled && installed.map(ext => (
                <ExtensionRow key={ext.id} ext={ext} installing={installing} getInitialColor={getInitialColor} formatDownloads={formatDownloads} onInstall={handleInstall} onUninstall={handleUninstall} />
              ))}
            </AnimatePresence>
          </>
        )}

        {/* Marketplace */}
        {marketplace.length > 0 && (
          <>
            <button onClick={() => setShowMarketplace(!showMarketplace)} className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/30 mt-1">
              {showMarketplace ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Marketplace ({marketplace.length})
            </button>
            <AnimatePresence>
              {showMarketplace && marketplace.map(ext => (
                <ExtensionRow key={ext.id} ext={ext} installing={installing} getInitialColor={getInitialColor} formatDownloads={formatDownloads} onInstall={handleInstall} onUninstall={handleUninstall} />
              ))}
            </AnimatePresence>
          </>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Package className="w-6 h-6 opacity-30" />
            <p className="text-xs">No extensions found</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// EXTENSION ROW
// ═══════════════════════════════════════════════════════════

function ExtensionRow({
  ext,
  installing,
  getInitialColor,
  formatDownloads,
  onInstall,
  onUninstall,
}: {
  ext: Extension
  installing: string | null
  getInitialColor: (name: string) => string
  formatDownloads: (n: number) => string
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50 rounded mx-1 cursor-pointer group">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getInitialColor(ext.name)} flex items-center justify-center text-white font-bold text-xs shrink-0 ${!ext.installed ? "opacity-70" : ""}`}>
        {ext.displayName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm truncate">{ext.displayName}</span>
          <span className="text-[10px] text-muted-foreground">v{ext.version}</span>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{ext.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{ext.publisher}</span>
          <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
            <Star className="w-2.5 h-2.5 fill-amber-500" />
            {ext.rating}
          </span>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Download className="w-2.5 h-2.5" />
            {formatDownloads(ext.downloads)}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex items-center">
        {ext.installed ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); onUninstall(ext.id) }} title="Uninstall">
              <Trash2 className="w-3 h-3 text-red-400" />
            </Button>
          </div>
        ) : installing === ext.id ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        ) : (
          <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); onInstall(ext.id) }} title="Install">
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </motion.div>
  )
}
