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

  // ─── Search ──────────────────────────────────────────────

  async search(query: ExtensionSearchQuery): Promise<ExtensionSearchResult> {
    let results = Array.from(this.registry.values())

    // Text search
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

    // Category filter
    if (query.category) {
      results = results.filter(ext => ext.categories.includes(query.category!))
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      results = results.filter(ext =>
        query.tags!.some(tag => ext.tags.includes(tag))
      )
    }

    // Verified only
    if (query.verified) {
      results = results.filter(ext => ext.verified)
    }

    // Sort
    const sortBy = query.sortBy || 'relevance'
    const sortOrder = query.sortOrder || 'desc'
    const multiplier = sortOrder === 'desc' ? -1 : 1

    results.sort((a, b) => {
      switch (sortBy) {
        case 'installs': return multiplier * (a.downloadCount - b.downloadCount)
        case 'rating': return multiplier * (a.rating - b.rating)
        case 'name': return multiplier * a.displayName.localeCompare(b.displayName)
        case 'publishedDate': return multiplier * (a.lastUpdated - b.lastUpdated)
        default: // relevance = installs + rating
          return multiplier * ((a.downloadCount + a.rating * 1000000) - (b.downloadCount + b.rating * 1000000))
      }
    })

    // Pagination
    const page = query.page || 1
    const pageSize = query.pageSize || 20
    const start = (page - 1) * pageSize
    const paged = results.slice(start, start + pageSize)

    return {
      extensions: paged,
      total: results.length,
      page,
      pageSize,
    }
  }

  // ─── Installation ────────────────────────────────────────

  async install(extensionId: string, userId: string): Promise<InstalledExtension> {
    const ext = this.registry.get(extensionId)
    if (!ext) throw new Error(`Extension ${extensionId} not found`)

    if (this.installed.has(extensionId)) {
      throw new Error(`Extension ${extensionId} is already installed`)
    }

    const installed: InstalledExtension = {
      ...ext,
      installPath: `/extensions/user/${ext.name}`,
      installedAt: Date.now(),
      isEnabled: true,
      isBuiltIn: false,
      autoUpdate: true,
      permissions: this.inferPermissions(ext),
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

  getInstalled(): InstalledExtension[] {
    return Array.from(this.installed.values())
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
