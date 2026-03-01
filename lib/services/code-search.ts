/**
 * Code Search & Indexing Service
 * 
 * Full-text and semantic code search with symbol indexing.
 * Inspired by: Sourcegraph (code intelligence)
 *              ripgrep (fast regex search)
 *              tree-sitter (syntax-aware search)
 * 
 * Uses: minisearch (already in deps) for full-text indexing
 * 
 * Supports:
 * - Full-text search across all workspace files
 * - Regex search with lookahead/behind
 * - Symbol search (functions, classes, variables, types)
 * - File search (fuzzy path matching)
 * - Search-and-replace with preview
 * - Search scopes (workspace, folder, file, git-tracked)
 * - Search history and saved searches
 */

import MiniSearch from 'minisearch'

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type SearchScope = 'workspace' | 'openFiles' | 'folder' | 'gitTracked'

export interface SearchOptions {
  query: string
  scope?: SearchScope
  scopePath?: string
  isRegex?: boolean
  isCaseSensitive?: boolean
  isWholeWord?: boolean
  includePattern?: string        // glob pattern for file includes
  excludePattern?: string        // glob pattern for file excludes
  maxResults?: number
  contextLines?: number          // lines of context around match
}

export interface SearchResult {
  file: string
  matches: SearchMatch[]
  language?: string
}

export interface SearchMatch {
  line: number
  column: number
  length: number
  lineContent: string
  contextBefore: string[]
  contextAfter: string[]
  matchText: string
}

export interface ReplaceOptions extends SearchOptions {
  replacement: string
  preserveCase?: boolean
}

export interface ReplacePreview {
  file: string
  changes: ReplaceChange[]
}

export interface ReplaceChange {
  line: number
  originalContent: string
  newContent: string
}

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'constant'
  | 'method'
  | 'property'
  | 'import'
  | 'export'
  | 'namespace'
  | 'module'

export interface CodeSymbol {
  name: string
  kind: SymbolKind
  file: string
  line: number
  column: number
  endLine?: number
  containerName?: string          // parent class/namespace
  signature?: string              // function signature, type definition
  documentation?: string          // JSDoc/docstring
}

export interface SymbolSearchResult {
  symbols: CodeSymbol[]
  total: number
}

export interface FileSearchResult {
  path: string
  score: number
  matchPositions: number[]       // character positions of match
}

export interface IndexedFile {
  id: string
  path: string
  content: string
  language: string
  size: number
  lastModified: number
  symbols: CodeSymbol[]
  lineCount: number
}

export interface SearchHistoryEntry {
  query: string
  options: Partial<SearchOptions>
  timestamp: number
  resultCount: number
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  options: Partial<SearchOptions>
  createdAt: number
}

// ═══════════════════════════════════════════════════════════
// SYMBOL EXTRACTION PATTERNS (per language)
// ═══════════════════════════════════════════════════════════

