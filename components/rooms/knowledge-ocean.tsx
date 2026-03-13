"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRoomEvents } from "@/lib/hooks/use-room-events"
import {
  Search,
  FileText,
  FolderTree,
  Database,
  Clock,
  RefreshCw,
  Code2,
  Brain,
  Layers,
  FileCode,
  Zap,
  Globe,
  BookOpen,
  Link2,
  Upload,
  Trash2,
  Filter,
  ChevronRight,
  Star,
  Eye,
  ArrowUpRight,
  Hash,
  Sparkles,
  Network,
  GitBranch,
  Package,
  Shield,
  BarChart3,
  X,
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Download,
  Tag,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/* ─── types ─── */
interface KnowledgeItem {
  id: string
  title: string
  type: "file" | "function" | "component" | "api" | "schema" | "doc" | "external" | "package" | "test"
  path?: string
  description?: string
  relevance?: number
  source?: string
  language?: string
  size?: number
  lastModified?: string
  tags?: string[]
}

/* ─── highlight helper ─── */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

interface IndexStats {
  totalFiles: number
  totalFunctions: number
  totalComponents: number
  totalApis: number
  totalDocs: number
  lastScan: Date | null
}

/* ─── type config ─── */
const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  file: { icon: FileText, color: "text-blue-400", label: "File" },
  function: { icon: Code2, color: "text-emerald-400", label: "Function" },
  component: { icon: Layers, color: "text-purple-400", label: "Component" },
  api: { icon: Globe, color: "text-orange-400", label: "API" },
  schema: { icon: Database, color: "text-red-400", label: "Schema" },
  doc: { icon: BookOpen, color: "text-yellow-400", label: "Doc" },
  external: { icon: Link2, color: "text-cyan-400", label: "External" },
  package: { icon: Package, color: "text-pink-400", label: "Package" },
  test: { icon: Shield, color: "text-green-400", label: "Test" },
}

const TABS = [
  { id: "all", label: "All", icon: Layers },
  { id: "files", label: "Files", icon: FileText },
  { id: "functions", label: "Functions", icon: Code2 },
  { id: "components", label: "Components", icon: Layers },
  { id: "apis", label: "APIs", icon: Globe },
  { id: "docs", label: "Docs", icon: BookOpen },
  { id: "graph", label: "Graph", icon: Network },
]

