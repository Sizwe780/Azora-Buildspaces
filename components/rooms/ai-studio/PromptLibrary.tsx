"use client"

import { useState } from "react"
import { FileText, Save, Trash2, Search, Plus, Play, Lock, Globe, Copy, Check, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

type TemplateCategory = "Code Generation" | "Testing" | "Documentation" | "Review/Refactor" | "General"

interface PromptTemplate {
  id: string
  title: string
  description: string
  category: TemplateCategory
  content: string
  variables: string[]
  isPublic: boolean
  usageCount: number
}

const CATEGORIES: TemplateCategory[] = ["Code Generation", "Testing", "Documentation", "Review/Refactor", "General"]

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "t-1",
    title: "React Component Generator",
    description: "Generate a functional React component with Tailwind CSS.",
    category: "Code Generation",
    content: "Create a React component named '{ComponentName}'. It should use Tailwind CSS for styling and accept the following props: {Props}. Focus on accessibility and responsive design.",
    variables: ["ComponentName", "Props"],
    isPublic: true,
    usageCount: 1450
  },
  {
    id: "t-2",
    title: "Jest Unit Test Suite",
    description: "Generate a complete Jest test suite for a module.",
    category: "Testing",
    content: "Write a comprehensive Jest unit test suite for the following module:\n\n{ModuleCode}\n\nInclude tests for edge cases, error handling, and normal operation.",
    variables: ["ModuleCode"],
    isPublic: true,
    usageCount: 890
  },
  {
    id: "t-3",
    title: "API Endpoint Documentation",
    description: "Generate OpenAPI/Swagger documentation for an endpoint.",
    category: "Documentation",
    content: "Generate OpenAPI 3.0 documentation for the following API endpoint:\n\nRoute: {Route}\nMethod: {Method}\nDescription: {Description}\n\nThe response should be strictly formatted YAML.",
    variables: ["Route", "Method", "Description"],
    isPublic: true,
    usageCount: 520
  },
  {
    id: "t-4",
    title: "Code Review & Refactor",
    description: "Analyze code for smell and suggest refactoring.",
    category: "Review/Refactor",
    content: "Review the following {Language} code for anti-patterns, security issues, and performance bottlenecks. Then, provide a refactored version with explanations.\n\nCode:\n{CodeToReview}",
    variables: ["Language", "CodeToReview"],
    isPublic: true,
    usageCount: 2200
  }
]

