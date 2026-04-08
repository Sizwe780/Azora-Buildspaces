"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CopilotAgentAvatar } from "@/components/ui/copilot-agent-avatar"
import { AgentActivityBadge } from "@/components/ui/agent-activity-badge"
import { agentStyles } from "@/components/ui/african-agent-avatar"
import { useFileSystem } from "@/lib/stores/file-system"
import { useWorkbench } from "@/lib/stores/workbench-store"
import {
    Send,
    Paperclip,
    RotateCcw,
    ThumbsUp,
    ThumbsDown,
    Check,
    Terminal,
    FileCode,
    X,
    Copy,
    Play,
    Sparkles,
    FileText,
    Wrench,
    Bug,
    BookOpen,
    TestTube,
    Code2,
    Pencil,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Loader2,
    FilePlus,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────

type MessageType = "user" | "agent" | "system"
type AgentKey = keyof typeof agentStyles

interface FileReference {
    name: string
    path: string
    content?: string
    lineRange?: { start: number; end: number }
}

interface CodeBlock {
    language: string
    code: string
    fileName?: string
}

interface TerminalCommand {
    command: string
    status: "pending" | "running" | "success" | "error"
    output?: string
}

interface FileChange {
    path: string
    action: "create" | "edit" | "delete"
    content?: string
    applied?: boolean
}

interface ChatMessage {
    id: string
    type: MessageType
    agent?: AgentKey
    content: string
    timestamp: Date
    files?: FileReference[]
    codeBlocks?: CodeBlock[]
    terminalCommands?: TerminalCommand[]
    fileChanges?: FileChange[]
    slashCommand?: SlashCommand
    isStreaming?: boolean
    feedback?: "up" | "down" | null
}

interface SlashCommand {
    name: string
    icon: React.ReactNode
    description: string
    prefix: string
}

// ─── Slash Commands ─────────────────────────────────

const SLASH_COMMANDS: SlashCommand[] = [
    { name: "explain", icon: <BookOpen className="w-3.5 h-3.5" />, description: "Explain how code works", prefix: "/explain" },
    { name: "fix", icon: <Bug className="w-3.5 h-3.5" />, description: "Find and fix bugs", prefix: "/fix" },
    { name: "test", icon: <TestTube className="w-3.5 h-3.5" />, description: "Generate unit tests", prefix: "/test" },
    { name: "doc", icon: <FileText className="w-3.5 h-3.5" />, description: "Generate documentation", prefix: "/doc" },
    { name: "generate", icon: <Code2 className="w-3.5 h-3.5" />, description: "Generate code from description", prefix: "/generate" },
    { name: "refactor", icon: <Wrench className="w-3.5 h-3.5" />, description: "Refactor and improve code", prefix: "/refactor" },
    { name: "terminal", icon: <Terminal className="w-3.5 h-3.5" />, description: "Run a terminal command", prefix: "/terminal" },
    { name: "new", icon: <FilePlus className="w-3.5 h-3.5" />, description: "Create a new file", prefix: "/new" },
    { name: "edit", icon: <Pencil className="w-3.5 h-3.5" />, description: "Edit a specific file", prefix: "/edit" },
]

// ─── Helpers ────────────────────────────────────────

function parseCodeBlocks(text: string): { content: string; codeBlocks: CodeBlock[] } {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
    const codeBlocks: CodeBlock[] = []
    let match
    while ((match = codeBlockRegex.exec(text)) !== null) {
        codeBlocks.push({ language: match[1] || "plaintext", code: match[2].trim() })
    }
    return { content: text, codeBlocks }
}

function parseFileChanges(text: string): FileChange[] {
    const changes: FileChange[] = []
    const filePattern = /\*\*(?:File|Create|Edit|New):\s*`?([^`*]+)`?\*\*\s*\(?(create|edit|new)?\)?/gi
    let match
    while ((match = filePattern.exec(text)) !== null) {
        changes.push({
            path: match[1].trim(),
            action: (match[2]?.toLowerCase() === "new" ? "create" : match[2]?.toLowerCase() as "create" | "edit") || "edit",
        })
    }
    return changes
}

function parseTerminalCommands(text: string): TerminalCommand[] {
    const commands: TerminalCommand[] = []
    const terminalRegex = /```(?:bash|shell|sh|cmd|powershell|terminal)\n([\s\S]*?)```/g
    let match
    while ((match = terminalRegex.exec(text)) !== null) {
        const lines = match[1].trim().split("\n")
        for (const line of lines) {
            const cmd = line.replace(/^\$\s*/, "").trim()
            if (cmd) commands.push({ command: cmd, status: "pending" })
        }
    }
    return commands
}

// ─── Markdown-like renderer ─────────────────────────

function processInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = []
    const regex = /(\*\*[^*]+\*\*)|(`[^`]+`)|(\*[^*]+\*)/g
    let lastIndex = 0
    let match
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
        if (match[1]) {
            parts.push(<strong key={match.index} className="text-white font-semibold">{match[1].slice(2, -2)}</strong>)
        } else if (match[2]) {
            parts.push(<code key={match.index} className="px-1.5 py-0.5 rounded bg-white/10 text-emerald-400 text-xs font-mono">{match[2].slice(1, -1)}</code>)
        } else if (match[3]) {
            parts.push(<em key={match.index} className="text-gray-200 italic">{match[3].slice(1, -1)}</em>)
        }
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex))
    return parts.length === 1 ? parts[0] : <>{parts}</>
}

