"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Settings, Search, ChevronRight, ChevronDown, RotateCcw, Keyboard,
  Check, X, FileJson, Pencil, Filter, Code2, Palette, Terminal,
  Brain, Users, Shield, FolderOpen, Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

interface SettingDefinition {
  id: string
  title: string
  description: string
  category: string
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object' | 'color'
  default: any
  enum?: string[]
  enumDescriptions?: string[]
  minimum?: number
  maximum?: number
  scope: 'user' | 'workspace' | 'language'
  tags?: string[]
}

interface KeyBinding {
  id: string
  command: string
  key: string
  when?: string
  source: 'default' | 'user' | 'extension'
}

const CATEGORY_ICONS: Record<string, any> = {
  'Editor': Code2,
  'Terminal': Terminal,
  'Workbench': Palette,
  'AI': Brain,
  'Collaboration': Users,
  'Security': Shield,
  'Files': FolderOpen,
}

export function SettingsView() {
  const [tab, setTab] = useState('gui')
  const [categories, setCategories] = useState<string[]>([])
  const [definitions, setDefinitions] = useState<SettingDefinition[]>([])
  const [keybindings, setKeybindings] = useState<KeyBinding[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Editor']))
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({})
  const [scope, setScope] = useState<'user' | 'workspace'>('user')
  const [jsonContent, setJsonContent] = useState('{}')
  const [kbSearch, setKbSearch] = useState('')
  const [editingKb, setEditingKb] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [showModifiedOnly, setShowModifiedOnly] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchDefinitions()
    fetchSettings()
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [scope])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/settings?action=categories')
      const data = await res.json()
      setCategories(data.categories || [])
    } catch (err) { console.error('Failed to fetch categories:', err) }
  }

  const fetchDefinitions = async () => {
    try {
      const res = await fetch('/api/settings?action=definitions')
      const data = await res.json()
      setDefinitions(data.definitions || [])
    } catch (err) { console.error('Failed to fetch definitions:', err) }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/settings?action=settings&scope=${scope}`)
      const data = await res.json()
      setSettingsValues(data.settings || {})
    } catch (err) { console.error('Failed to fetch settings:', err) }
  }

  const fetchKeybindings = async () => {
    try {
      const res = await fetch('/api/settings?action=keybindings')
      const data = await res.json()
      setKeybindings(data.keybindings || [])
    } catch (err) { console.error('Failed to fetch keybindings:', err) }
  }

  const fetchJSON = async () => {
    try {
      const res = await fetch(`/api/settings?action=settings-json&scope=${scope}`)
      const data = await res.json()
      setJsonContent(data.json || '{}')
    } catch (err) { console.error('Failed to fetch JSON:', err) }
  }

  useEffect(() => {
    if (tab === 'keybindings') fetchKeybindings()
    if (tab === 'json') fetchJSON()
  }, [tab])

  const updateSetting = async (id: string, value: any) => {
    setSettingsValues(prev => ({ ...prev, [id]: value }))
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-setting', id, value, scope })
      })
    } catch (err) { console.error('Failed to update setting:', err) }
  }

  const resetSetting = async (id: string) => {
    const def = definitions.find(d => d.id === id)
    if (def) setSettingsValues(prev => { const next = { ...prev }; delete next[id]; return next })
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-setting', id, scope })
      })
    } catch (err) { console.error('Failed to reset setting:', err) }
  }

  const updateKeybinding = async (command: string, key: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-keybinding', command, key })
      })
      fetchKeybindings()
      setEditingKb(null)
      setNewKey('')
    } catch (err) { console.error('Failed to update keybinding:', err) }
  }

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const getSettingValue = (def: SettingDefinition) => {
    return def.id in settingsValues ? settingsValues[def.id] : def.default
  }

  const isModified = (id: string) => id in settingsValues

  // Group definitions by category with search
  const groupedDefs = useMemo(() => {
    let filtered = definitions
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = definitions.filter(d =>
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.tags?.some(t => t.includes(q))
      )
    }
    if (showModifiedOnly) {
      filtered = filtered.filter(d => isModified(d.id))
    }
    const groups = new Map<string, SettingDefinition[]>()
    filtered.forEach(d => {
      if (!groups.has(d.category)) groups.set(d.category, [])
      groups.get(d.category)!.push(d)
    })
    return groups
  }, [definitions, searchQuery, showModifiedOnly, settingsValues])

  const filteredKb = useMemo(() => {
    if (!kbSearch) return keybindings
    const q = kbSearch.toLowerCase()
    return keybindings.filter(kb =>
      kb.command.toLowerCase().includes(q) || kb.key.toLowerCase().includes(q)
    )
  }, [keybindings, kbSearch])

  const renderSettingControl = (def: SettingDefinition) => {
    const value = getSettingValue(def)
    const modified = isModified(def.id)

    return (
      <div key={def.id} className="group py-2.5 px-3 hover:bg-muted/15 rounded-md transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{def.title}</span>
              {modified && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{def.description}</div>
            <div className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">{def.id}</div>
          </div>
          {modified && (
            <Button
              variant="ghost"
              size="icon"
              className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => resetSetting(def.id)}
              title="Reset to default"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="mt-2">
          {def.type === 'boolean' && (
            <Switch
              checked={value}
              onCheckedChange={(checked) => updateSetting(def.id, checked)}
            />
          )}

          {def.type === 'enum' && def.enum && (
            <Select value={String(value)} onValueChange={(v) => updateSetting(def.id, v)}>
              <SelectTrigger className="h-7 text-xs bg-muted/20 border-border/30 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {def.enum.map((opt, i) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {opt}
                    {def.enumDescriptions?.[i] && (
                      <span className="text-muted-foreground ml-1.5 text-[10px]">— {def.enumDescriptions[i]}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {def.type === 'number' && (
            <div className="flex items-center gap-2 max-w-xs">
              <Input
                type="number"
                value={value}
                min={def.minimum}
                max={def.maximum}
                onChange={e => updateSetting(def.id, Number(e.target.value))}
                className="h-7 text-xs bg-muted/20 border-border/30 w-24"
              />
              {def.minimum !== undefined && def.maximum !== undefined && (
                <input
                  type="range"
                  min={def.minimum}
                  max={def.maximum}
                  value={value}
                  onChange={e => updateSetting(def.id, Number(e.target.value))}
                  className="flex-1 h-1.5 accent-primary"
                />
              )}
            </div>
          )}

          {def.type === 'string' && (
            <Input
              value={value || ''}
              onChange={e => updateSetting(def.id, e.target.value)}
              className="h-7 text-xs bg-muted/20 border-border/30 max-w-md"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Settings</span>
          </div>
          <Select value={scope} onValueChange={(v) => setScope(v as 'user' | 'workspace')}>
            <SelectTrigger className="h-6 w-24 text-[11px] border-border/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user" className="text-xs">User</SelectItem>
              <SelectItem value="workspace" className="text-xs">Workspace</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search settings..."
            className="h-7 text-xs pl-8 bg-muted/20 border-border/30"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent h-8 px-2">
          <TabsTrigger value="gui" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">
            <Settings className="w-3 h-3 mr-1" /> GUI
          </TabsTrigger>
          <TabsTrigger value="json" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">
            <FileJson className="w-3 h-3 mr-1" /> JSON
          </TabsTrigger>
          <TabsTrigger value="keybindings" className="text-[11px] h-7 px-2.5 data-[state=active]:bg-muted/50">
            <Keyboard className="w-3 h-3 mr-1" /> Keybindings
          </TabsTrigger>
        </TabsList>

        {/* GUI Settings Tab */}
        <TabsContent value="gui" className="flex-1 m-0 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 text-[11px]">
            <button
              onClick={() => setShowModifiedOnly(!showModifiedOnly)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors",
                showModifiedOnly ? "border-blue-500/30 bg-blue-500/10 text-blue-400" : "border-border/30 text-muted-foreground hover:text-foreground"
              )}
            >
              <Filter className="w-3 h-3" />
              Modified
            </button>
            <span className="text-muted-foreground ml-auto">
              {Array.from(groupedDefs.values()).reduce((s, d) => s + d.length, 0)} settings
            </span>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-1">
              {Array.from(groupedDefs.entries()).map(([category, defs]) => {
                const isExpanded = expandedCategories.has(category) || !!searchQuery
                const CatIcon = CATEGORY_ICONS[category] || Settings
                return (
                  <div key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/20 transition-colors sticky top-0 bg-background/95 backdrop-blur-sm z-10"
                    >
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      <CatIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">{category}</span>
                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 ml-auto">{defs.length}</Badge>
                    </button>
                    {isExpanded && defs.map(def => renderSettingControl(def))}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* JSON Settings Tab */}
        <TabsContent value="json" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-3">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                <span>Edit settings directly in JSON format</span>
              </div>
              <textarea
                value={jsonContent}
                onChange={e => setJsonContent(e.target.value)}
                className="w-full h-[400px] p-3 rounded-lg bg-muted/20 border border-border/30 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                spellCheck={false}
              />
              <Button
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={async () => {
                  try {
                    await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'import-settings', json: jsonContent, scope })
                    })
                    fetchSettings()
                  } catch (err) { console.error('Failed to save JSON:', err) }
                }}
              >
                <Check className="w-3 h-3 mr-1" /> Apply Changes
              </Button>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Keybindings Tab */}
        <TabsContent value="keybindings" className="flex-1 m-0 overflow-hidden flex flex-col">
          <div className="px-3 py-1.5 border-b border-border/20">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={kbSearch}
                onChange={e => setKbSearch(e.target.value)}
                placeholder="Search keybindings..."
                className="h-6 text-xs pl-7 bg-transparent border-border/30"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-1">
              {/* Header */}
              <div className="grid grid-cols-[1fr_120px_100px_60px] gap-2 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border/20">
                <span>Command</span>
                <span>Keybinding</span>
                <span>When</span>
                <span>Source</span>
              </div>
              {filteredKb.map(kb => (
                <div key={kb.id} className="grid grid-cols-[1fr_120px_100px_60px] gap-2 px-3 py-1.5 hover:bg-muted/15 rounded items-center group text-xs">
                  <span className="font-mono text-[11px] truncate">{kb.command}</span>
                  <div className="flex items-center gap-1">
                    {editingKb === kb.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={newKey}
                          onChange={e => setNewKey(e.target.value)}
                          placeholder="Press keys..."
                          className="h-5 text-[11px] w-20 px-1"
                          autoFocus
                          onKeyDown={e => {
                            e.preventDefault()
                            const parts = []
                            if (e.ctrlKey) parts.push('Ctrl')
                            if (e.shiftKey) parts.push('Shift')
                            if (e.altKey) parts.push('Alt')
                            if (e.metaKey) parts.push('Meta')
                            if (!['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) parts.push(e.key)
                            setNewKey(parts.join('+'))
                          }}
                        />
                        <Button variant="ghost" size="icon" className="w-4 h-4" onClick={() => updateKeybinding(kb.command, newKey)}>
                          <Check className="w-2.5 h-2.5 text-green-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-4 h-4" onClick={() => { setEditingKb(null); setNewKey('') }}>
                          <X className="w-2.5 h-2.5 text-red-400" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingKb(kb.id); setNewKey(kb.key) }}
                        className="flex items-center gap-0.5"
                      >
                        <kbd className="px-1.5 py-0.5 bg-muted/30 border border-border/40 rounded text-[10px] font-mono">
                          {kb.key}
                        </kbd>
                        <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate">{kb.when || '—'}</span>
                  <Badge variant="outline" className={cn(
                    "text-[9px] h-3.5 px-1",
                    kb.source === 'user' ? 'text-blue-400 border-blue-500/30' :
                    kb.source === 'extension' ? 'text-purple-400 border-purple-500/30' :
                    'text-muted-foreground'
                  )}>
                    {kb.source}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
