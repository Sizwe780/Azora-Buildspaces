/**
 * Extension Marketplace Service
 * 
 * Self-hosted extension discovery, installation, and management.
 * Inspired by: https://github.com/coder/code-marketplace
 *              https://github.com/eclipse/openvsx (Open VSX Registry)
 * 
 * Supports:
 * - Extension search, filtering, and categorization
 * - Installation/uninstallation lifecycle
 * - Version management and auto-updates
 * - Extension ratings and reviews
 * - Compatibility checking with Code Chamber
 * - Extension sandboxing and permission management
 */

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface Extension {
  id: string                   // publisher.name format
  name: string
  displayName: string
  publisher: ExtensionPublisher
  version: string
  description: string
  longDescription?: string
  categories: ExtensionCategory[]
  tags: string[]
  icon?: string
  repository?: string
  homepage?: string
  license: string
  engine: string               // e.g., "vscode ^1.85.0" or "buildspaces ^0.1.0"
  main?: string                // entry point
  activationEvents: string[]
  contributes: ExtensionContributions
  dependencies: string[]
  size: number                 // bytes
  downloadCount: number
  rating: number               // 0-5
  reviewCount: number
  lastUpdated: number
  createdAt: number
  verified: boolean
  preview: boolean
}

export interface ExtensionPublisher {
  id: string
  name: string
  displayName: string
  verified: boolean
  avatar?: string
}

export type ExtensionCategory =
  | 'Programming Languages'
  | 'Snippets'
  | 'Linters'
  | 'Themes'
  | 'Debuggers'
  | 'Formatters'
  | 'Keymaps'
  | 'SCM Providers'
  | 'Other'
  | 'Extension Packs'
  | 'Language Packs'
  | 'Data Science'
  | 'Machine Learning'
  | 'Visualization'
  | 'Notebooks'
  | 'Education'
  | 'Testing'
  | 'AI'
  | 'Collaboration'

export interface ExtensionContributions {
  commands?: ExtensionCommand[]
  languages?: ExtensionLanguageContrib[]
  themes?: ExtensionThemeContrib[]
  snippets?: ExtensionSnippetContrib[]
  keybindings?: ExtensionKeybinding[]
  menus?: Record<string, any[]>
  configuration?: Record<string, any>
  views?: Record<string, any[]>
}

export interface ExtensionCommand {
  command: string
  title: string
  category?: string
  icon?: string
}

export interface ExtensionLanguageContrib {
  id: string
  aliases?: string[]
  extensions?: string[]
  configuration?: string
  firstLine?: string
}

export interface ExtensionThemeContrib {
  label: string
  uiTheme: 'vs-dark' | 'vs' | 'hc-black' | 'hc-light'
  path: string
}

export interface ExtensionSnippetContrib {
  language: string
  path: string
}

export interface ExtensionKeybinding {
  command: string
  key: string
  mac?: string
  when?: string
}

export interface InstalledExtension extends Extension {
  installPath: string
  installedAt: number
  isEnabled: boolean
  isBuiltIn: boolean
  autoUpdate: boolean
  permissions: ExtensionPermission[]
}

export type ExtensionPermission =
  | 'filesystem'     // read/write workspace files
  | 'network'        // make HTTP requests
  | 'terminal'       // access terminal
  | 'git'            // access git operations
  | 'debug'          // access debugger
  | 'secrets'        // access secret storage
  | 'clipboard'      // access clipboard
  | 'notifications'  // show notifications
  | 'webview'        // create webview panels
  | 'all'            // all permissions

export interface ExtensionSearchQuery {
  text?: string
  category?: ExtensionCategory
  tags?: string[]
  sortBy?: 'relevance' | 'installs' | 'rating' | 'name' | 'publishedDate'
  sortOrder?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  verified?: boolean
}

export interface ExtensionSearchResult {
  extensions: Extension[]
  total: number
  page: number
  pageSize: number
}

export interface ExtensionReview {
  id: string
  extensionId: string
  userId: string
  userName: string
  rating: number
  title?: string
  body: string
  createdAt: number
  helpful: number
}

// ═══════════════════════════════════════════════════════════
// BUILT-IN EXTENSIONS (pre-installed)
// ═══════════════════════════════════════════════════════════