const SYMBOL_PATTERNS: Record<string, { kind: SymbolKind; pattern: RegExp }[]> = {
  typescript: [
    { kind: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g },
    { kind: 'class', pattern: /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g },
    { kind: 'interface', pattern: /(?:export\s+)?interface\s+(\w+)/g },
    { kind: 'type', pattern: /(?:export\s+)?type\s+(\w+)/g },
    { kind: 'enum', pattern: /(?:export\s+)?(?:const\s+)?enum\s+(\w+)/g },
    { kind: 'constant', pattern: /(?:export\s+)?const\s+(\w+)\s*[=:]/g },
    { kind: 'variable', pattern: /(?:export\s+)?(?:let|var)\s+(\w+)\s*[=:]/g },
    { kind: 'method', pattern: /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g },
  ],
  javascript: [
    { kind: 'function', pattern: /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g },
    { kind: 'class', pattern: /(?:export\s+)?class\s+(\w+)/g },
    { kind: 'constant', pattern: /(?:export\s+)?const\s+(\w+)\s*=/g },
    { kind: 'variable', pattern: /(?:export\s+)?(?:let|var)\s+(\w+)\s*=/g },
    { kind: 'method', pattern: /(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/g },
  ],
  python: [
    { kind: 'function', pattern: /(?:async\s+)?def\s+(\w+)/g },
    { kind: 'class', pattern: /class\s+(\w+)/g },
    { kind: 'variable', pattern: /^(\w+)\s*=/gm },
    { kind: 'import', pattern: /(?:from\s+\S+\s+)?import\s+(\w+)/g },
  ],
  rust: [
    { kind: 'function', pattern: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/g },
    { kind: 'class', pattern: /(?:pub\s+)?struct\s+(\w+)/g },
    { kind: 'interface', pattern: /(?:pub\s+)?trait\s+(\w+)/g },
    { kind: 'enum', pattern: /(?:pub\s+)?enum\s+(\w+)/g },
    { kind: 'type', pattern: /(?:pub\s+)?type\s+(\w+)/g },
    { kind: 'module', pattern: /(?:pub\s+)?mod\s+(\w+)/g },
    { kind: 'constant', pattern: /(?:pub\s+)?const\s+(\w+)/g },
  ],
  go: [
    { kind: 'function', pattern: /func\s+(?:\([^)]+\)\s+)?(\w+)/g },
    { kind: 'class', pattern: /type\s+(\w+)\s+struct/g },
    { kind: 'interface', pattern: /type\s+(\w+)\s+interface/g },
    { kind: 'type', pattern: /type\s+(\w+)\s+\w+/g },
    { kind: 'constant', pattern: /const\s+(\w+)/g },
    { kind: 'variable', pattern: /var\s+(\w+)/g },
  ],
  java: [
    { kind: 'class', pattern: /(?:public\s+)?(?:abstract\s+)?class\s+(\w+)/g },
    { kind: 'interface', pattern: /(?:public\s+)?interface\s+(\w+)/g },
    { kind: 'enum', pattern: /(?:public\s+)?enum\s+(\w+)/g },
    { kind: 'method', pattern: /(?:public|private|protected)?\s*(?:static\s+)?(?:[\w<>\[\]]+)\s+(\w+)\s*\(/g },
    { kind: 'constant', pattern: /(?:public\s+)?(?:static\s+)?final\s+\w+\s+(\w+)/g },
  ],
  cpp: [
    { kind: 'function', pattern: /(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*(?:const)?\s*\{/g },
    { kind: 'class', pattern: /class\s+(\w+)/g },
    { kind: 'class', pattern: /struct\s+(\w+)/g },
    { kind: 'enum', pattern: /enum\s+(?:class\s+)?(\w+)/g },
    { kind: 'namespace', pattern: /namespace\s+(\w+)/g },
    { kind: 'type', pattern: /typedef\s+[\w\s*]+\s+(\w+)\s*;/g },
  ],
}

// Map file extensions to language keys
const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.pyw': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.c': 'cpp', '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
  '.cs': 'typescript',  // C# patterns are similar enough
  '.rb': 'python',      // Ruby patterns are similar enough for basics
  '.php': 'java',       // PHP patterns are similar enough for basics
}

// ═══════════════════════════════════════════════════════════
// CODE SEARCH SERVICE
// ═══════════════════════════════════════════════════════════

export class CodeSearchService {
  private fileIndex: MiniSearch<IndexedFile>
  private symbolIndex: MiniSearch<CodeSymbol & { id: string }>
  private files: Map<string, IndexedFile> = new Map()
  private history: SearchHistoryEntry[] = []
  private savedSearches: Map<string, SavedSearch> = new Map()

  constructor() {
    this.fileIndex = new MiniSearch<IndexedFile>({
      fields: ['path', 'content'],
      storeFields: ['path', 'language', 'lineCount'],
      searchOptions: {
        boost: { path: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    })

    this.symbolIndex = new MiniSearch<CodeSymbol & { id: string }>({
      fields: ['name', 'containerName', 'signature', 'documentation'],
      storeFields: ['name', 'kind', 'file', 'line', 'column', 'containerName', 'signature'],
      searchOptions: {
        boost: { name: 3 },
        fuzzy: 0.2,
        prefix: true,
      },
    })
  }

  // ─── File Indexing ───────────────────────────────────────

  indexFile(path: string, content: string): void {
    const ext = path.substring(path.lastIndexOf('.'))
    const language = EXT_TO_LANG[ext] || 'unknown'
    const lines = content.split('\n')

    // Extract symbols
    const symbols = this.extractSymbols(path, content, language)

    const entry: IndexedFile = {
      id: path,
      path,
      content,
      language,
      size: content.length,
      lastModified: Date.now(),
      symbols,
      lineCount: lines.length,
    }

    // Remove old entry if exists
    if (this.files.has(path)) {
      try { this.fileIndex.discard(path) } catch {}
      // Remove old symbols
      for (const sym of (this.files.get(path)?.symbols || [])) {
        try { this.symbolIndex.discard(`${path}:${sym.name}:${sym.line}`) } catch {}
      }
    }

    this.files.set(path, entry)
    this.fileIndex.add(entry)

    // Add symbols to symbol index
    for (const sym of symbols) {
      const symEntry = { ...sym, id: `${path}:${sym.name}:${sym.line}` }
      this.symbolIndex.add(symEntry)
    }
  }

  removeFile(path: string): void {
    const existing = this.files.get(path)
    if (!existing) return

    try { this.fileIndex.discard(path) } catch {}
    for (const sym of existing.symbols) {
      try { this.symbolIndex.discard(`${path}:${sym.name}:${sym.line}`) } catch {}
    }
    this.files.delete(path)
  }

  indexWorkspace(files: { path: string; content: string }[]): { indexed: number; symbols: number; elapsed: number } {
    const start = Date.now()
    let totalSymbols = 0

    for (const file of files) {
      this.indexFile(file.path, file.content)
      totalSymbols += (this.files.get(file.path)?.symbols.length || 0)
    }

    return {
      indexed: files.length,
      symbols: totalSymbols,
      elapsed: Date.now() - start,
    }
  }

  // ─── Symbol Extraction ──────────────────────────────────

  private extractSymbols(filePath: string, content: string, language: string): CodeSymbol[] {
    const patterns = SYMBOL_PATTERNS[language]
    if (!patterns) return []

    const symbols: CodeSymbol[] = []
    const lines = content.split('\n')

    for (const { kind, pattern } of patterns) {
      // Reset regex state
      const regex = new RegExp(pattern.source, pattern.flags)
      let match: RegExpExecArray | null

      while ((match = regex.exec(content)) !== null) {
        const name = match[1]
        if (!name || name.length < 2) continue

        // Skip common noise words
        if (['if', 'else', 'for', 'while', 'return', 'new', 'this', 'true', 'false', 'null'].includes(name)) continue

        // Calculate line number
        const beforeMatch = content.substring(0, match.index)
        const line = beforeMatch.split('\n').length
        const lineStart = beforeMatch.lastIndexOf('\n') + 1
        const column = match.index - lineStart

        // Get the full line as a rough signature
        const lineContent = lines[line - 1]?.trim() || ''

        symbols.push({
          name,
          kind,
          file: filePath,
          line,
          column,
          signature: lineContent,
        })
      }
    }

    return symbols
  }

  // ─── Text Search ─────────────────────────────────────────

  search(options: SearchOptions): { results: SearchResult[]; total: number; elapsed: number } {
    const start = Date.now()
    const results: SearchResult[] = []
    let totalMatches = 0
    const maxResults = options.maxResults || 1000
    const contextLines = options.contextLines ?? 2

    // Build the matcher
    let matcher: (line: string) => { index: number; length: number }[] | null

    if (options.isRegex) {
      try {
        const flags = options.isCaseSensitive ? 'g' : 'gi'
        const regex = new RegExp(options.query, flags)
        matcher = (line) => {
          const matches: { index: number; length: number }[] = []
          let m: RegExpExecArray | null
          regex.lastIndex = 0
          while ((m = regex.exec(line)) !== null) {
            matches.push({ index: m.index, length: m[0].length })
            if (m.index === regex.lastIndex) regex.lastIndex++
          }
          return matches.length ? matches : null
        }
      } catch {
        return { results: [], total: 0, elapsed: 0 }
      }
    } else {
      const q = options.isCaseSensitive ? options.query : options.query.toLowerCase()
      matcher = (line) => {
        const searchIn = options.isCaseSensitive ? line : line.toLowerCase()
        const matches: { index: number; length: number }[] = []
        let pos = 0
        while (true) {
          const idx = searchIn.indexOf(q, pos)
          if (idx === -1) break

          if (options.isWholeWord) {
            const before = idx > 0 ? searchIn[idx - 1] : ' '
            const after = idx + q.length < searchIn.length ? searchIn[idx + q.length] : ' '
            if (/\w/.test(before) || /\w/.test(after)) {
              pos = idx + 1
              continue
            }
          }

          matches.push({ index: idx, length: q.length })
          pos = idx + 1
        }
        return matches.length ? matches : null
      }
    }

    // Compile include/exclude patterns
    const includeRe = options.includePattern ? this.globToRegex(options.includePattern) : null
    const excludeRe = options.excludePattern ? this.globToRegex(options.excludePattern) : null

    // Search through indexed files
    for (const [path, file] of this.files) {
      if (totalMatches >= maxResults) break

      // Apply include/exclude
      if (includeRe && !includeRe.test(path)) continue
      if (excludeRe && excludeRe.test(path)) continue

      const lines = file.content.split('\n')
      const fileMatches: SearchMatch[] = []

      for (let i = 0; i < lines.length && totalMatches < maxResults; i++) {
        const lineMatches = matcher(lines[i])
        if (!lineMatches) continue

        for (const { index, length } of lineMatches) {
          fileMatches.push({
            line: i + 1,
            column: index,
            length,
            lineContent: lines[i],
            matchText: lines[i].substring(index, index + length),
            contextBefore: lines.slice(Math.max(0, i - contextLines), i),
            contextAfter: lines.slice(i + 1, i + 1 + contextLines),
          })
          totalMatches++
        }
      }

      if (fileMatches.length > 0) {
        results.push({
          file: path,
          matches: fileMatches,
          language: file.language,
        })
      }
    }

    // Record in history
    this.history.push({
      query: options.query,
      options,
      timestamp: Date.now(),
      resultCount: totalMatches,
    })
    if (this.history.length > 100) this.history.shift()

    return {
      results,
      total: totalMatches,
      elapsed: Date.now() - start,
    }
  }

  // ─── Replace ─────────────────────────────────────────────

  previewReplace(options: ReplaceOptions): ReplacePreview[] {
    const searchResults = this.search(options)
    const previews: ReplacePreview[] = []

    for (const result of searchResults.results) {
      const changes: ReplaceChange[] = []
      for (const match of result.matches) {
        let newLine = match.lineContent
        if (options.isRegex) {
          try {
            const flags = options.isCaseSensitive ? 'g' : 'gi'
            const regex = new RegExp(options.query, flags)
            newLine = newLine.replace(regex, options.replacement)
          } catch { continue }
        } else {
          const before = newLine.substring(0, match.column)
          const after = newLine.substring(match.column + match.length)
          newLine = before + options.replacement + after
        }
        changes.push({
          line: match.line,
          originalContent: match.lineContent,
          newContent: newLine,
        })
      }
      if (changes.length > 0) {
        previews.push({ file: result.file, changes })
      }
    }
    return previews
  }

  applyReplace(options: ReplaceOptions): { filesChanged: number; replacements: number } {
    const previews = this.previewReplace(options)
    let totalReplacements = 0

    for (const preview of previews) {
      const file = this.files.get(preview.file)
      if (!file) continue

      const lines = file.content.split('\n')
      // Apply changes from bottom to top to preserve line numbers
      const sortedChanges = [...preview.changes].sort((a, b) => b.line - a.line)
      for (const change of sortedChanges) {
        lines[change.line - 1] = change.newContent
        totalReplacements++
      }

      // Re-index the modified file
      this.indexFile(preview.file, lines.join('\n'))
    }

    return {
      filesChanged: previews.length,
      replacements: totalReplacements,
    }
  }

  // ─── Symbol Search ───────────────────────────────────────

  searchSymbols(query: string, kind?: SymbolKind, limit = 50): SymbolSearchResult {
    if (!query.trim()) {
      // Return all symbols of a kind if no query but kind is specified
      if (kind) {
        const all = Array.from(this.files.values())
          .flatMap(f => f.symbols)
          .filter(s => s.kind === kind)
          .slice(0, limit)
        return { symbols: all, total: all.length }
      }
      return { symbols: [], total: 0 }
    }

    const results = this.symbolIndex.search(query, {
      prefix: true,
      fuzzy: 0.2,
      boost: { name: 5 },
    })

    let symbols = results.map(r => {
      const file = this.files.get(r.file as string)
      if (!file) return null
      return file.symbols.find(
        s => s.name === r.name && s.line === r.line
      ) || null
    }).filter((s): s is CodeSymbol => s !== null)

    if (kind) {
      symbols = symbols.filter(s => s.kind === kind)
    }

    return {
      symbols: symbols.slice(0, limit),
      total: symbols.length,
    }
  }

  getSymbolsInFile(path: string): CodeSymbol[] {
    return this.files.get(path)?.symbols || []
  }

  // ─── File Search (fuzzy) ────────────────────────────────

  searchFiles(query: string, limit = 30): FileSearchResult[] {
    if (!query.trim()) return []

    const q = query.toLowerCase()
    const results: FileSearchResult[] = []

    for (const [path] of this.files) {
      const filename = path.split('/').pop() || path
      const lowerPath = path.toLowerCase()
      const lowerName = filename.toLowerCase()

      // Calculate fuzzy match score
      let score = 0
      const matchPositions: number[] = []
      let qi = 0

      for (let pi = 0; pi < lowerPath.length && qi < q.length; pi++) {
        if (lowerPath[pi] === q[qi]) {
          matchPositions.push(pi)
          score += 1

          // Bonus for consecutive matches
          if (matchPositions.length > 1 && matchPositions[matchPositions.length - 1] - matchPositions[matchPositions.length - 2] === 1) {
            score += 2
          }
          // Bonus for matching at start of segment
          if (pi === 0 || lowerPath[pi - 1] === '/' || lowerPath[pi - 1] === '\\' || lowerPath[pi - 1] === '.') {
            score += 3
          }
          // Bonus for filename match
          if (lowerName.includes(q[qi])) {
            score += 1
          }
          qi++
        }
      }

      // Only include if all query characters matched
      if (qi === q.length) {
        results.push({ path, score, matchPositions })
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  // ─── Search History ──────────────────────────────────────

  getHistory(): SearchHistoryEntry[] {
    return [...this.history].reverse()
  }

  clearHistory(): void {
    this.history = []
  }

  // ─── Saved Searches ─────────────────────────────────────

  saveSearch(name: string, query: string, options: Partial<SearchOptions>): SavedSearch {
    const saved: SavedSearch = {
      id: `saved_${Date.now()}`,
      name,
      query,
      options,
      createdAt: Date.now(),
    }
    this.savedSearches.set(saved.id, saved)
    return saved
  }

  getSavedSearches(): SavedSearch[] {
    return Array.from(this.savedSearches.values())
  }

  deleteSavedSearch(id: string): boolean {
    return this.savedSearches.delete(id)
  }

  // ─── Stats ───────────────────────────────────────────────

  getStats() {
    const allSymbols = Array.from(this.files.values()).flatMap(f => f.symbols)
    const symbolsByKind: Record<string, number> = {}
    for (const sym of allSymbols) {
      symbolsByKind[sym.kind] = (symbolsByKind[sym.kind] || 0) + 1
    }

    return {
      indexedFiles: this.files.size,
      totalLines: Array.from(this.files.values()).reduce((sum, f) => sum + f.lineCount, 0),
      totalSize: Array.from(this.files.values()).reduce((sum, f) => sum + f.size, 0),
      totalSymbols: allSymbols.length,
      symbolsByKind,
      languages: [...new Set(Array.from(this.files.values()).map(f => f.language))],
      searchHistory: this.history.length,
      savedSearches: this.savedSearches.size,
    }
  }

  // ─── Utilities ───────────────────────────────────────────

  private globToRegex(glob: string): RegExp {
    const escaped = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    return new RegExp(escaped, 'i')
  }
}

export const codeSearch = new CodeSearchService()
