"use client"

import React, { useMemo } from 'react'
import { ChevronRight, ChevronDown, Code, Variable, Box, Layers, Zap, Settings, Tag, Hash } from 'lucide-react'
import { useWorkspace } from '@/lib/workspace/workspace-context'

interface SymbolInfo {
  name: string
  kind: 'function' | 'variable' | 'class' | 'interface' | 'method' | 'property' | 'type' | 'enum' | 'constant'
  range: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  }
  children?: SymbolInfo[]
}

interface OutlineItemProps {
  symbol: SymbolInfo
  level: number
  expanded: boolean
  onToggle: () => void
  onClick: () => void
}

function OutlineItem({ symbol, level, expanded, onToggle, onClick }: OutlineItemProps) {
  const getIcon = (kind: string) => {
    switch (kind) {
      case 'function': return <Code className="w-4 h-4" />
      case 'method': return <Zap className="w-4 h-4" />
      case 'class': return <Box className="w-4 h-4" />
      case 'interface': return <Layers className="w-4 h-4" />
      case 'variable': return <Variable className="w-4 h-4" />
      case 'property': return <Settings className="w-4 h-4" />
      case 'type': return <Tag className="w-4 h-4" />
      case 'enum': return <Hash className="w-4 h-4" />
      case 'constant': return <Hash className="w-4 h-4" />
      default: return <Variable className="w-4 h-4" />
    }
  }

  const hasChildren = symbol.children && symbol.children.length > 0

  return (
    <div className="select-none">
      <div
        className="flex items-center py-1 px-2 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={onClick}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="mr-1 p-0.5 hover:bg-muted rounded"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        <div className="mr-2 text-muted-foreground">
          {getIcon(symbol.kind)}
        </div>
        <span className="truncate">{symbol.name}</span>
      </div>
    </div>
  )
}

export function OutlineView() {
  const { activeFilePath, activeFileContent } = useWorkspace()

  const symbols = useMemo(() => {
    if (!activeFileContent || !activeFilePath) return []

    // Simple symbol extraction - in a real implementation, this would use
    // the language server or Monaco's built-in symbol provider
    const lines = activeFileContent.split('\n')
    const symbols: SymbolInfo[] = []

    lines.forEach((line, index) => {
      const trimmed = line.trim()

      // Function definitions
      const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/)
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          range: {
            startLineNumber: index + 1,
            startColumn: line.indexOf(funcMatch[1]) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(funcMatch[1]) + funcMatch[1].length
          }
        })
      }

      // Class definitions
      const classMatch = trimmed.match(/^(?:export\s+)?class\s+(\w+)/)
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          range: {
            startLineNumber: index + 1,
            startColumn: line.indexOf(classMatch[1]) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(classMatch[1]) + classMatch[1].length
          }
        })
      }

      // Interface definitions
      const interfaceMatch = trimmed.match(/^(?:export\s+)?interface\s+(\w+)/)
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          kind: 'interface',
          range: {
            startLineNumber: index + 1,
            startColumn: line.indexOf(interfaceMatch[1]) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(interfaceMatch[1]) + interfaceMatch[1].length
          }
        })
      }

      // Type definitions
      const typeMatch = trimmed.match(/^(?:export\s+)?type\s+(\w+)/)
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          kind: 'type',
          range: {
            startLineNumber: index + 1,
            startColumn: line.indexOf(typeMatch[1]) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(typeMatch[1]) + typeMatch[1].length
          }
        })
      }

      // Enum definitions
      const enumMatch = trimmed.match(/^(?:export\s+)?enum\s+(\w+)/)
      if (enumMatch) {
        symbols.push({
          name: enumMatch[1],
          kind: 'enum',
          range: {
            startLineNumber: index + 1,
            startColumn: line.indexOf(enumMatch[1]) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(enumMatch[1]) + enumMatch[1].length
          }
        })
      }

      // Arrow function declarations (const foo = () => ...)
      const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s+)?\(/)
      if (arrowMatch) {
        symbols.push({
          name: arrowMatch[1],
          kind: 'function',
          range: {
            startLineNumber: index + 1,
            startColumn: line.indexOf(arrowMatch[1]) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(arrowMatch[1]) + arrowMatch[1].length
          }
        })
        return // avoid double-matching as variable
      }

      // Const/let declarations at module level (non-function assignments)
      const varMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)/)
      if (varMatch) {
        symbols.push({
          name: varMatch[1],
          kind: trimmed.includes('const') ? 'constant' : 'variable',
          range: {
            startLineNumber: index + 1,
            startColumn: line.indexOf(varMatch[1]) + 1,
            endLineNumber: index + 1,
            endColumn: line.indexOf(varMatch[1]) + varMatch[1].length
          }
        })
      }
    })

    return symbols
  }, [activeFileContent, activeFilePath])

  if (!activeFilePath) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No file open</p>
      </div>
    )
  }

  if (symbols.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>No symbols found</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-2 border-b">
        <h3 className="text-sm font-medium">Outline</h3>
      </div>
      <div className="py-2">
        {symbols.map((symbol, index) => (
          <OutlineItem
            key={`${symbol.name}-${index}`}
            symbol={symbol}
            level={0}
            expanded={false}
            onToggle={() => {}} // For now, no expansion
            onClick={() => {
              // Dispatch gotoLine event to scroll editor to the symbol's line
              window.dispatchEvent(new CustomEvent('azora:gotoLine', {
                detail: { line: symbol.range.startLineNumber, column: symbol.range.startColumn }
              }))
            }}
          />
        ))}
      </div>
    </div>
  )
}