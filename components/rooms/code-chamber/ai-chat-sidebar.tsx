"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useFileSystem } from "@/lib/stores/file-system"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
    Sparkles, Bot, Send, Square, Copy, Check, FileCode,
    Bug, TestTube, FileText, RefreshCw, Code, Loader2, Trash2, Wand2
} from "lucide-react"

interface ChatMessage {
    id: string
    role: "user" | "assistant"
    content: string
    action?: string
    isStreaming?: boolean
    timestamp: number
}

interface AIChatSidebarProps {
    onApplyCode?: (fileId: string, content: string) => void
}

export function AIChatSidebar({ onApplyCode }: AIChatSidebarProps) {
    const { fileMap, openFiles, activeFileId, readFile, writeFile } = useFileSystem()
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hi! I'm **Elara**, your AI coding assistant. I can help you:\n\n- **Analyze** your code for issues\n- **Explain** complex logic\n- **Refactor** for better patterns\n- **Debug** errors and exceptions\n- **Generate Tests** for your functions\n- **Document** your code\n\nSelect an action or just ask me anything.",
            timestamp: Date.now(),
        },
    ])
    const [input, setInput] = useState("")
    const [isStreaming, setIsStreaming] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const abortRef = useRef<AbortController | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const activeFileName = activeFileId ? fileMap[activeFileId]?.name || "" : ""
    const activeFileContent = activeFileId ? readFile(activeFileId) || "" : ""

    const actions = [
        { id: "analyze", label: "Analyze", icon: Bug, color: "text-red-400" },
        { id: "explain", label: "Explain", icon: FileText, color: "text-blue-400" },
        { id: "refactor", label: "Refactor", icon: Wand2, color: "text-purple-400" },
        { id: "debug", label: "Debug", icon: Bug, color: "text-amber-400" },
        { id: "test", label: "Gen Tests", icon: TestTube, color: "text-emerald-400" },
        { id: "document", label: "Document", icon: FileText, color: "text-cyan-400" },
    ]

    const sendMessage = useCallback(async (text: string, action?: string) => {
        if ((!text.trim() && !action) || isStreaming) return

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: action ? `[${action.toUpperCase()}] ${text || `Analyze the current file: ${activeFileName}`}` : text,
            action,
            timestamp: Date.now(),
        }

        const assistantId = `assistant-${Date.now()}`
        const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            isStreaming: true,
            timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, userMsg, assistantMsg])
        setInput("")
        setIsStreaming(true)

        const controller = new AbortController()
        abortRef.current = controller

        try {
            const filesContext = openFiles.slice(0, 5).map((id) => ({
                path: fileMap[id]?.name || id,
                content: readFile(id) || "",
            }))

            const payload: Record<string, any> = {
                prompt: text || `${action} the current file`,
                action: action || "chat",
                code: activeFileContent,
                language: getLanguageFromName(activeFileName),
                filename: activeFileName,
                files: filesContext,
            }

            const res = await fetch("/api/code-chamber/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal,
            })

            if (!res.ok) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: "Sorry, the AI service returned an error. Please try again.", isStreaming: false } : m
                    )
                )
                setIsStreaming(false)
                return
            }

            const reader = res.body?.getReader()
            if (!reader) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: "No response received.", isStreaming: false } : m
                    )
                )
                setIsStreaming(false)
                return
            }

            const decoder = new TextDecoder()
            let fullText = ""

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                fullText += chunk
                setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, content: fullText } : m))
                )
            }

            setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
            )
        } catch (e: any) {
            if (e.name !== "AbortError") {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: "Connection failed. Please check your network and try again.", isStreaming: false } : m
                    )
                )
            }
        } finally {
            setIsStreaming(false)
            abortRef.current = null
        }
    }, [isStreaming, activeFileId, activeFileName, activeFileContent, openFiles, fileMap, readFile])

    const handleStop = () => {
        abortRef.current?.abort()
        setIsStreaming(false)
    }

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleApplyCode = (content: string) => {
        if (activeFileId && onApplyCode) {
            // Extract code from markdown code blocks
            const match = content.match(/```(?:\w+)?\n([\s\S]*?)```/)
            if (match) {
                onApplyCode(activeFileId, match[1].trim())
            }
        }
    }

    const clearChat = () => {
        setMessages([messages[0]])
    }

    const renderInlineFormatting = (text: string) => {
        return text.split('`').map((segment, index) => {
            if (index % 2 === 1) {
                return (
                    <code key={`code-${index}`} className="px-1 py-0.5 rounded bg-[#161b22] text-[#e6edf3] text-[12px] font-mono">
                        {segment}
                    </code>
                )
            }

            return <span key={`text-${index}`}>{segment}</span>
        })
    }

    const renderContent = (content: string, msgId: string) => {
        // Simple markdown-like rendering for code blocks
        const parts = content.split(/(```[\s\S]*?```)/g)
        return parts.map((part, i) => {
            const codeMatch = part.match(/```(\w+)?\n([\s\S]*?)```/)
            if (codeMatch) {
                const lang = codeMatch[1] || ""
                const code = codeMatch[2]
                return (
                    <div key={i} className="my-2 rounded-md border border-[#30363d] overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-1 bg-[#161b22] border-b border-[#30363d]">
                            <span className="text-[10px] text-[#484f58] uppercase">{lang}</span>
                            <div className="flex items-center gap-1">
                                {activeFileId && (
                                    <button
                                        onClick={() => handleApplyCode(part)}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                    >
                                        <Code className="w-3 h-3" /> Apply
                                    </button>
                                )}
                                <button
                                    onClick={() => handleCopy(code, `${msgId}-${i}`)}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[#8b949e] hover:bg-[#30363d] transition-colors"
                                >
                                    {copiedId === `${msgId}-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                        <pre className="px-3 py-2 text-[12px] font-mono text-foreground overflow-x-auto bg-background">
                            {code}
                        </pre>
                    </div>
                )
            }

            const lines = part.split('\n')

            return (
                <span key={i}>
                    {lines.map((line, lineIndex) => (
                        <span key={`line-${i}-${lineIndex}`}>
                            {renderInlineFormatting(line)}
                            {lineIndex < lines.length - 1 && <br />}
                        </span>
                    ))}
                </span>
            )
        })
    }

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            <div className="h-9 flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Elara AI
                </div>
                <button onClick={clearChat} className="p-1 rounded hover:bg-[#30363d] text-[#484f58] hover:text-[#8b949e] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Action buttons */}
            {activeFileId && (
                <div className="px-3 pb-2 flex flex-wrap gap-1">
                    {actions.map((a) => {
                        const Icon = a.icon
                        return (
                            <button
                                key={a.id}
                                onClick={() => sendMessage("", a.id)}
                                disabled={isStreaming}
                                className={cn(
                                    "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-[#30363d] hover:border-[#484f58] transition-colors disabled:opacity-40",
                                    a.color
                                )}
                            >
                                <Icon className="w-3 h-3" />
                                {a.label}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Context indicator */}
            {activeFileName && (
                <div className="mx-3 mb-2 flex items-center gap-2 px-2 py-1 rounded bg-[#161b22] border border-[#30363d] text-[11px] text-[#8b949e]">
                    <FileCode className="w-3 h-3 shrink-0" />
                    <span className="truncate">Context: {activeFileName}</span>
                </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 space-y-4 pb-4">
                {messages.map((msg) => (
                    <div key={msg.id} className="text-[13px] leading-relaxed">
                        <div className="flex items-center gap-2 mb-1">
                            {msg.role === "assistant" ? (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shrink-0">
                                    <Bot className="w-3 h-3 text-black" />
                                </div>
                            ) : (
                                <div className="w-5 h-5 rounded-full bg-[#30363d] flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-white">U</span>
                                </div>
                            )}
                            <span className="text-[11px] font-medium text-[#8b949e]">
                                {msg.role === "assistant" ? "Elara" : "You"}
                            </span>
                            {msg.isStreaming && (
                                <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                            )}
                        </div>
                        <div className={cn("pl-7", msg.role === "user" ? "text-white" : "text-foreground")}>
                            {renderContent(msg.content, msg.id)}
                            {msg.isStreaming && msg.content === "" && (
                                <span className="text-[#8b949e] animate-pulse">Thinking...</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[#1b1f27]">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                sendMessage(input)
                            }
                        }}
                        placeholder="Ask Elara anything..."
                        disabled={isStreaming}
                        rows={1}
                        className="flex-1 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-[13px] text-white placeholder:text-[#484f58] outline-none focus:border-[#1f6feb] transition-colors disabled:opacity-50 resize-none min-h-[36px] max-h-[120px]"
                        style={{ height: "auto" }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = "auto"
                            target.style.height = Math.min(target.scrollHeight, 120) + "px"
                        }}
                    />
                    {isStreaming ? (
                        <Button size="sm" onClick={handleStop} className="h-9 w-9 p-0 bg-red-600/80 hover:bg-red-600 border-0 shrink-0">
                            <Square className="w-3.5 h-3.5 text-white" />
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim()}
                            className="h-9 w-9 p-0 bg-[#238636] hover:bg-[#2ea043] border-0 text-white disabled:opacity-40 shrink-0"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

function getLanguageFromName(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase()
    switch (ext) {
        case "tsx": case "ts": return "typescript"
        case "jsx": case "js": return "javascript"
        case "css": return "css"
        case "json": return "json"
        case "md": return "markdown"
        case "html": return "html"
        case "py": return "python"
        case "rs": return "rust"
        case "go": return "go"
        default: return "plaintext"
    }
}