const BUILTIN_EXTENSIONS: Partial<Extension>[] = [
  {
    id: 'azora.theme-dark-modern',
    name: 'theme-dark-modern',
    displayName: 'Dark Modern',
    version: '1.0.0',
    description: 'Dark Modern theme for Code Chamber',
    categories: ['Themes'],
    tags: ['theme', 'dark', 'modern'],
    verified: true,
    downloadCount: 0,
    rating: 5.0,
  },
  {
    id: 'azora.elara-ai',
    name: 'elara-ai',
    displayName: 'Elara AI Assistant',
    version: '1.0.0',
    description: 'AI-powered code assistant with multi-model support',
    categories: ['AI'],
    tags: ['ai', 'copilot', 'completion', 'chat'],
    verified: true,
    downloadCount: 0,
    rating: 5.0,
  },
  {
    id: 'azora.git-source-control',
    name: 'git-source-control',
    displayName: 'Git Source Control',
    version: '1.0.0',
    description: 'Integrated Git support with diff viewer and commit graph',
    categories: ['SCM Providers'],
    tags: ['git', 'scm', 'source-control'],
    verified: true,
    downloadCount: 0,
    rating: 5.0,
  },
  {
    id: 'azora.collaboration',
    name: 'collaboration',
    displayName: 'Live Collaboration',
    version: '1.0.0',
    description: 'Real-time collaborative editing powered by Yjs CRDT',
    categories: ['Collaboration'],
    tags: ['collaboration', 'real-time', 'pair-programming'],
    verified: true,
    downloadCount: 0,
    rating: 5.0,
  },
  {
    id: 'azora.typescript-language-features',
    name: 'typescript-language-features',
    displayName: 'TypeScript & JavaScript',
    version: '1.0.0',
    description: 'Rich language support for TypeScript and JavaScript',
    categories: ['Programming Languages'],
    tags: ['typescript', 'javascript', 'language'],
    verified: true,
    downloadCount: 0,
    rating: 5.0,
  },
]

// ═══════════════════════════════════════════════════════════
// FEATURED / RECOMMENDED EXTENSIONS  
// ═══════════════════════════════════════════════════════════

const FEATURED_EXTENSIONS: Partial<Extension>[] = [
  {
    id: 'esbenp.prettier-vscode',
    name: 'prettier-vscode',
    displayName: 'Prettier - Code formatter',
    version: '10.4.0',
    description: 'Code formatter using prettier',
    categories: ['Formatters'],
    tags: ['formatter', 'prettier', 'javascript', 'typescript'],
    verified: true,
    downloadCount: 48_000_000,
    rating: 4.2,
  },
  {
    id: 'dbaeumer.vscode-eslint',
    name: 'vscode-eslint',
    displayName: 'ESLint',
    version: '3.0.10',
    description: 'Integrates ESLint JavaScript into VS Code',
    categories: ['Linters'],
    tags: ['linter', 'eslint', 'javascript'],
    verified: true,
    downloadCount: 35_000_000,
    rating: 4.4,
  },
  {
    id: 'ms-python.python',
    name: 'python',
    displayName: 'Python',
    version: '2024.8.1',
    description: 'IntelliSense, linting, debugging, and more for Python',
    categories: ['Programming Languages'],
    tags: ['python', 'language', 'linting', 'debugging'],
    verified: true,
    downloadCount: 110_000_000,
    rating: 4.5,
  },
  {
    id: 'rust-lang.rust-analyzer',
    name: 'rust-analyzer',
    displayName: 'rust-analyzer',
    version: '0.4.2024',
    description: 'Rust language support with rust-analyzer',
    categories: ['Programming Languages'],
    tags: ['rust', 'language', 'analyzer'],
    verified: true,
    downloadCount: 8_000_000,
    rating: 4.8,
  },
  {
    id: 'github.copilot',
    name: 'copilot',
    displayName: 'GitHub Copilot',
    version: '1.200.0',
    description: 'AI pair programmer',
    categories: ['AI'],
    tags: ['ai', 'copilot', 'completion'],
    verified: true,
    downloadCount: 20_000_000,
    rating: 4.3,
  },
  {
    id: 'ms-toolsai.jupyter',
    name: 'jupyter',
    displayName: 'Jupyter',
    version: '2024.7.0',
    description: 'Jupyter notebook support',
    categories: ['Notebooks', 'Data Science'],
    tags: ['jupyter', 'notebook', 'data-science', 'python'],
    verified: true,
    downloadCount: 60_000_000,
    rating: 4.0,
  },
  {
    id: 'bradlc.vscode-tailwindcss',
    name: 'vscode-tailwindcss',
    displayName: 'Tailwind CSS IntelliSense',
    version: '0.12.0',
    description: 'Intelligent Tailwind CSS tooling',
    categories: ['Other'],
    tags: ['tailwind', 'css', 'intellisense'],
    verified: true,
    downloadCount: 15_000_000,
    rating: 4.6,
  },
  {
    id: 'prisma.prisma',
    name: 'prisma',
    displayName: 'Prisma',
    version: '5.14.0',
    description: 'Adds syntax highlighting, formatting, auto-completion and more for Prisma Schema',
    categories: ['Programming Languages'],
    tags: ['prisma', 'database', 'orm'],
    verified: true,
    downloadCount: 7_000_000,
    rating: 4.7,
  },
]

