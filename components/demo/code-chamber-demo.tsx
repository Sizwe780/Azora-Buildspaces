"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Terminal as TerminalIcon,
  X,
  Plus,
  Settings,
  Search,
  GitBranch,
  Play,
  Save,
  Maximize2,
  Minimize2,
  Code2,
  Zap,
  MessageSquare,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AfricanAgentAvatar } from "@/components/ui/african-agent-avatar"
import { CitadelLogo } from "@/components/ui/citadel-logo"
import { TerminalComponent } from "@/components/ui/terminal-component"


interface FileNode {
  name: string
  type: "file" | "folder"
  children?: FileNode[]
  content?: string
  language?: string
}

const defaultFileTree: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "app",
        type: "folder",
        children: [
          {
            name: "page.tsx",
            type: "file",
            language: "typescript",
            content: `export default function Home() {\n  return (\n    <main className="flex min-h-screen flex-col items-center justify-center">\n      <h1 className="text-4xl font-bold">Welcome to BuildSpaces</h1>\n      <p className="mt-4 text-gray-600">Start building amazing things</p>\n    </main>\n  )\n}`,
          },
          {
            name: "layout.tsx",
            type: "file",
            language: "typescript",
            content: `import type { Metadata } from "next"\nimport "./globals.css"\n\nexport const metadata: Metadata = {\n  title: "BuildSpaces App",\n  description: "Built with Citadel BuildSpaces",\n}\n\nexport default function RootLayout({\n  children,\n}: {\n  children: React.ReactNode\n}) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  )\n}`,
          },
          {
            name: "globals.css",
            type: "file",
            language: "css",
            content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --foreground-rgb: 0, 0, 0;\n  --background-rgb: 255, 255, 255;\n}\n\nbody {\n  color: rgb(var(--foreground-rgb));\n  background: rgb(var(--background-rgb));\n}`,
          },
        ],
      },
      {
        name: "components",
        type: "folder",
        children: [
          {
            name: "button.tsx",
            type: "file",
            language: "typescript",
            content: `interface ButtonProps {\n  children: React.ReactNode\n  variant?: "primary" | "secondary"\n  onClick?: () => void\n}\n\nexport function Button({ children, variant = "primary", onClick }: ButtonProps) {\n  return (\n    <button\n      onClick={onClick}\n      className={\`px-4 py-2 rounded-lg font-medium \${variant === "primary" ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-800"}\`}\n    >\n      {children}\n    </button>\n  )\n}`,
          },
          {
            name: "card.tsx",
            type: "file",
            language: "typescript",
            content: `interface CardProps {\n  title: string\n  description: string\n  children?: React.ReactNode\n}\n\nexport function Card({ title, description, children }: CardProps) {\n  return (\n    <div className="rounded-xl border border-gray-200 p-6 shadow-sm">\n      <h3 className="text-lg font-semibold">{title}</h3>\n      <p className="mt-2 text-gray-600">{description}</p>\n      {children && <div className="mt-4">{children}</div>}\n    </div>\n  )\n}`,
          },
        ],
      },
      {
        name: "lib",
        type: "folder",
        children: [
          {
            name: "utils.ts",
            type: "file",
            language: "typescript",
            content: `import { clsx, type ClassValue } from "clsx"\nimport { twMerge } from "tailwind-merge"\n\nexport function cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs))\n}`,
          },
        ],
      },
    ],
  },
  {
    name: "package.json",
    type: "file",
    language: "json",
    content: `{\n  "name": "buildspaces-app",\n  "version": "0.1.0",\n  "private": true,\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start",\n    "lint": "next lint"\n  },\n  "dependencies": {\n    "next": "14.0.0",\n    "react": "18.2.0",\n    "react-dom": "18.2.0"\n  }\n}`,
  },
  {
    name: "tsconfig.json",
    type: "file",
    language: "json",
    content: `{\n  "compilerOptions": {\n    "target": "es5",\n    "lib": ["dom", "dom.iterable", "esnext"],\n    "allowJs": true,\n    "skipLibCheck": true,\n    "strict": true,\n    "forceConsistentCasingInFileNames": true,\n    "noEmit": true,\n    "esModuleInterop": true,\n    "module": "esnext",\n    "moduleResolution": "bundler",\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "jsx": "preserve",\n    "incremental": true,\n    "paths": {\n      "@/*": ["./*"]\n    }\n  },\n  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],\n  "exclude": ["node_modules"]\n}`,
  },
  { name: ".gitignore", type: "file", content: `node_modules\n.next\n.env.local\n.env\n.DS_Store` },
  {
    name: "README.md",
    type: "file",
    language: "markdown",
    content: `# BuildSpaces App\n\nThis project was created with Citadel BuildSpaces.\n\n## Getting Started\n\n\`\`\`bash\nnpm run dev\n\`\`\`\n\nOpen [http://localhost:3000](http://localhost:3000) to see your app.`,
  },
]

