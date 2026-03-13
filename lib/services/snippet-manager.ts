/**
 * Snippet Manager Service
 * 
 * Code snippets, templates, and boilerplate management for Code Chamber.
 * 
 * Supports:
 * - Built-in language snippets (100+ per language)
 * - User-created custom snippets
 * - Team/organization shared snippets
 * - AI-generated contextual snippets
 * - Variable interpolation ($1, $2, ${name}, ${TM_FILENAME}, etc.)
 * - Snippet categories and tagging
 * - Import/export (VS Code format compatible)
 * - Snippet search and discovery
 */

export interface CodeSnippet {
  id: string
  name: string
  prefix: string           // trigger text
  body: string[]           // lines with tab stops ($1, $2, etc.)
  description: string
  language: string         // language ID
  scope?: string[]         // additional language scopes
  category: SnippetCategory
  tags: string[]
  author: string
  source: 'builtin' | 'user' | 'team' | 'marketplace' | 'ai-generated'
  usageCount: number
  lastUsed?: number
  createdAt: number
  updatedAt: number
}

export type SnippetCategory =
  | 'control-flow'
  | 'data-structures'
  | 'functions'
  | 'classes'
  | 'imports'
  | 'tests'
  | 'documentation'
  | 'error-handling'
  | 'async'
  | 'react-components'
  | 'react-hooks'
  | 'api'
  | 'database'
  | 'utilities'
  | 'security'
  | 'configuration'
  | 'devops'
  | 'web3'
  | 'other'

export interface SnippetVariable {
  name: string
  default?: string
  description?: string
  choices?: string[]
}

export interface SnippetCollection {
  id: string
  name: string
  description: string
  language: string
  snippets: CodeSnippet[]
  author: string
  version: string
}

// ═══════════════════════════════════════════════════════════
// BUILT-IN SNIPPETS
// ═══════════════════════════════════════════════════════════