function renderMarkdown(text: string): React.ReactNode[] {
    const parts = text.split(/(```[\s\S]*?```)/g)
    const nodes: React.ReactNode[] = []
    parts.forEach((part, idx) => {
        if (part.startsWith("```")) return // code blocks rendered separately
        const lines = part.split("\n")
        lines.forEach((line, lineIdx) => {
            if (!line.trim()) { nodes.push(<br key={`br-${idx}-${lineIdx}`} />); return }
            if (line.startsWith("## ")) { nodes.push(<h3 key={`h-${idx}-${lineIdx}`} className="text-sm font-semibold text-white mt-3 mb-1">{processInline(line.slice(3))}</h3>); return }
            if (line.startsWith("### ")) { nodes.push(<h4 key={`h4-${idx}-${lineIdx}`} className="text-xs font-semibold text-white/90 mt-2 mb-1">{processInline(line.slice(4))}</h4>); return }
            if (line.match(/^[-*]\s/)) { nodes.push(<div key={`li-${idx}-${lineIdx}`} className="flex gap-2 text-sm text-gray-300 ml-2"><span className="text-gray-500 shrink-0">•</span><span>{processInline(line.slice(2))}</span></div>); return }
            if (line.match(/^\d+\.\s/)) { const num = line.match(/^(\d+)\./); nodes.push(<div key={`ol-${idx}-${lineIdx}`} className="flex gap-2 text-sm text-gray-300 ml-2"><span className="text-gray-500 shrink-0">{num?.[1]}.</span><span>{processInline(line.replace(/^\d+\.\s/, ""))}</span></div>); return }
            nodes.push(<p key={`p-${idx}-${lineIdx}`} className="text-sm text-gray-300 leading-relaxed">{processInline(line)}</p>)
        })
    })
    return nodes
}

// ─── Code Block Component ───────────────────────────

