"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useFileSystem } from "@/lib/stores/file-system"
import {
    Play, Bug, StopCircle, SkipForward, SkipBack, RotateCw,
    ChevronRight, ChevronDown, Variable, Eye, Terminal, Loader2, X
} from "lucide-react"

interface DebugVariable {
    name: string
    value: string
    type: string
    children?: DebugVariable[]
}

interface DebugStackFrame {
    id: number
    name: string
    file: string
    line: number
    column: number
    isActive: boolean
}

interface DebugBreakpoint {
    id: string
    file: string
    fileId: string
    line: number
    enabled: boolean
    condition?: string
    hitCount?: number
}

type DebugState = "idle" | "running" | "paused" | "stopped"

interface DebugPanelProps {
    projectId: string
    onNavigate?: (fileId: string, line: number) => void
}

export function DebugPanel({ projectId, onNavigate }: DebugPanelProps) {
    const { fileMap, activeFileId } = useFileSystem()
    const [debugState, setDebugState] = useState<DebugState>("idle")
    const [variables, setVariables] = useState<DebugVariable[]>([])
    const [callStack, setCallStack] = useState<DebugStackFrame[]>([])
    const [breakpoints, setBreakpoints] = useState<DebugBreakpoint[]>([])
    const [watchExpressions, setWatchExpressions] = useState<{ expr: string; value: string }[]>([])
    const [newWatch, setNewWatch] = useState("")
    const [consoleInput, setConsoleInput] = useState("")
    const [consoleOutput, setConsoleOutput] = useState<{ text: string; type: "input" | "output" | "error" }[]>([
        { text: "Debug Console ready. Start a debug session to begin.", type: "output" },
    ])
    const [expandedVars, setExpandedVars] = useState<Set<string>>(new Set())
    const consoleRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight
        }
    }, [consoleOutput])

    const startDebug = useCallback(() => {
        setDebugState("running")
        setConsoleOutput(prev => [...prev, { text: `Starting debug session for project: ${projectId}`, type: "output" }])
        
        // Simulate hitting a breakpoint after a short delay
        setTimeout(() => {
            setDebugState("paused")
            setVariables([
                { name: "request", value: "IncomingMessage", type: "object", children: [
                    { name: "method", value: '"GET"', type: "string" },
                    { name: "url", value: '"/api/data"', type: "string" },
                    { name: "headers", value: "Object", type: "object", children: [
                        { name: "content-type", value: '"application/json"', type: "string" },
                        { name: "authorization", value: '"Bearer ..."', type: "string" },
                    ]},
                ]},
                { name: "response", value: "ServerResponse", type: "object", children: [
                    { name: "statusCode", value: "200", type: "number" },
                    { name: "headersSent", value: "false", type: "boolean" },
                ]},
                { name: "data", value: "Array(3)", type: "object", children: [
                    { name: "0", value: '{ id: 1, name: "Item 1" }', type: "object" },
                    { name: "1", value: '{ id: 2, name: "Item 2" }', type: "object" },
                    { name: "2", value: '{ id: 3, name: "Item 3" }', type: "object" },
                ]},
                { name: "count", value: "3", type: "number" },
                { name: "isAuthenticated", value: "true", type: "boolean" },
                { name: "userId", value: '"usr_12345"', type: "string" },
            ])
            setCallStack([
                { id: 0, name: "handleRequest", file: "server.ts", line: 42, column: 8, isActive: true },
                { id: 1, name: "processData", file: "data.ts", line: 18, column: 4, isActive: false },
                { id: 2, name: "authenticate", file: "auth.ts", line: 25, column: 12, isActive: false },
                { id: 3, name: "main", file: "index.ts", line: 7, column: 1, isActive: false },
            ])
            setConsoleOutput(prev => [...prev, { text: "⏸ Paused on breakpoint at server.ts:42", type: "output" }])
        }, 800)
    }, [projectId])

    const stopDebug = () => {
        setDebugState("stopped")
        setVariables([])
        setCallStack([])
        setConsoleOutput(prev => [...prev, { text: "Debug session ended.", type: "output" }])
        setTimeout(() => setDebugState("idle"), 500)
    }

    const continueDebug = () => {
        setDebugState("running")
        setConsoleOutput(prev => [...prev, { text: "▶ Continuing...", type: "output" }])
        setTimeout(() => {
            setDebugState("paused")
            setConsoleOutput(prev => [...prev, { text: "⏸ Paused on breakpoint at data.ts:18", type: "output" }])
        }, 500)
    }

    const stepOver = () => {
        setConsoleOutput(prev => [...prev, { text: "→ Step over: line 43", type: "output" }])
    }

    const stepInto = () => {
        setConsoleOutput(prev => [...prev, { text: "↓ Step into: processData()", type: "output" }])
    }

    const handleConsoleSubmit = () => {
        if (!consoleInput.trim()) return
        setConsoleOutput(prev => [
            ...prev,
            { text: `> ${consoleInput}`, type: "input" },
            { text: evalExpression(consoleInput), type: "output" },
        ])
        setConsoleInput("")
    }

    const addWatch = () => {
        if (!newWatch.trim()) return
        setWatchExpressions(prev => [...prev, { expr: newWatch, value: evalExpression(newWatch) }])
        setNewWatch("")
    }

    const toggleVar = (path: string) => {
        setExpandedVars(prev => {
            const next = new Set(prev)
            next.has(path) ? next.delete(path) : next.add(path)
            return next
        })
    }

    const renderVariable = (v: DebugVariable, path: string, depth: number) => {
        const hasChildren = v.children && v.children.length > 0
        const isExpanded = expandedVars.has(path)

        return (
            <div key={path}>
                <div
                    className="flex items-center gap-1 py-[2px] hover:bg-[#1f1f1f] cursor-pointer transition-colors"
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => hasChildren && toggleVar(path)}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="w-3 h-3 text-[#484f58] shrink-0" /> : <ChevronRight className="w-3 h-3 text-[#484f58] shrink-0" />
                    ) : <span className="w-3 shrink-0" />}
                    <span className="text-[12px] text-purple-400 font-medium">{v.name}</span>
                    <span className="text-[12px] text-[#30363d] mx-0.5">=</span>
                    <span className={cn("text-[12px] truncate",
                        v.type === "string" ? "text-emerald-400" :
                        v.type === "number" ? "text-amber-400" :
                        v.type === "boolean" ? "text-blue-400" :
                        "text-foreground"
                    )}>{v.value}</span>
                </div>
                {hasChildren && isExpanded && v.children!.map((child, i) =>
                    renderVariable(child, `${path}.${child.name}`, depth + 1)
                )}
            </div>
        )
    }

    const addBreakpoint = () => {
        if (!activeFileId || !fileMap[activeFileId]) return
        const fileName = fileMap[activeFileId]?.name || "unknown"
        const bp: DebugBreakpoint = {
            id: `bp-${Date.now()}`,
            file: fileName,
            fileId: activeFileId,
            line: 1,
            enabled: true,
        }
        setBreakpoints(prev => [...prev, bp])
    }

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            {/* Debug Toolbar */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1b1f27] shrink-0">
                <div className="flex items-center gap-1">
                    {debugState === "idle" || debugState === "stopped" ? (
                        <button onClick={startDebug} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-[#238636] hover:bg-[#2ea043] text-white transition-colors">
                            <Play className="w-3 h-3" /> Start
                        </button>
                    ) : (
                        <>
                            <button onClick={continueDebug} disabled={debugState !== "paused"} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-30">
                                <Play className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={stepOver} disabled={debugState !== "paused"} className="p-1 rounded text-[#8b949e] hover:bg-[#30363d] transition-colors disabled:opacity-30">
                                <SkipForward className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={stepInto} disabled={debugState !== "paused"} className="p-1 rounded text-[#8b949e] hover:bg-[#30363d] transition-colors disabled:opacity-30">
                                <SkipBack className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setConsoleOutput(prev => [...prev, { text: "↻ Restarting...", type: "output" }]); stopDebug(); setTimeout(startDebug, 300) }} className="p-1 rounded text-amber-400 hover:bg-amber-500/10 transition-colors">
                                <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={stopDebug} className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                                <StopCircle className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                    {debugState === "running" && <><Loader2 className="w-3 h-3 animate-spin text-emerald-400" /><span className="text-emerald-400">Running</span></>}
                    {debugState === "paused" && <><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-amber-400">Paused</span></>}
                    {debugState === "idle" && <span className="text-[#484f58]">Not started</span>}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Variables */}
                <div className="border-b border-[#1b1f27]">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
                        <Variable className="w-3 h-3" /> Variables
                    </div>
                    <div className="pb-1">
                        {variables.length === 0 ? (
                            <div className="px-3 py-2 text-[12px] text-[#484f58]">
                                {debugState === "idle" ? "Start debugging to inspect variables" : "No variables in scope"}
                            </div>
                        ) : variables.map((v, i) => renderVariable(v, v.name, 0))}
                    </div>
                </div>

                {/* Watch */}
                <div className="border-b border-[#1b1f27]">
                    <div className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e] flex items-center gap-2">
                            <Eye className="w-3 h-3" /> Watch
                        </span>
                    </div>
                    <div className="px-3 pb-2">
                        {watchExpressions.map((w, i) => (
                            <div key={i} className="flex items-center gap-2 py-[2px] text-[12px]">
                                <span className="text-purple-400">{w.expr}</span>
                                <span className="text-[#30363d]">=</span>
                                <span className="text-foreground truncate">{w.value}</span>
                                <button onClick={() => setWatchExpressions(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto p-0.5 rounded hover:bg-[#30363d] text-[#484f58]">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                        <div className="flex items-center gap-1 mt-1">
                            <input
                                value={newWatch}
                                onChange={(e) => setNewWatch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") addWatch() }}
                                placeholder="Add expression..."
                                className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-[11px] text-white placeholder:text-[#484f58] outline-none focus:border-[#1f6feb]"
                            />
                        </div>
                    </div>
                </div>

                {/* Call Stack */}
                <div className="border-b border-[#1b1f27]">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
                        Call Stack
                    </div>
                    <div className="pb-1">
                        {callStack.length === 0 ? (
                            <div className="px-3 py-2 text-[12px] text-[#484f58]">No call stack</div>
                        ) : callStack.map((frame) => (
                            <button
                                key={frame.id}
                                onClick={() => onNavigate && onNavigate(frame.file, frame.line)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-1 text-left text-[12px] hover:bg-[#1f1f1f] transition-colors",
                                    frame.isActive && "bg-[#1f6feb]/10"
                                )}
                            >
                                {frame.isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                                <span className={frame.isActive ? "text-white font-medium" : "text-[#8b949e]"}>{frame.name}</span>
                                <span className="text-[10px] text-[#484f58] ml-auto">{frame.file}:{frame.line}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Breakpoints */}
                <div className="border-b border-[#1b1f27]">
                    <div className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">Breakpoints</span>
                        <button onClick={addBreakpoint} className="text-[10px] text-[#58a6ff] hover:underline">+ Add</button>
                    </div>
                    <div className="pb-1">
                        {breakpoints.length === 0 ? (
                            <div className="px-3 py-2 text-[12px] text-[#484f58]">No breakpoints set</div>
                        ) : breakpoints.map((bp) => (
                            <div key={bp.id} className="flex items-center gap-2 px-3 py-1 text-[12px]">
                                <button
                                    onClick={() => setBreakpoints(prev => prev.map(b => b.id === bp.id ? { ...b, enabled: !b.enabled } : b))}
                                    className={cn("w-3 h-3 rounded-full border-2 shrink-0",
                                        bp.enabled ? "bg-red-500 border-red-500" : "border-[#484f58]"
                                    )}
                                />
                                <span className="text-foreground">{bp.file}</span>
                                <span className="text-[#484f58]">:{bp.line}</span>
                                <button
                                    onClick={() => setBreakpoints(prev => prev.filter(b => b.id !== bp.id))}
                                    className="ml-auto p-0.5 rounded hover:bg-[#30363d] text-[#484f58]"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Debug Console */}
                <div>
                    <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
                        <Terminal className="w-3 h-3" /> Console
                    </div>
                    <div ref={consoleRef} className="max-h-[200px] overflow-y-auto font-mono text-[11px] leading-[16px] px-3">
                        {consoleOutput.map((line, i) => (
                            <div key={i} className={cn("py-[1px]",
                                line.type === "input" ? "text-[#58a6ff]" :
                                line.type === "error" ? "text-red-400" :
                                "text-[#8b949e]"
                            )}>
                                {line.text}
                            </div>
                        ))}
                    </div>
                    <div className="px-3 py-1.5">
                        <div className="flex items-center gap-1">
                            <span className="text-[#58a6ff] text-[11px] font-mono">&gt;</span>
                            <input
                                value={consoleInput}
                                onChange={(e) => setConsoleInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleConsoleSubmit() }}
                                placeholder="Evaluate expression..."
                                disabled={debugState !== "paused"}
                                className="flex-1 bg-transparent text-[11px] text-white font-mono placeholder:text-[#30363d] outline-none disabled:opacity-40"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function evalExpression(expr: string): string {
    // Simulated expression evaluation for demo purposes
    const lower = expr.toLowerCase().trim()
    if (lower === "count" || lower === "data.length") return "3"
    if (lower === "isauthenticated") return "true"
    if (lower === "userid") return '"usr_12345"'
    if (lower === "request.method") return '"GET"'
    if (lower === "response.statuscode") return "200"
    if (lower.includes("typeof")) return '"object"'
    if (lower.includes("json.stringify")) return '\'{"id":1,"name":"Item 1"}\''
    return `<evaluated: ${expr}>`
}
