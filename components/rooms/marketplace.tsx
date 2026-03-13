"use client"

import { useState, useEffect, useMemo } from "react"
import { useRoomEvents } from "@/lib/hooks/use-room-events"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Filter,
  Star,
  Download,
  ExternalLink,
  Sparkles,
  Code2,
  Palette,
  Database,
  RefreshCw,
  TrendingUp,
  Package,
  Shield,
  Zap,
  Brain,
  Globe,
  Layers,
  Terminal,
  GitBranch,
  Heart,
  Eye,
  ArrowUpRight,
  ChevronDown,
  X,
  Check,
  Crown,
  Flame,
  Clock,
  BarChart3,
  Users,
  Plus,
  Minus,
  Trash2,
  Upload,
  MessageSquare,
  ThumbsUp,
  Image,
} from "lucide-react"

/* ─── types ─── */
interface Review {
  id: string
  userId: string
  userName: string
  rating: number
  comment: string
  date: string
  helpful: number
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  author: string
  rating: number
  downloads: number
  price: string
  tags: string[]
  icon: string
  color: string
  featured?: boolean
  verified?: boolean
  version?: string
  lastUpdated?: string
  reviews?: Review[]
  reviewCount?: number
  screenshots?: string[]
  readme?: string
}

/* ─── categories ─── */
const CATEGORIES = [
  { id: "all", label: "All", icon: Layers },
  { id: "templates", label: "Templates", icon: Code2 },
  { id: "agents", label: "AI Agents", icon: Brain },
  { id: "components", label: "Components", icon: Package },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "integrations", label: "Integrations", icon: Globe },
  { id: "devops", label: "DevOps", icon: Terminal },
]

const ICON_MAP: Record<string, any> = {
  Code2,
  Sparkles,
  Palette,
  Database,
  Brain,
  Shield,
  Globe,
  Terminal,
  GitBranch,
  Zap,
  Package,
  Layers,
}