export default function PromptLibrary({ onSelectPrompt }: { onSelectPrompt?: (content: string) => void }) {
  const [templates, setTemplates] = useState<PromptTemplate[]>(DEFAULT_TEMPLATES)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All")
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === "All" || t.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const extractVariables = (text: string) => {
    const matches = text.match(/\{([^}]+)\}/g)
    if (!matches) return []
    return Array.from(new Set(matches.map(m => m.replace(/[{}]/g, ''))))
  }

  const handleSave = (template: PromptTemplate) => {
    const updatedVariables = extractVariables(template.content)
    const newTemplate = { ...template, variables: updatedVariables }
    
    if (templates.find(t => t.id === newTemplate.id)) {
      setTemplates(templates.map(t => t.id === newTemplate.id ? newTemplate : t))
    } else {
      setTemplates([...templates, { ...newTemplate, id: `t-${Date.now()}` }])
    }
    setEditingTemplate(null)
  }

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id))
    if (editingTemplate?.id === id) setEditingTemplate(null)
  }

  const startNew = () => {
    setEditingTemplate({
      id: "new",
      title: "New Template",
      description: "",
      category: "Code Generation",
      content: "",
      variables: [],
      isPublic: false,
      usageCount: 0
    })
  }

  const copyToClipboard = (template: PromptTemplate) => {
    let content = template.content;
    navigator.clipboard.writeText(content)
    setCopiedId(template.id)
    setTimeout(() => setCopiedId(null), 2000)
    setTemplates(templates.map(t => t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t))
  }

  if (editingTemplate) {
    return (
      <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            {editingTemplate.id === "new" ? "Create Template" : "Edit Template"}
          </h2>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button size="sm" onClick={() => handleSave(editingTemplate)} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" /> Save Protocol
            </Button>
          </div>
        </div>

        <div className="grid gap-4 max-w-3xl">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Template Title</label>
            <Input 
              value={editingTemplate.title} 
              onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
              className="bg-zinc-900 border-zinc-800 text-sm"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Description</label>
            <Input 
              value={editingTemplate.description} 
              onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
              className="bg-zinc-900 border-zinc-800 text-sm"
            />
          </div>

          <div className="flex gap-4">
            <div className="space-y-1 flex-1">
              <label className="text-xs font-semibold text-zinc-400">Category</label>
              <select 
                value={editingTemplate.category}
                onChange={e => setEditingTemplate({...editingTemplate, category: e.target.value as TemplateCategory})}
                className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-200"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex-1">
                <label className="text-xs font-semibold text-zinc-400">Visibility</label>
                <select 
                  value={editingTemplate.isPublic ? "public" : "private"}
                  onChange={e => setEditingTemplate({...editingTemplate, isPublic: e.target.value === "public"})}
                  className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-sm text-zinc-200"
                >
                  <option value="public">Public (Shared)</option>
                  <option value="private">Private (Workspace Only)</option>
                </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 flex justify-between">
              <span>Prompt Content</span>
              <span className="text-zinc-600 font-normal">Use {"{variableName}"} to define placeholders</span>
            </label>
            <Textarea 
              value={editingTemplate.content} 
              onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
              className="bg-zinc-900 border-zinc-800 font-mono text-sm h-64 resize-none"
            />
          </div>

          {extractVariables(editingTemplate.content).length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 mb-2">
                Detected Variables:
              </span>
              <div className="flex flex-wrap gap-2">
                {extractVariables(editingTemplate.content).map(v => (
                  <Badge key={v} variant="outline" className="border-blue-500/30 text-blue-300 font-mono text-[10px]">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-100">
            <FileText className="w-5 h-5 text-blue-400" />
            Prompt Library
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">Manage, discover, and invoke powerful AI instructions.</p>
        </div>
        <Button size="sm" onClick={startNew} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs h-8">
          <Plus className="w-3.5 h-3.5 mr-1" />
          Create Template
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input 
            placeholder="Search templates..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-xs h-8 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 tailwind-scrollbar-hide">
          <Badge 
            variant={activeCategory === "All" ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap text-[10px] font-medium transition-colors ${activeCategory === "All" ? "bg-zinc-700 text-zinc-100 hover:bg-zinc-600 border-zinc-600" : "border-zinc-800 text-zinc-400 hover:text-zinc-200 bg-zinc-900/50"}`}
            onClick={() => setActiveCategory("All")}
          >All</Badge>
          {CATEGORIES.map(cat => (
            <Badge 
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap text-[10px] font-medium transition-colors ${activeCategory === cat ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border-blue-500/30" : "border-zinc-800 text-zinc-400 hover:text-zinc-200 bg-zinc-900/50"}`}
              onClick={() => setActiveCategory(cat)}
            >{cat}</Badge>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 pr-4 -mr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="bg-zinc-900/30 border-zinc-800 flex flex-col overflow-hidden hover:border-zinc-700 hover:bg-zinc-900/50 transition-all shadow-sm">
              <CardHeader className="p-3 pb-2 bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 border-b border-zinc-800/50">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-sm font-semibold text-zinc-200 leading-tight">
                    {template.title}
                  </CardTitle>
                  <div className="shrink-0 flex items-center gap-1 text-[10px] text-zinc-500">
                    {template.isPublic ? <Globe className="w-3 h-3 text-emerald-400/70" /> : <Lock className="w-3 h-3 text-amber-400/70" />}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2 min-h-[32px]">{template.description}</p>
              </CardHeader>
              <CardContent className="p-3 py-2.5 flex-1">
                 <div className="flex flex-wrap gap-1.5 mt-1">
                   <Badge variant="outline" className="text-[9px] h-4 py-0 border-zinc-700 bg-zinc-900 text-zinc-400 px-1.5">
                     {template.category}
                   </Badge>
                   {template.variables.slice(0, 3).map(v => (
                     <Badge key={v} variant="outline" className="text-[9px] h-4 py-0 border-blue-900/30 bg-blue-900/10 text-blue-400 font-mono px-1.5">
                       {'{'}{v}{'}'}
                     </Badge>
                   ))}
                   {template.variables.length > 3 && (
                     <span className="text-[10px] text-zinc-600 self-center font-medium">+{template.variables.length - 3}</span>
                   )}
                 </div>
              </CardContent>
              <CardFooter className="p-2 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/30">
                <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono bg-zinc-900 px-1.5 py-0.5 rounded-sm border border-zinc-800/80">
                  <Play className="w-3 h-3 text-emerald-500/70" />
                  {template.usageCount.toLocaleString()}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800" onClick={() => copyToClipboard(template)} title="Copy raw prompt">
                    {copiedId === template.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10" onClick={() => setEditingTemplate(template)} title="Edit template">
                    <Settings className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(template.id)} title="Delete template">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-lg">
              <FileText className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-xs">No templates found matching your search.</p>
              <Button variant="link" onClick={() => {setSearchQuery(""); setActiveCategory("All")}} className="text-blue-400 text-xs mt-1 h-auto p-0">Clear filters</Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}