function CodeBlockRenderer({ block, onApply, onCopy, onInsert }: {
    block: CodeBlock
    onApply: (code: string, fileName?: string) => void
    onCopy: (code: string) => void
    onInsert: (code: string) => void
}) {
    const [copied, setCopied] = useState(false)
    const [applied, setApplied] = useState(false)

    const handleCopy = () => { onCopy(block.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    const handleApply = () => { onApply(block.code, block.fileName); setApplied(true); setTimeout(() => setApplied(false), 3000) }

    return (
        <div className="my-2 rounded-lg border border-white/10 overflow-hidden bg-[var(--ide-widget-bg)]">
            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
                <span className="text-[11px] text-gray-400 font-mono">{block.language}</span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-gray-400 hover:text-white gap-1" onClick={handleCopy}>
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-gray-400 hover:text-white gap-1" onClick={() => onInsert(block.code)}>
                        <ArrowRight className="w-3 h-3" />Insert
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-emerald-400 hover:text-emerald-300 gap-1 hover:bg-emerald-500/10" onClick={handleApply}>
                        {applied ? <CheckCircle2 className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                        {applied ? "Applied" : "Apply"}
                    </Button>
                </div>
            </div>
            <pre className="p-3 overflow-x-auto text-[13px] leading-5 font-mono text-gray-300 max-h-[300px] overflow-y-auto"><code>{block.code}</code></pre>
        </div>
    )
}

// ─── Terminal Command Component ─────────────────────

function TerminalCommandRenderer({ command, onRun }: { command: TerminalCommand; onRun: (cmd: string) => void }) {
    return (
        <div className="my-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ide-widget-bg)] border border-white/10">
            <Terminal className="w-4 h-4 text-gray-400 shrink-0" />
            <code className="flex-1 text-[13px] font-mono text-emerald-400">{command.command}</code>
            {command.status === "pending" && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-emerald-400 hover:bg-emerald-500/10 gap-1" onClick={() => onRun(command.command)}>
                    <Play className="w-3 h-3" />Run
                </Button>
            )}
            {command.status === "running" && <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />}
            {command.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {command.status === "error" && <XCircle className="w-4 h-4 text-red-400" />}
        </div>
    )
}

// ─── File Change Component ──────────────────────────

function FileChangeRenderer({ change, onApply }: { change: FileChange; onApply: (change: FileChange) => void }) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs">
            {change.action === "create" ? <FilePlus className="w-3.5 h-3.5 text-emerald-400" /> : change.action === "edit" ? <Pencil className="w-3.5 h-3.5 text-yellow-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
            <span className="flex-1 font-mono text-gray-300">{change.path}</span>
            <span className="text-gray-500 capitalize">{change.action}</span>
            {!change.applied && (
                <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px] text-emerald-400 hover:bg-emerald-500/10" onClick={() => onApply(change)}>Apply</Button>
            )}
            {change.applied && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
    )
}

// ─── Context Chip ───────────────────────────────────

function ContextChip({ file, onRemove }: { file: FileReference; onRemove: () => void }) {
    return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/25 text-blue-400 text-[11px]">
            <FileCode className="w-3 h-3" />
            <span className="max-w-[120px] truncate">{file.name}</span>
            {file.lineRange && <span className="text-blue-500/60">L{file.lineRange.start}-{file.lineRange.end}</span>}
            <button onClick={onRemove} className="ml-0.5 hover:text-white transition-colors"><X className="w-3 h-3" /></button>
        </div>
    )
}

// ─── File Picker Dropdown ───────────────────────────

function FilePicker({ files, onSelect, searchTerm }: {
    files: { id: string; name: string; path: string }[]
    onSelect: (file: { id: string; name: string; path: string }) => void
    searchTerm: string
}) {
    const filtered = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.path.toLowerCase().includes(searchTerm.toLowerCase()))
    if (filtered.length === 0) return null
    return (
        <div className="absolute bottom-full left-0 right-0 mb-1 max-h-[200px] overflow-y-auto rounded-lg border border-white/15 bg-[var(--ide-menu-bg)] shadow-xl z-50">
            <div className="p-1">
                {filtered.slice(0, 10).map(file => (
                    <button key={file.id} className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-left text-sm hover:bg-white/10 transition-colors" onClick={() => onSelect(file)}>
                        <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="text-gray-300 truncate">{file.name}</span>
                        <span className="text-gray-600 text-[11px] truncate ml-auto">{file.path}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─── Slash Command Picker ───────────────────────────

function SlashCommandPicker({ commands, searchTerm, onSelect }: {
    commands: SlashCommand[]
    searchTerm: string
    onSelect: (cmd: SlashCommand) => void
}) {
    const filtered = commands.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    if (filtered.length === 0) return null
    return (
        <div className="absolute bottom-full left-0 right-0 mb-1 max-h-[240px] overflow-y-auto rounded-lg border border-white/15 bg-[var(--ide-menu-bg)] shadow-xl z-50">
            <div className="px-3 py-2 border-b border-white/10"><p className="text-[11px] text-gray-500 font-medium">SLASH COMMANDS</p></div>
            <div className="p-1">
                {filtered.map(cmd => (
                    <button key={cmd.name} className="w-full flex items-center gap-3 px-3 py-2 rounded text-left hover:bg-white/10 transition-colors" onClick={() => onSelect(cmd)}>
                        <span className="text-emerald-400">{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                            <span className="text-sm text-white font-medium">{cmd.prefix}</span>
                            <p className="text-[11px] text-gray-500">{cmd.description}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}

// ─── Main Component ─────────────────────────────────

interface CopilotChatPanelProps {
    agent?: AgentKey
    className?: string
}

const CHAT_STORAGE_KEY = 'azora-chat-history'

function loadChatHistory(): ChatMessage[] | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as ChatMessage[]
        // Rehydrate Date objects
        return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp), isStreaming: false }))
    } catch { return null }
}

function saveChatHistory(messages: ChatMessage[]) {
    if (typeof window === 'undefined') return
    try {
        // Only persist non-streaming messages, limit to last 100
        const toSave = messages.filter(m => !m.isStreaming).slice(-100)
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toSave))
    } catch { /* quota exceeded, ignore */ }
}

export function CopilotChatPanel({ agent = "elara", className = "" }: CopilotChatPanelProps) {
    // ── State ──────────────────────────────
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const saved = loadChatHistory()
        if (saved && saved.length > 0) return saved
        return [{
            id: "welcome",
            type: "agent" as const,
            agent: "elara" as AgentKey,
            content: "Hello! I'm **Elara**, your AI coding assistant powered by **Citadels M**. I can help you write, fix, explain, and refactor code.\n\nTry these commands:\n- `/explain` — Explain code\n- `/fix` — Find and fix bugs\n- `/test` — Generate tests\n- `/terminal` — Run commands\n- `/new` — Create files\n\nOr just ask me anything! Use `@` to reference files from your workspace.",
            timestamp: new Date(),
        }]
    })
    const [input, setInput] = useState("")
    const [isStreaming, setIsStreaming] = useState(false)
    const [typingAgent, setTypingAgent] = useState<AgentKey | null>(null)
    const [attachedFiles, setAttachedFiles] = useState<FileReference[]>([])
    const [showSlashMenu, setShowSlashMenu] = useState(false)
    const [showFilePicker, setShowFilePicker] = useState(false)
    const [slashSearchTerm, setSlashSearchTerm] = useState("")
    const [fileSearchTerm, setFileSearchTerm] = useState("")
    const [activeSlashCmd, setActiveSlashCmd] = useState<SlashCommand | null>(null)

    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const style = agentStyles[agent]

    // ── Store hooks ────────────────────────
    const { fileMap, activeFileId, readFile, writeFile, createFile: fsCreateFile, openFile, setActiveFile } = useFileSystem()
    const { setPanelView } = useWorkbench()

    // ── Derived data ───────────────────────
    const workspaceFiles = useMemo(() => Object.values(fileMap).filter(f => f.type === "file").map(f => ({ id: f.id, name: f.name, path: f.path })), [fileMap])
    const activeFileContent = useMemo(() => activeFileId ? (readFile(activeFileId) || null) : null, [activeFileId, readFile])
    const activeFileName = useMemo(() => activeFileId ? (fileMap[activeFileId]?.name || null) : null, [activeFileId, fileMap])

    // ── Auto-scroll ────────────────────────
    useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [messages, isStreaming])

    // ── Persist chat history ───────────────
    useEffect(() => {
        // Debounce saves — don't save while streaming
        if (isStreaming) return
        saveChatHistory(messages)
    }, [messages, isStreaming])

    // ── Input handling ─────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setInput(value)
        if (value.startsWith("/")) { setShowSlashMenu(true); setSlashSearchTerm(value.slice(1).split(" ")[0]); setShowFilePicker(false) } else { setShowSlashMenu(false) }
        const atMatch = value.match(/@(\S*)$/)
        if (atMatch) { setShowFilePicker(true); setFileSearchTerm(atMatch[1]); setShowSlashMenu(false) } else { setShowFilePicker(false) }
    }

    const handleSlashSelect = (cmd: SlashCommand) => { setActiveSlashCmd(cmd); setInput(cmd.prefix + " "); setShowSlashMenu(false); inputRef.current?.focus() }

    const handleFileSelect = (file: { id: string; name: string; path: string }) => {
        const content = readFile(file.id)
        setAttachedFiles(prev => [...prev, { name: file.name, path: file.path, content: content || undefined }])
        setInput(prev => prev.replace(/@\S*$/, ""))
        setShowFilePicker(false)
        inputRef.current?.focus()
    }

    const handleAttachCurrentFile = () => {
        if (activeFileId && activeFileName) {
            const content = readFile(activeFileId)
            setAttachedFiles(prev => [...prev, { name: activeFileName!, path: fileMap[activeFileId]?.path || activeFileName!, content: content || undefined }])
        }
    }

    // ── Actions ────────────────────────────

    const handleApplyCode = useCallback((code: string, _fileName?: string) => {
        if (activeFileId) {
            writeFile(activeFileId, code)
            window.dispatchEvent(new CustomEvent("elara:code-applied", { detail: { fileId: activeFileId, code } }))
        }
    }, [activeFileId, writeFile])

    const handleInsertCode = useCallback((code: string) => {
        window.dispatchEvent(new CustomEvent("elara:insert-at-cursor", { detail: { code } }))
    }, [])

    const handleCopyCode = useCallback((code: string) => { navigator.clipboard.writeText(code) }, [])

    const handleRunTerminal = useCallback((command: string) => {
        setPanelView("terminal")
        window.dispatchEvent(new CustomEvent("elara:run-terminal", { detail: { command } }))
        setMessages(prev => prev.map(msg => ({
            ...msg,
            terminalCommands: msg.terminalCommands?.map(cmd => cmd.command === command ? { ...cmd, status: "running" as const } : cmd),
        })))
        setTimeout(() => {
            setMessages(prev => prev.map(msg => ({
                ...msg,
                terminalCommands: msg.terminalCommands?.map(cmd => cmd.command === command ? { ...cmd, status: "success" as const } : cmd),
            })))
        }, 3000)
    }, [setPanelView])

    const handleApplyFileChange = useCallback(async (change: FileChange) => {
        try {
            if (change.action === "create" && change.content) {
                await fsCreateFile(null, change.path, change.content)
            } else if (change.action === "edit" && change.content) {
                const file = Object.values(fileMap).find(f => f.path === change.path)
                if (file) { await writeFile(file.id, change.content); openFile(file.id); setActiveFile(file.id) }
            }
            setMessages(prev => prev.map(msg => ({ ...msg, fileChanges: msg.fileChanges?.map(fc => fc.path === change.path ? { ...fc, applied: true } : fc) })))
        } catch (err) { console.error("Failed to apply file change:", err) }
    }, [fileMap, fsCreateFile, writeFile, openFile, setActiveFile])

    const handleRetry = useCallback((messageId: string) => {
        const idx = messages.findIndex(m => m.id === messageId)
        if (idx <= 0) return
        const userMsg = messages.slice(0, idx).reverse().find(m => m.type === "user")
        if (userMsg) { setMessages(prev => prev.filter(m => m.id !== messageId)); setInput(userMsg.content) }
    }, [messages])

    const handleFeedback = useCallback((messageId: string, feedback: "up" | "down") => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback } : m))
    }, [])

    // ── Send Message ───────────────────────

    const handleSend = async () => {
        if (!input.trim() && attachedFiles.length === 0) return
        const prompt = input.trim()

        // Determine action from slash command
        let action = "chat"
        let cleanPrompt = prompt
        const slashMatch = prompt.match(/^\/(\w+)\s*/)
        if (slashMatch) {
            const cmdName = slashMatch[1]
            const cmd = SLASH_COMMANDS.find(c => c.name === cmdName)
            if (cmd) {
                action = cmdName === "terminal" ? "chat" : cmdName === "new" ? "generate" : cmdName === "edit" ? "refactor" : cmdName
                cleanPrompt = prompt.slice(slashMatch[0].length)
            }
        }

        // Build user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: "user",
            content: prompt,
            timestamp: new Date(),
            files: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
            slashCommand: activeSlashCmd || undefined,
        }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setAttachedFiles([])
        setActiveSlashCmd(null)
        setShowSlashMenu(false)
        setShowFilePicker(false)

        setIsStreaming(true)
        setTypingAgent(agent)

        try {
            // Build context
            let contextPayload = cleanPrompt
            if (attachedFiles.length > 0) {
                const fileContext = attachedFiles.map(f => `--- File: ${f.path} ---\n${f.content || "(no content)"}`).join("\n\n")
                contextPayload = `${cleanPrompt}\n\nReferenced files:\n${fileContext}`
            }
            if (attachedFiles.length === 0 && activeFileContent && ["explain", "fix", "test", "doc", "refactor", "debug"].includes(action)) {
                contextPayload = `${cleanPrompt}\n\nActive file (${activeFileName}):\n\`\`\`\n${activeFileContent}\n\`\`\``
            }
            if (slashMatch?.[1] === "terminal") {
                contextPayload = `The user wants you to suggest terminal commands for: ${cleanPrompt}\n\nProvide the commands in \`\`\`bash code blocks so the user can run them.`
            }
            if (slashMatch?.[1] === "new") {
                contextPayload = `Create a new file based on: ${cleanPrompt}\n\nProvide the complete file content in a code block. Include **File: \`filename\`** (create) to indicate the file path.`
            }
            if (slashMatch?.[1] === "edit") {
                contextPayload = `Edit the file ${activeFileName || "current file"} as follows: ${cleanPrompt}\n\nCurrent content:\n\`\`\`\n${activeFileContent || ""}\n\`\`\`\n\nProvide the complete updated file content.`
            }

            const response = await fetch("/api/code-chamber/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: action === "chat" ? "chat" : action,
                    prompt: contextPayload,
                    code: attachedFiles.length > 0 ? attachedFiles[0].content : activeFileContent || undefined,
                    language: activeFileName?.split(".").pop() || undefined,
                    fileName: activeFileName || undefined,
                    stream: true,
                }),
            })

            if (!response.ok) throw new Error(await response.text())

            // Handle streaming
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let fullText = ""
            const streamMsgId = (Date.now() + 1).toString()

            setMessages(prev => [...prev, {
                id: streamMsgId, type: "agent", agent, content: "", timestamp: new Date(), isStreaming: true,
            }])

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const chunk = decoder.decode(value, { stream: true })
                    const lines = chunk.split("\n").filter(Boolean)
                    for (const line of lines) {
                        const match = line.match(/^0:(.+)$/)
                        if (match) { try { fullText += JSON.parse(match[1]) } catch { fullText += line } }
                        else { fullText += line }
                    }
                    setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, content: fullText } : m))
                }
            } else {
                const data = await response.json()
                fullText = data?.text || "No response."
            }

            // Finalize
            const { codeBlocks } = parseCodeBlocks(fullText)
            const terminalCommands = parseTerminalCommands(fullText)
            const fileChanges = parseFileChanges(fullText)

            setMessages(prev => prev.map(m => m.id === streamMsgId ? {
                ...m, content: fullText, isStreaming: false,
                codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined,
                terminalCommands: terminalCommands.length > 0 ? terminalCommands : undefined,
                fileChanges: fileChanges.length > 0 ? fileChanges : undefined,
            } : m))
        } catch (error) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(), type: "system",
                content: `Request failed: ${error instanceof Error ? error.message : "Unknown error"}. Check that the Citadels M backend is running.`,
                timestamp: new Date(),
            }])
        } finally {
            setIsStreaming(false)
            setTypingAgent(null)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }

    // ── Render ─────────────────────────────

    return (
        <div className={`flex flex-col h-full bg-[var(--ide-terminal-bg)] ${className}`} style={{ borderLeft: `1px solid ${style.auraColors[0]}20` }}>
            {/* ── Header ── */}
            <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: `${style.auraColors[0]}20`, background: `linear-gradient(180deg, ${style.auraColors[0]}08 0%, transparent 100%)` }}>
                <CopilotAgentAvatar agent={agent} size="sm" showActivity={false} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">{style.name}</h3>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-medium">Citadels M</span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{style.description}</p>
                </div>
                <AgentActivityBadge agent={agent} status={isStreaming ? "working" : "idle"} size="sm" />
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-gray-500 hover:text-white"
                    title="Clear chat history"
                    onClick={() => {
                        setMessages([{
                            id: "welcome",
                            type: "agent",
                            agent: "elara",
                            content: "Chat history cleared. How can I help you?",
                            timestamp: new Date(),
                        }])
                        localStorage.removeItem(CHAT_STORAGE_KEY)
                    }}
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* ── Messages ── */}
            <ScrollArea className="flex-1 overflow-y-auto" ref={scrollRef}>
                <div className="p-4 space-y-4">
                    {messages.map(message => (
                        <div key={message.id} className="animate-fade-in">
                            {message.type === "user" ? (
                                <div className="flex justify-end gap-2">
                                    <div className="max-w-[85%] space-y-2">
                                        {message.slashCommand && (
                                            <div className="flex justify-end">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[11px]">
                                                    {message.slashCommand.icon}{message.slashCommand.prefix}
                                                </div>
                                            </div>
                                        )}
                                        {message.files && message.files.length > 0 && (
                                            <div className="flex flex-wrap justify-end gap-1.5">
                                                {message.files.map((file, i) => (
                                                    <div key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/20 text-blue-400 text-[11px]">
                                                        <FileCode className="w-3 h-3" />{file.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="bg-white/10 rounded-2xl rounded-tr-sm px-4 py-3">
                                            <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : message.type === "system" ? (
                                <div className="flex justify-center">
                                    <div className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs max-w-[90%]">{message.content}</div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        <CopilotAgentAvatar agent={message.agent || agent} size="sm" showActivity={false} isWorking={message.isStreaming} />
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{
                                            background: `linear-gradient(135deg, ${agentStyles[message.agent || agent].auraColors[0]}10, ${agentStyles[message.agent || agent].auraColors[1]}06)`,
                                            border: `1px solid ${agentStyles[message.agent || agent].auraColors[0]}18`,
                                        }}>
                                            <div className="space-y-1">{renderMarkdown(message.content)}</div>
                                            {message.isStreaming && <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle" />}
                                        </div>

                                        {message.codeBlocks?.map((block, i) => (
                                            <CodeBlockRenderer key={`cb-${message.id}-${i}`} block={block} onApply={handleApplyCode} onCopy={handleCopyCode} onInsert={handleInsertCode} />
                                        ))}

                                        {message.terminalCommands?.map((cmd, i) => (
                                            <TerminalCommandRenderer key={`tc-${message.id}-${i}`} command={cmd} onRun={handleRunTerminal} />
                                        ))}

                                        {message.fileChanges && message.fileChanges.length > 0 && (
                                            <div className="space-y-1">
                                                <p className="text-[11px] text-gray-500 font-medium px-1">FILES ({message.fileChanges.length})</p>
                                                {message.fileChanges.map((fc, i) => (
                                                    <FileChangeRenderer key={`fc-${message.id}-${i}`} change={fc} onApply={handleApplyFileChange} />
                                                ))}
                                            </div>
                                        )}

                                        {!message.isStreaming && message.id !== "welcome" && (
                                            <div className="flex items-center gap-2 px-1">
                                                <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${message.feedback === "up" ? "text-emerald-400" : "text-gray-500 hover:text-white"}`} onClick={() => handleFeedback(message.id, "up")}><ThumbsUp className="w-3 h-3" /></Button>
                                                <Button variant="ghost" size="sm" className={`h-6 w-6 p-0 ${message.feedback === "down" ? "text-red-400" : "text-gray-500 hover:text-white"}`} onClick={() => handleFeedback(message.id, "down")}><ThumbsDown className="w-3 h-3" /></Button>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-white" onClick={() => handleRetry(message.id)}><RotateCcw className="w-3 h-3" /></Button>
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-500 hover:text-white" onClick={() => handleCopyCode(message.content)}><Copy className="w-3 h-3" /></Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {isStreaming && typingAgent && !messages.some(m => m.isStreaming) && (
                        <div className="flex gap-3 animate-fade-in">
                            <div className="flex-shrink-0 mt-1"><CopilotAgentAvatar agent={typingAgent} size="sm" showActivity={false} isWorking /></div>
                            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{
                                background: `linear-gradient(135deg, ${agentStyles[typingAgent].auraColors[0]}15, ${agentStyles[typingAgent].auraColors[1]}08)`,
                                border: `1px solid ${agentStyles[typingAgent].auraColors[0]}20`,
                            }}>
                                <div className="flex items-center gap-1">
                                    {[0, 1, 2].map(i => (<span key={i} className="w-2 h-2 rounded-full" style={{ background: agentStyles[typingAgent].auraColors[i % 3], animation: `elara-typing-bounce 1.4s ease-in-out ${i * 0.15}s infinite` }} />))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* ── Input Area ── */}
            <div className="border-t relative" style={{ borderColor: `${style.auraColors[0]}20`, background: `linear-gradient(0deg, ${style.auraColors[0]}06 0%, transparent 100%)` }}>
                {showSlashMenu && <div className="relative px-4"><SlashCommandPicker commands={SLASH_COMMANDS} searchTerm={slashSearchTerm} onSelect={handleSlashSelect} /></div>}
                {showFilePicker && <div className="relative px-4"><FilePicker files={workspaceFiles} onSelect={handleFileSelect} searchTerm={fileSearchTerm} /></div>}

                {attachedFiles.length > 0 && (
                    <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                        {attachedFiles.map((file, i) => <ContextChip key={i} file={file} onRemove={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))} />)}
                    </div>
                )}

                {activeSlashCmd && (
                    <div className="px-4 pt-2 flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[11px]">
                            {activeSlashCmd.icon}<span>{activeSlashCmd.prefix}</span>
                        </div>
                        <button onClick={() => { setActiveSlashCmd(null); setInput("") }} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
                    </div>
                )}

                <div className="p-3">
                    <div className="flex items-center gap-3 mb-2">
                        <button className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 transition-colors" onClick={handleAttachCurrentFile} title="Attach current file">
                            <Paperclip className="w-3 h-3" />Attach file
                        </button>
                        {activeFileName && <span className="text-[11px] text-gray-600">Active: <span className="text-gray-400">{activeFileName}</span></span>}
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="relative flex-1">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder={`Ask ${style.name}... (/ for commands, @ for files)`}
                                className="w-full min-h-[38px] max-h-[120px] resize-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                                rows={1}
                                disabled={isStreaming}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute right-1 bottom-1 h-7 w-7 text-gray-400 hover:text-white disabled:opacity-30"
                                onClick={handleSend}
                                disabled={isStreaming || (!input.trim() && attachedFiles.length === 0)}
                            >
                                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                        <p className="text-[10px] text-gray-600">Enter to send · Shift+Enter for new line</p>
                        <p className="text-[10px] text-gray-600">Powered by Citadels M</p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes elara-typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
                .animate-fade-in { animation: elara-fade-in 0.3s ease-out; }
                @keyframes elara-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