/* ─── template card ─── */
function TemplateCard({ template, onInstall, onSelect, onAddToCart, inCart }: { template: Template; onInstall: (id: string) => void; onSelect: (t: Template) => void; onAddToCart?: (t: Template) => void; inCart?: boolean }) {
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)
  const Icon = ICON_MAP[template.icon] || Code2

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      })
      if (res.ok) {
        onInstall(template.id)
        setInstalled(true)
      }
    } catch {
      // If API not available, still proceed with client-side install
      onInstall(template.id)
      setInstalled(true)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <Card className="bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700 transition-all h-full flex flex-col overflow-hidden cursor-pointer" onClick={() => onSelect(template)}>
        {template.featured && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center gap-1.5">
            <Crown className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Featured</span>
          </div>
        )}

        <CardHeader className="pb-3 pt-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700/50 ${template.color || "text-zinc-400"}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-zinc-100 truncate">
                  {template.name}
                </CardTitle>
                {template.verified && (
                  <div className="flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                by {template.author}
                {template.version && <span className="text-zinc-600"> • v{template.version}</span>}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pb-3 flex-1">
          <p className="text-xs text-zinc-400 mb-3 line-clamp-2 leading-relaxed">
            {template.description}
          </p>

          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1.5 border-zinc-800 text-zinc-500">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-zinc-800 text-zinc-600">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span>{template.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>{template.downloads >= 1000 ? `${(template.downloads / 1000).toFixed(1)}k` : template.downloads}</span>
              </div>
            </div>
            <span className="font-medium text-zinc-300">{template.price}</span>
          </div>
        </CardContent>

        <CardFooter className="pt-0 pb-4 px-4 gap-2">
          <Button
            onClick={(e) => { e.stopPropagation(); handleInstall(); }}
            disabled={installing || installed}
            className={`flex-1 h-8 text-xs ${
              installed
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            }`}
            variant="outline"
          >
            {installing ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                Installing…
              </>
            ) : installed ? (
              <>
                <Check className="w-3 h-3 mr-1.5" />
                Installed
              </>
            ) : (
              <>
                <Download className="w-3 h-3 mr-1.5" />
                Install
              </>
            )}
          </Button>
          {onAddToCart && (
            <Button
              onClick={(e) => { e.stopPropagation(); onAddToCart(template); }}
              size="sm"
              variant="outline"
              className={`h-8 px-2.5 text-xs transition-all ${
                inCart
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
              }`}
            >
              <ShoppingCart className="w-3 h-3" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════ */
/*                MARKETPLACE                      */
/* ═══════════════════════════════════════════════ */
export default function Marketplace() {
  const { emit, ROOM_EVENTS } = useRoomEvents('marketplace')
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")
  const [sortBy, setSortBy] = useState<"trending" | "newest" | "rating" | "downloads">("trending")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  
  // Cart state
  const [cartItems, setCartItems] = useState<Template[]>([])
  const [showCart, setShowCart] = useState(false)
  
  // Publish dialog state
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [publishForm, setPublishForm] = useState({
    name: "",
    description: "",
    category: "templates",
    tags: "",
    price: "Free",
    readme: "",
  })
  const [isPublishing, setIsPublishing] = useState(false)
  
  // Reviews state
  const [detailTab, setDetailTab] = useState<"overview" | "reviews" | "versions">("overview")
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  
  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch("/api/marketplace/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...publishForm,
          tags: publishForm.tags.split(",").map(t => t.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        setShowPublishDialog(false)
        setPublishForm({ name: "", description: "", category: "templates", tags: "", price: "Free", readme: "" })
        loadTemplates()
      }
    } catch (err) {
      console.error("Publish failed:", err)
    } finally {
      setIsPublishing(false)
    }
  }
  
  const handleSubmitReview = async () => {
    if (!selectedTemplate || !newReview.comment.trim()) return
    setIsSubmittingReview(true)
    try {
      await fetch(`/api/marketplace/templates/${selectedTemplate.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview),
      })
      setNewReview({ rating: 5, comment: "" })
      // Refresh template details to show new review
      loadTemplates()
    } catch (err) {
      console.error("Review failed:", err)
    } finally {
      setIsSubmittingReview(false)
    }
  }
  
  const handleAddToCart = (template: Template) => {
    setCartItems(prev => {
      const exists = prev.find(t => t.id === template.id)
      if (exists) {
        return prev.filter(t => t.id !== template.id) // Toggle off
      }
      return [...prev, template]
    })
  }
  
  const handleRemoveFromCart = (templateId: string) => {
    setCartItems(prev => prev.filter(t => t.id !== templateId))
  }
  
  const cartTotal = cartItems.reduce((sum, t) => {
    const price = parseFloat(t.price.replace(/[^0-9.]/g, '')) || 0
    return sum + price
  }, 0)

  const loadTemplates = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      if (activeCategory !== "all") params.set("category", activeCategory)
      params.set("sort", sortBy)

      const response = await fetch(`/api/marketplace/templates?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        throw new Error("Failed to load templates")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [searchQuery, activeCategory, sortBy])

  const handleInstall = async (templateId: string) => {
    try {
      await fetch("/api/marketplace/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      })
    } catch (error) {
      console.error("Install failed:", error)
    }
  }

  const featuredTemplates = templates.filter((t) => t.featured)
  const regularTemplates = templates.filter((t) => !t.featured)

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 relative overflow-hidden">
      {/* ── Header ── */}
      <div className="border-b border-zinc-800 bg-zinc-900/30">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-100">Marketplace</h1>
                <p className="text-xs text-zinc-500">Discover templates, agents, and components</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowCart(!showCart)}
                className="relative gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200" 
                size="sm"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Cart
                {cartItems.length > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 flex items-center justify-center bg-blue-600 text-[10px]">
                    {cartItems.length}
                  </Badge>
                )}
              </Button>
              <Button className="gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200" size="sm" onClick={() => setShowPublishDialog(true)}>
                <ExternalLink className="w-3.5 h-3.5" />
                Publish
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search templates, agents, components..."
                className="pl-10 h-9 bg-zinc-900/60 border-zinc-700/50 text-sm text-zinc-200 placeholder:text-zinc-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-zinc-500"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-2 text-xs text-zinc-300 h-9"
            >
              <option value="trending">🔥 Trending</option>
              <option value="newest">🆕 Newest</option>
              <option value="rating">⭐ Top Rated</option>
              <option value="downloads">📥 Most Downloaded</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-0">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                    activeCategory === cat.id
                      ? "border-blue-500 text-blue-400"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 animate-spin text-zinc-600 mb-4" />
              <p className="text-sm text-zinc-500">Loading marketplace…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-red-400 text-sm mb-4">Failed to load: {error}</p>
              <Button onClick={loadTemplates} size="sm" className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ShoppingBag className="w-14 h-14 text-zinc-800 mb-4" />
              <h3 className="text-base font-medium text-zinc-400 mb-1">No templates found</h3>
              <p className="text-xs text-zinc-600 mb-4">
                {searchQuery ? "Try different search terms" : "Be the first to publish!"}
              </p>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-3.5 h-3.5" />
                Publish Template
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured Section */}
              {featuredTemplates.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Featured</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredTemplates.map((template) => (
                      <TemplateCard key={template.id} template={template} onInstall={handleInstall} onSelect={setSelectedTemplate} onAddToCart={handleAddToCart} inCart={cartItems.some(t => t.id === template.id)} />
                    ))}
                  </div>
                </div>
              )}

              {/* All Templates */}
              <div>
                {featuredTemplates.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-4 h-4 text-zinc-500" />
                    <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                      {activeCategory === "all" ? "All" : CATEGORIES.find((c) => c.id === activeCategory)?.label}
                    </h2>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-zinc-800 text-zinc-600">
                      {regularTemplates.length}
                    </Badge>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(featuredTemplates.length > 0 ? regularTemplates : templates).map((template) => (
                    <TemplateCard key={template.id} template={template} onInstall={handleInstall} onSelect={setSelectedTemplate} onAddToCart={handleAddToCart} inCart={cartItems.some(t => t.id === template.id)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ── Template Detail Drawer ── */}
      <AnimatePresence>
        {selectedTemplate && (() => {
          const Icon = ICON_MAP[selectedTemplate.icon] || Code2
          return (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 right-0 w-[420px] bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-200">Template Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(null)} className="h-7 w-7 p-0 text-zinc-500">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-5 space-y-6">
                  {/* Hero */}
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50 ${selectedTemplate.color || "text-zinc-400"}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-zinc-100">{selectedTemplate.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        by {selectedTemplate.author}
                        {selectedTemplate.version && <span> • v{selectedTemplate.version}</span>}
                      </p>
                      {selectedTemplate.featured && (
                        <Badge className="mt-2 bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                          <Crown className="w-3 h-3 mr-1" />Featured
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Tab Navigation */}
                  <div className="flex border-b border-zinc-800">
                    {["overview", "reviews"].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setDetailTab(tab as "overview" | "reviews")}
                        className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                          detailTab === tab
                            ? "border-blue-500 text-blue-400"
                            : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {tab === "overview" ? "Overview" : `Reviews (${selectedTemplate.reviews?.length || 0})`}
                      </button>
                    ))}
                  </div>

                  {detailTab === "overview" ? (
                    <>
                      {/* Description */}
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Description</h4>
                        <p className="text-sm text-zinc-300 leading-relaxed">{selectedTemplate.description}</p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center border border-zinc-800/60">
                          <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span className="text-sm font-bold">{selectedTemplate.rating}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500">Rating</span>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center border border-zinc-800/60">
                          <div className="text-sm font-bold text-zinc-200 mb-1">
                            {selectedTemplate.downloads >= 1000 ? `${(selectedTemplate.downloads / 1000).toFixed(1)}k` : selectedTemplate.downloads}
                          </div>
                          <span className="text-[10px] text-zinc-500">Downloads</span>
                        </div>
                        <div className="bg-zinc-800/60 rounded-lg p-3 text-center border border-zinc-800/60">
                          <div className="text-sm font-bold text-zinc-200 mb-1">{selectedTemplate.price}</div>
                          <span className="text-[10px] text-zinc-500">Price</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTemplate.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5 border-zinc-700 text-zinc-400">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between text-zinc-500">
                          <span>Category</span>
                          <span className="text-zinc-300 capitalize">{selectedTemplate.category}</span>
                        </div>
                        {selectedTemplate.version && (
                          <div className="flex justify-between text-zinc-500">
                            <span>Version</span>
                            <span className="text-zinc-300">{selectedTemplate.version}</span>
                          </div>
                        )}
                        {selectedTemplate.lastUpdated && (
                          <div className="flex justify-between text-zinc-500">
                            <span>Last Updated</span>
                            <span className="text-zinc-300">{selectedTemplate.lastUpdated}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-zinc-500">
                          <span>Verified</span>
                          <span className={selectedTemplate.verified ? "text-blue-400" : "text-zinc-600"}>
                            {selectedTemplate.verified ? '✓ Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Reviews Tab */}
                      <div className="space-y-4">
                        {/* Submit Review */}
                        <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
                          <h4 className="text-sm font-medium text-zinc-300 mb-3">Write a Review</h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  onClick={() => setNewReview({ ...newReview, rating: star })}
                                  className="p-0.5"
                                >
                                  <Star
                                    className={`w-5 h-5 transition-colors ${
                                      star <= newReview.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-zinc-600 hover:text-amber-400/50"
                                    }`}
                                  />
                                </button>
                              ))}
                              <span className="ml-2 text-xs text-zinc-500">{newReview.rating}/5</span>
                            </div>
                            <Textarea
                              placeholder="Share your experience with this template..."
                              value={newReview.comment}
                              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                              className="bg-zinc-900 border-zinc-700 text-zinc-200 min-h-[60px] text-sm"
                            />
                            <Button
                              onClick={handleSubmitReview}
                              disabled={isSubmittingReview || !newReview.comment}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
                            >
                              {isSubmittingReview ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5" />
                              )}
                              Submit Review
                            </Button>
                          </div>
                        </div>

                        {/* Reviews List */}
                        {selectedTemplate.reviews && selectedTemplate.reviews.length > 0 ? (
                          <div className="space-y-3">
                            {selectedTemplate.reviews.map((review) => (
                              <div key={review.id} className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <span className="text-sm font-medium text-zinc-300">{review.userName}</span>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3 h-3 ${
                                            star <= review.rating ? "fill-amber-400 text-amber-400" : "text-zinc-700"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-zinc-600">{review.date}</span>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed">{review.comment}</p>
                                <button className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500 hover:text-zinc-300">
                                  <ThumbsUp className="w-3 h-3" />
                                  Helpful ({review.helpful})
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                            <p className="text-sm text-zinc-500">No reviews yet</p>
                            <p className="text-xs text-zinc-600">Be the first to review!</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Action Footer */}
              <div className="p-4 border-t border-zinc-800 space-y-2">
                <Button
                  onClick={() => { handleInstall(selectedTemplate.id); }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Download className="w-4 h-4" />
                  Install {selectedTemplate.name}
                </Button>
                <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 gap-2" onClick={() => setSelectedTemplate(null)}>
                  <Eye className="w-4 h-4" />
                  Back to Browse
                </Button>
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── Cart Drawer ── */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 right-0 w-[380px] bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-zinc-200">Your Cart</h2>
                <Badge className="text-[10px] bg-blue-600/20 text-blue-400 border-blue-500/30">
                  {cartItems.length}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowCart(false)} className="h-7 w-7 p-0 text-zinc-500">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShoppingCart className="w-12 h-12 text-zinc-800 mb-3" />
                  <p className="text-sm text-zinc-500">Your cart is empty</p>
                  <p className="text-xs text-zinc-600 mt-1">Add templates to get started</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {cartItems.map((item) => {
                    const Icon = ICON_MAP[item.icon] || Code2
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                        <div className={`p-2 rounded-lg bg-zinc-800 border border-zinc-700/50 ${item.color || "text-zinc-400"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-zinc-200 truncate">{item.name}</h4>
                          <p className="text-xs text-zinc-500">{item.price}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Cart Footer */}
            {cartItems.length > 0 && (
              <div className="p-4 border-t border-zinc-800 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Total</span>
                  <span className="font-semibold text-zinc-200">
                    {cartTotal === 0 ? 'Free' : `$${cartTotal.toFixed(2)}`}
                  </span>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Download className="w-4 h-4" />
                  Install All ({cartItems.length})
                </Button>
                <Button variant="outline" className="w-full border-zinc-700 text-zinc-400 text-xs" onClick={() => setCartItems([])}>
                  Clear Cart
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Bar ── */}
      <div className="h-7 border-t border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/20 text-[11px] text-zinc-600">
        <span>{templates.length} templates available</span>
        <div className="flex items-center gap-3">
          <span>Category: {CATEGORIES.find((c) => c.id === activeCategory)?.label}</span>
          <span>Sort: {sortBy}</span>
        </div>
      </div>

      {/* ── Publish Dialog ── */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Upload className="w-5 h-5 text-blue-400" />
              Publish to Marketplace
            </DialogTitle>
            <DialogDescription className="text-zinc-500">
              Share your template with the community
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Template Name</Label>
              <Input
                placeholder="My Awesome Template"
                value={publishForm.name}
                onChange={(e) => setPublishForm({ ...publishForm, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Description</Label>
              <Textarea
                placeholder="Describe what your template does..."
                value={publishForm.description}
                onChange={(e) => setPublishForm({ ...publishForm, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">Category</Label>
                <select
                  value={publishForm.category}
                  onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="templates">Templates</option>
                  <option value="agents">Agents</option>
                  <option value="components">Components</option>
                  <option value="themes">Themes</option>
                  <option value="integrations">Integrations</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-400">Price</Label>
                <select
                  value={publishForm.price}
                  onChange={(e) => setPublishForm({ ...publishForm, price: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="Free">Free</option>
                  <option value="$4.99">$4.99</option>
                  <option value="$9.99">$9.99</option>
                  <option value="$19.99">$19.99</option>
                  <option value="$49.99">$49.99</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Tags (comma-separated)</Label>
              <Input
                placeholder="react, typescript, api"
                value={publishForm.tags}
                onChange={(e) => setPublishForm({ ...publishForm, tags: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">README / Documentation</Label>
              <Textarea
                placeholder="# Getting Started\n\nProvide setup instructions..."
                value={publishForm.readme}
                onChange={(e) => setPublishForm({ ...publishForm, readme: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 min-h-[100px] font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishDialog(false)} className="border-zinc-700 text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !publishForm.name || !publishForm.description}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Publish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