// ═══════════════════════════════════════════════════════════
// MARKETPLACE SERVICE
// ═══════════════════════════════════════════════════════════

import { prisma } from '../database/client';

export class ExtensionMarketplaceService {
  private registry: Map<string, Extension> = new Map()
  private installed: Map<string, InstalledExtension> = new Map()
  private reviews: Map<string, ExtensionReview[]> = new Map()

  constructor() {
    this.initializeRegistry()
  }

  private initializeRegistry(): void {
    // Register built-in extensions
    for (const ext of BUILTIN_EXTENSIONS) {
      const full = this.createFullExtension(ext)
      this.registry.set(full.id, full)
      this.installed.set(full.id, {
        ...full,
        installPath: `/extensions/builtin/${full.name}`,
        installedAt: Date.now(),
        isEnabled: true,
        isBuiltIn: true,
        autoUpdate: false,
        permissions: ['all'],
      })
    }

    // Register featured extensions
    for (const ext of FEATURED_EXTENSIONS) {
      const full = this.createFullExtension(ext)
      this.registry.set(full.id, full)
    }
  }

  private createFullExtension(partial: Partial<Extension>): Extension {
    return {
      id: partial.id || 'unknown.unknown',
      name: partial.name || 'unknown',
      displayName: partial.displayName || partial.name || 'Unknown',
      publisher: partial.publisher || {
        id: (partial.id || '').split('.')[0] || 'unknown',
        name: (partial.id || '').split('.')[0] || 'unknown',
        displayName: (partial.id || '').split('.')[0] || 'Unknown',
        verified: partial.verified || false,
      },
      version: partial.version || '1.0.0',
      description: partial.description || '',
      categories: partial.categories || ['Other'],
      tags: partial.tags || [],
      license: partial.license || 'MIT',
      engine: partial.engine || 'buildspaces ^0.1.0',
      activationEvents: partial.activationEvents || ['*'],
      contributes: partial.contributes || {},
      dependencies: partial.dependencies || [],
      size: partial.size || 0,
      downloadCount: partial.downloadCount || 0,
      rating: partial.rating || 0,
      reviewCount: partial.reviewCount || 0,
      lastUpdated: partial.lastUpdated || Date.now(),
      createdAt: partial.createdAt || Date.now(),
      verified: partial.verified || false,
      preview: partial.preview || false,
    }
  }

  // ─── OpenVSX Registry Integration ───────────────────────

