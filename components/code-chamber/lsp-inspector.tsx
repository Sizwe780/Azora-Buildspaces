"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AlertCircle, CheckCircle2, ChevronRight, Info, AlertTriangle, Zap, Activity } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Diagnostic {
    line: number
    column?: number
    severity: 'error' | 'warning' | 'info' | 'hint'
    message: string
    rule: string
    fix?: string
}

interface AnalysisSummary {
    errors: number
    warnings: number
    info: number
    score: number
}

interface LspInspectorProps {
    activeFile: string | null
    content: string | null
    onApplyFix?: (line: number, fix: string) => void
}

export function LspInspector({ activeFile, content, onApplyFix }: LspInspectorProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([])
    const [summary, setSummary] = useState<AnalysisSummary | null>(null)
    const [error, setError] = useState<string | null>(null)

    const runAnalysis = useCallback(async () => {
        if (!activeFile || !content) return

        setIsAnalyzing(true)
        setError(null)

        try {
            const res = await fetch('/api/code-chamber/lint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: content,
                    language: activeFile.split('.').pop(),
                    filename: activeFile
                })
            })

            if (!res.ok) throw new Error('Analysis failed')

            const data = await res.json()
            setDiagnostics(data.diagnostics || [])
            setSummary(data.summary || null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsAnalyzing(false)
        }
    }, [activeFile, content])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeFile && content) {
                runAnalysis()
            }
        }, 1500) // Debounce analysis

        return () => clearTimeout(timer)
    }, [activeFile, content, runAnalysis])

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />
            case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
            case 'info': return <Info className="h-4 w-4 text-blue-500" />
            default: return <Zap className="h-4 w-4 text-muted-foreground" />
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-500'
        if (score >= 70) return 'text-yellow-500'
        return 'text-destructive'
    }

    if (!activeFile) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Activity className="h-12 w-12 mb-4 opacity-20" />
                <p>Select a file to begin LSP analysis.</p>
            </div>
        )
    }

    return (
        <Card className="h-full border-none shadow-none bg-transparent">
            <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        LSP Inspector
                        {isAnalyzing && <Badge variant="secondary" className="animate-pulse">Analyzing...</Badge>}
                    </span>
                    {summary && (
                        <div className="flex items-center gap-3">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <div className={`text-lg font-bold ${getScoreColor(summary.score)}`}>
                                            {summary.score}
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Health Score</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-4">
                {summary && (
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/50">
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground">Errors</div>
                            <div className="font-mono font-bold text-destructive">{summary.errors}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground">Warnings</div>
                            <div className="font-mono font-bold text-yellow-500">{summary.warnings}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-muted-foreground">Info</div>
                            <div className="font-mono font-bold text-blue-500">{summary.info}</div>
                        </div>
                    </div>
                )}

                <ScrollArea className="h-[calc(100vh-320px)]">
                    {error && (
                        <div className="p-4 bg-destructive/10 text-destructive text-xs rounded-md flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    {!isAnalyzing && diagnostics.length === 0 && !error && (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground italic text-sm">
                            <CheckCircle2 className="h-8 w-8 mb-2 text-green-500/50" />
                            No issues detected in {activeFile.split('/').pop()}.
                        </div>
                    )}

                    <div className="space-y-2 pr-4">
                        {diagnostics.map((d, i) => (
                            <div 
                                key={i} 
                                className="group p-2 rounded-md border border-border/40 hover:border-border transition-colors bg-card/50"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5">{getSeverityIcon(d.severity)}</div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-muted-foreground">
                                                Line {d.line}{d.column ? `:${d.column}` : ''}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                                {d.rule}
                                            </Badge>
                                        </div>
                                        <p className="text-xs leading-relaxed">{d.message}</p>
                                        {d.fix && onApplyFix && (
                                            <button 
                                                onClick={() => onApplyFix(d.line, d.fix!)}
                                                className="text-[10px] text-blue-500 hover:text-blue-400 font-medium flex items-center gap-1 pt-1 underline-offset-4 hover:underline"
                                            >
                                                <Zap className="h-3 w-3" />
                                                Quick Fix
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}