/* ─── knowledge item card ─── */
function KnowledgeCard({
  item,
  searchQuery = "",
  onDelete,
}: {
  item: KnowledgeItem
  searchQuery?: string
  onDelete?: (id: string) => void
}) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.file
  const Icon = config.icon
  const [copied, setCopied] = useState(false)

  const copyPath = () => {
    if (item.path) {
      navigator.clipboard.writeText(item.path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyLink = () => {
    // construct a real shareable URL using the current origin; the
    // knowledge explorer page handles deep linking by ID.
    const url = `${window.location.origin}/knowledge/${encodeURIComponent(item.id)}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportMarkdown = () => {
    const content = [
      `# ${item.title}`,
      "",
      item.description || "",
      "",
      item.path ? `**Path:** \`${item.path}\`` : "",
      item.tags?.length ? `**Tags:** ${item.tags.join(", ")}` : "",
    ]
      .filter((l) => l !== undefined)
      .join("\n")
    const blob = new Blob([content], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${item.title.replace(/\s+/g, "-").toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="group px-4 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-1.5 rounded-md bg-zinc-800/50 ${config.color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
              {highlightText(item.title, searchQuery)}
            </h4>
            <Badge variant="outline" className={`text-[9px] h-4 px-1 border-zinc-700/50 ${config.color}`}>
              {config.label}
            </Badge>
            {item.relevance != null && item.relevance > 0 && (
              <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">
                {Math.round(item.relevance * 100)}%
              </span>
            )}
          </div>

          {item.path && (
            <div className="flex items-center gap-1.5 group/path">
              <p className="text-[11px] text-zinc-500 truncate font-mono">{item.path}</p>
              <button
                onClick={(e) => { e.stopPropagation(); copyPath() }}
                className="opacity-0 group-hover/path:opacity-100 transition-opacity flex-shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />}
              </button>
            </div>
          )}

          {item.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
              {highlightText(item.description, searchQuery)}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {item.language && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-zinc-800 text-zinc-500">
                {item.language}
              </Badge>
            )}
            {item.size != null && (
              <span className="text-[10px] text-zinc-600">
                {item.size > 1024 ? `${(item.size / 1024).toFixed(1)} KB` : `${item.size} B`}
              </span>
            )}
            {item.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1.5 border-blue-800/50 text-blue-400/80 bg-blue-500/5">
                #{tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-zinc-500 hover:text-white"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-500 hover:text-white">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200 text-xs w-44">
              <DropdownMenuItem onClick={copyLink} className="gap-2 cursor-pointer hover:bg-zinc-800">
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportMarkdown} className="gap-2 cursor-pointer hover:bg-zinc-800">
                <Download className="w-3.5 h-3.5" /> Export as Markdown
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(item.id)}
                  className="gap-2 cursor-pointer text-red-400 hover:bg-zinc-800 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Force-directed knowledge graph using canvas + simulation ─── */
function ForceGraph({ items, onSelect }: { items: KnowledgeItem[]; onSelect: (item: KnowledgeItem) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const nodesRef = useRef<{ x: number; y: number; vx: number; vy: number; item: KnowledgeItem; type: string; radius: number }[]>([])
  const edgesRef = useRef<{ source: number; target: number }[]>([])
  const animFrameRef = useRef<number>(0)
  const [hoveredNode, setHoveredNode] = useState<KnowledgeItem | null>(null)
  const [graphSearch, setGraphSearch] = useState("")
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set())
  
  // Zoom/pan state
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [draggedNode, setDraggedNode] = useState<number | null>(null)
  const lastMouseRef = useRef({ x: 0, y: 0 })

  const TYPE_COLORS: Record<string, string> = {
    file: '#3b82f6', function: '#10b981', component: '#a855f7',
    api: '#f97316', schema: '#ef4444', doc: '#eab308',
    external: '#06b6d4', package: '#ec4899', test: '#22c55e',
  }

  // Search filter for graph nodes
  useEffect(() => {
    if (!graphSearch.trim()) {
      setHighlightedNodes(new Set())
      return
    }
    const query = graphSearch.toLowerCase()
    const matches = new Set<string>()
    items.forEach(item => {
      if (item.title.toLowerCase().includes(query) || 
          item.path?.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query)) {
        matches.add(item.id)
      }
    })
    setHighlightedNodes(matches)
  }, [graphSearch, items])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const W = container.clientWidth
    const H = container.clientHeight
    canvas.width = W * window.devicePixelRatio
    canvas.height = H * window.devicePixelRatio
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Build nodes grouped by type
    const typeGroups: Record<string, KnowledgeItem[]> = {}
    items.forEach(item => {
      if (!typeGroups[item.type]) typeGroups[item.type] = []
      typeGroups[item.type].push(item)
    })

    const typeKeys = Object.keys(typeGroups)
    const nodes: typeof nodesRef.current = []
    items.forEach((item, i) => {
      const typeIdx = typeKeys.indexOf(item.type)
      const angle = (typeIdx / typeKeys.length) * Math.PI * 2
      const spread = 100 + Math.random() * 150
      nodes.push({
        x: W / 2 + Math.cos(angle) * spread + (Math.random() - 0.5) * 80,
        y: H / 2 + Math.sin(angle) * spread + (Math.random() - 0.5) * 80,
        vx: 0, vy: 0,
        item,
        type: item.type,
        radius: item.type === 'component' || item.type === 'api' ? 18 : 12,
      })
    })
    nodesRef.current = nodes

    // Build edges: connect items of same type + cross-type by path similarity
    const edges: { source: number; target: number }[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].type === nodes[j].type && Math.random() < 0.3) {
          edges.push({ source: i, target: j })
        } else if (nodes[i].item.path && nodes[j].item.path) {
          const dir1 = nodes[i].item.path!.split('/').slice(0, -1).join('/')
          const dir2 = nodes[j].item.path!.split('/').slice(0, -1).join('/')
          if (dir1 === dir2 && dir1.length > 0) {
            edges.push({ source: i, target: j })
          }
        }
      }
    }
    edgesRef.current = edges

    // Force simulation step
    const simulate = () => {
      const alpha = 0.3
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x
          const dy = nodes[j].y - nodes[i].y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = -800 / (dist * dist)
          const fx = (dx / dist) * force * alpha
          const fy = (dy / dist) * force * alpha
          nodes[i].vx -= fx; nodes[i].vy -= fy
          nodes[j].vx += fx; nodes[j].vy += fy
        }
      }
      // Spring edges
      edges.forEach(({ source, target }) => {
        const dx = nodes[target].x - nodes[source].x
        const dy = nodes[target].y - nodes[source].y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const force = (dist - 80) * 0.006 * alpha
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        nodes[source].vx += fx; nodes[source].vy += fy
        nodes[target].vx -= fx; nodes[target].vy -= fy
      })
      // Center gravity
      nodes.forEach(n => {
        n.vx += (W / 2 - n.x) * 0.001
        n.vy += (H / 2 - n.y) * 0.001
        n.vx *= 0.9; n.vy *= 0.9
        n.x += n.vx; n.y += n.vy
        n.x = Math.max(n.radius, Math.min(W - n.radius, n.x))
        n.y = Math.max(n.radius, Math.min(H - n.radius, n.y))
      })
    }

    // Draw with zoom/pan
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.translate(panOffset.x, panOffset.y)
      ctx.scale(zoom, zoom)
      
      // Edges
      ctx.lineWidth = 0.5 / zoom
      ctx.strokeStyle = '#3f3f46'
      edges.forEach(({ source, target }) => {
        ctx.beginPath()
        ctx.moveTo(nodes[source].x, nodes[source].y)
        ctx.lineTo(nodes[target].x, nodes[target].y)
        ctx.stroke()
      })
      // Nodes
      nodes.forEach(n => {
        const isHighlighted = highlightedNodes.size > 0 && highlightedNodes.has(n.item.id)
        const isHovered = hoveredNode?.id === n.item.id
        const isDimmed = highlightedNodes.size > 0 && !isHighlighted
        
        ctx.beginPath()
        ctx.arc(n.x, n.y, isHighlighted ? n.radius * 1.3 : n.radius, 0, Math.PI * 2)
        ctx.fillStyle = TYPE_COLORS[n.type] || '#888'
        ctx.globalAlpha = isDimmed ? 0.2 : 0.8
        ctx.fill()
        ctx.globalAlpha = 1
        
        // Border
        ctx.strokeStyle = isHighlighted ? '#fff' : isHovered ? '#fbbf24' : '#52525b'
        ctx.lineWidth = (isHighlighted || isHovered ? 2 : 1) / zoom
        ctx.stroke()
        
        // Highlight ring
        if (isHighlighted) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.radius * 1.6, 0, Math.PI * 2)
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 2 / zoom
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])
        }
        
        // Label
        if (!isDimmed) {
          ctx.fillStyle = isHighlighted ? '#fbbf24' : '#e4e4e7'
          ctx.font = `${9 / zoom}px sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(n.item.title.substring(0, 12), n.x, n.y + n.radius + 12 / zoom)
        }
      })
      ctx.restore()
    }

    let frameCount = 0
    const loop = () => {
      if (frameCount < 300 && draggedNode === null) simulate() // Settle after 300 frames, skip if dragging
      draw()
      frameCount++
      animFrameRef.current = requestAnimationFrame(loop)
    }
    loop()

    // Convert screen coords to graph coords
    const screenToGraph = (sx: number, sy: number) => ({
      x: (sx - panOffset.x) / zoom,
      y: (sy - panOffset.y) / zoom,
    })

    // Click handler
    const onClick = (e: MouseEvent) => {
      if (isPanning) return
      const rect = canvas.getBoundingClientRect()
      const { x: mx, y: my } = screenToGraph(e.clientX - rect.left, e.clientY - rect.top)
      for (const n of nodes) {
        const dx = mx - n.x, dy = my - n.y
        if (dx * dx + dy * dy < n.radius * n.radius) {
          onSelect(n.item)
          break
        }
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const { x: mx, y: my } = screenToGraph(e.clientX - rect.left, e.clientY - rect.top)
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      
      // Check if clicking on a node to drag
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const dx = mx - n.x, dy = my - n.y
        if (dx * dx + dy * dy < n.radius * n.radius) {
          setDraggedNode(i)
          return
        }
      }
      // Otherwise start panning
      setIsPanning(true)
    }

    const onMouseUp = () => {
      setIsPanning(false)
      setDraggedNode(null)
    }

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const { x: mx, y: my } = screenToGraph(e.clientX - rect.left, e.clientY - rect.top)
      
      if (draggedNode !== null) {
        // Drag node
        nodes[draggedNode].x = mx
        nodes[draggedNode].y = my
        nodes[draggedNode].vx = 0
        nodes[draggedNode].vy = 0
      } else if (isPanning) {
        // Pan
        const dx = e.clientX - lastMouseRef.current.x
        const dy = e.clientY - lastMouseRef.current.y
        setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
        lastMouseRef.current = { x: e.clientX, y: e.clientY }
      } else {
        // Hover detection
        let found: KnowledgeItem | null = null
        for (const n of nodes) {
          const dx = mx - n.x, dy = my - n.y
          if (dx * dx + dy * dy < n.radius * n.radius) {
            found = n.item
            break
          }
        }
        setHoveredNode(found)
        canvas.style.cursor = found ? 'pointer' : isPanning ? 'grabbing' : 'grab'
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.2, Math.min(3, zoom * delta))
      
      // Zoom toward mouse position
      const scale = newZoom / zoom
      setPanOffset(prev => ({
        x: mx - (mx - prev.x) * scale,
        y: my - (my - prev.y) * scale,
      }))
      setZoom(newZoom)
    }

    canvas.addEventListener('click', onClick)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [items, hoveredNode, onSelect, zoom, panOffset, isPanning, draggedNode, highlightedNodes])

  return (
    <div ref={containerRef} className="w-full h-full relative min-h-[400px]">
      <canvas ref={canvasRef} className="w-full h-full cursor-grab" />
      
      {/* Graph Search */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={graphSearch}
            onChange={(e) => setGraphSearch(e.target.value)}
            placeholder="Search graph..."
            className="w-48 pl-8 pr-3 py-1.5 text-xs bg-zinc-900/90 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          {graphSearch && (
            <button
              onClick={() => setGraphSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        {highlightedNodes.size > 0 && (
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded">
            {highlightedNodes.size} match{highlightedNodes.size !== 1 ? 'es' : ''}
          </span>
        )}
      </div>
      
      {/* Zoom Controls */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 rounded-lg p-1">
        <button
          onClick={() => setZoom(z => Math.max(0.2, z / 1.2))}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-zinc-700 mx-1" />
        <button
          onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Reset view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute top-3 right-3 bg-zinc-900/95 border border-zinc-700 rounded-lg px-3 py-2 text-xs max-w-[200px] z-10">
          <div className="font-semibold text-zinc-200">{hoveredNode.title}</div>
          <div className="text-zinc-500 mt-0.5">{hoveredNode.type} • {hoveredNode.path || 'unknown'}</div>
          {hoveredNode.description && <div className="text-zinc-400 mt-1 line-clamp-2">{hoveredNode.description}</div>}
        </div>
      )}
      
      {/* Instructions */}
      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-zinc-600 bg-zinc-900/80 px-2 py-1 rounded">
        Scroll to zoom • Drag to pan • Click nodes to select
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════ */
/*              KNOWLEDGE OCEAN                    */
/* ═══════════════════════════════════════════════ */
export default function KnowledgeOcean() {
  const { emit, ROOM_EVENTS } = useRoomEvents('knowledge-ocean')
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [isGeneratingEmbeddings, setIsGeneratingEmbeddings] = useState(false)
  const [embeddingsReady, setEmbeddingsReady] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [searchMode, setSearchMode] = useState<"local" | "semantic">("local")
  const [ragQuestion, setRagQuestion] = useState("")
  const [ragAnswer, setRagAnswer] = useState("")
  const [ragSources, setRagSources] = useState<any[]>([])
  const [isAskingRag, setIsAskingRag] = useState(false)
  const [showAskPanel, setShowAskPanel] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<{ question: string; answer: string; sources: any[]; timestamp: string }[]>([])
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [viewingItem, setViewingItem] = useState<KnowledgeItem | null>(null)

  const [stats, setStats] = useState<IndexStats>({
    totalFiles: 0,
    totalFunctions: 0,
    totalComponents: 0,
    totalApis: 0,
    totalDocs: 0,
    lastScan: null,
  })

  // New document dialog state
  const [showNewDocDialog, setShowNewDocDialog] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [newDocContent, setNewDocContent] = useState("")
  const [newDocTags, setNewDocTags] = useState("")

  // Active tag filter
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)

  // Scan project files using Knowledge Engine
  const scanProjectFiles = useCallback(async () => {
    setIsScanning(true)
    try {
      // Trigger indexing
      const indexResponse = await fetch("/api/knowledge/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPath: "/" }),
      })

      if (indexResponse.ok) {
        const indexData = await indexResponse.json()
        console.log("[KnowledgeOcean] Indexed:", indexData.stats)

        if (indexData.stats) {
          setStats({
            totalFiles: indexData.stats.files || 0,
            totalFunctions: indexData.stats.functions || 0,
            totalComponents: indexData.stats.components || 0,
            totalApis: indexData.stats.apis || 0,
            totalDocs: indexData.stats.docs || 0,
            lastScan: new Date(),
          })
        }
      }

      // Get items via search
      const searchResponse = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "*", mode: "local", maxResults: 1000 }),
      })

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        const items: KnowledgeItem[] = (searchData.results || []).map((result: any) => ({
          id: result.id,
          title: result.name,
          type: result.type,
          path: result.path,
          description: result.content ? result.content.substring(0, 150) : undefined,
          relevance: result.score || result.relevanceScore,
          language: result.language,
          size: result.size,
        }))
        setKnowledgeItems(items)
      } else {
        setKnowledgeItems([])
      }
    } catch (error) {
      console.error("Error scanning files:", error)
      setKnowledgeItems([])
    } finally {
      setIsScanning(false)
      // Bridge: notify all rooms that knowledge index has been updated
      window.dispatchEvent(new CustomEvent('azora:knowledge-indexed', {
        detail: { itemCount: knowledgeItems.length, timestamp: new Date().toISOString() },
      }))
    }
  }, [])

  // Semantic search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) return

    try {
      const resp = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode: searchMode, maxResults: 50 }),
      })

      if (resp.ok) {
        const data = await resp.json()
        const items: KnowledgeItem[] = (data.results || []).map((r: any) => ({
          id: r.id,
          title: r.name,
          type: r.type,
          path: r.path,
          description: r.content ? r.content.substring(0, 150) : undefined,
          relevance: r.score || r.relevanceScore,
          language: r.language,
        }))
        setKnowledgeItems(items)
      }
    } catch (error) {
      console.error("Search failed:", error)
    }
  }, [searchMode])

  // Generate vector embeddings for semantic search
  const generateEmbeddings = useCallback(async () => {
    if (isGeneratingEmbeddings) return
    setIsGeneratingEmbeddings(true)
    
    try {
      const resp = await fetch("/api/knowledge/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      if (resp.ok) {
        const data = await resp.json()
        if (data.success) {
          setEmbeddingsReady(true)
          setSearchMode("semantic")
          console.log(`[KnowledgeOcean] Generated embeddings for ${data.chunksProcessed} chunks`)
        }
      }
    } catch (error) {
      console.error("Embedding generation failed:", error)
    } finally {
      setIsGeneratingEmbeddings(false)
    }
  }, [isGeneratingEmbeddings])

  // RAG Q&A — Ask questions about the codebase
  const askQuestion = useCallback(async () => {
    if (!ragQuestion.trim() || isAskingRag) return
    setIsAskingRag(true)
    setRagAnswer("")
    setRagSources([])

    // Emit cross-room event for achievement tracking
    try {
      fetch('/api/collectibles/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'knowledge-ask', room: 'knowledge-ocean' }),
      }).catch(() => {})
    } catch { /* silent */ }

    try {
      // First, retrieve relevant context via search
      const searchResp = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: ragQuestion, mode: "local", maxResults: 10 }),
      })

      let context: any[] = []
      if (searchResp.ok) {
        const searchData = await searchResp.json()
        context = (searchData.results || []).map((r: any) => ({
          title: r.name,
          path: r.path,
          content: r.content ? r.content.substring(0, 500) : r.name,
          relevance: r.score,
        }))
      }

      // Then, ask the RAG endpoint
      const ragResp = await fetch("/api/knowledge/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: ragQuestion, context }),
      })

      if (ragResp.ok) {
        const ragData = await ragResp.json()
        const answer = ragData.answer || "No answer generated."
        const sources = ragData.sources || []
        setRagAnswer(answer)
        setRagSources(sources)

        // Bridge: broadcast knowledge answer to all rooms
        window.dispatchEvent(new CustomEvent('azora:knowledge-answer', {
          detail: { question: ragQuestion, answer, sources, timestamp: new Date().toISOString() },
        }))

        // Save to conversation history
        const entry = { question: ragQuestion, answer, sources, timestamp: new Date().toISOString() }
        setConversationHistory(prev => [...prev, entry])

        // Fetch related follow-up questions
        try {
          const relResp = await fetch("/api/knowledge/graph", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "suggest-related", question: ragQuestion, answer }),
          })
          if (relResp.ok) {
            const relData = await relResp.json()
            setRelatedQuestions(relData.suggestions || [])
          }
        } catch { /* silent */ }
      } else {
        setRagAnswer("Sorry, I couldn't generate an answer. Please try again.")
      }
    } catch (error) {
      console.error("RAG Q&A failed:", error)
      setRagAnswer("An error occurred while processing your question.")
    } finally {
      setIsAskingRag(false)
    }
  }, [ragQuestion, isAskingRag])

  // Save new document
  const saveNewDocument = useCallback(() => {
    if (!newDocTitle.trim()) return
    const tags = newDocTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const newItem: KnowledgeItem = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      type: "doc",
      description: newDocContent.trim() || undefined,
      size: newDocContent.length,
      tags,
      lastModified: new Date().toISOString(),
    }
    setKnowledgeItems((prev) => [newItem, ...prev])
    setNewDocTitle("")
    setNewDocContent("")
    setNewDocTags("")
    setShowNewDocDialog(false)
  }, [newDocTitle, newDocContent, newDocTags])

  // Delete item from state
  const deleteItem = useCallback((id: string) => {
    setKnowledgeItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  useEffect(() => {
    scanProjectFiles()
  }, [scanProjectFiles])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) return
    const timer = setTimeout(() => performSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, performSearch])

  // Filter by tab + tag
  const filteredItems = useMemo(() => {
    let items = knowledgeItems

    if (activeTab !== "all") {
      const typeMap: Record<string, string[]> = {
        files: ["file"],
        functions: ["function"],
        components: ["component"],
        apis: ["api"],
        docs: ["doc", "external"],
      }
      const types = typeMap[activeTab] || []
      items = items.filter((item) => types.includes(item.type))
    }

    if (searchQuery && !searchMode) {
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.path?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (activeTagFilter) {
      items = items.filter((item) => item.tags?.includes(activeTagFilter))
    }

    return items
  }, [knowledgeItems, activeTab, searchQuery, searchMode, activeTagFilter])

  // All unique tags across all items
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    knowledgeItems.forEach((item) => item.tags?.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [knowledgeItems])

  // Storage used derived from content lengths (in KB)
  const storageUsedKB = useMemo(() => {
    return (knowledgeItems.reduce((acc, item) => acc + (item.size || (item.description?.length ?? 0)), 0) / 1024).toFixed(1)
  }, [knowledgeItems])

  const totalIndexed = knowledgeItems.length

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100">
      {/* ── New Document Dialog ── */}
      <Dialog open={showNewDocDialog} onOpenChange={setShowNewDocDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              New Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Title</Label>
              <Input
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Document title"
                className="h-9 bg-zinc-950/50 border-zinc-700/50 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Content (Markdown)</Label>
              <Textarea
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                placeholder="Write markdown content..."
                className="min-h-[120px] bg-zinc-950/50 border-zinc-700/50 text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Tags (comma-separated)</Label>
              <Input
                value={newDocTags}
                onChange={(e) => setNewDocTags(e.target.value)}
                placeholder="e.g. auth, api, frontend"
                className="h-9 bg-zinc-950/50 border-zinc-700/50 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewDocDialog(false)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={saveNewDocument}
              disabled={!newDocTitle.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Header ── */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <Brain className="w-4 h-4 text-blue-400" />
          </div>
          <h1 className="font-semibold text-base">Knowledge Ocean</h1>
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-700 text-zinc-500">
            {totalIndexed} indexed
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchMode("local")}
              className={`h-7 px-2.5 text-xs gap-1 ${searchMode === "local" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              <Search className="w-3 h-3" />
              Text
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchMode("semantic")}
              className={`h-7 px-2.5 text-xs gap-1 ${searchMode === "semantic" ? "bg-zinc-800 text-white" : "text-zinc-500"}`}
            >
              <Sparkles className="w-3 h-3" />
              Semantic
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAskPanel(!showAskPanel)}
            className={`h-8 gap-1.5 border-zinc-700 ${showAskPanel ? "text-blue-400 border-blue-500/50" : "text-zinc-300"}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewDocDialog(true)}
            className="h-8 gap-1.5 border-zinc-700 text-zinc-300 hover:text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            New Doc
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={scanProjectFiles}
            disabled={isScanning}
            className="h-8 gap-1.5 border-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning…" : "Rescan"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={generateEmbeddings}
            disabled={isGeneratingEmbeddings || isScanning}
            className={`h-8 gap-1.5 border-zinc-700 ${embeddingsReady ? 'text-emerald-400 border-emerald-700' : 'text-zinc-300'}`}
          >
            <Brain className={`w-3.5 h-3.5 ${isGeneratingEmbeddings ? "animate-pulse" : ""}`} />
            {isGeneratingEmbeddings ? "Embedding…" : embeddingsReady ? "Vectors ✓" : "Embed"}
          </Button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-6 py-3 border-b border-zinc-800/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchMode === "semantic" ? "Search with natural language..." : "Search knowledge base..."}
            className="pl-10 h-9 bg-zinc-900/50 border-zinc-700/50 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearchQuery(""); scanProjectFiles() }}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-zinc-500"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Ask AI Panel (RAG) ── */}
      <AnimatePresence>
        {showAskPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-zinc-800/50 overflow-hidden"
          >
            <div className="px-6 py-4 bg-zinc-900/30">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-zinc-200">Ask about your codebase</span>
                {conversationHistory.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    {conversationHistory.length} previous {conversationHistory.length === 1 ? "question" : "questions"}
                  </button>
                )}
              </div>

              {/* Conversation History */}
              {showHistory && conversationHistory.length > 0 && (
                <div className="mb-3 max-h-40 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-zinc-700">
                  {conversationHistory.map((entry, i) => (
                    <button
                      key={i}
                      onClick={() => { setRagQuestion(entry.question); setShowHistory(false) }}
                      className="w-full text-left p-2 rounded-md bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800/50 transition-colors"
                    >
                      <div className="text-xs text-zinc-400 truncate">{entry.question}</div>
                      <div className="text-[10px] text-zinc-600 truncate mt-0.5">{entry.answer.substring(0, 80)}…</div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={ragQuestion}
                  onChange={(e) => setRagQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                  placeholder="e.g. How does the authentication flow work?"
                  className="flex-1 h-9 bg-zinc-900/50 border-zinc-700/50 text-sm text-zinc-200 placeholder:text-zinc-600"
                  disabled={isAskingRag}
                />
                <Button
                  onClick={askQuestion}
                  disabled={isAskingRag || !ragQuestion.trim()}
                  size="sm"
                  className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isAskingRag ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isAskingRag ? "Thinking…" : "Ask"}
                </Button>
              </div>
              {ragAnswer && (
                <div className="mt-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/30">
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{ragAnswer}</div>
                  {ragSources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-zinc-700/30">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium">Sources</span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {ragSources.map((src: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px] h-5 px-1.5 border-zinc-700 text-zinc-500">
                            {src.title || src.path}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Related Questions */}
              {relatedQuestions.length > 0 && (
                <div className="mt-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/20">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Related Questions</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {relatedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setRagQuestion(q); setRelatedQuestions([]) }}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Index Statistics Dashboard ── */}
      <div className="px-6 py-3 border-b border-zinc-800/30 grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 px-3 py-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Documents</div>
          <div className="text-lg font-semibold text-zinc-200">{totalIndexed}</div>
        </div>
        <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 px-3 py-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Total Indexed</div>
          <div className="text-lg font-semibold text-zinc-200">
            {stats.totalFiles + stats.totalFunctions + stats.totalComponents + stats.totalApis + stats.totalDocs}
          </div>
        </div>
        <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 px-3 py-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Storage Used</div>
          <div className="text-lg font-semibold text-zinc-200">{storageUsedKB} KB</div>
        </div>
        <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/50 px-3 py-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Last Indexed</div>
          <div className="text-sm font-medium text-zinc-200 truncate">
            {stats.lastScan ? stats.lastScan.toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      {/* ── Tag Filter Bar ── */}
      {allTags.length > 0 && (
        <div className="px-6 py-2 border-b border-zinc-800/30 flex items-center gap-2 flex-wrap">
          <Tag className="w-3 h-3 text-zinc-600 flex-shrink-0" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                activeTagFilter === tag
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                  : "bg-zinc-800/30 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
              }`}
            >
              #{tag}
            </button>
          ))}
          {activeTagFilter && (
            <button
              onClick={() => setActiveTagFilter(null)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-0.5 ml-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Tabs + Content ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-2">
          <TabsList className="bg-zinc-900/50 h-8 p-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const count = tab.id === "all"
                ? filteredItems.length
                : knowledgeItems.filter((i) => {
                    const typeMap: Record<string, string[]> = {
                      files: ["file"], functions: ["function"], components: ["component"], apis: ["api"], docs: ["doc", "external"],
                    }
                    return (typeMap[tab.id] || []).includes(i.type)
                  }).length
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-1.5 text-[11px] h-7 data-[state=active]:bg-zinc-800"
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                  <span className="text-zinc-600 ml-0.5">{count}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>

        {/* Content for non-graph tabs */}
        {TABS.filter(tab => tab.id !== "graph").map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              {isScanning ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-4" />
                  <p className="text-sm text-zinc-400">Scanning project files…</p>
                  <p className="text-xs text-zinc-600 mt-1">Indexing code, docs, and APIs</p>
                </div>
              ) : filteredItems.length > 0 ? (
                <div>
                  {filteredItems.map((item) => (
                    <KnowledgeCard key={item.id} item={item} searchQuery={searchQuery} onDelete={deleteItem} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <Brain className="w-10 h-10 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500 mb-1">
                    {searchQuery ? "No results found" : "No items indexed"}
                  </p>
                  <p className="text-xs text-zinc-600 mb-4">
                    {searchQuery ? "Try different search terms" : 'Click "Rescan" to index your project'}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={scanProjectFiles}
                      size="sm"
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Scan Project
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        ))}

        {/* Graph tab — Interactive force-directed knowledge topology */}
        <TabsContent value="graph" className="flex-1 m-0 overflow-hidden">
          <div className="h-full flex flex-col bg-zinc-950/50">
            <div className="px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
              <Network className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-300">Knowledge Graph</span>
              <Badge variant="outline" className="text-[10px] h-5 border-zinc-700 text-zinc-500 ml-auto">{knowledgeItems.length} nodes</Badge>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {knowledgeItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <Network className="w-12 h-12 text-zinc-700 mb-3" />
                  <p className="text-sm text-zinc-500">No knowledge indexed yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Scan your project to visualize connections</p>
                </div>
              ) : (
                <ForceGraph items={knowledgeItems} onSelect={setViewingItem} />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Viewer Panel */}
      <AnimatePresence>
        {viewingItem && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute inset-y-0 right-0 w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col z-30 shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                {(() => { const conf = TYPE_CONFIG[viewingItem.type] || TYPE_CONFIG.file; const Icon = conf.icon; return <Icon className={`w-4 h-4 ${conf.color}`} /> })()}
                <span className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">{viewingItem.title}</span>
              </div>
              <button onClick={() => setViewingItem(null)} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ScrollArea className="flex-1 p-5">
              <div className="space-y-4">
                {viewingItem.path && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">Path</div>
                    <code className="text-xs text-zinc-300 bg-zinc-800 px-2 py-1 rounded block break-all">{viewingItem.path}</code>
                  </div>
                )}
                {viewingItem.description && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">Description</div>
                    <p className="text-sm text-zinc-300 leading-relaxed">{viewingItem.description}</p>
                  </div>
                )}
                {viewingItem.language && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">Language</div>
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">{viewingItem.language}</Badge>
                  </div>
                )}
                {viewingItem.tags && viewingItem.tags.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingItem.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {viewingItem.size != null && (
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Size</div>
                      <div className="text-sm font-semibold text-zinc-200">{viewingItem.size} bytes</div>
                    </div>
                  )}
                  {viewingItem.lastModified && (
                    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                      <div className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">Modified</div>
                      <div className="text-sm font-semibold text-zinc-200 truncate">{viewingItem.lastModified}</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 border-zinc-700 text-zinc-300 text-xs"
                    onClick={() => { if (viewingItem.path) navigator.clipboard.writeText(viewingItem.path) }}>
                    <Copy className="w-3.5 h-3.5" />Copy Path
                  </Button>
                  <Button size="sm" className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs">
                    <Eye className="w-3.5 h-3.5" />Open
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Bar ── */}
      <div className="h-7 border-t border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/20 text-[11px] text-zinc-600">
        <span>{filteredItems.length} items</span>
        <div className="flex items-center gap-3">
          <span>Mode: {searchMode === "semantic" ? "AI Semantic" : "Text Search"}</span>
          {stats.lastScan && <span>Last scan: {stats.lastScan.toLocaleTimeString()}</span>}
        </div>
      </div>
    </div>
  )
}
