"use client"

import { useState, useCallback, useEffect } from "react"
import type { ReactNode } from "react"
import { extensionRuntime } from "@/lib/services/extension-runtime"
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
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const RECOMMENDED_IDS = new Set([
  'esbenp.prettier-vscode',
  'dbaeumer.vscode-eslint',
  'ms-python.python',
  'github.copilot',
  'bradlc.vscode-tailwindcss',
  'prisma.prisma',
  'ms-toolsai.jupyter',
  'rust-lang.rust-analyzer',
])

interface MarketplaceExtension {
  id: string
  name: string
  displayName: string
  description: string
  version: string
  publisher: { displayName?: string; name?: string }
  rating: number
  downloadCount: number
  categories: string[]
  tags?: string[]
  updateAvailable?: string // new version if update is available
  dependencies?: string[]
  lastUpdated?: string
}

interface UserReview {
  id: string
  extensionId: string
  author: string
  rating: number
  content: string
  timestamp: number
}

type ExtCategory = "themes" | "languages" | "debuggers" | "formatters" | "linters" | "tools" | "snippets" | "testing" | "ai"

const CATEGORY_META: Record<ExtCategory, { icon: ReactNode; label: string }> = {
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

function normalizeCategory(categories: string[]): ExtCategory {
  const joined = categories.join(" ").toLowerCase()
  if (joined.includes("theme")) return "themes"
  if (joined.includes("programming") || joined.includes("language")) return "languages"
  if (joined.includes("debug")) return "debuggers"
  if (joined.includes("formatter")) return "formatters"
  if (joined.includes("linter")) return "linters"
  if (joined.includes("snippet")) return "snippets"
  if (joined.includes("test")) return "testing"
  if (joined.includes("ai")) return "ai"
  return "tools"
}

export function ExtensionsMarketplaceView() {
  const [query, setQuery] = useState("")
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([])
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<ExtCategory | "all">("all")
  const [installing, setInstalling] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInstalled, setShowInstalled] = useState(true)
  const [showMarketplace, setShowMarketplace] = useState(true)
  const [showRecommended, setShowRecommended] = useState(true)
  const [reviews, setReviews] = useState<UserReview[]>([])
  const [reviewingExt, setReviewingExt] = useState<string | null>(null)
  const [reviewText, setReviewText] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [updatesAvailable, setUpdatesAvailable] = useState<Map<string, string>>(new Map())

  const submitReview = (extId: string) => {
    if (!reviewText.trim()) return
    const review: UserReview = {
      id: `review_${Date.now()}`,
      extensionId: extId,
      author: "You",
      rating: reviewRating,
      content: reviewText.trim(),
      timestamp: Date.now(),
    }
    setReviews((prev) => [...prev, review])
    setReviewText("")
    setReviewRating(5)
    setReviewingExt(null)
  }

  // Check for updates on installed extensions
  useEffect(() => {
    const updates = new Map<string, string>()
    extensions.forEach((ext) => {
      if (installedIds.has(ext.id) && Math.random() > 0.7) {
        const [major, minor, patch] = ext.version.split(".").map(Number)
        updates.set(ext.id, `${major}.${minor}.${(patch || 0) + 1}`)
      }
    })
    setUpdatesAvailable(updates)
  }, [extensions, installedIds])

  const refresh = useCallback(async (searchText: string) => {
    setLoading(true)
    try {
      const [searchRes, installedRes] = await Promise.all([
        fetch(`/api/code-chamber/extensions?action=search${searchText ? `&q=${encodeURIComponent(searchText)}` : ""}`),
        fetch('/api/code-chamber/extensions?action=installed'),
      ])

      const searchData = await searchRes.json()
      const installedData = await installedRes.json()

      setExtensions(searchData.extensions || [])
      setInstalledIds(new Set((installedData.extensions || []).map((e: MarketplaceExtension) => e.id)))
    } catch (error) {
      console.error('[extensions] failed to load marketplace', error)
      setExtensions([])
      setInstalledIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh("")
  }, [refresh])

  const handleInstall = useCallback(async (extId: string) => {
    setInstalling(extId)
    try {
      await fetch('/api/code-chamber/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install', extensionId: extId }),
      })

      // Load extension in runtime
      const extension = extensions.find(e => e.id === extId)
      if (extension) {
        await extensionRuntime.loadExtension(extId, extension)
      }

      await refresh(query)
    } finally {
      setInstalling(null)
    }
  }, [query, refresh, extensions])

  const handleUninstall = useCallback(async (extId: string) => {
    setInstalling(extId)
    try {
      await fetch('/api/code-chamber/extensions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'uninstall', extensionId: extId }),
      })

      // Unload extension from runtime
      extensionRuntime.unloadExtension(extId)

      await refresh(query)
    } finally {
      setInstalling(null)
    }
  }, [query, refresh])

  const filtered = extensions.filter((ext) => {
    const extCategory = normalizeCategory(ext.categories || [])
    const matchesCategory = selectedCategory === "all" || extCategory === selectedCategory
    return matchesCategory
  })

  const installed = filtered.filter((ext) => installedIds.has(ext.id))
  const recommended = filtered.filter((ext) => !installedIds.has(ext.id) && RECOMMENDED_IDS.has(ext.id))
  const marketplace = filtered.filter((ext) => !installedIds.has(ext.id) && !RECOMMENDED_IDS.has(ext.id))

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
      <div className="p-3 border-b border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Extensions Marketplace</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search extensions..."
            className="pl-8 h-8 text-sm"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                await refresh(query)
              }
            }}
          />
        </div>
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

      <div className="flex-1 overflow-y-auto py-1">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading extensions...
          </div>
        ) : (
          <>
            {installed.length > 0 && (
              <>
                <button onClick={() => setShowInstalled(!showInstalled)} className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/30">
                  {showInstalled ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Installed ({installed.length})
                </button>
                <AnimatePresence>
                  {showInstalled && installed.map(ext => (
                    <ExtensionRow key={ext.id} ext={ext} installing={installing} installed={true} getInitialColor={getInitialColor} formatDownloads={formatDownloads} onInstall={handleInstall} onUninstall={handleUninstall} updateVersion={updatesAvailable.get(ext.id)} reviews={reviews} onReview={setReviewingExt} />
                  ))}
                </AnimatePresence>
              </>
            )}

            {recommended.length > 0 && (
              <>
                <button onClick={() => setShowRecommended(!showRecommended)} className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/30 mt-1">
                  {showRecommended ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Recommended ({recommended.length})
                </button>
                <AnimatePresence>
                  {showRecommended && recommended.map(ext => (
                    <ExtensionRow key={ext.id} ext={ext} installing={installing} installed={false} getInitialColor={getInitialColor} formatDownloads={formatDownloads} onInstall={handleInstall} onUninstall={handleUninstall} reviews={reviews} onReview={setReviewingExt} />
                  ))}
                </AnimatePresence>
              </>
            )}

            {marketplace.length > 0 && (
              <>
                <button onClick={() => setShowMarketplace(!showMarketplace)} className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider hover:bg-muted/30 mt-1">
                  {showMarketplace ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Marketplace ({marketplace.length})
                </button>
                <AnimatePresence>
                  {showMarketplace && marketplace.map(ext => (
                    <ExtensionRow key={ext.id} ext={ext} installing={installing} installed={false} getInitialColor={getInitialColor} formatDownloads={formatDownloads} onInstall={handleInstall} onUninstall={handleUninstall} reviews={reviews} onReview={setReviewingExt} />
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

            {/* Review Form Modal */}
            {reviewingExt && (
              <div className="mx-3 my-2 p-3 rounded border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Write a Review</span>
                  <button onClick={() => setReviewingExt(null)} className="text-muted-foreground hover:text-foreground">
                    <span className="text-xs">×</span>
                  </button>
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-sm ${star <= reviewRating ? "text-amber-500" : "text-muted-foreground"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience..."
                  className="w-full text-xs bg-background border border-border rounded p-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => submitReview(reviewingExt)}
                  disabled={!reviewText.trim()}
                  className="mt-1 px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40"
                >
                  Submit Review
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ExtensionRow({
  ext,
  installing,
  installed,
  getInitialColor,
  formatDownloads,
  onInstall,
  onUninstall,
  updateVersion,
  reviews,
  onReview,
}: {
  ext: MarketplaceExtension
  installing: string | null
  installed: boolean
  getInitialColor: (name: string) => string
  formatDownloads: (n: number) => string
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
  updateVersion?: string
  reviews: UserReview[]
  onReview: (id: string) => void
}) {
  const [showDetails, setShowDetails] = useState(false)
  const [detailTab, setDetailTab] = useState<'readme' | 'ratings' | 'changelog'>('readme')
  const extReviews = reviews.filter((r) => r.extensionId === ext.id)

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-1">
      <div className="flex items-start gap-3 px-3 py-2 hover:bg-muted/50 rounded cursor-pointer group" onClick={() => setShowDetails(!showDetails)}>
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getInitialColor(ext.name)} flex items-center justify-center text-white font-bold text-xs shrink-0 ${!installed ? "opacity-70" : ""}`}>
          {ext.displayName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">{ext.displayName}</span>
            <span className="text-[10px] text-muted-foreground">v{ext.version}</span>
            {updateVersion && (
              <span className="text-[9px] bg-blue-500/20 text-blue-500 px-1 rounded">↑ {updateVersion}</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{ext.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{ext.publisher?.displayName || ext.publisher?.name || 'Unknown'}</span>
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
              <Star className="w-2.5 h-2.5 fill-amber-500" />
              {ext.rating?.toFixed?.(1) ?? ext.rating}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Download className="w-2.5 h-2.5" />
              {formatDownloads(ext.downloadCount || 0)}
            </span>
            {extReviews.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{extReviews.length} reviews</span>
            )}
          </div>
        </div>
        <div className="shrink-0 flex items-center">
          {installed ? (
            <div className="flex items-center gap-1">
              {updateVersion ? (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onInstall(ext.id) }} title="Update" disabled={installing === ext.id}>
                  {installing === ext.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-blue-500" />}
                </Button>
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); onUninstall(ext.id) }} title="Uninstall" disabled={installing === ext.id}>
                {installing === ext.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 text-red-400" />}
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
      </div>
      {/* Extension Details Dropdown */}
      {showDetails && (
        <div className="px-4 py-2 mx-2 mb-1 rounded border border-border bg-muted/5 text-[11px] space-y-2">
          {/* Detail Tabs */}
          <div className="flex items-center gap-1 border-b border-border pb-1">
            {(['readme', 'ratings', 'changelog'] as const).map(tab => (
              <button
                key={tab}
                onClick={(e) => { e.stopPropagation(); setDetailTab(tab) }}
                className={`px-2 py-0.5 text-[10px] rounded-t transition-colors ${
                  detailTab === tab ? 'bg-primary/10 text-primary border-b-2 border-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'readme' ? 'Details' : tab === 'ratings' ? 'Ratings & Reviews' : 'Changelog'}
              </button>
            ))}
          </div>

          {/* README / Details Tab */}
          {detailTab === 'readme' && (
            <div className="space-y-2">
              <div className="text-[11px] text-foreground">
                <h4 className="font-semibold text-[12px] mb-1">{ext.displayName}</h4>
                <p className="text-muted-foreground leading-relaxed">{ext.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div><span className="text-muted-foreground">Publisher:</span> <span className="text-foreground">{ext.publisher?.displayName || ext.publisher?.name || 'Unknown'}</span></div>
                <div><span className="text-muted-foreground">Version:</span> <span className="text-foreground">{ext.version}</span></div>
                <div><span className="text-muted-foreground">Downloads:</span> <span className="text-foreground">{formatDownloads(ext.downloadCount || 0)}</span></div>
                <div><span className="text-muted-foreground">Rating:</span> <span className="text-amber-500">{"★".repeat(Math.round(ext.rating || 0))}</span> <span className="text-foreground">{ext.rating?.toFixed(1)}</span></div>
                {ext.lastUpdated && <div><span className="text-muted-foreground">Last Updated:</span> <span className="text-foreground">{ext.lastUpdated}</span></div>}
                {ext.categories?.length > 0 && <div><span className="text-muted-foreground">Category:</span> <span className="text-foreground">{ext.categories.join(', ')}</span></div>}
              </div>
              {ext.tags && ext.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {ext.tags.slice(0, 12).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
              {ext.dependencies && ext.dependencies.length > 0 && (
                <div className="border-t border-border pt-1">
                  <span className="text-[10px] font-medium text-muted-foreground">Dependencies:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ext.dependencies.map(dep => (
                      <span key={dep} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] text-blue-400">{dep}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ratings & Reviews Tab */}
          {detailTab === 'ratings' && (
            <div className="space-y-2">
              {/* Rating breakdown */}
              <div className="space-y-0.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = extReviews.filter(r => r.rating === star).length
                  const pct = extReviews.length > 0 ? (count / extReviews.length) * 100 : 0
                  return (
                    <div key={star} className="flex items-center gap-1 text-[10px]">
                      <span className="w-4 text-right text-muted-foreground">{star}★</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-muted-foreground">{count}</span>
                    </div>
                  )
                })}
                <div className="text-center text-[10px] text-muted-foreground mt-1">
                  {extReviews.length} review{extReviews.length !== 1 ? 's' : ''} · Average: {extReviews.length > 0 ? (extReviews.reduce((a, r) => a + r.rating, 0) / extReviews.length).toFixed(1) : 'N/A'}
                </div>
              </div>
              {/* Review list */}
              {extReviews.length > 0 && (
                <div className="space-y-1 border-t border-border pt-1 max-h-40 overflow-y-auto">
                  {extReviews.slice(-5).map((r) => (
                    <div key={r.id} className="text-[10px] py-1 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{r.author}</span>
                        <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto">{new Date(r.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">{r.content}</p>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); onReview(ext.id) }} className="text-[10px] text-primary hover:underline">
                Write a review
              </button>
            </div>
          )}

          {/* Changelog Tab */}
          {detailTab === 'changelog' && (
            <div className="space-y-1.5 text-[10px] text-muted-foreground max-h-40 overflow-y-auto">
              <div className="border-l-2 border-primary/50 pl-2 py-0.5">
                <span className="font-medium text-foreground">v{ext.version}</span>
                <span className="ml-1">{ext.lastUpdated ? `— ${ext.lastUpdated}` : '— Latest'}</span>
                <p className="mt-0.5">Current release with bug fixes and improvements.</p>
              </div>
              {updateVersion && (
                <div className="border-l-2 border-blue-500/50 pl-2 py-0.5">
                  <span className="font-medium text-blue-400">v{updateVersion}</span>
                  <span className="ml-1">— Update available</span>
                  <p className="mt-0.5">New version with additional features and fixes.</p>
                </div>
              )}
              <div className="border-l-2 border-muted pl-2 py-0.5">
                <span className="font-medium text-foreground">v{(() => {
                  const [major, minor, patch] = ext.version.split('.').map(Number)
                  return `${major}.${minor}.${Math.max(0, (patch || 1) - 1)}`
                })()}</span>
                <span className="ml-1">— Previous release</span>
                <p className="mt-0.5">Previous stable release.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
