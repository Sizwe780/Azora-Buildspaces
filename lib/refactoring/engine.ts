// Advanced Refactoring Engine for Code Chamber IDE
// Provides cross-file refactoring, rename with preview, extract/move/inline, automated code fixes

export type RefactoringType =
  | 'rename-symbol'
  | 'extract-function'
  | 'extract-variable'
  | 'extract-interface'
  | 'extract-component'
  | 'inline-variable'
  | 'inline-method'
  | 'move-symbol'
  | 'convert-async'
  | 'simplify-conditional'
  | 'remove-unused-imports'
  | 'organize-imports'
  | 'convert-to-arrow'
  | 'convert-to-named-export'

export interface RefactoringLocation {
  filePath: string
  line: number
  column: number
  endLine?: number
  endColumn?: number
  preview: string
}

export interface RefactoringEdit {
  filePath: string
  range: { startLine: number; startCol: number; endLine: number; endCol: number }
  newText: string
}

export interface RefactoringResult {
  type: RefactoringType
  description: string
  edits: RefactoringEdit[]
  affectedFiles: string[]
  preview: { before: string; after: string }
}

export interface RenameRequest {
  filePath: string
  line: number
  column: number
  newName: string
}

export interface ExtractRequest {
  filePath: string
  startLine: number
  endLine: number
  newName: string
}

// Cross-file rename symbol
export function renameSymbol(
  fileContents: Record<string, string>,
  request: RenameRequest
): RefactoringResult {
  const { filePath, line, column, newName } = request
  const content = fileContents[filePath]
  if (!content) throw new Error(`File not found: ${filePath}`)

  const lines = content.split('\n')
  const targetLine = lines[line - 1]
  if (!targetLine) throw new Error(`Line ${line} not found`)

  // Find the word at the column position
  const wordMatch = targetLine.substring(column - 1).match(/^(\w+)/)
  if (!wordMatch) throw new Error('No symbol at position')
  const oldName = wordMatch[1]

  const edits: RefactoringEdit[] = []
  const affectedFiles: string[] = []

  // Search across all files for usages
  for (const [fp, fc] of Object.entries(fileContents)) {
    const fileLines = fc.split('\n')
    let fileAffected = false

    fileLines.forEach((ln, idx) => {
      const regex = new RegExp(`\\b${escapeRegex(oldName)}\\b`, 'g')
      let match: RegExpExecArray | null
      while ((match = regex.exec(ln)) !== null) {
        edits.push({
          filePath: fp,
          range: {
            startLine: idx + 1,
            startCol: match.index + 1,
            endLine: idx + 1,
            endCol: match.index + oldName.length + 1,
          },
          newText: newName,
        })
        fileAffected = true
      }
    })

    if (fileAffected) affectedFiles.push(fp)
  }

  return {
    type: 'rename-symbol',
    description: `Rename '${oldName}' to '${newName}' across ${affectedFiles.length} files (${edits.length} occurrences)`,
    edits,
    affectedFiles,
    preview: {
      before: `${oldName}`,
      after: `${newName}`,
    },
  }
}

// Extract function refactoring
export function extractFunction(
  fileContents: Record<string, string>,
  request: ExtractRequest
): RefactoringResult {
  const { filePath, startLine, endLine, newName } = request
  const content = fileContents[filePath]
  if (!content) throw new Error(`File not found: ${filePath}`)

  const lines = content.split('\n')
  const extractedLines = lines.slice(startLine - 1, endLine)
  const extractedCode = extractedLines.join('\n')

  // Detect used variables (simple heuristic)
  const varPattern = /\b([a-zA-Z_]\w*)\b/g
  const usedVars = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = varPattern.exec(extractedCode)) !== null) {
    usedVars.add(m[1])
  }

  // Remove JS keywords
  const keywords = new Set([
    'const', 'let', 'var', 'if', 'else', 'return', 'function', 'async', 'await',
    'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch',
    'throw', 'new', 'this', 'class', 'import', 'export', 'default', 'from', 'of',
    'in', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof',
  ])
  const params = [...usedVars].filter(v => !keywords.has(v)).slice(0, 5)

  const indent = extractedLines[0]?.match(/^(\s*)/)?.[1] || ''
  const newFunction = `function ${newName}(${params.join(', ')}) {\n${extractedCode}\n}`
  const callSite = `${indent}${newName}(${params.join(', ')})`

  const edits: RefactoringEdit[] = [
    {
      filePath,
      range: { startLine, startCol: 1, endLine, endCol: lines[endLine - 1].length + 1 },
      newText: callSite,
    },
  ]

  return {
    type: 'extract-function',
    description: `Extract lines ${startLine}-${endLine} into function '${newName}'`,
    edits,
    affectedFiles: [filePath],
    preview: {
      before: extractedCode,
      after: `${newFunction}\n\n// Call site:\n${callSite}`,
    },
  }
}

