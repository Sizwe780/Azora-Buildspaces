"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Square, RefreshCw, TrendingUp, Cpu, HardDrive, Zap, Clock, AlertTriangle, CheckCircle2 } from "lucide-react"

interface ProfilerMetric {
    id: string
    name: string
    value: number
    unit: string
    category: 'cpu' | 'memory' | 'render' | 'network'
    status: 'good' | 'warning' | 'critical'
    timestamp: number
}

interface ProfilerSuggestion {
    id: string
    severity: 'low' | 'medium' | 'high'
    message: string
    file?: string
    line?: number
}

interface ProfilerSnapshot {
    id: string
    timestamp: number
    metrics: ProfilerMetric[]
    suggestions: ProfilerSuggestion[]
    duration: number
}

interface PerformanceProfilerProps {
    projectId: string
    activeFile?: string | null
    fileContent?: string
}

function getStatusColor(status: string) {
    switch (status) {
        case 'good': return 'text-emerald-400'
        case 'warning': return 'text-amber-400'
        case 'critical': return 'text-red-400'
        default: return 'text-zinc-400'
    }
}

function getCategoryIcon(category: string) {
    switch (category) {
        case 'cpu': return <Cpu className="w-3.5 h-3.5" />
        case 'memory': return <HardDrive className="w-3.5 h-3.5" />
        case 'render': return <Zap className="w-3.5 h-3.5" />
        case 'network': return <Clock className="w-3.5 h-3.5" />
        default: return <TrendingUp className="w-3.5 h-3.5" />
    }
}

