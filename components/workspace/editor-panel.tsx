"use client"
import { useState, useEffect, useRef, useMemo } from "react"
import { X, FileCode, ChevronRight, Bot, Users, Wifi, WifiOff } from "lucide-react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { getLanguageByExtension, type LanguageSupport } from "@/lib/languages"
import { LanguageSelector } from "./language-selector"
import { cn } from "@/lib/utils"
// Yjs imports moved to dynamic import to prevent build hangs
// import * as Y from "yjs"
// import { WebsocketProvider } from "y-websocket"
// import { MonacoBinding } from "y-monaco"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface EditorPanelProps {
  activeFile: string
  openFiles: string[]
  onFileSelect: (file: string) => void
  onCloseFile: (file: string) => void
}

export function EditorPanel({ activeFile, openFiles, onFileSelect, onCloseFile }: EditorPanelProps) {
  const [code, setCode] = useState("// Loading...")
  const [isAiTyping, setIsAiTyping] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [collaborators, setCollaborators] = useState<string[]>([])
  const [overrideLanguage, setOverrideLanguage] = useState<LanguageSupport | null>(null)

  const ydocRef = useRef<any | null>(null)
  const providerRef = useRef<any | null>(null)
  const bindingRef = useRef<any | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Detect language from file extension or override
  const detectedLanguage = useMemo(() => {
    if (overrideLanguage) return overrideLanguage
    if (!activeFile) return null
    const ext = "." + activeFile.split(".").pop()
    return getLanguageByExtension(ext) || null
  }, [activeFile, overrideLanguage])

  const monacoLanguage = detectedLanguage?.monaco || "plaintext"

  // Fetch file content
  useEffect(() => {
    if (!activeFile) return

    const fetchContent = async () => {
      try {
        const response = await fetch(`http://localhost:3001/fs/content?path=${encodeURIComponent(activeFile)}`)
        const data = await response.json()
        if (data.content !== undefined) {
          setCode(data.content)
        }
      } catch (error) {
        console.error("Failed to fetch file content:", error)
        setCode("// Error loading file")
      }
    }

    fetchContent()
  }, [activeFile])

  // Auto-save logic
  const handleCodeChange = (newCode: string | undefined) => {
    const value = newCode || ""
    setCode(value)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("http://localhost:3001/fs/write", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: activeFile, content: value })
        })
        console.log(`Saved ${activeFile}`)
      } catch (error) {
        console.error("Failed to save file:", error)
      }
    }, 1000)
  }

  // Simulate AI typing suggestion
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeFile === "page.tsx") {
        setIsAiTyping(true)
        setTimeout(() => {
          setAiSuggestion("// Elara suggests: Add loading state for better UX")
          setIsAiTyping(false)
        }, 2000)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [activeFile])

  // Initialize Yjs for real-time collaboration
  useEffect(() => {
    if (!activeFile) return

    let provider: any = null;
    let binding: any = null;
    let ydoc: any = null;

    const initCollaboration = async () => {
      // Dynamic imports to avoid SSR/Build issues
      const Y = await import("yjs");
      const { WebsocketProvider } = await import("y-websocket");

      // Clean up previous
      if (bindingRef.current) {
        bindingRef.current.destroy()
        bindingRef.current = null
      }
      if (providerRef.current) {
        providerRef.current.destroy()
        providerRef.current = null
      }
      if (ydocRef.current) {
        ydocRef.current.destroy()
        ydocRef.current = null
      }

      ydoc = new Y.Doc()
      ydocRef.current = ydoc

      provider = new WebsocketProvider('ws://localhost:1234', `buildspaces-${activeFile}`, ydoc)
      providerRef.current = provider

      provider.on('status', (event: any) => {
        setIsConnected(event.status === 'connected')
      })

      provider.on('peers', (peers: any) => {
        setCollaborators(Object.keys(peers))
      })
    };

    initCollaboration();

    return () => {
      if (bindingRef.current) bindingRef.current.destroy()
      if (providerRef.current) providerRef.current.destroy()
      if (ydocRef.current) ydocRef.current.destroy()
    }
  }, [activeFile])

  const getFileIcon = (name: string) => {
    if (name.endsWith(".tsx")) return "text-blue-400"
    if (name.endsWith(".ts")) return "text-blue-500"
    if (name.endsWith(".css")) return "text-pink-400"
    return "text-muted-foreground"
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between px-3 py-1 text-[11px] text-muted-foreground border-b border-border/20 bg-background/50">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          {activeFile.split('/').map((segment, i, arr) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3 opacity-40" />}
              <span className={cn(
                "hover:text-foreground cursor-pointer transition-colors truncate",
                i === arr.length - 1 && "text-foreground font-medium"
              )}>{segment}</span>
            </span>
          ))}
        </div>

        {/* Collaboration Status */}
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {collaborators.length > 0 && (
            <div className="flex items-center gap-1 text-emerald-500 text-[10px]">
              <Users className="w-3 h-3" />
              <span>{collaborators.length + 1} online</span>
            </div>
          )}
          <div className={cn(
            "flex items-center gap-1 text-[10px]",
            isConnected ? 'text-emerald-500' : 'text-amber-500'
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>
          <div className="h-3 w-px bg-border/40" />
          <LanguageSelector
            currentFileName={activeFile}
            currentLanguageId={overrideLanguage?.id}
            onLanguageChange={(lang) => setOverrideLanguage(lang)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/30 bg-muted/10 overflow-x-auto scrollbar-hide">
        {openFiles.map((tab) => {
          const isActive = activeFile === tab
          const fileName = tab.split('/').pop() || tab
          const ext = '.' + fileName.split('.').pop()
          return (
            <button
              key={tab}
              onClick={() => onFileSelect(tab)}
              className={cn(
                "group flex items-center gap-1.5 pl-3 pr-2 h-[35px] text-[13px] border-r border-border/20 transition-all relative whitespace-nowrap",
                isActive
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40"
              )}
            >
              {/* Active tab top highlight */}
              {isActive && <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />}
              {/* Inactive tab bottom border covers panel border */}
              {!isActive && <div className="absolute bottom-0 left-0 right-0 h-px bg-border/20" />}

              <FileCode className={cn("w-3.5 h-3.5 shrink-0", getFileIcon(tab))} />
              <span className={cn("truncate max-w-[120px]", isActive && "font-medium")}>{fileName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseFile(tab)
                }}
                className="ml-1 p-0.5 rounded-sm hover:bg-muted/80 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          )
        })}
      </div>

      {/* AI Suggestion Banner */}
      <AnimatePresence>
        {(isAiTyping || aiSuggestion) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-primary/20 bg-primary/5 overflow-hidden"
          >
            <div className="px-4 py-2 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
                <Bot className="w-3 h-3 text-background" />
              </div>
              {isAiTyping ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <span>Elara is analyzing</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-foreground">{aiSuggestion}</span>
                  <div className="flex items-center gap-2">
                    <button className="px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                      Accept
                    </button>
                    <button
                      className="px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setAiSuggestion(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={monacoLanguage}
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          onMount={(editor, monaco) => {
            // Initialize Yjs binding for real-time collaboration
            const initBinding = async () => {
              if (ydocRef.current && providerRef.current) {
                const { MonacoBinding } = await import("y-monaco");
                const ytext = ydocRef.current.getText('monaco')
                const binding = new MonacoBinding(ytext, editor.getModel()!, new Set([editor]), providerRef.current.awareness)
                bindingRef.current = binding
              }
            };
            initBinding();
          }}
          options={{
            minimap: { enabled: true, scale: 1, showSlider: 'mouseover', renderCharacters: false },
            fontSize: 13,
            lineHeight: 20,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 12, bottom: 12 },
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            renderLineHighlight: "all",
            renderLineHighlightOnlyWhenFocus: false,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true, highlightActiveIndentation: true },
            stickyScroll: { enabled: true },
            suggest: { preview: true, showMethods: true, showFunctions: true, showStatusBar: true },
            inlineSuggest: { enabled: true },
            parameterHints: { enabled: true },
            folding: true,
            foldingStrategy: "indentation",
            showFoldingControls: "mouseover",
            overviewRulerLanes: 3,
            colorDecorators: true,
            contextmenu: true,
            mouseWheelZoom: true,
            linkedEditing: true,
            occurrencesHighlight: "singleFile",
            selectionHighlight: true,
            codeLens: true,
          }}
        />
      </div>
    </div>
  )
}
