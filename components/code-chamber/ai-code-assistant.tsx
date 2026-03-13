"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DiffEditor } from "@monaco-editor/react"
import {
    AlertTriangle,
    BookOpen,
    Bug,
    Check,
    ChevronDown,
    Copy,
    Eye,
    EyeOff,
    FileCode,
    FileDiff,
    Loader2,
    MessageSquare,
    Paintbrush,
    RefreshCw,
    Search,
    Send,
    Sparkles,
    StopCircle,
    TestTube,
    Wand2,
} from "lucide-react"
import { useFileSystem } from "@/lib/stores/file-system"
import { useAIIntelligence } from "@/lib/services/ai-intelligence-service"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface AICodeAssistantProps {
    activeFile: string | null
    onClose: () => void
}

type AIAction = 'analyze' | 'generate' | 'explain' | 'refactor' | 'debug' | 'document' | 'test' | 'chat'

interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    action?: AIAction
    timestamp: number
    codeContext?: {
        fileName?: string
        language?: string
        code?: string
    }
}

const ACTION_CONFIG: Record<AIAction, { icon: React.ReactNode; label: string; description: string; color: string }> = {
    analyze: {
        icon: <Search className="w-3.5 h-3.5" />,
        label: 'Analyze',
        description: 'Find bugs, security issues, and improvements',
        color: 'text-yellow-500',
    },
    generate: {
        icon: <Wand2 className="w-3.5 h-3.5" />,
        label: 'Generate',
        description: 'Generate code from a description',
        color: 'text-green-500',
    },
    explain: {
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: 'Explain',
        description: 'Explain how the code works',
        color: 'text-blue-500',
    },
    refactor: {
        icon: <Paintbrush className="w-3.5 h-3.5" />,
        label: 'Refactor',
        description: 'Suggest cleaner implementations',
        color: 'text-purple-500',
    },
    debug: {
        icon: <Bug className="w-3.5 h-3.5" />,
        label: 'Debug',
        description: 'Find and fix bugs',
        color: 'text-red-500',
    },
    document: {
        icon: <FileCode className="w-3.5 h-3.5" />,
        label: 'Document',
        description: 'Add comprehensive documentation',
        color: 'text-cyan-500',
    },
    test: {
        icon: <TestTube className="w-3.5 h-3.5" />,
        label: 'Test',
        description: 'Generate unit tests',
        color: 'text-orange-500',
    },
    chat: {
        icon: <MessageSquare className="w-3.5 h-3.5" />,
        label: 'Chat',
        description: 'Free-form coding conversation',
        color: 'text-indigo-500',
    },
}

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