  private normalizeOpenVSXExtension(raw: any): Extension {
    const namespace = raw.namespace || raw.publisher?.name || (raw.namespaceUrl?.split('/').pop()) || 'unknown'
    const name = raw.name || 'unknown'
    const id = `${namespace}.${name}`
    return {
      id,
      name,
      displayName: raw.displayName || name,
      publisher: {
        id: namespace,
        name: namespace,
        displayName: raw.namespaceDisplayName || namespace,
        verified: raw.verified || false,
        avatar: raw.namespaceUrl,
      },
      version: raw.version || '0.0.1',
      description: raw.description || '',
      categories: (raw.categories || ['Other']) as ExtensionCategory[],
      tags: raw.tags || [],
      icon: raw.files?.icon || undefined,
      repository: raw.repository || undefined,
      homepage: raw.homepage || undefined,
      license: raw.license || 'MIT',
      engine: 'vscode ^1.85.0',
      main: undefined,
      activationEvents: ['*'],
      contributes: {},
      dependencies: [],
      size: raw.size || 0,
      downloadCount: raw.downloadCount || 0,
      rating: raw.averageRating || 0,
      reviewCount: raw.reviewCount || 0,
      lastUpdated: raw.timestamp ? new Date(raw.timestamp).getTime() : Date.now(),
      createdAt: raw.publishedDate ? new Date(raw.publishedDate).getTime() : Date.now(),
      verified: raw.verified || false,
      preview: raw.preview || false,
    }
  }

  private async searchOpenVSX(query: ExtensionSearchQuery): Promise<Extension[]> {
    const OPENVSX_API = 'https://open-vsx.org/api'
    const pageSize = query.pageSize || 20
    const offset = ((query.page || 1) - 1) * pageSize

    const params = new URLSearchParams({
      size: String(pageSize),
      offset: String(offset),
    })
    if (query.text) params.set('query', query.text)
    if (query.category) params.set('category', query.category)
    if (query.sortBy && query.sortBy !== 'relevance') params.set('sortBy', query.sortBy === 'publishedDate' ? 'timestamp' : query.sortBy)
    if (query.sortOrder) params.set('sortOrder', query.sortOrder)

    const res = await fetch(`${OPENVSX_API}/-/search?${params.toString()}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`OpenVSX search failed: ${res.status}`)
    const data = await res.json()
    return (data.extensions || []).map((e: any) => this.normalizeOpenVSXExtension(e))
  }

  private async getOpenVSXExtension(publisher: string, name: string): Promise<Extension | null> {
    try {
      const res = await fetch(`https://open-vsx.org/api/${encodeURIComponent(publisher)}/${encodeURIComponent(name)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      })
      if (!res.ok) return null
      const data = await res.json()
      return this.normalizeOpenVSXExtension(data)
    } catch {
      return null
    }
  }

  // ─── Search ──────────────────────────────────────────────

  async search(query: ExtensionSearchQuery): Promise<ExtensionSearchResult> {
    const page = query.page || 1
    const pageSize = query.pageSize || 20

    // Try OpenVSX first for real marketplace data
    try {
      const openVSXResults = await this.searchOpenVSX(query)
      // Register fetched extensions in local registry cache
      for (const ext of openVSXResults) {
        if (!this.registry.has(ext.id)) {
          this.registry.set(ext.id, ext)
        }
      }
      return { extensions: openVSXResults, total: openVSXResults.length, page, pageSize }
    } catch {
      // Fall back to local registry when OpenVSX is unreachable
    }

    // Local fallback
    let results = Array.from(this.registry.values())

    if (query.text) {
      const q = query.text.toLowerCase()
      results = results.filter(
        ext =>
          ext.displayName.toLowerCase().includes(q) ||
          ext.description.toLowerCase().includes(q) ||
          ext.id.toLowerCase().includes(q) ||
          ext.tags.some(t => t.includes(q))
      )
    }
    if (query.category) {
      results = results.filter(ext => ext.categories.includes(query.category!))
    }
    if (query.tags && query.tags.length > 0) {
      results = results.filter(ext => query.tags!.some(tag => ext.tags.includes(tag)))
    }
    if (query.verified) {
      results = results.filter(ext => ext.verified)
    }

    const sortBy = query.sortBy || 'relevance'
    const sortOrder = query.sortOrder || 'desc'
    const multiplier = sortOrder === 'desc' ? -1 : 1
    results.sort((a, b) => {
      switch (sortBy) {
        case 'installs': return multiplier * (a.downloadCount - b.downloadCount)
        case 'rating': return multiplier * (a.rating - b.rating)
        case 'name': return multiplier * a.displayName.localeCompare(b.displayName)
        case 'publishedDate': return multiplier * (a.lastUpdated - b.lastUpdated)
        default: return multiplier * ((a.downloadCount + a.rating * 1000000) - (b.downloadCount + b.rating * 1000000))
      }
    })

    const start = (page - 1) * pageSize
    const paged = results.slice(start, start + pageSize)
    return { extensions: paged, total: results.length, page, pageSize }
  }

