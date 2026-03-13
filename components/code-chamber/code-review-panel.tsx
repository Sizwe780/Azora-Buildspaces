"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    GitBranch, GitCommit, GitPullRequest, Loader2, CheckCircle2,
    AlertTriangle, Info, XCircle, RefreshCw, FileCode, Shield
} from "lucide-react"

interface CodeReviewPanelProps {
    projectId: string
    activeFile: string | null
    fileContent?: string
}

interface ReviewItem {
    id: string
    severity: 'error' | 'warning' | 'info' | 'suggestion'
    line?: number
    message: string
    category: string
}

interface ReviewSummary {
    score: number
    items: ReviewItem[]
    timestamp: string
}

const SEVERITY_CONFIG = {
    error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    suggestion: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
}

function analyzeCode(content: string, fileName: string): ReviewSummary {
    const items: ReviewItem[] = []
    const lines = content.split('\n')

    // Security checks
    lines.forEach((line, i) => {
        if (line.match(/eval\s*\(/)) items.push({ id: `sec-${i}`, severity: 'error', line: i + 1, message: 'Avoid using eval() — potential code injection vulnerability.', category: 'Security' })
        if (line.match(/innerHTML\s*=/)) items.push({ id: `sec2-${i}`, severity: 'warning', line: i + 1, message: 'Direct innerHTML assignment — risk of XSS. Use textContent or sanitize.', category: 'Security' })
        if (line.match(/password|secret|api[_-]?key/i) && line.match(/[=:]\s*["'][^"']+["']/)) items.push({ id: `sec3-${i}`, severity: 'error', line: i + 1, message: 'Possible hardcoded credential detected. Use environment variables.', category: 'Security' })
    })

    // Code quality
    lines.forEach((line, i) => {
        if (line.match(/console\.(log|debug|info)\(/)) items.push({ id: `q-${i}`, severity: 'warning', line: i + 1, message: 'Console statement found — remove before production.', category: 'Quality' })
        if (line.match(/\/\/\s*TODO/i)) items.push({ id: `todo-${i}`, severity: 'info', line: i + 1, message: `TODO comment: ${line.trim().substring(0, 80)}`, category: 'Maintenance' })
        if (line.match(/\/\/\s*(HACK|FIXME|XXX)/i)) items.push({ id: `fix-${i}`, severity: 'warning', line: i + 1, message: `Code marker: ${line.trim().substring(0, 80)}`, category: 'Maintenance' })
        if (line.length > 120) items.push({ id: `len-${i}`, severity: 'info', line: i + 1, message: `Line exceeds 120 characters (${line.length}).`, category: 'Style' })
    })

    // TypeScript-specific
    if (fileName.match(/\.(ts|tsx)$/)) {
        lines.forEach((line, i) => {
            if (line.match(/:\s*any\b/)) items.push({ id: `ts-${i}`, severity: 'warning', line: i + 1, message: 'Explicit `any` type — consider using a specific type.', category: 'TypeScript' })
            if (line.match(/@ts-ignore/)) items.push({ id: `tsi-${i}`, severity: 'warning', line: i + 1, message: '@ts-ignore suppresses type checking. Fix the underlying type issue.', category: 'TypeScript' })
            if (line.match(/as\s+any/)) items.push({ id: `tsa-${i}`, severity: 'warning', line: i + 1, message: 'Type assertion to `any` bypasses type safety.', category: 'TypeScript' })
        })
    }

    // Complexity
    const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*(\(|async\s*\()/g) || []
    if (functions.length > 15) items.push({ id: 'cx-fn', severity: 'info', message: `${functions.length} functions in one file — consider splitting into modules.`, category: 'Complexity' })
    if (lines.length > 300) items.push({ id: 'cx-lines', severity: 'info', message: `File has ${lines.length} lines — consider extracting components.`, category: 'Complexity' })

    // Suggestions
    if (!content.includes('try') && content.includes('fetch(')) items.push({ id: 'sug-try', severity: 'suggestion', message: 'Fetch calls without try/catch — add error handling.', category: 'Best Practice' })
    if (content.includes('useEffect') && !content.includes('return')) items.push({ id: 'sug-cleanup', severity: 'suggestion', message: 'useEffect without cleanup — check if unmount cleanup is needed.', category: 'React' })

    const errorCount = items.filter(i => i.severity === 'error').length
    const warnCount = items.filter(i => i.severity === 'warning').length
    const score = Math.max(0, 100 - (errorCount * 15) - (warnCount * 5) - (items.length * 1))

    return { score, items, timestamp: new Date().toLocaleTimeString() }
}

export function CodeReviewPanel({ projectId, activeFile, fileContent }: CodeReviewPanelProps) {
    const [review, setReview] = useState<ReviewSummary | null>(null)
    const [isReviewing, setIsReviewing] = useState(false)
    const [filter, setFilter] = useState<string | null>(null)

    const runReview = useCallback(async () => {
        if (!activeFile) return
        setIsReviewing(true)
        setReview(null)

        try {
            // Try AI-powered review
            const res = await fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Review this code for bugs, security issues, performance, and best practices. For each issue return JSON array of {severity, line, message, category}.\n\nFile: ${activeFile}\n\n${fileContent || ''}`,
                    language: activeFile.split('.').pop() || 'typescript',
                }),
            })
            if (res.ok) {
                const data = await res.json()
                try {
                    const parsed = JSON.parse(data.code || data.result || '[]')
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const items = parsed.map((p: any, i: number) => ({ ...p, id: `ai-${i}` }))
                        setReview({ score: Math.max(0, 100 - items.length * 5), items, timestamp: new Date().toLocaleTimeString() })
                        setIsReviewing(false)
                        return
                    }
                } catch { /* parse failed, fallback */ }
            }
        } catch { /* fallback */ }

        // Fallback: local analysis
        if (fileContent) {
            const result = analyzeCode(fileContent, activeFile)
            setReview(result)
        } else {
            // Try to fetch file content
            try {
                const fsRes = await fetch(`/api/fs/read?path=${encodeURIComponent(activeFile)}`)
                if (fsRes.ok) {
                    const data = await fsRes.json()
                    const content = data.content || ''
                    setReview(analyzeCode(content, activeFile))
                } else {
                    setReview({ score: 0, items: [{ id: 'err', severity: 'info', message: 'Unable to read file content for review.', category: 'System' }], timestamp: new Date().toLocaleTimeString() })
                }
            } catch {
                setReview({ score: 0, items: [{ id: 'err', severity: 'info', message: 'Unable to read file content.', category: 'System' }], timestamp: new Date().toLocaleTimeString() })
            }
        }
        setIsReviewing(false)
    }, [activeFile, fileContent])

    const filteredItems = review ? (filter ? review.items.filter(i => i.severity === filter) : review.items) : []
    const categories = review ? [...new Set(review.items.map(i => i.category))] : []

    const scoreColor = review ? (review.score >= 80 ? 'text-emerald-400' : review.score >= 60 ? 'text-amber-400' : 'text-red-400') : ''

    return (
        <div className="h-full flex flex-col">
            <div className="h-12 border-b flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4" />
                    <span className="text-sm font-medium">Code Review</span>
                </div>
                {activeFile && (
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={runReview} disabled={isReviewing}>
                        {isReviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {isReviewing ? 'Reviewing...' : 'Run Review'}
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1">
                {!activeFile && (
                    <div className="text-center text-muted-foreground py-8">
                        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Open a file to review</p>
                        <p className="text-xs mt-1">Automated security, quality, and best practice analysis</p>
                    </div>
                )}

                {activeFile && !review && !isReviewing && (
                    <div className="text-center text-muted-foreground py-8">
                        <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Click "Run Review" to analyze</p>
                        <p className="text-xs mt-1 max-w-[200px] mx-auto truncate">{activeFile}</p>
                    </div>
                )}

                {isReviewing && (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" />
                        <p className="text-sm text-muted-foreground">Analyzing code...</p>
                    </div>
                )}

                {review && (
                    <div className="p-4 space-y-4">
                        {/* Score card */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/10 border">
                            <div>
                                <p className="text-xs text-muted-foreground">Quality Score</p>
                                <p className={`text-3xl font-bold ${scoreColor}`}>{review.score}</p>
                            </div>
                            <div className="text-right text-xs text-muted-foreground space-y-0.5">
                                <p>{review.items.filter(i => i.severity === 'error').length} errors</p>
                                <p>{review.items.filter(i => i.severity === 'warning').length} warnings</p>
                                <p>{review.items.filter(i => i.severity === 'suggestion').length} suggestions</p>
                                <p className="text-[10px]">{review.timestamp}</p>
                            </div>
                        </div>

                        {/* Severity filters */}
                        <div className="flex gap-1.5">
                            <button onClick={() => setFilter(null)} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${!filter ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'border-muted text-muted-foreground hover:text-foreground'}`}>
                                All ({review.items.length})
                            </button>
                            {(['error', 'warning', 'suggestion', 'info'] as const).map(sev => {
                                const count = review.items.filter(i => i.severity === sev).length
                                if (count === 0) return null
                                const cfg = SEVERITY_CONFIG[sev]
                                return (
                                    <button key={sev} onClick={() => setFilter(filter === sev ? null : sev)}
                                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${filter === sev ? `${cfg.bg} ${cfg.color}` : 'border-muted text-muted-foreground hover:text-foreground'}`}>
                                        {sev} ({count})
                                    </button>
                                )
                            })}
                        </div>

                        {/* Review items */}
                        <div className="space-y-2">
                            {filteredItems.map(item => {
                                const cfg = SEVERITY_CONFIG[item.severity]
                                const Icon = cfg.icon
                                return (
                                    <div key={item.id} className={`p-2.5 rounded-lg border ${cfg.bg} text-xs`}>
                                        <div className="flex items-start gap-2">
                                            <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    {item.line && <span className="text-[10px] font-mono text-muted-foreground">L{item.line}</span>}
                                                    <Badge variant="outline" className="text-[9px] h-4">{item.category}</Badge>
                                                </div>
                                                <p className="text-muted-foreground leading-relaxed">{item.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {filteredItems.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground text-xs">
                                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                                No issues found in this category.
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}
