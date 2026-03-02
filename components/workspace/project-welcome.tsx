"use client"

import { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles, Plus, FolderOpen, GitBranch, Upload, Code2, Zap,
  Rocket, Terminal, Brain, Globe, Layers, ArrowRight, Star,
  Command, Clock, BookOpen, ExternalLink
} from "lucide-react"
import { projectTemplates, ProjectTemplate } from "@/lib/templates/project-templates"
import { useFileSystem } from "@/lib/stores/file-system"
import { cn } from "@/lib/utils"

const makeId = () => Math.random().toString(36).slice(2, 9)

interface ProjectWelcomeProps {
  onProjectSelect: (projectId: string) => void
}

const QUICK_ACTIONS = [
  { icon: Plus, label: 'New Project', description: 'Start from a template', color: 'from-violet-600 to-indigo-600' },
  { icon: FolderOpen, label: 'Open Files', description: 'Import local files', color: 'from-blue-600 to-cyan-600' },
  { icon: GitBranch, label: 'Clone Repository', description: 'Clone from Git URL', color: 'from-emerald-600 to-teal-600' },
  { icon: Clock, label: 'Recent Projects', description: 'Open a recent project', color: 'from-amber-600 to-orange-600' },
]

const FEATURE_HIGHLIGHTS = [
  { icon: Brain, label: 'AI Assistant', desc: 'GPT-4, Claude, Gemini powered coding' },
  { icon: Zap, label: '60+ Languages', desc: 'Full language server support' },
  { icon: Globe, label: 'Live Preview', desc: 'Real-time browser preview' },
  { icon: Terminal, label: 'Integrated Terminal', desc: 'Full shell access' },
  { icon: Rocket, label: 'One-Click Deploy', desc: 'Deploy to 10+ cloud providers' },
  { icon: Layers, label: 'Collaboration', desc: 'Real-time pair programming' },
]

export function ProjectWelcome({ onProjectSelect }: ProjectWelcomeProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showTemplates, setShowTemplates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { createFile, rootId } = useFileSystem()

  const categories = [
    { id: 'all', name: 'All', count: projectTemplates.length },
    { id: 'web', name: 'Web', count: projectTemplates.filter(t => t.category === 'web').length },
    { id: 'api', name: 'API', count: projectTemplates.filter(t => t.category === 'api').length },
    { id: 'mobile', name: 'Mobile', count: projectTemplates.filter(t => t.category === 'mobile').length },
    { id: 'ai', name: 'AI/ML', count: projectTemplates.filter(t => t.category === 'ai').length },
  ]

  const filteredTemplates = selectedCategory === 'all'
    ? projectTemplates
    : projectTemplates.filter(t => t.category === selectedCategory)

  const handleTemplateSelect = (template: ProjectTemplate) => {
    onProjectSelect(`project-${template.id}-${makeId()}`)
  }

  const handleOpenFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const projectId = `uploaded-${makeId()}`
    for (const file of Array.from(files)) {
      const text = await file.text()
      await createFile(rootId || null, file.name, text)
    }
    onProjectSelect(projectId)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [createFile, rootId, onProjectSelect])

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleOpenFiles}
        aria-label="Open project files"
      />

      <div className="flex-1 overflow-auto">
        {/* Hero section */}
        <div className="relative px-8 pt-10 pb-8">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-indigo-600/5 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/20">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Code Chamber
                </h1>
                <p className="text-sm text-muted-foreground">by Azora BuildSpaces</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground max-w-lg mb-6">
              The most powerful cloud IDE — AI-assisted coding, real-time collaboration, 60+ languages, 
              one-click deploy, and everything you need to build, test, and ship faster.
            </p>

            {/* Keyboard shortcut hint */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mb-8">
              <Command className="w-3 h-3" />
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 bg-muted/30 border border-border/40 rounded text-[10px] font-mono">Ctrl+Shift+P</kbd>
              <span>for Command Palette</span>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
          >
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={action.label}
                onClick={() => {
                  if (action.label === 'New Project') setShowTemplates(true)
                  else if (action.label === 'Open Files') fileInputRef.current?.click()
                  else if (action.label === 'Clone Repository') window.dispatchEvent(new CustomEvent('workspace:clone-repo'))
                }}
                className="group p-4 rounded-xl border border-border/30 bg-card/50 hover:bg-card hover:border-border/60 hover:shadow-lg transition-all text-left"
              >
                <div className={cn("w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm", action.color)}>
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm font-semibold mb-0.5 group-hover:text-primary transition-colors">{action.label}</div>
                <div className="text-[11px] text-muted-foreground">{action.description}</div>
              </button>
            ))}
          </motion.div>
        </div>

        {/* Templates section */}
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-8 pb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Project Templates</h2>
              <div className="flex items-center gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all",
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {cat.name} <span className="opacity-60 ml-0.5">{cat.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <button
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-4 rounded-xl border border-border/30 bg-card/30 hover:bg-card/80 hover:border-primary/30 hover:shadow-md group transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{template.icon}</span>
                      <Badge variant="outline" className="text-[10px] h-5 capitalize">{template.category}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors">{template.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {Object.keys(template.files).filter(key => template.files[key].type === 'file').length} files
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Start <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No templates in this category</p>
                <Button variant="link" size="sm" onClick={() => setSelectedCategory('all')} className="text-xs mt-2">
                  Show all templates
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-8 pb-8"
        >
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            Features
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {FEATURE_HIGHLIGHTS.map((feat) => (
              <div key={feat.label} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/10 border border-border/20">
                <feat.icon className="w-4 h-4 text-primary/70 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium">{feat.label}</div>
                  <div className="text-[10px] text-muted-foreground">{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer links */}
        <div className="px-8 pb-6">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60">
            <a href="#" className="flex items-center gap-1 hover:text-muted-foreground transition-colors">
              <BookOpen className="w-3 h-3" /> Documentation
            </a>
            <a href="#" className="flex items-center gap-1 hover:text-muted-foreground transition-colors">
              <ExternalLink className="w-3 h-3" /> Release Notes
            </a>
            <span className="ml-auto">Azora BuildSpaces v1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}