export function AICodeAssistant({ activeFile, onClose }: AICodeAssistantProps) {
    const [prompt, setPrompt] = useState("")
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [isStreaming, setIsStreaming] = useState(false)
    const [selectedAction, setSelectedAction] = useState<AIAction>('chat')
    const [showCodeDiff, setShowCodeDiff] = useState<Record<string, boolean>>({})
    const [diffData, setDiffData] = useState<Record<string, { original: string; modified: string }>>({})
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [showActions, setShowActions] = useState(false)
    const [errorPredictions, setErrorPredictions] = useState<any[]>([])
    const { fileMap } = useFileSystem()
    const scrollRef = useRef<HTMLDivElement>(null)
    const abortRef = useRef<AbortController | null>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // AI Intelligence store integration
    const {
        model: selectedModel,
        setModel,
        predictErrors,
        isProcessing: aiProcessing,
    } = useAIIntelligence()

    const availableModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']

    // Auto-predict errors when active file changes
    useEffect(() => {
        if (activeFile) {
            const file = fileMap[activeFile]
            if (file?.content) {
                predictErrors(file.content, file.name.split('.').pop() || 'typescript')
                    .then((preds: any[]) => setErrorPredictions(preds || []))
                    .catch(() => {})
            }
        }
    }, [activeFile]) // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    // Get the active file content and metadata
    const getFileContext = useCallback(() => {
        if (!activeFile) return null
        const file = fileMap[activeFile]
        if (!file) return null

        const ext = file.name.split('.').pop() || ''
        const langMap: Record<string, string> = {
            ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
            py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
            cpp: 'cpp', c: 'c', cs: 'csharp', php: 'php', swift: 'swift',
            kt: 'kotlin', dart: 'dart', sql: 'sql', sh: 'bash', yml: 'yaml',
            yaml: 'yaml', json: 'json', md: 'markdown', css: 'css', html: 'html',
        }

        return {
            fileName: file.name,
            language: langMap[ext] || ext,
            code: file.content || '',
        }
    }, [activeFile, fileMap])

    // ─── Streaming AI Request ──────────────────────────────

    const sendMessage = async () => {
        if ((!prompt.trim() && selectedAction === 'chat') || isStreaming) return

        const fileContext = getFileContext()
        const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            role: 'user',
            content: prompt || `${ACTION_CONFIG[selectedAction].label} the current file`,
            action: selectedAction,
            timestamp: Date.now(),
            codeContext: fileContext || undefined,
        }

        setMessages(prev => [...prev, userMessage])
        setPrompt("")
        setIsStreaming(true)

        const assistantMessage: ChatMessage = {
            id: `msg_${Date.now() + 1}`,
            role: 'assistant',
            content: '',
            action: selectedAction,
            timestamp: Date.now(),
        }
        setMessages(prev => [...prev, assistantMessage])

        try {
            abortRef.current = new AbortController()

            const response = await fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: selectedAction,
                    prompt: prompt || undefined,
                    code: fileContext?.code || undefined,
                    language: fileContext?.language || undefined,
                    fileName: fileContext?.fileName || undefined,
                    stream: true,
                }),
                signal: abortRef.current.signal,
            })

            if (!response.ok) {
                throw new Error(`AI request failed: ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) throw new Error('No response stream')

            let fullText = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                // Parse SSE data chunks from Vercel AI SDK
                const lines = chunk.split('\n')
                for (const line of lines) {
                    // Vercel AI SDK v3 data stream format
                    if (line.startsWith('0:')) {
                        try {
                            const text = JSON.parse(line.slice(2))
                            fullText += text
                            setMessages(prev =>
                                prev.map(m =>
                                    m.id === assistantMessage.id
                                        ? { ...m, content: fullText }
                                        : m
                                )
                            )
                        } catch {
                            // Skip malformed chunks
                        }
                    }
                }
            }

            // Final update with complete text
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMessage.id
                        ? { ...m, content: fullText || 'No response received.' }
                        : m
                )
            )
        } catch (error: any) {
            if (error.name === 'AbortError') {
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMessage.id
                            ? { ...m, content: m.content + '\n\n*— Generation stopped —*' }
                            : m
                    )
                )
            } else {
                console.error('[AI Assistant] Error:', error)
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMessage.id
                            ? { ...m, content: `⚠️ Error: ${error.message || 'Failed to get AI response'}.\n\nMake sure the OpenAI API key is configured in your environment.` }
                            : m
                    )
                )
            }
        } finally {
            setIsStreaming(false)
            abortRef.current = null
        }
    }

    const stopGeneration = () => {
        abortRef.current?.abort()
    }

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const clearChat = () => {
        setMessages([])
        setShowCodeDiff({})
        setDiffData({})
    }

    // Extract code blocks from AI response and create diff
    const extractCodeDiff = (messageId: string, content: string) => {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
        const matches = [...content.matchAll(codeBlockRegex)]

        if (matches.length > 0) {
            const codeBlock = matches[0][2]
            const language = matches[0][1] || 'typescript'

            // Get current file content as original
            const fileContext = getFileContext()
            const originalCode = fileContext?.code || ''

            // Store diff data
            setDiffData(prev => ({
                ...prev,
                [messageId]: {
                    original: originalCode,
                    modified: codeBlock
                }
            }))
        }
    }

    // Toggle diff view for a message
    const toggleCodeDiff = (messageId: string, content: string) => {
        setShowCodeDiff(prev => {
            const newState = { ...prev, [messageId]: !prev[messageId] }
            if (newState[messageId] && !diffData[messageId]) {
                extractCodeDiff(messageId, content)
            }
            return newState
        })
    }

    // ─── Quick Actions (one-click, no prompt needed) ───────

    const runQuickAction = (action: AIAction) => {
        setSelectedAction(action)
        const fileContext = getFileContext()
        if (!fileContext?.code) return

        setPrompt('')
        // Trigger directly
        setTimeout(() => {
            const userMsg: ChatMessage = {
                id: `msg_${Date.now()}`,
                role: 'user',
                content: `${ACTION_CONFIG[action].label} this file`,
                action,
                timestamp: Date.now(),
                codeContext: fileContext,
            }
            setMessages(prev => [...prev, userMsg])
            setIsStreaming(true)

            const assistantMsg: ChatMessage = {
                id: `msg_${Date.now() + 1}`,
                role: 'assistant',
                content: '',
                action,
                timestamp: Date.now(),
            }
            setMessages(prev => [...prev, assistantMsg])

            // Fire the request
            const controller = new AbortController()
            abortRef.current = controller

            fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    code: fileContext.code,
                    language: fileContext.language,
                    fileName: fileContext.fileName,
                    stream: true,
                }),
                signal: controller.signal,
            }).then(async (response) => {
                if (!response.ok) throw new Error(`AI request failed: ${response.status}`)
                const reader = response.body?.getReader()
                if (!reader) throw new Error('No stream')

                const decoder = new TextDecoder()
                let fullText = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const chunk = decoder.decode(value, { stream: true })
                    const lines = chunk.split('\n')
                    for (const line of lines) {
                        if (line.startsWith('0:')) {
                            try {
                                const text = JSON.parse(line.slice(2))
                                fullText += text
                                setMessages(prev =>
                                    prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullText } : m)
                                )
                            } catch {}
                        }
                    }
                }

                setMessages(prev =>
                    prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullText || 'No response.' } : m)
                )
            }).catch((err) => {
                if (err.name !== 'AbortError') {
                    setMessages(prev =>
                        prev.map(m => m.id === assistantMsg.id ? { ...m, content: `⚠️ Error: ${err.message}` } : m)
                    )
                }
            }).finally(() => {
                setIsStreaming(false)
                abortRef.current = null
            })
        }, 50)
    }

    // ─── Render ────────────────────────────────────────────

    const fileContext = getFileContext()

    return (
        <div className="h-full flex flex-col bg-background/95 backdrop-blur">
            {/* Header */}
            <div className="h-12 border-b flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Elara AI</span>
                    {isStreaming && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 animate-pulse">
                            streaming
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {/* Model Selector */}
                    <select
                        value={selectedModel}
                        onChange={(e) => setModel(e.target.value)}
                        className="text-[10px] bg-transparent border border-border rounded px-1.5 py-0.5 focus:outline-none h-6"
                        title="Select AI Model"
                    >
                    {availableModels.map((m: string) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                    <Button variant="ghost" size="sm" onClick={clearChat} title="Clear chat">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        ×
                    </Button>
                </div>
            </div>

            {/* Error Predictions Banner */}
            {errorPredictions.length > 0 && (
                <div className="px-3 py-1.5 border-b bg-amber-500/5 shrink-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-medium text-amber-500">
                            {errorPredictions.length} potential issue{errorPredictions.length > 1 ? "s" : ""} detected
                        </span>
                    </div>
                    {errorPredictions.slice(0, 3).map((pred: any, i: number) => (
                        <div key={i} className="text-[10px] text-muted-foreground truncate pl-4">
                            L{pred.line}: {pred.message} ({Math.round(pred.confidence * 100)}% confidence)
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Action Buttons */}
            {fileContext && messages.length === 0 && (
                <div className="p-3 border-b space-y-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <FileCode className="w-3 h-3" />
                        <span className="truncate">{fileContext.fileName}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{fileContext.language}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                        {(['analyze', 'explain', 'refactor', 'debug', 'document', 'test', 'generate'] as AIAction[]).map((action) => {
                            const config = ACTION_CONFIG[action]
                            return (
                                <Button
                                    key={action}
                                    variant="outline"
                                    size="sm"
                                    className={`flex flex-col items-center gap-0.5 h-auto py-2 px-1 text-[10px] ${config.color} hover:bg-accent`}
                                    onClick={() => runQuickAction(action)}
                                    disabled={isStreaming}
                                >
                                    {config.icon}
                                    {config.label}
                                </Button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                        <Sparkles className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium mb-1">Elara AI Code Assistant</p>
                        <p className="text-xs text-center opacity-70">
                            {activeFile
                                ? 'Choose a quick action above or type a question below'
                                : 'Open a file and ask me anything about your code'}
                        </p>
                    </div>
                ) : (
                    <div className="p-3 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[95%] rounded-lg px-3 py-2 text-sm ${
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    }`}
                                >
                                    {/* Action badge */}
                                    {msg.action && msg.action !== 'chat' && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${ACTION_CONFIG[msg.action].color}`}>
                                                {ACTION_CONFIG[msg.action].icon}
                                                <span className="ml-1">{ACTION_CONFIG[msg.action].label}</span>
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Context indicator for user messages */}
                                    {msg.role === 'user' && msg.codeContext && (
                                        <div className="flex items-center gap-1 mb-1 opacity-70">
                                            <FileCode className="w-3 h-3" />
                                            <span className="text-[10px]">{msg.codeContext.fileName}</span>
                                        </div>
                                    )}

                                    {/* Message content - render with basic markdown for code blocks */}
                                    <div className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                                        {msg.content || (
                                            <span className="flex items-center gap-1 text-muted-foreground">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                Thinking...
                                            </span>
                                        )}
                                    </div>

                                    {/* Copy button for assistant messages */}
                                    {msg.role === 'assistant' && msg.content && (
                                        <div className="flex justify-end items-center gap-1 mt-1">
                                            {/* Code diff button if content contains code blocks */}
                                            {msg.content.includes('```') && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 px-1.5 text-[10px]"
                                                    onClick={() => toggleCodeDiff(msg.id, msg.content)}
                                                    title="Show code diff"
                                                >
                                                    {showCodeDiff[msg.id] ? (
                                                        <EyeOff className="w-3 h-3" />
                                                    ) : (
                                                        <FileDiff className="w-3 h-3" />
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-1.5 text-[10px]"
                                                onClick={() => copyToClipboard(msg.content, msg.id)}
                                            >
                                                {copiedId === msg.id ? (
                                                    <Check className="w-3 h-3 text-green-500" />
                                                ) : (
                                                    <Copy className="w-3 h-3" />
                                                )}
                                            </Button>
                                        </div>
                                    )}

                                    {/* Code diff preview */}
                                    {showCodeDiff[msg.id] && diffData[msg.id] && (
                                        <div className="mt-2 border rounded-md overflow-hidden">
                                            <div className="bg-muted px-2 py-1 text-[10px] font-medium flex items-center gap-1">
                                                <FileDiff className="w-3 h-3" />
                                                Code Changes Preview
                                            </div>
                                            <div className="h-48">
                                                <DiffEditor
                                                    height="100%"
                                                    language={fileContext?.language?.toLowerCase() || 'typescript'}
                                                    theme="vs-dark"
                                                    original={diffData[msg.id].original}
                                                    modified={diffData[msg.id].modified}
                                                    options={{
                                                        readOnly: true,
                                                        minimap: { enabled: false },
                                                        fontSize: 11,
                                                        lineNumbers: 'off',
                                                        renderSideBySide: true,
                                                        scrollBeyondLastLine: false,
                                                        automaticLayout: true,
                                                    }}
                                                />
                                            </div>
                                            <div className="bg-muted px-2 py-1 text-[10px] flex justify-between items-center">
                                                <span className="text-muted-foreground">
                                                    {fileContext?.fileName || 'current file'}
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-5 text-[10px] px-2"
                                                    onClick={() => {
                                                        // Apply the diff to the current file
                                                        window.dispatchEvent(new CustomEvent('elara:code-applied', {
                                                            detail: { fileId: activeFile, code: diffData[msg.id].modified }
                                                        }))
                                                        setShowCodeDiff(prev => ({ ...prev, [msg.id]: false }))
                                                    }}
                                                >
                                                    Apply Changes
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t p-3 shrink-0">
                {/* Action selector */}
                <div className="flex items-center gap-2 mb-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className={`h-6 text-[10px] gap-1 ${ACTION_CONFIG[selectedAction].color}`}
                        onClick={() => setShowActions(!showActions)}
                    >
                        {ACTION_CONFIG[selectedAction].icon}
                        {ACTION_CONFIG[selectedAction].label}
                        <ChevronDown className="w-2.5 h-2.5" />
                    </Button>
                    {showActions && (
                        <div className="flex flex-wrap gap-1">
                            {(Object.keys(ACTION_CONFIG) as AIAction[]).map((action) => (
                                <Button
                                    key={action}
                                    variant={action === selectedAction ? "secondary" : "ghost"}
                                    size="sm"
                                    className={`h-5 text-[10px] px-1.5 ${ACTION_CONFIG[action].color}`}
                                    onClick={() => {
                                        setSelectedAction(action)
                                        setShowActions(false)
                                    }}
                                >
                                    {ACTION_CONFIG[action].icon}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <Textarea
                        ref={textareaRef}
                        placeholder={selectedAction === 'chat'
                            ? "Ask anything about your code..."
                            : `${ACTION_CONFIG[selectedAction].description}...`
                        }
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[60px] max-h-[120px] resize-none text-xs"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                sendMessage()
                            }
                        }}
                        disabled={isStreaming}
                    />
                    <div className="flex flex-col gap-1">
                        {isStreaming ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-full"
                                onClick={stopGeneration}
                                title="Stop generation"
                            >
                                <StopCircle className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={sendMessage}
                                disabled={!prompt.trim() && selectedAction === 'chat'}
                                size="sm"
                                className="h-full gap-1"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
