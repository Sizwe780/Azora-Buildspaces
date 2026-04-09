"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Code2, FileText, Play, Plus, RefreshCw, Save, Trash2, Database, PanelRightClose, PanelRightOpen, TerminalSquare, AlertCircle } from "lucide-react"

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

type CellType = "code" | "markdown"

interface CellOutput {
    type: "text" | "error" | "stream" | "html" | "image"
    content: string
}

interface Cell {
    id: string
    type: CellType
    source: string
    language: string
    outputs: CellOutput[]
    metadata: {
        executionCount?: number
        executionTime?: number
    }
    isExecuting?: boolean
}

const NOTEBOOK_ID = "ai-studio-notebook"
const KERNEL_ID = "ai-studio-kernel"

function createWelcomeCells(): Array<Pick<Cell, "type" | "source" | "language">> {
    return [
        {
            type: "markdown",
            source: "# AI Studio Notebook\nUse the local TypeScript kernel to explore ideas, prototype logic, and inspect variables.",
            language: "markdown",
        },
        {
            type: "code",
            source: "const greeting = \"Hello from AI Studio\"\ngreeting",
            language: "typescript",
        },
    ]
}

export default function NotebookInterface() {
    const [cells, setCells] = useState<Cell[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [kernelStatus, setKernelStatus] = useState("idle")
    const [executionCount, setExecutionCount] = useState(0)
    const [variableCount, setVariableCount] = useState(0)
    const [variables, setVariables] = useState<Array<{ name: string; type: string; value: string; size?: number }>>([])
    const [isInspectorOpen, setIsInspectorOpen] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
    const saveTimersRef = useRef<Record<string, number | undefined>>({})

    const refreshKernel = async () => {
        try {
            const response = await fetch(`/api/notebook/kernel?kernelId=${encodeURIComponent(KERNEL_ID)}`, { cache: "no-store" })
            if (!response.ok) {
                return
            }

            const data = await response.json()
            setKernelStatus(data.kernel?.status || "idle")
            setExecutionCount(data.kernel?.executionCount || 0)
            setVariableCount(data.variableCount || 0)
            setVariables(data.variables || [])
        } catch {
            // Kernel polling is best-effort.
        }
    }

    const persistCell = async (cellId: string, updates: Partial<Cell>) => {
        await fetch("/api/notebook/cells", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                notebookId: NOTEBOOK_ID,
                cellId,
                source: updates.source,
                type: updates.type,
                language: updates.language,
                outputs: updates.outputs,
                metadata: updates.metadata,
            }),
        })

        setLastSavedAt(new Date().toLocaleTimeString())
    }

    const scheduleSave = (cellId: string, updates: Partial<Cell>) => {
        const existingTimer = saveTimersRef.current[cellId]
        if (existingTimer) {
            window.clearTimeout(existingTimer)
        }

        saveTimersRef.current[cellId] = window.setTimeout(() => {
            void persistCell(cellId, updates)
        }, 400)
    }

    useEffect(() => {
        const loadNotebook = async () => {
            setIsLoading(true)

            try {
                const response = await fetch(`/api/notebook/cells?notebookId=${encodeURIComponent(NOTEBOOK_ID)}`, { cache: "no-store" })
                const data = await response.json()
                const nextCells = Array.isArray(data.cells)
                    ? data.cells.map((cell: any) => ({
                        id: cell.id,
                        type: cell.type === "markdown" ? "markdown" : "code",
                        source: cell.source || "",
                        language: cell.language || (cell.type === "markdown" ? "markdown" : "typescript"),
                        outputs: Array.isArray(cell.outputs) ? cell.outputs : [],
                        metadata: cell.metadata || {},
                    }))
                    : []

                if (nextCells.length > 0) {
                    setCells(nextCells)
                } else {
                    const seededCells: Cell[] = []

                    for (const seed of createWelcomeCells()) {
                        const createResponse = await fetch("/api/notebook/cells", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                notebookId: NOTEBOOK_ID,
                                type: seed.type,
                                source: seed.source,
                                language: seed.language,
                            }),
                        })
                        const createData = await createResponse.json()
                        if (createData.cell) {
                            seededCells.push({
                                id: createData.cell.id,
                                type: createData.cell.type === "markdown" ? "markdown" : "code",
                                source: createData.cell.source || "",
                                language: createData.cell.language || seed.language,
                                outputs: Array.isArray(createData.cell.outputs) ? createData.cell.outputs : [],
                                metadata: createData.cell.metadata || {},
                            })
                        }
                    }

                    setCells(seededCells)
                }
            } catch {
                setCells([])
            } finally {
                setIsLoading(false)
            }
        }

        void loadNotebook()
        void refreshKernel()

        const intervalId = window.setInterval(() => {
            void refreshKernel()
        }, 3000)

        return () => {
            window.clearInterval(intervalId)
            Object.values(saveTimersRef.current).forEach((timerId) => {
                if (timerId) {
                    window.clearTimeout(timerId)
                }
            })
        }
    }, [])

    const addCell = async (type: CellType) => {
        const response = await fetch("/api/notebook/cells", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                notebookId: NOTEBOOK_ID,
                type,
                source: "",
                language: type === "markdown" ? "markdown" : "typescript",
            }),
        })

        const data = await response.json()
        if (!data.cell) {
            return
        }

        setCells((prev) => [
            ...prev,
            {
                id: data.cell.id,
                type: data.cell.type === "markdown" ? "markdown" : "code",
                source: data.cell.source || "",
                language: data.cell.language || (type === "markdown" ? "markdown" : "typescript"),
                outputs: Array.isArray(data.cell.outputs) ? data.cell.outputs : [],
                metadata: data.cell.metadata || {},
            },
        ])
    }

    const deleteCell = async (cellId: string) => {
        setCells((prev) => prev.filter((cell) => cell.id !== cellId))
        await fetch("/api/notebook/cells", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notebookId: NOTEBOOK_ID, cellId }),
        })
    }

    const updateCellContent = (cellId: string, source: string) => {
        setCells((prev) => prev.map((cell) => (cell.id === cellId ? { ...cell, source } : cell)))
        scheduleSave(cellId, { source })
    }

    const saveNotebook = async () => {
        setIsSaving(true)

        try {
            await Promise.all(cells.map((cell) => persistCell(cell.id, cell)))
        } finally {
            setIsSaving(false)
        }
    }

    const restartKernel = async () => {
        await fetch("/api/notebook/kernel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restart", kernelId: KERNEL_ID }),
        })

        setCells((prev) => prev.map((cell) => ({ ...cell, isExecuting: false })))
        await refreshKernel()
    }

    const executeCell = async (cellId: string) => {
        const cell = cells.find((entry) => entry.id === cellId)
        if (!cell || cell.type !== "code") {
            return
        }

        setCells((prev) => prev.map((entry) => (entry.id === cellId ? { ...entry, isExecuting: true } : entry)))

        try {
            const response = await fetch("/api/notebook/kernel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "execute", kernelId: KERNEL_ID, code: cell.source }),
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Execution failed")
            }

            const outputs = data.output?.content
                ? [{ type: data.output.type, content: data.output.content }]
                : []
            const metadata = {
                executionCount: data.output?.executionCount,
                executionTime: data.output?.executionTime,
            }

            setCells((prev) => prev.map((entry) => (
                entry.id === cellId
                    ? { ...entry, isExecuting: false, outputs, metadata }
                    : entry
            )))

            await persistCell(cellId, { outputs, metadata })
            await refreshKernel()
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            const outputs = [{ type: "error" as const, content: message }]

            setCells((prev) => prev.map((entry) => (
                entry.id === cellId
                    ? { ...entry, isExecuting: false, outputs }
                    : entry
            )))

            await persistCell(cellId, { outputs })
        }
    }

    return (
        <div className="h-full flex flex-col bg-background text-foreground">
            <div className="h-11 border-b border-border px-4 flex items-center justify-between bg-muted/40 gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">AI Studio Notebook.ipynb</span>
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                        TypeScript Kernel
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${kernelStatus === "busy" ? "border-blue-500/30 text-blue-400" : kernelStatus === "error" ? "border-red-500/30 text-red-400" : "border-emerald-500/30 text-emerald-400"}`}>
                        {kernelStatus}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">exec #{executionCount}</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsInspectorOpen(!isInspectorOpen)} className="h-6 px-2 gap-1.5 text-xs text-muted-foreground hover:text-zinc-200 ml-1">
                        <Database className="w-3 h-3" />
                        <span className="text-[10px]">{variableCount} vars</span>
                        {isInspectorOpen ? <PanelRightClose className="w-3 h-3 ml-0.5" /> : <PanelRightOpen className="w-3 h-3 ml-0.5" />}
                    </Button>
                    {lastSavedAt && <span className="text-[10px] text-zinc-600">saved {lastSavedAt}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => addCell("code")} className="gap-1.5 text-xs border-border bg-transparent">
                        <Code2 className="w-3.5 h-3.5" />
                        Code
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addCell("markdown")} className="gap-1.5 text-xs border-border bg-transparent">
                        <FileText className="w-3.5 h-3.5" />
                        Markdown
                    </Button>
                    <Button size="sm" variant="ghost" onClick={restartKernel} className="gap-1.5 text-xs text-muted-foreground">
                        <RefreshCw className="w-3.5 h-3.5" />
                        Restart
                    </Button>
                    <Button size="sm" variant="ghost" onClick={saveNotebook} disabled={isSaving} className="gap-1.5 text-xs text-muted-foreground">
                        {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading ? (
                    <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading notebook…
                    </div>
                ) : cells.map((cell, index) => (
                    <div key={cell.id} className="border border-border rounded-xl overflow-hidden bg-muted/40 shadow-sm">
                        <div className="flex items-center gap-2 p-2.5 bg-muted/60 border-b border-border">
                            <span className="text-[11px] font-mono text-muted-foreground">
                                {cell.type === "code" ? `In [${cell.metadata.executionCount || index + 1}]` : `Md [${index + 1}]`}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                {cell.type === "code" ? "code" : "markdown"}
                            </Badge>
                            <div className="flex-1" />
                            {cell.type === "code" && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-muted-foreground hover:text-emerald-400"
                                    onClick={() => executeCell(cell.id)}
                                    disabled={cell.isExecuting}
                                >
                                    {cell.isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => void deleteCell(cell.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>

                        <div className={`${cell.type === "markdown" ? "h-40" : "h-56"} border-b border-border`}>
                            <MonacoEditor
                                height="100%"
                                language={cell.type === "markdown" ? "markdown" : cell.language}
                                theme="vs-dark"
                                value={cell.source}
                                onChange={(value) => updateCellContent(cell.id, value || "")}
                                options={{
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    folding: true,
                                    lineNumbers: cell.type === "markdown" ? "off" : "on",
                                    wordWrap: "on",
                                }}
                            />
                        </div>

                        {cell.outputs.length > 0 && (
                            <div className="bg-black/80 font-mono text-xs">
                                {cell.outputs.map((output, outputIndex) => (
                                    <div
                                        key={`${cell.id}-${outputIndex}`}
                                        className={`p-3 whitespace-pre-wrap ${output.type === "error" ? "text-red-300 border-t border-red-500/20" : "text-foreground"}`}
                                    >
                                        {output.content || "(no output)"}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {!isLoading && (
                    <div className="flex justify-center py-4 gap-2">
                        <Button variant="ghost" onClick={() => addCell("code")} className="gap-2 text-muted-foreground hover:text-zinc-200 text-xs">
                            <Plus className="w-4 h-4" />
                            Add Code Cell
                        </Button>
                        <Button variant="ghost" onClick={() => addCell("markdown")} className="gap-2 text-muted-foreground hover:text-zinc-200 text-xs">
                            <Plus className="w-4 h-4" />
                            Add Markdown Cell
                        </Button>
                    </div>
                )}
                </div>

                {isInspectorOpen && (
                    <div className="w-72 md:w-80 border-l border-border bg-muted/20 flex flex-col overflow-hidden shrink-0">
                        <div className="h-9 border-b border-border px-3 flex items-center justify-between bg-muted/40">
                            <span className="text-xs font-semibold text-zinc-300">Variable Inspector</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {variables.length > 0 ? (
                                variables.map((v) => (
                                    <div key={v.name} className="bg-muted/60 border border-border rounded-md p-2.5 overflow-hidden shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-mono text-[11px] font-semibold text-blue-400">{v.name}</span>
                                            <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-border font-normal text-muted-foreground bg-background/50">{v.type}</Badge>
                                        </div>
                                        <div className="font-mono text-[10px] text-zinc-300 break-all bg-black/40 p-1.5 rounded border border-border/50">
                                            {v.value.length > 150 ? `${v.value.substring(0, 150)}...` : v.value}
                                        </div>
                                        {v.size && <div className="text-[9px] text-zinc-600 mt-1.5 text-right font-mono">{v.size} bytes</div>}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground text-xs py-8 px-4">
                                    <Database className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No variables in memory.<br/>Execute some code cells.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