function FileTreeItem({
  node,
  depth = 0,
  onSelect,
  selectedFile,
}: {
  node: FileNode
  depth?: number
  onSelect: (node: FileNode) => void
  selectedFile: string | null
}) {
  const [isOpen, setIsOpen] = useState(depth < 2)

  const isSelected = selectedFile === node.name

  if (node.type === "folder") {
    return (
      <div>
        <div
          className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer text-sm transition-colors ${
            isSelected 
              ? "bg-emerald-500/15 text-white" 
              : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
          )}
          {isOpen ? (
            <FolderOpen className="h-4 w-4 text-amber-400/70" />
          ) : (
            <Folder className="h-4 w-4 text-amber-400/60" />
          )}
          <span className="text-gray-300 font-medium">{node.name}</span>
        </div>
        {isOpen &&
          node.children?.map((child, i) => (
            <FileTreeItem key={i} node={child} depth={depth + 1} onSelect={onSelect} selectedFile={selectedFile} />
          ))}
      </div>
    )
  }

  const getFileIcon = (name: string) => {
    if (name.endsWith(".tsx") || name.endsWith(".ts")) return "text-blue-400"
    if (name.endsWith(".css")) return "text-pink-400"
    if (name.endsWith(".json")) return "text-yellow-400"
    if (name.endsWith(".md")) return "text-gray-400"
    return "text-gray-400"
  }

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm transition-colors ${
        isSelected 
          ? "bg-emerald-500/15 text-emerald-200" 
          : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
      }`}
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
      onClick={() => onSelect(node)}
    >
      <File className={`h-3.5 w-3.5 ${getFileIcon(node.name)}`} />
      <span className="text-gray-300 font-medium truncate">{node.name}</span>
    </div>
  )
}
import MonacoEditor from "@monaco-editor/react"

function CodeEditor({ content, language, onChange }: { content: string; language?: string; onChange?: (value: string | undefined) => void }) {
  return (
    <MonacoEditor
      height="100%"
      defaultLanguage={language || "typescript"}
      defaultValue={content}
      value={content}
      theme="vs-dark"
      onChange={onChange}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: "on",
        roundedSelection: false,
        scrollBeyondLastLine: false,
        readOnly: false,
        automaticLayout: true,
      }}
    />
  )
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function CodeChamber() {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
  const [openTabs, setOpenTabs] = useState<FileNode[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "Welcome to BuildSpaces Terminal",
    "Type 'help' for available commands",
    "",
    "$ npm run dev",
    "ready - started server on 0.0.0.0:3000, url: http://localhost:3000",
    "event - compiled client and server successfully in 234 ms (18 modules)",
    "",
  ])
  const [terminalInput, setTerminalInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm Elara, your AI coding assistant. I can help you write code, debug issues, or explain concepts. What would you like to build today?",
      timestamp: new Date(),
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [showChat, setShowChat] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const handleFileSelect = (node: FileNode) => {
    if (node.type === "file") {
      setSelectedFile(node)
      setActiveTab(node.name)
      if (!openTabs.find((t) => t.name === node.name)) {
        setOpenTabs([...openTabs, node])
      }
    }
  }

  const closeTab = (name: string) => {
    const newTabs = openTabs.filter((t) => t.name !== name)
    setOpenTabs(newTabs)
    if (activeTab === name) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].name : null)
      setSelectedFile(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null)
    }
  }

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!terminalInput.trim()) return

    const newLines = [...terminalLines, `$ ${terminalInput}`]

    // Simulate command responses
    if (terminalInput === "help") {
      newLines.push(
        "Available commands:",
        "  npm run dev    - Start development server",
        "  npm run build  - Build for production",
        "  npm run lint   - Run linter",
        "  clear          - Clear terminal",
        "",
      )
    } else if (terminalInput === "clear") {
      setTerminalLines(["Terminal cleared", ""])
      setTerminalInput("")
      return
    } else if (terminalInput.startsWith("npm")) {
      newLines.push("Executing...", "")
    } else {
      newLines.push(`Command not found: ${terminalInput}`, "")
    }

    setTerminalLines(newLines)
    setTerminalInput("")
  }

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMessage: ChatMessage = { role: "user", content: chatInput, timestamp: new Date() }
    setChatMessages([...chatMessages, userMessage])
    setChatInput("")

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I can help you with that! Let me analyze your code and suggest some improvements.",
        "Great question! Here's how we can implement that feature...",
        "I see what you're trying to do. Let me generate some code for you.",
        "That's a common pattern in React. Here's the best practice approach...",
      ]
      const aiResponse: ChatMessage = {
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      }
      setChatMessages((prev) => [...prev, aiResponse])
    }, 1000)
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [chatMessages])

  return (
    <div
      className={`flex flex-col bg-[#0d1117] ${isFullscreen ? "fixed inset-0 z-50" : "h-[800px]"} rounded-xl overflow-hidden border border-white/10`}
    >
      {/* Premium Top toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#0d1117] border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-emerald-500 to-cyan-500">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">Code Chamber</span>
            <span className="text-xs text-gray-500">buildspaces-app</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 px-3 text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all">
            <Save className="h-4 w-4 mr-2" />
            <span className="text-xs font-medium">Save</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all">
            <Play className="h-4 w-4 mr-2" />
            <span className="text-xs font-medium">Run</span>
          </Button>
          <div className="w-px h-4 bg-white/[0.08]" />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar - Premium styling */}
        <div className="w-14 bg-[#0d1117] border-r border-white/[0.08] flex flex-col items-center py-4 gap-4 select-none">
          <button className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 transition-all">
            <File className="h-5 w-5" />
          </button>
          <button className="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] transition-all">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] transition-all">
            <GitBranch className="h-5 w-5" />
          </button>
          <button className="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] transition-all">
            <Settings className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <button
            className="p-2.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] transition-all"
            onClick={() => setShowChat(!showChat)}
            title={showChat ? "Hide AI Assistant" : "Show AI Assistant"}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>

        {/* File explorer panel */}
        <div className="w-60 bg-[#0d1117] border-r border-white/[0.08] overflow-auto flex flex-col">
          <div className="px-4 py-3 text-xs uppercase tracking-widest text-gray-500 font-semibold border-b border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span>Explorer</span>
              <Plus className="h-3.5 w-3.5 hover:text-gray-300 cursor-pointer transition-colors" />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {defaultFileTree.map((node, i) => (
              <FileTreeItem key={i} node={node} onSelect={handleFileSelect} selectedFile={activeTab} />
            ))}
          </div>
        </div>

        {/* Main editor area */}
        <div className="flex-1 flex flex-col">
          {/* Editor Tabs - Premium styling */}
          <div className="flex items-center bg-[#0d1117] border-b border-white/[0.08] overflow-x-auto gap-1 px-2">
            {openTabs.map((tab) => (
              <div
                key={tab.name}
                className={`flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer rounded-t-md transition-all ${
                  activeTab === tab.name 
                    ? "bg-white/[0.08] text-white border-b-2 border-emerald-500" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
                onClick={() => {
                  setActiveTab(tab.name)
                  setSelectedFile(tab)
                }}
              >
                <File className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium truncate max-w-[120px]">{tab.name}</span>
                <X
                  className="h-3 w-3 hover:bg-white/20 rounded p-0.5 flex-shrink-0 ml-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.name)
                  }}
                />
              </div>
            ))}
            <button className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] rounded transition-all ml-auto flex-shrink-0">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Editor content */}
          <div className="flex-1 bg-[#1e2228] overflow-auto">
            {selectedFile ? (
              <CodeEditor content={selectedFile.content || ""} language={selectedFile.language} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <CitadelLogo size="lg" className="mx-auto mb-4" />
                  <p>Select a file to start editing</p>
                </div>
              </div>
            )}
          </div>


          {/* Terminal Panel */}
          {terminalOpen && (
            <div className="h-48 bg-[#0d1117] border-t border-white/[0.08] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-sm bg-emerald-500/20 flex items-center justify-center">
                    <TerminalIcon className="h-3 w-3 text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">Terminal</span>
                </div>
                <button className="text-gray-500 hover:text-gray-300 hover:bg-white/[0.08] p-1 rounded transition-all" onClick={() => setTerminalOpen(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TerminalComponent initialContent={terminalLines} />
              </div>
            </div>
          )}
        </div>

        {/* AI Assistant Panel */}
        {showChat && (
          <div className="w-80 bg-[#0d1117] border-l border-white/[0.08] flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Elara</p>
                  <p className="text-xs text-emerald-400">AI Architect</p>
                </div>
              </div>
              <button className="text-gray-500 hover:text-gray-300 p-1.5 rounded hover:bg-white/[0.08] transition-all">
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
            <div ref={chatRef} className="flex-1 overflow-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user" 
                        ? "bg-emerald-500/15 text-emerald-100 rounded-br-none" 
                        : "bg-white/[0.08] text-gray-200 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-white/[0.08]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Elara..."
                  className="flex-1 bg-white/[0.08] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500/50 focus:bg-white/[0.1] transition-all"
                />
                <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-9 px-3 text-xs font-medium transition-all">
                  Send
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
