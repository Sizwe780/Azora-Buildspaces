"use client"

import { useState, useEffect } from "react"
import { Figma, Download, Code, Eye, Layers, Palette, Copy, CheckCircle2, Loader2, ExternalLink, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

interface FigmaImport {
  projectId: string
  fileName: string
  pages: { id: string; name: string; componentCount: number }[]
  components: any[]
  tokens: any[]
  importedAt: number
}

interface Framework {
  id: string
  name: string
  icon: string
  description: string
}

interface GeneratedCode {
  id: string
  componentName: string
  framework: string
  files: { filename: string; content: string; language: string; type: string }[]
  dependencies: string[]
  timestamp: number
}

interface ConversionHistory {
  id: string
  sourceFile: string
  sourceNodeName: string
  framework: string
  timestamp: number
  status: string
  fileCount: number
  linesOfCode: number
}

export function FigmaToCodeView() {
  const [tab, setTab] = useState('import')
  const [figmaUrl, setFigmaUrl] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [importResult, setImportResult] = useState<FigmaImport | null>(null)
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [selectedFramework, setSelectedFramework] = useState('react-tailwind')
  const [history, setHistory] = useState<ConversionHistory[]>([])
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<number | null>(null)

  // Options
  const [responsive, setResponsive] = useState(true)
  const [accessibility, setAccessibility] = useState(true)
  const [animations, setAnimations] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [typescript, setTypescript] = useState(true)
  const [storybook, setStorybook] = useState(false)

  useEffect(() => {
    fetchFrameworks()
    fetchHistory()
  }, [])

  const fetchFrameworks = async () => {
    try {
      const res = await fetch('/api/figma?action=frameworks')
      const data = await res.json()
      setFrameworks(data.frameworks || [])
    } catch {
      setFrameworks([
        { id: 'react-tailwind', name: 'React + Tailwind', icon: '⚛️', description: 'React components with Tailwind CSS' },
        { id: 'react-css', name: 'React + CSS Modules', icon: '⚛️', description: 'React with scoped CSS modules' },
        { id: 'vue', name: 'Vue 3', icon: '💚', description: 'Vue 3 SFC with Composition API' },
        { id: 'svelte', name: 'Svelte', icon: '🔥', description: 'Svelte components with scoped styles' },
        { id: 'html-css', name: 'HTML + CSS', icon: '🌐', description: 'Vanilla HTML and CSS' },
        { id: 'react-native', name: 'React Native', icon: '📱', description: 'React Native with StyleSheet' },
        { id: 'flutter', name: 'Flutter', icon: '🦋', description: 'Flutter Dart widgets' },
      ])
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/figma?action=history')
      const data = await res.json()
      setHistory(data.history || [])
    } catch { /* noop */ }
  }

  const handleImport = async () => {
    setIsImporting(true)
    try {
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          url: figmaUrl || undefined,
          fileKey: !figmaUrl ? 'demo' : undefined,
          accessToken: accessToken || 'demo',
        }),
      })
      const data = await res.json()
      setImportResult(data.result)
      setTab('components')
    } catch { /* noop */ }
    setIsImporting(false)
  }

  const handleGenerate = async (componentIndex: number) => {
    if (!importResult) return
    setIsGenerating(true)
    setSelectedComponent(componentIndex)
    try {
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          component: importResult.components[componentIndex],
          options: {
            framework: selectedFramework,
            responsive,
            accessibility,
            animations,
            darkMode,
            typescript,
            generateStorybook: storybook,
          },
        }),
      })
      const data = await res.json()
      setGeneratedCode(data.code)
      setTab('output')
      await fetchHistory()
    } catch { /* noop */ }
    setIsGenerating(false)
  }

  const handleGenerateAll = async () => {
    if (!importResult) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-all',
          fileKey: importResult.projectId,
          options: {
            framework: selectedFramework,
            responsive,
            accessibility,
            animations,
            darkMode,
            typescript,
            generateStorybook: storybook,
          },
        }),
      })
      await fetchHistory()
    } catch { /* noop */ }
    setIsGenerating(false)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Figma className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-semibold uppercase tracking-wider">Figma to Code</span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 bg-muted/50">
          <TabsTrigger value="import" className="text-xs">Import</TabsTrigger>
          <TabsTrigger value="components" className="text-xs">Components</TabsTrigger>
          <TabsTrigger value="output" className="text-xs">Output</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Figma URL or File Key</label>
                <Input
                  className="h-8 text-xs"
                  placeholder="https://figma.com/file/... or paste file key"
                  value={figmaUrl}
                  onChange={e => setFigmaUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Access Token</label>
                <Input
                  className="h-8 text-xs"
                  type="password"
                  placeholder="Figma personal access token (or leave blank for demo)"
                  value={accessToken}
                  onChange={e => setAccessToken(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Target Framework</label>
                <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworks.map(fw => (
                      <SelectItem key={fw.id} value={fw.id} className="text-xs">
                        {fw.icon} {fw.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-3 rounded-lg border border-border bg-card">
                <span className="text-xs font-medium">Options</span>
                <div className="space-y-2">
                  {[
                    { label: 'Responsive', value: responsive, setter: setResponsive },
                    { label: 'Accessibility (ARIA)', value: accessibility, setter: setAccessibility },
                    { label: 'Animations', value: animations, setter: setAnimations },
                    { label: 'Dark Mode', value: darkMode, setter: setDarkMode },
                    { label: 'TypeScript', value: typescript, setter: setTypescript },
                    { label: 'Storybook Stories', value: storybook, setter: setStorybook },
                  ].map(opt => (
                    <div key={opt.label} className="flex items-center justify-between">
                      <span className="text-xs">{opt.label}</span>
                      <Switch checked={opt.value} onCheckedChange={opt.setter} />
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full h-9 text-xs" onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Importing...</>
                ) : (
                  <><Download className="w-3 h-3 mr-1" /> Import from Figma</>
                )}
              </Button>

              <div className="text-center">
                <Button variant="ghost" className="text-xs text-muted-foreground" onClick={() => { setFigmaUrl(''); handleImport() }}>
                  <Sparkles className="w-3 h-3 mr-1" /> Try Demo Import
                </Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Components Tab */}
        <TabsContent value="components" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {!importResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No Figma file imported</p>
                  <p className="text-xs mt-1">Import a file to see components</p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-lg border border-border bg-card mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{importResult.fileName}</span>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleGenerateAll} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Code className="w-3 h-3 mr-1" />}
                        Generate All
                      </Button>
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>{importResult.pages.length} pages</span>
                      <span>•</span>
                      <span>{importResult.components.length} components</span>
                      <span>•</span>
                      <span>{importResult.tokens.length} tokens</span>
                    </div>
                  </div>

                  {/* Design Tokens Preview */}
                  {importResult.tokens.length > 0 && (
                    <div className="p-3 rounded-lg border border-border bg-card mb-2">
                      <span className="text-xs font-medium flex items-center gap-1 mb-2"><Palette className="w-3 h-3" /> Design Tokens</span>
                      <div className="flex flex-wrap gap-1">
                        {importResult.tokens.filter(t => t.type === 'color').map(token => (
                          <div key={token.id} className="flex items-center gap-1 px-2 py-1 rounded-full border border-border text-[10px]">
                            <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: token.value }} />
                            {token.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importResult.components.map((comp, i) => (
                    <div key={comp.id} className="p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Layers className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium">{comp.name}</span>
                          <Badge variant="outline" className="text-[9px]">{comp.type}</Badge>
                        </div>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleGenerate(i)} disabled={isGenerating && selectedComponent === i}>
                          {isGenerating && selectedComponent === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Code className="w-3 h-3" />}
                        </Button>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {Math.round(comp.width)}×{Math.round(comp.height)}px
                        {comp.layoutMode && comp.layoutMode !== 'NONE' && ` • ${comp.layoutMode.toLowerCase()}`}
                        {comp.children && ` • ${comp.children.length} children`}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Output Tab */}
        <TabsContent value="output" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!generatedCode ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No code generated yet</p>
                  <p className="text-xs mt-1">Select a component and generate code</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{generatedCode.componentName}</span>
                    <Badge variant="outline" className="text-[10px]">{generatedCode.framework}</Badge>
                  </div>

                  {generatedCode.dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {generatedCode.dependencies.map(dep => (
                        <Badge key={dep} variant="secondary" className="text-[9px]">{dep}</Badge>
                      ))}
                    </div>
                  )}

                  {generatedCode.files.map((file) => (
                    <div key={file.filename} className="rounded-lg border border-border overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border">
                        <span className="text-xs font-mono">{file.filename}</span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px]">{file.type}</Badge>
                          <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => copyToClipboard(file.content, file.filename)}>
                            {copied === file.filename ? <CheckCircle2 className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                          </Button>
                        </div>
                      </div>
                      <pre className="p-3 text-[10px] font-mono overflow-x-auto max-h-[300px] bg-background">
                        <code>{file.content}</code>
                      </pre>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xs">No conversion history</p>
                </div>
              ) : (
                history.map(entry => (
                  <div key={entry.id} className="p-2 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{entry.sourceNodeName}</span>
                      <Badge variant={entry.status === 'success' ? 'default' : 'secondary'} className="text-[9px]">{entry.status}</Badge>
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>{entry.framework}</span>
                      <span>•</span>
                      <span>{entry.fileCount} files</span>
                      <span>•</span>
                      <span>{entry.linesOfCode} lines</span>
                      <span>•</span>
                      <span>{formatTimeAgo(entry.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