  // convenience wrappers for API compatibility
  searchExtensions(query: ExtensionSearchQuery) {
    return this.search(query)
  }

  async installExtension(extensionId: string) {
    // default to system user for now
    return this.install(extensionId, 'system')
  }

  async uninstallExtension(extensionId: string) {
    return this.uninstall(extensionId)
  }

  rateExtension(extensionId: string, review: ExtensionReview) {
    // just forward to internal review map
    const arr = this.reviews.get(extensionId) || []
    arr.push(review)
    this.reviews.set(extensionId, arr)
  }

  async getInstalledExtensions(projectId: string = 'default'): Promise<InstalledExtension[]> {
    return this.getInstalled(projectId)
  }

  // ─── Installation ────────────────────────────────────────

  /** Download extension .vsix from OpenVSX and return the download URL and size */
  private async downloadVsix(publisher: string, name: string, version: string): Promise<{ downloadUrl: string; vsixSize: number }> {
    const downloadUrl = `https://open-vsx.org/api/${publisher}/${name}/${version}/file/${name}-${version}.vsix`
    try {
      // HEAD request to verify availability and get size
      const headRes = await fetch(downloadUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
      if (!headRes.ok) {
        // Fallback: try the generic file endpoint
        const altUrl = `https://open-vsx.org/api/${publisher}/${name}/${version}/file/${name}.vsix`
        const altRes = await fetch(altUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) })
        if (altRes.ok) {
          const size = parseInt(altRes.headers.get('content-length') || '0', 10)
          return { downloadUrl: altUrl, vsixSize: size }
        }
        throw new Error(`VSIX not available: ${headRes.status}`)
      }
      const size = parseInt(headRes.headers.get('content-length') || '0', 10)
      return { downloadUrl, vsixSize: size }
    } catch (err: any) {
      // Non-fatal: extension installs without download (metadata-only)
      console.warn(`VSIX download verification failed for ${publisher}.${name}@${version}:`, err.message)
      return { downloadUrl, vsixSize: 0 }
    }
  }

  async install(extensionId: string, userId: string, projectId: string = 'default'): Promise<InstalledExtension> {
    let ext = this.registry.get(extensionId)
    if (!ext) {
      // Try to fetch from OpenVSX (publisher.name format)
      const [publisher, name] = extensionId.split('.')
      if (publisher && name) {
        const fetched = await this.getOpenVSXExtension(publisher, name)
        if (fetched) {
          this.registry.set(fetched.id, fetched)
          ext = fetched
        }
      }
    }
    if (!ext) throw new Error(`Extension ${extensionId} not found`)

    if (this.installed.has(extensionId)) {
      throw new Error(`Extension ${extensionId} is already installed`)
    }

    // Attempt real .vsix download verification from OpenVSX
    let downloadUrl: string | null = null
    let vsixSize = 0
    const [pub, nm] = extensionId.split('.')
    if (pub && nm && ext.version) {
      const result = await this.downloadVsix(pub, nm, ext.version)
      downloadUrl = result.downloadUrl
      vsixSize = result.vsixSize
    }

    const installed: InstalledExtension = {
      ...ext,
      installPath: `/extensions/user/${ext.name}`,
      installedAt: Date.now(),
      isEnabled: true,
      isBuiltIn: false,
      autoUpdate: true,
      permissions: this.inferPermissions(ext),
      ...(downloadUrl ? { downloadUrl, vsixSize } : {}),
    }

    this.installed.set(extensionId, installed)

    // Increment download count
    ext.downloadCount++

    return installed
  }

  async uninstall(extensionId: string): Promise<boolean> {
    const ext = this.installed.get(extensionId)
    if (!ext) return false
    if (ext.isBuiltIn) throw new Error('Cannot uninstall built-in extensions')

    this.installed.delete(extensionId)
    return true
  }

  async enable(extensionId: string): Promise<void> {
    const ext = this.installed.get(extensionId)
    if (ext) ext.isEnabled = true
  }

  async disable(extensionId: string): Promise<void> {
    const ext = this.installed.get(extensionId)
    if (ext) ext.isEnabled = false
  }

  async update(extensionId: string): Promise<InstalledExtension | null> {
    const installed = this.installed.get(extensionId)
    const registry = this.registry.get(extensionId)
    if (!installed || !registry) return null

    if (installed.version !== registry.version) {
      installed.version = registry.version
      installed.lastUpdated = Date.now()
      return installed
    }
    return null
  }

  // ─── Queries ─────────────────────────────────────────────

  async getInstalled(projectId: string = 'default'): Promise<InstalledExtension[]> {
    try {
      const dbExts = await prisma.installedExtension.findMany({ where: { projectId } });
      if (dbExts && dbExts.length > 0) {
        // Merge with memory
        for (const ext of dbExts) {
          if (this.registry.has(ext.extensionId)) {
             const base = this.registry.get(ext.extensionId)!;
             this.installed.set(ext.extensionId, { ...base, isEnabled: ext.isActive, installedAt: ext.installedAt.getTime(), installPath: `/extensions/${projectId}/${ext.extensionId}`, isBuiltIn: false, autoUpdate: true, permissions: ['all'] });
          }
        }
      }
    } catch (e) { 
      console.error('Failed to load extensions from DB', e);
    }
    return Array.from(this.installed.values());
  }

  getEnabled(): InstalledExtension[] {
    return Array.from(this.installed.values()).filter(e => e.isEnabled)
  }

  getBuiltIn(): InstalledExtension[] {
    return Array.from(this.installed.values()).filter(e => e.isBuiltIn)
  }

  isInstalled(extensionId: string): boolean {
    return this.installed.has(extensionId)
  }

  getFeatured(): Extension[] {
    return Array.from(this.registry.values())
      .filter(e => e.verified && e.downloadCount > 1_000_000)
      .sort((a, b) => b.downloadCount - a.downloadCount)
  }

  getByCategory(category: ExtensionCategory): Extension[] {
    return Array.from(this.registry.values())
      .filter(e => e.categories.includes(category))
  }

  // ─── Reviews ─────────────────────────────────────────────

  async addReview(
    extensionId: string,
    userId: string,
    userName: string,
    rating: number,
    title: string,
    body: string
  ): Promise<ExtensionReview> {
    const review: ExtensionReview = {
      id: `review_${Date.now()}`,
      extensionId,
      userId,
      userName,
      rating: Math.max(1, Math.min(5, rating)),
      title,
      body,
      createdAt: Date.now(),
      helpful: 0,
    }

    if (!this.reviews.has(extensionId)) {
      this.reviews.set(extensionId, [])
    }
    this.reviews.get(extensionId)!.push(review)

    // Recalculate average rating
    const ext = this.registry.get(extensionId)
    if (ext) {
      const allReviews = this.reviews.get(extensionId)!
      ext.rating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      ext.reviewCount = allReviews.length
    }

    return review
  }

  async getReviews(extensionId: string): Promise<ExtensionReview[]> {
    return this.reviews.get(extensionId) || []
  }

  // ─── Permissions ─────────────────────────────────────────

  private inferPermissions(ext: Extension): ExtensionPermission[] {
    const perms: ExtensionPermission[] = ['notifications']

    if (ext.categories.includes('SCM Providers')) perms.push('git')
    if (ext.categories.includes('Debuggers')) perms.push('debug')
    if (ext.categories.includes('AI')) perms.push('network')
    if (ext.contributes.commands?.length) perms.push('filesystem')

    return [...new Set(perms)]
  }

  // ─── Stats ───────────────────────────────────────────────

  getStats() {
    return {
      totalAvailable: this.registry.size,
      totalInstalled: this.installed.size,
      totalBuiltIn: Array.from(this.installed.values()).filter(e => e.isBuiltIn).length,
      totalEnabled: Array.from(this.installed.values()).filter(e => e.isEnabled).length,
      categories: [...new Set(
        Array.from(this.registry.values()).flatMap(e => e.categories)
      )].sort(),
    }
  }
}

export const extensionMarketplace = new ExtensionMarketplaceService()
