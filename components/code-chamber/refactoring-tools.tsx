"use client"

import { useState, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Wrench, RefreshCw, Shuffle, ArrowDownToLine, Loader2, CheckCircle2, AlertCircle, Copy, Type, Braces } from "lucide-react"

interface RefactoringToolsProps {
    activeFile: string | null
    fileMap: any
    onApplyRefactor?: (newContent: string) => void
}

type RefactorAction = 'extract-function' | 'rename-symbol' | 'inline-variable' | 'extract-variable' | 'convert-arrow'

interface RefactorResult {
    action: RefactorAction
    success: boolean
    description: string
    newContent?: string
}

export function RefactoringTools({ activeFile, fileMap, onApplyRefactor }: RefactoringToolsProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<RefactorResult | null>(null)
    const [newName, setNewName] = useState('')
    const [showRenameInput, setShowRenameInput] = useState(false)

    const getFileContent = useCallback(() => {
        if (!activeFile || !fileMap) return null
        const file = fileMap[activeFile]
        return typeof file === 'string' ? file : file?.content || null
    }, [activeFile, fileMap])

    const runRefactor = useCallback(async (action: RefactorAction) => {
        const content = getFileContent()
        if (!content) {
            setResult({ action, success: false, description: 'No active file content available.' })
            return
        }

        setIsProcessing(true)
        setResult(null)

        try {
            // Try AI-powered refactoring
            const res = await fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Perform the following refactoring on this code: ${action}${action === 'rename-symbol' && newName ? ` (rename to "${newName}")` : ''}.\n\nReturn ONLY the refactored code, no explanations.\n\nCode:\n${content}`,
                    language: activeFile?.split('.').pop() || 'typescript',
                }),
            })
            if (res.ok) {
                const data = await res.json()
                const refactored = data.code || data.result
                if (refactored) {
                    setResult({ action, success: true, description: `${action} applied via AI refactoring.`, newContent: refactored })
                    setIsProcessing(false)
                    return
                }
            }
        } catch { /* fallback */ }

        // Fallback: local heuristic refactoring
        let newContent = content
        let desc = ''
        try {
            switch (action) {
                case 'extract-function': {
                    // Find the longest block (between braces) that isn't already a function
                    const lines = content.split('\n')
                    const blockStart = lines.findIndex((l: string) => l.includes('{') && !l.match(/function|const|class|interface|export/))
                    if (blockStart >= 0) {
                        const extractedLines = lines.slice(blockStart, Math.min(blockStart + 5, lines.length))
                        const fnBody = extractedLines.join('\n')
                        const fnName = `extractedFunction_${Date.now().toString(36)}`
                        newContent = `function ${fnName}() {\n${fnBody}\n}\n\n${lines.slice(0, blockStart).join('\n')}\n${fnName}();\n${lines.slice(blockStart + 5).join('\n')}`
                        desc = `Extracted ${extractedLines.length} lines into \`${fnName}()\`.`
                    } else {
                        desc = 'No suitable block found to extract. Select a code region first.'
                    }
                    break
                }
                case 'rename-symbol': {
                    if (!newName) {
                        setShowRenameInput(true)
                        setIsProcessing(false)
                        return
                    }
                    // Find the first function/const name and rename it
                    const match = content.match(/(function|const|let|var)\s+(\w+)/)
                    if (match) {
                        const oldName = match[2]
                        newContent = content.replace(new RegExp(`\\b${oldName}\\b`, 'g'), newName)
                        desc = `Renamed \`${oldName}\` → \`${newName}\` (${(content.match(new RegExp(`\\b${oldName}\\b`, 'g')) || []).length} occurrences).`
                    } else {
                        desc = 'No symbol found to rename.'
                    }
                    setShowRenameInput(false)
                    break
                }
                case 'inline-variable': {
                    // Find a simple const assignment and inline it
                    const constMatch = content.match(/const\s+(\w+)\s*=\s*([^;\n]+);/)
                    if (constMatch) {
                        const [fullMatch, varName, value] = constMatch
                        const usages = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length - 1
                        if (usages > 0) {
                            newContent = content.replace(fullMatch, '').replace(new RegExp(`\\b${varName}\\b`, 'g'), value.trim())
                            desc = `Inlined \`${varName}\` = \`${value.trim()}\` at ${usages} usage(s).`
                        } else {
                            desc = `\`${varName}\` has no usages to inline.`
                        }
                    } else {
                        desc = 'No simple variable assignment found to inline.'
                    }
                    break
                }
                case 'extract-variable': {
                    // Find a duplicated expression and extract to variable
                    const expressions = content.match(/\b\w+\.\w+\(\)/g) || []
                    const counts: Record<string, number> = {}
                    expressions.forEach((e: string) => { counts[e] = (counts[e] || 0) + 1 })
                    const duplicate = Object.entries(counts).find(([, c]) => c > 1)
                    if (duplicate) {
                        const [expr, count] = duplicate
                        const varName = `extracted_${expr.replace(/[^a-zA-Z]/g, '_')}`
                        newContent = `const ${varName} = ${expr};\n` + content.replace(new RegExp(expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), varName)
                        desc = `Extracted \`${expr}\` (${count}x) into \`${varName}\`.`
                    } else {
                        desc = 'No duplicate expressions found to extract.'
                    }
                    break
                }
                case 'convert-arrow': {
                    // Convert function declarations to arrow functions
                    const funcRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*\{/g
                    let convertCount = 0
                    newContent = content.replace(funcRegex, (_match: string, name: string, params: string) => {
                        convertCount++
                        return `const ${name} = (${params}) => {`
                    })
                    desc = convertCount > 0 ? `Converted ${convertCount} function(s) to arrow functions.` : 'No function declarations found to convert.'
                    break
                }
            }
        } catch (e) {
            desc = `Refactoring failed: ${e instanceof Error ? e.message : 'Unknown error'}`
        }

        setResult({
            action,
            success: newContent !== content,
            description: desc,
            newContent: newContent !== content ? newContent : undefined,
        })
        setIsProcessing(false)
    }, [activeFile, fileMap, getFileContent, newName])

    const applyResult = () => {
        if (result?.newContent && onApplyRefactor) {
            onApplyRefactor(result.newContent)
            setResult(prev => prev ? { ...prev, description: prev.description + ' (Applied!)' } : prev)
        }
    }

    return (
        <div className="h-full flex flex-col">
            <div className="h-12 border-b flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    <span className="text-sm font-medium">Refactoring</span>
                </div>
                {activeFile && (
                    <Badge variant="outline" className="text-[10px] max-w-[180px] truncate">
                        {activeFile}
                    </Badge>
                )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => runRefactor('extract-function')} disabled={isProcessing || !activeFile}>
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Extract Function
                    </Button>

                    <div className="space-y-1">
                        <Button variant="outline" className="w-full justify-start" onClick={() => { if (!showRenameInput) { setShowRenameInput(true) } else { runRefactor('rename-symbol') } }} disabled={isProcessing || !activeFile}>
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shuffle className="w-4 h-4 mr-2" />}
                            Rename Symbol
                        </Button>
                        {showRenameInput && (
                            <div className="flex gap-2 pl-6">
                                <Input
                                    placeholder="New name..."
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="h-8 text-xs"
                                    onKeyDown={(e) => { if (e.key === 'Enter' && newName) runRefactor('rename-symbol') }}
                                />
                            </div>
                        )}
                    </div>

                    <Button variant="outline" className="w-full justify-start" onClick={() => runRefactor('inline-variable')} disabled={isProcessing || !activeFile}>
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 mr-2" />}
                        Inline Variable
                    </Button>

                    <Button variant="outline" className="w-full justify-start" onClick={() => runRefactor('extract-variable')} disabled={isProcessing || !activeFile}>
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Braces className="w-4 h-4 mr-2" />}
                        Extract Variable
                    </Button>

                    <Button variant="outline" className="w-full justify-start" onClick={() => runRefactor('convert-arrow')} disabled={isProcessing || !activeFile}>
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Type className="w-4 h-4 mr-2" />}
                        Convert to Arrow Functions
                    </Button>
                </div>

                {/* Result Display */}
                {result && (
                    <div className={`mt-4 p-3 rounded-lg border text-xs ${result.success ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                        <div className="flex items-start gap-2">
                            {result.success ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />}
                            <div className="flex-1">
                                <p className="text-muted-foreground">{result.description}</p>
                                {result.newContent && onApplyRefactor && (
                                    <Button size="sm" className="mt-2 h-7 text-xs" onClick={applyResult}>
                                        Apply Refactoring
                                    </Button>
                                )}
                                {result.newContent && (
                                    <Button variant="ghost" size="sm" className="mt-2 ml-2 h-7 text-xs" onClick={() => navigator.clipboard.writeText(result.newContent || '')}>
                                        <Copy className="w-3 h-3 mr-1" /> Copy
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!activeFile && (
                    <div className="mt-8 text-center text-muted-foreground">
                        <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Open a file to enable refactoring</p>
                        <p className="text-xs mt-1">Select a file in the explorer to get started</p>
                    </div>
                )}
            </div>
        </div>
    )
}
