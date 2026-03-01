"use client"

import { useState, useMemo } from "react"
import {
  Box,
  Search,
  Zap,
  Cloud,
  Server,
  Globe,
  Smartphone,
  Link2,
  Star,
  ArrowRight,
  CheckCircle2,
  Clock,
  HardDrive,
  Cpu,
  MemoryStick,
  Settings as SettingsIcon,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ENVIRONMENT_TEMPLATES, type EnvironmentTemplate, type EnvironmentType } from "@/types/execution-environments"

interface EnvironmentTemplateSelectorProps {
  onSelect: (template: EnvironmentTemplate) => void
  onCustom?: () => void
  selectedTemplateId?: string
}

const TYPE_ICONS: Record<EnvironmentType, React.ReactNode> = {
  devcontainer: <Box className="w-4 h-4" />,
  docker: <Server className="w-4 h-4" />,
  kubernetes: <Cloud className="w-4 h-4" />,
  webcontainer: <Globe className="w-4 h-4" />,
  vm: <HardDrive className="w-4 h-4" />,
  firecracker: <Zap className="w-4 h-4" />,
}

const TYPE_LABELS: Record<EnvironmentType, string> = {
  devcontainer: "Dev Container",
  docker: "Docker",
  kubernetes: "Kubernetes",
  webcontainer: "WebContainer",
  vm: "Virtual Machine",
  firecracker: "Firecracker µVM",
}

const TYPE_DESCRIPTIONS: Record<EnvironmentType, string> = {
  devcontainer: "VS Code-compatible dev containers",
  docker: "Full Docker containers",
  kubernetes: "Scalable K8s pods",
  webcontainer: "In-browser instant environments",
  vm: "Full virtual machines",
  firecracker: "Lightweight micro-VMs",
}

export function EnvironmentTemplateSelector({
  onSelect,
  onCustom,
  selectedTemplateId,
}: EnvironmentTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<EnvironmentType | "all">("all")
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    ENVIRONMENT_TEMPLATES.forEach((t) => t.tags.forEach((tag) => tags.add(tag)))
    return [...tags].sort()
  }, [])

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let templates = [...ENVIRONMENT_TEMPLATES]

    if (selectedType !== "all") {
      templates = templates.filter((t) => t.type === selectedType)
    }

    if (selectedTag) {
      templates = templates.filter((t) => t.tags.includes(selectedTag))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      )
    }

    // Sort by popularity
    templates.sort((a, b) => b.popularity - a.popularity)
    return templates
  }, [selectedType, selectedTag, searchQuery])

  const envTypes: (EnvironmentType | "all")[] = [
    "all",
    "webcontainer",
    "devcontainer",
    "docker",
    "kubernetes",
    "firecracker",
    "vm",
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Environment Templates</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose a pre-configured development environment
          </p>
        </div>
        {onCustom && (
          <button
            onClick={onCustom}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            Custom
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
      </div>

      {/* Environment Type Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {envTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full whitespace-nowrap border transition-all ${
              selectedType === type
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {type === "all" ? (
              <Box className="w-3.5 h-3.5" />
            ) : (
              TYPE_ICONS[type]
            )}
            <span>{type === "all" ? "All" : TYPE_LABELS[type]}</span>
          </button>
        ))}
      </div>

      {/* Tag Pills */}
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
              selectedTag === tag
                ? "bg-primary/20 text-primary border border-primary/40"
                : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/60"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template) => (
            <motion.button
              key={template.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelect(template)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`relative text-left p-4 rounded-xl border transition-all ${
                selectedTemplateId === template.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              }`}
            >
              {/* Selected Check */}
              {selectedTemplateId === template.id && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">{template.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">{template.name}</h4>
                    {template.popularity >= 80 && (
                      <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>

              {/* Environment Type Badge */}
              <div className="flex items-center gap-1.5 mt-3">
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-muted/50 text-muted-foreground">
                  {TYPE_ICONS[template.type]}
                  {TYPE_LABELS[template.type]}
                </span>
              </div>

              {/* Resources */}
              <div className="flex items-center gap-3 mt-2.5 text-[10px] text-muted-foreground">
                {template.resources && (
                  <>
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      {template.resources.cpu} CPU
                    </span>
                    <span className="flex items-center gap-1">
                      <MemoryStick className="w-3 h-3" />
                      {template.resources.memory >= 1024
                        ? `${(template.resources.memory / 1024).toFixed(0)} GB`
                        : `${template.resources.memory} MB`}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {template.resources.storage} GB
                    </span>
                  </>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {template.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="px-1.5 py-0.5 text-[9px] rounded bg-muted/40 text-muted-foreground">
                    {tag}
                  </span>
                ))}
                {template.tags.length > 4 && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded bg-muted/40 text-muted-foreground">
                    +{template.tags.length - 4}
                  </span>
                )}
              </div>

              {/* Hover Arrow */}
              <AnimatePresence>
                {hoveredId === template.id && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    className="absolute bottom-4 right-4"
                  >
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Box className="w-8 h-8 opacity-30" />
          <span className="text-xs">No templates match your filters</span>
          <button
            onClick={() => {
              setSearchQuery("")
              setSelectedType("all")
              setSelectedTag(null)
            }}
            className="text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