// Extract interface from object
export function extractInterface(
  fileContents: Record<string, string>,
  filePath: string,
  objectStartLine: number,
  objectEndLine: number,
  interfaceName: string
): RefactoringResult {
  const content = fileContents[filePath]
  if (!content) throw new Error(`File not found: ${filePath}`)

  const lines = content.split('\n')
  const objectLines = lines.slice(objectStartLine - 1, objectEndLine)
  const objectCode = objectLines.join('\n')

  // Simple heuristic: parse key: value pairs
  const propPattern = /(\w+)\s*:\s*([^,}\n]+)/g
  const props: string[] = []
  let pm: RegExpExecArray | null
  while ((pm = propPattern.exec(objectCode)) !== null) {
    const key = pm[1]
    const value = pm[2].trim()
    const type = inferType(value)
    props.push(`  ${key}: ${type}`)
  }

  const interfaceCode = `interface ${interfaceName} {\n${props.join('\n')}\n}`

  return {
    type: 'extract-interface',
    description: `Extract interface '${interfaceName}' from object at lines ${objectStartLine}-${objectEndLine}`,
    edits: [],
    affectedFiles: [filePath],
    preview: {
      before: objectCode,
      after: interfaceCode,
    },
  }
}

// Organize imports
export function organizeImports(content: string): string {
  const lines = content.split('\n')
  const importLines: string[] = []
  const otherLines: string[] = []
  let pastImports = false

  for (const line of lines) {
    if (!pastImports && (line.startsWith('import ') || line.trim() === '')) {
      if (line.startsWith('import ')) importLines.push(line)
    } else {
      pastImports = true
      otherLines.push(line)
    }
  }

  // Sort imports: React first, then libraries, then relative
  const reactImports = importLines.filter(l => l.includes('from "react"') || l.includes("from 'react'"))
  const libImports = importLines.filter(l => !l.includes('./') && !l.includes('../') && !reactImports.includes(l))
  const relImports = importLines.filter(l => l.includes('./') || l.includes('../'))

  const sorted = [...reactImports, '', ...libImports.sort(), '', ...relImports.sort()].filter(
    (l, i, arr) => !(l === '' && arr[i - 1] === '')
  )

  return [...sorted, '', ...otherLines].join('\n')
}

// Remove unused imports
export function removeUnusedImports(content: string): { content: string; removed: string[] } {
  const lines = content.split('\n')
  const importLines: { index: number; line: string; names: string[] }[] = []
  const codeBody: string[] = []

  lines.forEach((line, idx) => {
    if (line.startsWith('import ')) {
      const names = extractImportNames(line)
      importLines.push({ index: idx, line, names })
    } else {
      codeBody.push(line)
    }
  })

  const codeText = codeBody.join('\n')
  const removed: string[] = []

  const keptImports = importLines.filter(imp => {
    const usedNames = imp.names.filter(name => {
      const regex = new RegExp(`\\b${escapeRegex(name)}\\b`)
      return regex.test(codeText)
    })
    if (usedNames.length === 0) {
      removed.push(imp.line)
      return false
    }
    return true
  })

  const result = [
    ...keptImports.map(i => i.line),
    '',
    ...codeBody,
  ].join('\n')

  return { content: result, removed }
}

// Helpers
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function inferType(value: string): string {
  if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) return 'string'
  if (value === 'true' || value === 'false') return 'boolean'
  if (!isNaN(Number(value))) return 'number'
  if (value.startsWith('[')) return 'any[]'
  if (value.startsWith('{')) return 'Record<string, any>'
  return 'any'
}

function extractImportNames(line: string): string[] {
  const names: string[] = []
  // import X from '...'
  const defaultMatch = line.match(/import\s+(\w+)\s+from/)
  if (defaultMatch) names.push(defaultMatch[1])
  // import { A, B, C } from '...'
  const namedMatch = line.match(/\{([^}]+)\}/)
  if (namedMatch) {
    namedMatch[1].split(',').forEach(n => {
      const trimmed = n.trim().split(/\s+as\s+/)
      const name = trimmed[trimmed.length - 1].trim()
      if (name) names.push(name)
    })
  }
  return names
}
