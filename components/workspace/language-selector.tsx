"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
  ChevronDown,
  Search,
  Code2,
  Globe,
  Smartphone,
  Cpu,
  FunctionSquare,
  Terminal,
  BarChart3,
  Link2,
  Database,
  FileText,
  Settings,
  Container,
  Check,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import {
  SUPPORTED_LANGUAGES,
  getLanguageByExtension,
  getLanguagesByCategory,
  type LanguageSupport,
  type LanguageCategory,
  TOTAL_LANGUAGE_COUNT,
} from "@/lib/languages"

interface LanguageSelectorProps {
  currentLanguageId?: string
  currentFileName?: string
  onLanguageChange?: (language: LanguageSupport) => void
  compact?: boolean
}

const CATEGORY_ICONS: Record<LanguageCategory, React.ReactNode> = {
  mainstream: <Code2 className="w-3.5 h-3.5" />,
  web: <Globe className="w-3.5 h-3.5" />,
  mobile: <Smartphone className="w-3.5 h-3.5" />,
  systems: <Cpu className="w-3.5 h-3.5" />,
  functional: <FunctionSquare className="w-3.5 h-3.5" />,
  scripting: <Terminal className="w-3.5 h-3.5" />,
  "data-science": <BarChart3 className="w-3.5 h-3.5" />,
  blockchain: <Link2 className="w-3.5 h-3.5" />,
  database: <Database className="w-3.5 h-3.5" />,
  markup: <FileText className="w-3.5 h-3.5" />,
  config: <Settings className="w-3.5 h-3.5" />,
  devops: <Container className="w-3.5 h-3.5" />,
}

const CATEGORY_LABELS: Record<LanguageCategory, string> = {
  mainstream: "Mainstream",
  web: "Web",
  mobile: "Mobile",
  systems: "Systems",
  functional: "Functional",
  scripting: "Scripting",
  "data-science": "Data Science",
  blockchain: "Blockchain",
  database: "Database",
  markup: "Markup & Docs",
  config: "Configuration",
  devops: "DevOps & Cloud",
}

export function LanguageSelector({
  currentLanguageId,
  currentFileName,
  onLanguageChange,
  compact = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<LanguageCategory | "all">("all")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auto-detect language from file extension
  const detectedLanguage = useMemo(() => {
    if (currentLanguageId) {
      return SUPPORTED_LANGUAGES.find((l) => l.id === currentLanguageId)
    }
    if (currentFileName) {
      const ext = "." + currentFileName.split(".").pop()
      return getLanguageByExtension(ext) || null
    }
    return null
  }, [currentLanguageId, currentFileName])

  // Filter languages
  const filteredLanguages = useMemo(() => {
    let langs = selectedCategory === "all" ? SUPPORTED_LANGUAGES : getLanguagesByCategory(selectedCategory)

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      langs = langs.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          l.extensions.some((ext) => ext.includes(q))
      )
    }

    return langs
  }, [selectedCategory, searchQuery])

  // Group by category when showing all
  const groupedLanguages = useMemo(() => {
    if (selectedCategory !== "all") return null
    const groups: Partial<Record<LanguageCategory, LanguageSupport[]>> = {}
    for (const lang of filteredLanguages) {
      if (!groups[lang.category]) groups[lang.category] = []
      groups[lang.category]!.push(lang)
    }
    return groups
  }, [filteredLanguages, selectedCategory])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (lang: LanguageSupport) => {
    onLanguageChange?.(lang)
    setIsOpen(false)
    setSearchQuery("")
  }

  const categories: (LanguageCategory | "all")[] = [
    "all",
    "mainstream",
    "web",
    "mobile",
    "systems",
    "functional",
    "scripting",
    "data-science",
    "blockchain",
    "database",
    "markup",
    "config",
    "devops",
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50"
      >
        {detectedLanguage ? (
          <>
            {detectedLanguage.icon && <span className="text-sm">{detectedLanguage.icon}</span>}
            <span style={{ color: detectedLanguage.color }}>{detectedLanguage.name}</span>
          </>
        ) : (
          <span>Plain Text</span>
        )}
        {!compact && <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-1 right-0 w-[420px] max-h-[480px] bg-popover border border-border rounded-lg shadow-xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">
                  Select Language
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {TOTAL_LANGUAGE_COUNT} languages supported
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search languages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-0.5 px-2 py-1.5 border-b border-border bg-muted/20 overflow-x-auto scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-md whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {cat === "all" ? (
                    <Code2 className="w-3 h-3" />
                  ) : (
                    CATEGORY_ICONS[cat]
                  )}
                  <span>{cat === "all" ? "All" : CATEGORY_LABELS[cat]}</span>
                </button>
              ))}
            </div>

            {/* Language List */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {filteredLanguages.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No languages matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : groupedLanguages ? (
                // Grouped view
                Object.entries(groupedLanguages).map(([category, langs]) => (
                  <div key={category}>
                    <div className="sticky top-0 px-3 py-1.5 text-[10px] font-medium text-muted-foreground bg-muted/40 uppercase tracking-wider flex items-center gap-1.5">
                      {CATEGORY_ICONS[category as LanguageCategory]}
                      {CATEGORY_LABELS[category as LanguageCategory]}
                      <span className="text-muted-foreground/50">({langs.length})</span>
                    </div>
                    {langs.map((lang) => (
                      <LanguageItem
                        key={lang.id}
                        language={lang}
                        isActive={detectedLanguage?.id === lang.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                ))
              ) : (
                // Flat view
                filteredLanguages.map((lang) => (
                  <LanguageItem
                    key={lang.id}
                    language={lang}
                    isActive={detectedLanguage?.id === lang.id}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LanguageItem({
  language,
  isActive,
  onSelect,
}: {
  language: LanguageSupport
  isActive: boolean
  onSelect: (lang: LanguageSupport) => void
}) {
  return (
    <button
      onClick={() => onSelect(language)}
      className={`w-full flex items-center gap-3 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors ${
        isActive ? "bg-primary/10 text-primary" : "text-foreground"
      }`}
    >
      {/* Icon & Name */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm w-5 text-center flex-shrink-0">{language.icon || "📄"}</span>
        <span className="font-medium truncate" style={{ color: language.color }}>
          {language.name}
        </span>
        <span className="text-muted-foreground/60 truncate">
          {language.extensions.slice(0, 3).join(", ")}
        </span>
      </div>

      {/* Feature badges */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {language.lsp && (
          <span className="px-1 py-0.5 text-[9px] rounded bg-blue-500/15 text-blue-400" title="IntelliSense">
            LSP
          </span>
        )}
        {language.debugger && (
          <span className="px-1 py-0.5 text-[9px] rounded bg-orange-500/15 text-orange-400" title="Debugger">
            DBG
          </span>
        )}
        {language.formatter && (
          <span className="px-1 py-0.5 text-[9px] rounded bg-green-500/15 text-green-400" title="Formatter">
            FMT
          </span>
        )}
      </div>

      {/* Active check */}
      {isActive && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
    </button>
  )
}
