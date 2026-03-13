"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Code2,
  Search,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Star,
  Tag,
  ChevronDown,
  ChevronRight,
  FileCode,
  Loader2,
  FileInput,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

interface Snippet {
  id: string
  name: string
  prefix: string
  body: string[]
  description: string
  language: string
  category: string
  tags: string[]
  source: string
  usageCount: number
}

const CATEGORY_LABELS: Record<string, string> = {
  'control-flow': '🔀 Control Flow',
  'data-structures': '📦 Data Structures',
  'functions': '⚡ Functions',
  'classes': '🏗️ Classes',
  'imports': '📥 Imports',
  'tests': '🧪 Tests',
  'documentation': '📝 Documentation',
  'error-handling': '🛡️ Error Handling',
  'async': '⏳ Async',
  'react-components': '⚛️ React Components',
  'react-hooks': '🪝 React Hooks',
  'api': '🌐 API',
  'database': '🗄️ Database',
  'utilities': '🔧 Utilities',
  'security': '🔒 Security',
  'configuration': '⚙️ Configuration',
  'devops': '🚀 DevOps',
  'web3': '🔗 Web3',
  'other': '📌 Other',
}

const LANGUAGE_OPTIONS = [
  'typescript', 'typescriptreact', 'javascript', 'python',
  'rust', 'go', 'java', 'solidity', 'sql', 'dockerfile',
]

export function SnippetsView() {
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('typescript')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create snippet form
  const [newName, setNewName] = useState('')
  const [newPrefix, setNewPrefix] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newCategory, setNewCategory] = useState('other')
  const [newTags, setNewTags] = useState('')

  const fetchSnippets = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        language: selectedLanguage,
        ...(selectedCategory && { category: selectedCategory }),
        limit: '100',
      })
      const res = await fetch(`/api/snippets?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSnippets(data.snippets || [])
      }
    } catch {
      // Snippets will load from local service
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSnippets()
  }, [searchQuery, selectedLanguage, selectedCategory])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Snippet[]> = {}
    snippets.forEach(s => {
      if (!groups[s.category]) groups[s.category] = []
      groups[s.category].push(s)
    })
    return groups
  }, [snippets])

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleCopySnippet = async (snippet: Snippet) => {
    const text = snippet.body.join('\n')
    await navigator.clipboard.writeText(text)
    setCopiedId(snippet.id)
    setTimeout(() => setCopiedId(null), 2000)

    // Record usage
    fetch('/api/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'use', id: snippet.id }),
    }).catch(() => {})
  }

  const handleInsertSnippet = (snippet: Snippet) => {
    const text = snippet.body.join('\n')
    // Use Monaco's snippet insertion via the global editor reference
    const monacoWin = window as any
    if (monacoWin.monaco) {
      const editors = monacoWin.monaco.editor.getEditors()
      const editor = editors[editors.length - 1]
      if (editor) {
        editor.focus()
        // Insert as snippet (supports tab stops $1, $2, etc.)
        const contribution = editor.getContribution('snippetController2')
        if (contribution) {
          contribution.insert(text)
        } else {
          // Fallback: plain text insertion
          editor.trigger('snippet', 'type', { text })
        }
      }
    }
    // Record usage
    fetch('/api/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'use', id: snippet.id }),
    }).catch(() => {})
  }

  const handleCreateSnippet = async () => {
    if (!newName || !newPrefix || !newBody) return

    try {
      const res = await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newName,
          prefix: newPrefix,
          body: newBody.split('\n'),
          description: newDescription,
          language: selectedLanguage,
          category: newCategory,
          tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        setShowCreate(false)
        setNewName('')
        setNewPrefix('')
        setNewBody('')
        setNewDescription('')
        setNewCategory('other')
        setNewTags('')
        fetchSnippets()
      }
    } catch {}
  }

  const handleDeleteSnippet = async (id: string) => {
    try {
      await fetch('/api/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
      fetchSnippets()
    } catch {}
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Snippets</span>
            <Badge variant="outline" className="text-[10px]">{snippets.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Snippet</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Input
                    placeholder="Name (e.g. 'React Server Component')"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Prefix / trigger (e.g. 'rsc')"
                    value={newPrefix}
                    onChange={e => setNewPrefix(e.target.value)}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder="Snippet body (use $1, $2 for tab stops, $0 for final cursor)"
                    value={newBody}
                    onChange={e => setNewBody(e.target.value)}
                    rows={8}
                    className="text-sm font-mono"
                  />
                  <Input
                    placeholder="Description"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-1.5"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    placeholder="Tags (comma separated)"
                    value={newTags}
                    onChange={e => setNewTags(e.target.value)}
                    className="text-sm"
                  />
                  <Button onClick={handleCreateSnippet} disabled={!newName || !newPrefix || !newBody} className="w-full">
                    Create Snippet
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <Download className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Upload className="w-4 h-4 mr-2" />
                  Import VS Code Snippets
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  Export Snippets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>

        {/* Language Selector */}
        <div className="flex gap-1 flex-wrap">
          {LANGUAGE_OPTIONS.map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors
                ${selectedLanguage === lang
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {lang.replace('typescriptreact', 'TSX')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Code2 className="w-8 h-8 opacity-20 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No snippets found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try a different search or language
            </p>
          </div>
        ) : (
          <div className="py-1">
            {Object.entries(grouped)
              .sort(([, a], [, b]) => b.length - a.length)
              .map(([category, catSnippets]) => (
                <div key={category}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 text-xs"
                  >
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">
                      {catSnippets.length}
                    </Badge>
                  </button>

                  {/* Snippets */}
                  {expandedCategories.has(category) && (
                    <div className="pl-4">
                      {catSnippets.map(snippet => (
                        <div
                          key={snippet.id}
                          className="group flex items-start gap-2 px-3 py-2 hover:bg-muted/30 border-l-2 border-transparent hover:border-primary/30"
                        >
                          <FileCode className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium truncate">{snippet.name}</span>
                              <code className="text-[10px] text-primary bg-primary/10 px-1 rounded">
                                {snippet.prefix}
                              </code>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                              {snippet.description}
                            </p>
                            {snippet.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {snippet.tags.slice(0, 3).map(tag => (
                                  <span
                                    key={tag}
                                    className="text-[9px] text-muted-foreground bg-muted px-1 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-5 h-5"
                              onClick={() => handleInsertSnippet(snippet)}
                              title="Insert into editor"
                            >
                              <FileInput className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-5 h-5"
                              onClick={() => handleCopySnippet(snippet)}
                              title="Copy to clipboard"
                            >
                              <Copy className={`w-3 h-3 ${copiedId === snippet.id ? 'text-green-500' : ''}`} />
                            </Button>
                            {snippet.source !== 'builtin' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-5 h-5 text-destructive"
                                onClick={() => handleDeleteSnippet(snippet.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                          {snippet.usageCount > 0 && (
                            <span className="text-[9px] text-muted-foreground shrink-0" title="Usage count">
                              ×{snippet.usageCount}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