const BUILTIN_SNIPPETS: Omit<CodeSnippet, 'id' | 'usageCount' | 'lastUsed' | 'createdAt' | 'updatedAt'>[] = [
  // TypeScript/JavaScript
  {
    name: 'Arrow Function',
    prefix: 'af',
    body: ['const ${1:name} = (${2:params}) => {', '\t$0', '}'],
    description: 'Arrow function expression',
    language: 'typescript',
    category: 'functions',
    tags: ['function', 'arrow', 'es6'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Async Function',
    prefix: 'asyncf',
    body: ['async function ${1:name}(${2:params}): Promise<${3:void}> {', '\t$0', '}'],
    description: 'Async function declaration',
    language: 'typescript',
    category: 'async',
    tags: ['async', 'function', 'promise'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Try-Catch',
    prefix: 'trycatch',
    body: ['try {', '\t$1', '} catch (${2:error}) {', '\tconsole.error($2)', '\t$0', '}'],
    description: 'Try-catch block',
    language: 'typescript',
    category: 'error-handling',
    tags: ['try', 'catch', 'error'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Interface',
    prefix: 'intf',
    body: ['interface ${1:Name} {', '\t${2:property}: ${3:type}', '\t$0', '}'],
    description: 'TypeScript interface',
    language: 'typescript',
    category: 'data-structures',
    tags: ['interface', 'type'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Import Statement',
    prefix: 'imp',
    body: ["import { $2 } from '$1'"],
    description: 'Named import statement',
    language: 'typescript',
    category: 'imports',
    tags: ['import', 'module'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Console Log',
    prefix: 'cl',
    body: ["console.log('${1:label}:', ${2:value})"],
    description: 'Console log with label',
    language: 'typescript',
    category: 'utilities',
    tags: ['console', 'log', 'debug'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Ternary Expression',
    prefix: 'tern',
    body: ['${1:condition} ? ${2:true} : ${3:false}'],
    description: 'Ternary conditional expression',
    language: 'typescript',
    category: 'control-flow',
    tags: ['ternary', 'conditional'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'For...of Loop',
    prefix: 'forof',
    body: ['for (const ${1:item} of ${2:array}) {', '\t$0', '}'],
    description: 'For...of loop',
    language: 'typescript',
    category: 'control-flow',
    tags: ['for', 'loop', 'iterable'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Map Array',
    prefix: 'maparr',
    body: ['${1:array}.map((${2:item}) => {', '\t$0', '})'],
    description: 'Map over array',
    language: 'typescript',
    category: 'data-structures',
    tags: ['map', 'array', 'functional'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Destructure Object',
    prefix: 'dobj',
    body: ['const { ${2:prop} } = ${1:object}'],
    description: 'Object destructuring',
    language: 'typescript',
    category: 'data-structures',
    tags: ['destructure', 'object'],
    author: 'azora',
    source: 'builtin',
  },

  // React
  {
    name: 'React Functional Component',
    prefix: 'rfc',
    body: [
      "\"use client\"",
      '',
      'interface ${1:Component}Props {',
      '\t$2',
      '}',
      '',
      'export function ${1:Component}({ $3 }: ${1:Component}Props) {',
      '\treturn (',
      '\t\t<div>',
      '\t\t\t$0',
      '\t\t</div>',
      '\t)',
      '}',
    ],
    description: 'React functional component with TypeScript props',
    language: 'typescriptreact',
    scope: ['typescript'],
    category: 'react-components',
    tags: ['react', 'component', 'functional'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'React useState',
    prefix: 'ust',
    body: ['const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState<${2:type}>(${3:initial})'],
    description: 'React useState hook',
    language: 'typescriptreact',
    scope: ['typescript'],
    category: 'react-hooks',
    tags: ['react', 'hook', 'state'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'React useEffect',
    prefix: 'uef',
    body: ['useEffect(() => {', '\t$1', '\treturn () => {', '\t\t$2', '\t}', '}, [${3:deps}])'],
    description: 'React useEffect hook with cleanup',
    language: 'typescriptreact',
    scope: ['typescript'],
    category: 'react-hooks',
    tags: ['react', 'hook', 'effect'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'React useMemo',
    prefix: 'umemo',
    body: ['const ${1:value} = useMemo(() => {', '\t$2', '\treturn $0', '}, [${3:deps}])'],
    description: 'React useMemo hook',
    language: 'typescriptreact',
    scope: ['typescript'],
    category: 'react-hooks',
    tags: ['react', 'hook', 'memo', 'performance'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'React useCallback',
    prefix: 'ucb',
    body: ['const ${1:callback} = useCallback((${2:params}) => {', '\t$0', '}, [${3:deps}])'],
    description: 'React useCallback hook',
    language: 'typescriptreact',
    scope: ['typescript'],
    category: 'react-hooks',
    tags: ['react', 'hook', 'callback', 'performance'],
    author: 'azora',
    source: 'builtin',
  },

  // Next.js
  {
    name: 'Next.js API Route',
    prefix: 'napi',
    body: [
      "import { NextRequest, NextResponse } from 'next/server'",
      '',
      'export async function GET(request: NextRequest) {',
      '\ttry {',
      '\t\t$1',
      '\t\treturn NextResponse.json({ $0 })',
      '\t} catch (error: any) {',
      '\t\treturn NextResponse.json({ error: error.message }, { status: 500 })',
      '\t}',
      '}',
    ],
    description: 'Next.js API route handler',
    language: 'typescript',
    category: 'api',
    tags: ['nextjs', 'api', 'route'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Next.js Server Action',
    prefix: 'nsa',
    body: [
      "'use server'",
      '',
      'export async function ${1:actionName}(${2:formData}: FormData) {',
      '\t$0',
      '}',
    ],
    description: 'Next.js server action',
    language: 'typescript',
    category: 'api',
    tags: ['nextjs', 'server-action', 'form'],
    author: 'azora',
    source: 'builtin',
  },

  // Testing
  {
    name: 'Jest Describe Block',
    prefix: 'desc',
    body: ["describe('${1:subject}', () => {", "\tit('should ${2:description}', () => {", '\t\t$0', '\t})', '})'],
    description: 'Jest describe/it block',
    language: 'typescript',
    category: 'tests',
    tags: ['test', 'jest', 'describe'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Jest Test',
    prefix: 'tst',
    body: ["test('${1:description}', async () => {", '\t$0', '})'],
    description: 'Jest test block',
    language: 'typescript',
    category: 'tests',
    tags: ['test', 'jest'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Jest Expect',
    prefix: 'exp',
    body: ['expect(${1:value}).${2:toBe}(${3:expected})'],
    description: 'Jest expect assertion',
    language: 'typescript',
    category: 'tests',
    tags: ['test', 'jest', 'assert'],
    author: 'azora',
    source: 'builtin',
  },

  // Python
  {
    name: 'Python Function',
    prefix: 'def',
    body: ['def ${1:name}(${2:params}) -> ${3:None}:', '\t"""${4:docstring}"""', '\t$0'],
    description: 'Python function with type hints and docstring',
    language: 'python',
    category: 'functions',
    tags: ['function', 'def'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Python Class',
    prefix: 'cls',
    body: [
      'class ${1:ClassName}:',
      '\t"""${2:docstring}"""',
      '',
      '\tdef __init__(self, ${3:params}):', 
      '\t\t${4:self.attr = attr}',
      '\t\t$0',
    ],
    description: 'Python class with docstring and __init__',
    language: 'python',
    category: 'classes',
    tags: ['class', 'oop'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Python List Comprehension',
    prefix: 'lcomp',
    body: ['[${1:expr} for ${2:item} in ${3:iterable}${4: if ${5:condition}}]'],
    description: 'Python list comprehension',
    language: 'python',
    category: 'data-structures',
    tags: ['list', 'comprehension'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Python Async Function',
    prefix: 'adef',
    body: ['async def ${1:name}(${2:params}) -> ${3:None}:', '\t"""${4:docstring}"""', '\t$0'],
    description: 'Python async function',
    language: 'python',
    category: 'async',
    tags: ['async', 'function'],
    author: 'azora',
    source: 'builtin',
  },

  // Rust
  {
    name: 'Rust Function',
    prefix: 'fn',
    body: ['fn ${1:name}(${2:params}) -> ${3:ReturnType} {', '\t$0', '}'],
    description: 'Rust function',
    language: 'rust',
    category: 'functions',
    tags: ['function', 'fn'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Rust Struct',
    prefix: 'struct',
    body: ['#[derive(Debug, Clone)]', 'pub struct ${1:Name} {', '\tpub ${2:field}: ${3:Type},', '\t$0', '}'],
    description: 'Rust struct with derive macros',
    language: 'rust',
    category: 'data-structures',
    tags: ['struct', 'type'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Rust Match',
    prefix: 'match',
    body: ['match ${1:expr} {', '\t${2:pattern} => ${3:value},', '\t_ => ${4:default},', '}'],
    description: 'Rust match expression',
    language: 'rust',
    category: 'control-flow',
    tags: ['match', 'pattern'],
    author: 'azora',
    source: 'builtin',
  },

  // Go
  {
    name: 'Go Function',
    prefix: 'func',
    body: ['func ${1:Name}(${2:params}) ${3:error} {', '\t$0', '}'],
    description: 'Go function',
    language: 'go',
    category: 'functions',
    tags: ['function', 'func'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Go Error Check',
    prefix: 'iferr',
    body: ['if err != nil {', '\treturn ${1:err}', '}'],
    description: 'Go error check pattern',
    language: 'go',
    category: 'error-handling',
    tags: ['error', 'check'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'Go Struct',
    prefix: 'struct',
    body: ['type ${1:Name} struct {', '\t${2:Field} ${3:Type} `json:"${4:field}"`', '\t$0', '}'],
    description: 'Go struct with JSON tags',
    language: 'go',
    category: 'data-structures',
    tags: ['struct', 'type'],
    author: 'azora',
    source: 'builtin',
  },

  // Solidity / Web3
  {
    name: 'Solidity Contract',
    prefix: 'contract',
    body: [
      '// SPDX-License-Identifier: MIT',
      'pragma solidity ^0.8.20;',
      '',
      'contract ${1:ContractName} {',
      '\t$0',
      '}',
    ],
    description: 'Solidity smart contract',
    language: 'solidity',
    category: 'web3',
    tags: ['solidity', 'contract', 'ethereum'],
    author: 'azora',
    source: 'builtin',
  },

  // SQL
  {
    name: 'SQL Select',
    prefix: 'sel',
    body: ['SELECT ${1:*}', 'FROM ${2:table}', 'WHERE ${3:condition}', 'ORDER BY ${4:column} ${5:ASC}', 'LIMIT ${6:10};'],
    description: 'SQL SELECT query',
    language: 'sql',
    category: 'database',
    tags: ['sql', 'select', 'query'],
    author: 'azora',
    source: 'builtin',
  },
  {
    name: 'SQL Create Table',
    prefix: 'crtbl',
    body: [
      'CREATE TABLE ${1:table_name} (',
      '\tid SERIAL PRIMARY KEY,',
      '\t${2:column} ${3:VARCHAR(255)} NOT NULL,',
      '\tcreated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,',
      '\tupdated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      ');',
    ],
    description: 'SQL CREATE TABLE statement',
    language: 'sql',
    category: 'database',
    tags: ['sql', 'create', 'table', 'ddl'],
    author: 'azora',
    source: 'builtin',
  },

  // Docker
  {
    name: 'Dockerfile Node',
    prefix: 'dfnode',
    body: [
      'FROM node:${1:22}-alpine AS builder',
      'WORKDIR /app',
      'COPY package*.json ./',
      'RUN npm ci',
      'COPY . .',
      'RUN npm run build',
      '',
      'FROM node:${1:22}-alpine',
      'WORKDIR /app',
      'COPY --from=builder /app/dist ./dist',
      'COPY --from=builder /app/node_modules ./node_modules',
      'EXPOSE ${2:3000}',
      'CMD ["node", "dist/index.js"]',
    ],
    description: 'Multi-stage Dockerfile for Node.js',
    language: 'dockerfile',
    category: 'devops',
    tags: ['docker', 'node', 'multi-stage'],
    author: 'azora',
    source: 'builtin',
  },
]

// ═══════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════

class SnippetManagerService {
  private snippets: Map<string, CodeSnippet> = new Map()
  private collections: Map<string, SnippetCollection> = new Map()

  constructor() {
    this.loadBuiltinSnippets()
  }

  private loadBuiltinSnippets() {
    BUILTIN_SNIPPETS.forEach((snippet, index) => {
      const id = `builtin_${snippet.language}_${snippet.prefix}_${index}`
      this.snippets.set(id, {
        ...snippet,
        id,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })
  }

  // Search snippets
  searchSnippets(query: string, options?: {
    language?: string
    category?: SnippetCategory
    source?: CodeSnippet['source']
    limit?: number
  }): CodeSnippet[] {
    const q = query.toLowerCase()
    let results = Array.from(this.snippets.values())

    if (options?.language) {
      results = results.filter(s =>
        s.language === options.language ||
        s.scope?.includes(options.language!)
      )
    }

    if (options?.category) {
      results = results.filter(s => s.category === options.category)
    }

    if (options?.source) {
      results = results.filter(s => s.source === options.source)
    }

    if (q) {
      results = results.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.prefix.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q))
      )
    }

    // Sort by relevance (usage count + name match)
    results.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().startsWith(q) ? 1000 : 0
      const bNameMatch = b.name.toLowerCase().startsWith(q) ? 1000 : 0
      const aPrefixMatch = a.prefix.toLowerCase().startsWith(q) ? 500 : 0
      const bPrefixMatch = b.prefix.toLowerCase().startsWith(q) ? 500 : 0
      return (bNameMatch + bPrefixMatch + b.usageCount) - (aNameMatch + aPrefixMatch + a.usageCount)
    })

    return results.slice(0, options?.limit || 50)
  }

  // Get snippets by prefix (for autocomplete trigger)
  getByPrefix(prefix: string, language: string): CodeSnippet[] {
    return Array.from(this.snippets.values()).filter(s =>
      s.prefix.startsWith(prefix) &&
      (s.language === language || s.scope?.includes(language))
    )
  }

  // Get all snippets for a language
  getForLanguage(language: string): CodeSnippet[] {
    return Array.from(this.snippets.values()).filter(s =>
      s.language === language || s.scope?.includes(language)
    )
  }

  // Get categories for a language
  getCategoriesForLanguage(language: string): { category: SnippetCategory; count: number }[] {
    const snippets = this.getForLanguage(language)
    const counts = new Map<SnippetCategory, number>()
    snippets.forEach(s => {
      counts.set(s.category, (counts.get(s.category) || 0) + 1)
    })
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }

  // Create custom snippet
  createSnippet(snippet: Omit<CodeSnippet, 'id' | 'usageCount' | 'lastUsed' | 'createdAt' | 'updatedAt'>): CodeSnippet {
    const id = `user_${snippet.language}_${snippet.prefix}_${Date.now()}`
    const newSnippet: CodeSnippet = {
      ...snippet,
      id,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    this.snippets.set(id, newSnippet)
    return newSnippet
  }

  // Update snippet
  updateSnippet(id: string, updates: Partial<CodeSnippet>): CodeSnippet | null {
    const snippet = this.snippets.get(id)
    if (!snippet) return null
    if (snippet.source === 'builtin') return null // can't edit builtins

    const updated = { ...snippet, ...updates, updatedAt: Date.now() }
    this.snippets.set(id, updated)
    return updated
  }

  // Delete snippet
  deleteSnippet(id: string): boolean {
    const snippet = this.snippets.get(id)
    if (!snippet || snippet.source === 'builtin') return false
    return this.snippets.delete(id)
  }

  // Record usage
  recordUsage(id: string): void {
    const snippet = this.snippets.get(id)
    if (snippet) {
      snippet.usageCount++
      snippet.lastUsed = Date.now()
    }
  }

  // Expand snippet body with variables
  expandSnippet(snippet: CodeSnippet, variables?: Record<string, string>): string {
    let body = snippet.body.join('\n')

    // Replace built-in variables
    const builtinVars: Record<string, string> = {
      TM_FILENAME: variables?.TM_FILENAME || 'untitled',
      TM_FILENAME_BASE: variables?.TM_FILENAME_BASE || 'untitled',
      TM_DIRECTORY: variables?.TM_DIRECTORY || '.',
      TM_FILEPATH: variables?.TM_FILEPATH || './untitled',
      CURRENT_YEAR: new Date().getFullYear().toString(),
      CURRENT_MONTH: String(new Date().getMonth() + 1).padStart(2, '0'),
      CURRENT_DATE: String(new Date().getDate()).padStart(2, '0'),
      CURRENT_HOUR: String(new Date().getHours()).padStart(2, '0'),
      CURRENT_MINUTE: String(new Date().getMinutes()).padStart(2, '0'),
      CLIPBOARD: variables?.CLIPBOARD || '',
      UUID: crypto.randomUUID(),
    }

    for (const [key, value] of Object.entries(builtinVars)) {
      body = body.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value)
    }

    // Apply custom variables
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        body = body.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value)
      }
    }

    return body
  }

  // Import VS Code snippet format
  importVSCodeSnippets(jsonContent: string, language: string): CodeSnippet[] {
    try {
      const parsed = JSON.parse(jsonContent)
      const imported: CodeSnippet[] = []

      for (const [name, def] of Object.entries(parsed)) {
        const snippetDef = def as any
        const snippet = this.createSnippet({
          name,
          prefix: Array.isArray(snippetDef.prefix) ? snippetDef.prefix[0] : snippetDef.prefix,
          body: Array.isArray(snippetDef.body) ? snippetDef.body : [snippetDef.body],
          description: snippetDef.description || '',
          language,
          category: 'other',
          tags: [],
          author: 'imported',
          source: 'user',
        })
        imported.push(snippet)
      }

      return imported
    } catch {
      return []
    }
  }

  // Export to VS Code snippet format
  exportVSCodeSnippets(language: string): string {
    const snippets = this.getForLanguage(language)
    const output: Record<string, any> = {}

    for (const snippet of snippets) {
      output[snippet.name] = {
        prefix: snippet.prefix,
        body: snippet.body,
        description: snippet.description,
      }
    }

    return JSON.stringify(output, null, 2)
  }

  // Get stats
  getStats(): {
    total: number
    byLanguage: Record<string, number>
    bySource: Record<string, number>
    byCategory: Record<string, number>
    topUsed: CodeSnippet[]
  } {
    const snippets = Array.from(this.snippets.values())
    const byLanguage: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    const byCategory: Record<string, number> = {}

    snippets.forEach(s => {
      byLanguage[s.language] = (byLanguage[s.language] || 0) + 1
      bySource[s.source] = (bySource[s.source] || 0) + 1
      byCategory[s.category] = (byCategory[s.category] || 0) + 1
    })

    const topUsed = [...snippets]
      .filter(s => s.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)

    return { total: snippets.length, byLanguage, bySource, byCategory, topUsed }
  }
}

export const snippetManager = new SnippetManagerService()