function analyzePerformance(content: string, fileName: string): { metrics: ProfilerMetric[], suggestions: ProfilerSuggestion[] } {
    const metrics: ProfilerMetric[] = []
    const suggestions: ProfilerSuggestion[] = []
    const lines = content.split('\n')
    const now = Date.now()

    // Analyze re-renders (React)
    const useStateCount = (content.match(/useState/g) || []).length
    const useEffectCount = (content.match(/useEffect/g) || []).length
    const useMemoCount = (content.match(/useMemo/g) || []).length
    const useCallbackCount = (content.match(/useCallback/g) || []).length

    metrics.push({
        id: 'm-1',
        name: 'useState hooks',
        value: useStateCount,
        unit: 'hooks',
        category: 'render',
        status: useStateCount > 10 ? 'warning' : 'good',
        timestamp: now
    })

    metrics.push({
        id: 'm-2',
        name: 'useEffect hooks',
        value: useEffectCount,
        unit: 'hooks',
        category: 'render',
        status: useEffectCount > 8 ? 'warning' : 'good',
        timestamp: now
    })

    // Memory pattern detection
    const largeArrays = lines.filter(l => l.match(/new Array\(\d{4,}\)|\[\s*\.\.\.\s*Array/)).length
    metrics.push({
        id: 'm-3',
        name: 'Large array allocations',
        value: largeArrays,
        unit: 'instances',
        category: 'memory',
        status: largeArrays > 0 ? 'warning' : 'good',
        timestamp: now
    })

    // CPU-heavy patterns
    const nestedLoops = lines.filter(l => l.match(/for\s*\(.*\{|\.forEach|\.map\(/)).length
    const deepNesting = content.match(/\{[^{}]*\{[^{}]*\{[^{}]*\{/g)?.length || 0
    metrics.push({
        id: 'm-4',
        name: 'Loop iterations',
        value: nestedLoops,
        unit: 'loops',
        category: 'cpu',
        status: nestedLoops > 15 ? 'warning' : 'good',
        timestamp: now
    })

    // Optimization score
    const optimizationRatio = (useMemoCount + useCallbackCount) / Math.max(1, useStateCount + useEffectCount)
    metrics.push({
        id: 'm-5',
        name: 'Memoization ratio',
        value: Math.round(optimizationRatio * 100),
        unit: '%',
        category: 'render',
        status: optimizationRatio < 0.3 && useStateCount > 3 ? 'warning' : 'good',
        timestamp: now
    })

    // Generate suggestions
    if (useStateCount > 8) {
        suggestions.push({
            id: 's-1',
            severity: 'medium',
            message: `${useStateCount} useState calls may cause frequent re-renders. Consider consolidating state with useReducer.`
        })
    }

    if (useEffectCount > 5 && useMemoCount === 0) {
        suggestions.push({
            id: 's-2',
            severity: 'medium',
            message: 'Multiple useEffect hooks without useMemo. Add memoization to prevent unnecessary recalculations.'
        })
    }

    // Check for inline object/array creation in JSX
    lines.forEach((line, i) => {
        if (line.match(/=\{\s*\{|\=\{\s*\[/) && line.match(/className|style|onClick/)) {
            suggestions.push({
                id: `s-inline-${i}`,
                severity: 'low',
                message: 'Inline object/array in JSX creates new reference each render.',
                file: fileName,
                line: i + 1
            })
        }
    })

    // Check for missing keys in maps
    const mapWithoutKey = lines.filter(l => l.match(/\.map\(/) && !l.match(/key=/)).length
    if (mapWithoutKey > 0) {
        suggestions.push({
            id: 's-keys',
            severity: 'high',
            message: `${mapWithoutKey} .map() calls potentially missing key prop.`
        })
    }

    // Check for console logs
    const consoleLogs = lines.filter(l => l.match(/console\.(log|debug)/)).length
    if (consoleLogs > 3) {
        suggestions.push({
            id: 's-console',
            severity: 'low',
            message: `${consoleLogs} console.log statements — remove for production.`
        })
    }

    // Add bundle size estimate
    const importCount = (content.match(/^import /gm) || []).length
    metrics.push({
        id: 'm-6',
        name: 'Import statements',
        value: importCount,
        unit: 'imports',
        category: 'network',
        status: importCount > 20 ? 'warning' : 'good',
        timestamp: now
    })

    return { metrics, suggestions }
}

export function PerformanceProfiler({ projectId, activeFile, fileContent }: PerformanceProfilerProps) {
    const [isProfiling, setIsProfiling] = useState(false)
    const [snapshots, setSnapshots] = useState<ProfilerSnapshot[]>([])
    const [currentMetrics, setCurrentMetrics] = useState<ProfilerMetric[]>([])
    const [suggestions, setSuggestions] = useState<ProfilerSuggestion[]>([])
    const [overallScore, setOverallScore] = useState<number | null>(null)

    const runProfile = useCallback(async () => {
        if (!activeFile || !fileContent) return
        setIsProfiling(true)

        // Simulate profiling delay for UX
        await new Promise(r => setTimeout(r, 800))

        const { metrics, suggestions: newSuggestions } = analyzePerformance(fileContent, activeFile)
        
        // Calculate overall score
        const warningCount = metrics.filter(m => m.status === 'warning').length
        const criticalCount = metrics.filter(m => m.status === 'critical').length
        const highSeverity = newSuggestions.filter(s => s.severity === 'high').length
        const score = Math.max(0, 100 - (warningCount * 10) - (criticalCount * 25) - (highSeverity * 15))

        const snapshot: ProfilerSnapshot = {
            id: Date.now().toString(36),
            timestamp: Date.now(),
            metrics,
            suggestions: newSuggestions,
            duration: 800
        }

        setCurrentMetrics(metrics)
        setSuggestions(newSuggestions)
        setOverallScore(score)
        setSnapshots(prev => [snapshot, ...prev].slice(0, 10))
        setIsProfiling(false)
    }, [activeFile, fileContent])

    const clearResults = () => {
        setCurrentMetrics([])
        setSuggestions([])
        setOverallScore(null)
    }

    return (
        <div className="h-full flex flex-col bg-zinc-950">
            {/* Header */}
            <div className="h-12 border-b border-zinc-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-zinc-200">Performance Profiler</span>
                    {overallScore !== null && (
                        <Badge className={`text-xs ${overallScore >= 80 ? 'bg-emerald-500/20 text-emerald-400' : overallScore >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                            Score: {overallScore}
                        </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={runProfile} 
                        disabled={isProfiling || !activeFile}
                        className="h-7 text-xs border-zinc-700 text-zinc-300"
                    >
                        {isProfiling ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                                Profiling...
                            </>
                        ) : (
                            <>
                                <Play className="w-3.5 h-3.5 mr-1" />
                                Profile
                            </>
                        )}
                    </Button>
                    {currentMetrics.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={clearResults} className="h-7 text-xs text-zinc-500">
                            <Square className="w-3.5 h-3.5 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {!activeFile ? (
                        <div className="text-center text-zinc-600 py-12">
                            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Open a file to profile its performance</p>
                        </div>
                    ) : currentMetrics.length === 0 ? (
                        <div className="text-center text-zinc-600 py-12">
                            <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Click "Profile" to analyze performance</p>
                            <p className="text-xs text-zinc-700 mt-1">Analyzes React patterns, memory usage, and optimization opportunities</p>
                        </div>
                    ) : (
                        <>
                            {/* Metrics Grid */}
                            <div>
                                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Metrics</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {currentMetrics.map(metric => (
                                        <div key={metric.id} className="bg-zinc-900/60 rounded-lg p-3 border border-zinc-800">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2 text-zinc-400">
                                                    {getCategoryIcon(metric.category)}
                                                    <span className="text-xs">{metric.name}</span>
                                                </div>
                                                {metric.status === 'good' ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                ) : (
                                                    <AlertTriangle className={`w-3.5 h-3.5 ${getStatusColor(metric.status)}`} />
                                                )}
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-lg font-semibold ${getStatusColor(metric.status)}`}>
                                                    {metric.value}
                                                </span>
                                                <span className="text-xs text-zinc-600">{metric.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Suggestions */}
                            {suggestions.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                                        Optimization Suggestions ({suggestions.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {suggestions.map(sug => (
                                            <div 
                                                key={sug.id} 
                                                className={`rounded-lg p-3 border text-sm ${
                                                    sug.severity === 'high' ? 'bg-red-500/5 border-red-500/20 text-red-300' :
                                                    sug.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' :
                                                    'bg-blue-500/5 border-blue-500/20 text-blue-300'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs">{sug.message}</p>
                                                        {sug.line && (
                                                            <p className="text-[10px] text-zinc-500 mt-1">Line {sug.line}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* History */}
                            {snapshots.length > 1 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">History</h3>
                                    <div className="space-y-1">
                                        {snapshots.slice(1).map(snap => (
                                            <div key={snap.id} className="flex items-center justify-between text-xs text-zinc-500 py-1.5 px-2 hover:bg-zinc-900/40 rounded">
                                                <span>{new Date(snap.timestamp).toLocaleTimeString()}</span>
                                                <span>{snap.metrics.filter(m => m.status === 'warning').length} warnings</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
