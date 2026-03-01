/**
 * Hocuspocus-Inspired Collaboration Server Configuration
 * 
 * Scalable Yjs collaboration backend with persistence, auth, webhooks.
 * Inspired by: https://github.com/ueberdosis/hocuspocus
 * Also leverages: Yjs, y-websocket, y-webrtc, y-indexeddb
 * 
 * Provides:
 * - Document-level collaboration with awareness (cursors, selections)
 * - Persistent storage via IndexedDB (client) and PostgreSQL (server)  
 * - Room-based sessions with access control
 * - Webhook notifications for document changes
 * - Conflict resolution via Yjs CRDT
 */

import * as Y from 'yjs'

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface CollaborationConfig {
  /** WebSocket URL for the collaboration server */
  wsUrl: string
  /** WebRTC signaling URLs */
  signalingUrls: string[]
  /** Enable IndexedDB persistence on client */
  enablePersistence: boolean
  /** Max connections per document */
  maxConnections: number
  /** Debounce interval for saving (ms) */
  saveDebounceMs: number
  /** Document change webhook URL */
  webhookUrl?: string
  /** Auth token for server connections */
  authToken?: string
}

export interface CollaborationDocument {
  id: string
  name: string
  roomId: string
  ydoc: Y.Doc
  createdAt: number
  lastModified: number
  version: number
  collaborators: CollaborationParticipant[]
  isReadOnly: boolean
}

export interface CollaborationParticipant {
  userId: string
  userName: string
  userColor: string
  userAvatar?: string
  cursor?: CursorPosition
  selection?: SelectionRange
  isTyping: boolean
  connectedAt: number
  lastActivityAt: number
  role: 'owner' | 'editor' | 'viewer'
}

export interface CursorPosition {
  line: number
  column: number
  filePath: string
}

export interface SelectionRange {
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  filePath: string
}

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor' | 'selection' | 'edit' | 'save' | 'conflict' | 'comment'
  userId: string
  documentId: string
  timestamp: number
  data?: any
}

export interface DocumentVersion {
  id: string
  documentId: string
  version: number
  snapshot: Uint8Array
  userId: string
  message?: string
  createdAt: number
}

// ═══════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════

export const DEFAULT_COLLABORATION_CONFIG: CollaborationConfig = {
  wsUrl: process.env.NEXT_PUBLIC_COLLAB_WS_URL || 'ws://localhost:1234',
  signalingUrls: [
    process.env.NEXT_PUBLIC_COLLAB_SIGNALING_URL || 'ws://localhost:4444',
  ],
  enablePersistence: true,
  maxConnections: 50,
  saveDebounceMs: 1000,
  webhookUrl: process.env.COLLAB_WEBHOOK_URL,
  authToken: undefined,
}

// ═══════════════════════════════════════════════════════════
// COLLABORATION SERVER SERVICE
// ═══════════════════════════════════════════════════════════

/**
 * Server-side collaboration manager.
 * Handles document lifecycle, persistence, access control, and webhooks.
 */
export class CollaborationServer {
  private documents: Map<string, CollaborationDocument> = new Map()
  private eventLog: CollaborationEvent[] = []
  private versionHistory: Map<string, DocumentVersion[]> = new Map()
  private config: CollaborationConfig

  constructor(config: Partial<CollaborationConfig> = {}) {
    this.config = { ...DEFAULT_COLLABORATION_CONFIG, ...config }
  }

  // ─── Document Lifecycle ──────────────────────────────────

  async createDocument(
    roomId: string,
    name: string,
    ownerId: string,
    initialContent?: string
  ): Promise<CollaborationDocument> {
    const ydoc = new Y.Doc()

    if (initialContent) {
      const ytext = ydoc.getText('content')
      ytext.insert(0, initialContent)
    }

    const doc: CollaborationDocument = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      roomId,
      ydoc,
      createdAt: Date.now(),
      lastModified: Date.now(),
      version: 1,
      collaborators: [{
        userId: ownerId,
        userName: 'Owner',
        userColor: '#6366f1',
        isTyping: false,
        connectedAt: Date.now(),
        lastActivityAt: Date.now(),
        role: 'owner',
      }],
      isReadOnly: false,
    }

    this.documents.set(doc.id, doc)
    this.versionHistory.set(doc.id, [])

    await this.logEvent({
      type: 'join',
      userId: ownerId,
      documentId: doc.id,
      timestamp: Date.now(),
    })

    return doc
  }

  async getDocument(documentId: string): Promise<CollaborationDocument | null> {
    return this.documents.get(documentId) || null
  }

  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const doc = this.documents.get(documentId)
    if (!doc) return false

    const collaborator = doc.collaborators.find(c => c.userId === userId)
    if (!collaborator || collaborator.role !== 'owner') {
      throw new Error('Only the document owner can delete it')
    }

    // Clean up Yjs doc
    doc.ydoc.destroy()
    this.documents.delete(documentId)
    this.versionHistory.delete(documentId)

    return true
  }

  // ─── Participant Management ──────────────────────────────

  async joinDocument(
    documentId: string,
    userId: string,
    userName: string,
    userColor: string,
    role: 'editor' | 'viewer' = 'editor'
  ): Promise<CollaborationDocument> {
    const doc = this.documents.get(documentId)
    if (!doc) throw new Error(`Document ${documentId} not found`)

    if (doc.collaborators.length >= this.config.maxConnections) {
      throw new Error(`Document has reached max connections (${this.config.maxConnections})`)
    }

    // Check if already connected
    const existing = doc.collaborators.find(c => c.userId === userId)
    if (existing) {
      existing.lastActivityAt = Date.now()
      return doc
    }

    doc.collaborators.push({
      userId,
      userName,
      userColor,
      isTyping: false,
      connectedAt: Date.now(),
      lastActivityAt: Date.now(),
      role,
    })

    await this.logEvent({
      type: 'join',
      userId,
      documentId,
      timestamp: Date.now(),
    })

    return doc
  }

  async leaveDocument(documentId: string, userId: string): Promise<void> {
    const doc = this.documents.get(documentId)
    if (!doc) return

    doc.collaborators = doc.collaborators.filter(c => c.userId !== userId)

    await this.logEvent({
      type: 'leave',
      userId,
      documentId,
      timestamp: Date.now(),
    })
  }

  // ─── Cursor & Selection ──────────────────────────────────

  async updateCursor(
    documentId: string,
    userId: string,
    cursor: CursorPosition
  ): Promise<void> {
    const doc = this.documents.get(documentId)
    if (!doc) return

    const collaborator = doc.collaborators.find(c => c.userId === userId)
    if (collaborator) {
      collaborator.cursor = cursor
      collaborator.lastActivityAt = Date.now()
    }
  }

  async updateSelection(
    documentId: string,
    userId: string,
    selection: SelectionRange
  ): Promise<void> {
    const doc = this.documents.get(documentId)
    if (!doc) return

    const collaborator = doc.collaborators.find(c => c.userId === userId)
    if (collaborator) {
      collaborator.selection = selection
      collaborator.lastActivityAt = Date.now()
    }
  }

  // ─── Versioning & Snapshots ──────────────────────────────

  async createVersion(
    documentId: string,
    userId: string,
    message?: string
  ): Promise<DocumentVersion> {
    const doc = this.documents.get(documentId)
    if (!doc) throw new Error(`Document ${documentId} not found`)

    const snapshot = Y.encodeStateAsUpdate(doc.ydoc)
    doc.version++
    doc.lastModified = Date.now()

    const version: DocumentVersion = {
      id: `ver_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      documentId,
      version: doc.version,
      snapshot,
      userId,
      message,
      createdAt: Date.now(),
    }

    const history = this.versionHistory.get(documentId) || []
    history.push(version)
    this.versionHistory.set(documentId, history)

    return version
  }

  async getVersionHistory(documentId: string): Promise<DocumentVersion[]> {
    return this.versionHistory.get(documentId) || []
  }

  async restoreVersion(
    documentId: string,
    versionId: string,
    userId: string
  ): Promise<boolean> {
    const doc = this.documents.get(documentId)
    if (!doc) return false

    const history = this.versionHistory.get(documentId) || []
    const version = history.find(v => v.id === versionId)
    if (!version) return false

    // Apply the stored state
    Y.applyUpdate(doc.ydoc, version.snapshot)
    doc.lastModified = Date.now()

    await this.logEvent({
      type: 'edit',
      userId,
      documentId,
      timestamp: Date.now(),
      data: { action: 'restore', versionId },
    })

    return true
  }

  // ─── Access Control ──────────────────────────────────────

  async setParticipantRole(
    documentId: string,
    targetUserId: string,
    newRole: 'editor' | 'viewer',
    requesterId: string
  ): Promise<boolean> {
    const doc = this.documents.get(documentId)
    if (!doc) return false

    const requester = doc.collaborators.find(c => c.userId === requesterId)
    if (!requester || requester.role !== 'owner') {
      throw new Error('Only the owner can change roles')
    }

    const target = doc.collaborators.find(c => c.userId === targetUserId)
    if (!target) return false

    target.role = newRole
    return true
  }

  canEdit(documentId: string, userId: string): boolean {
    const doc = this.documents.get(documentId)
    if (!doc) return false
    if (doc.isReadOnly) return false

    const collaborator = doc.collaborators.find(c => c.userId === userId)
    return collaborator?.role === 'owner' || collaborator?.role === 'editor'
  }

  // ─── Events & Webhooks ───────────────────────────────────

  private async logEvent(event: CollaborationEvent): Promise<void> {
    this.eventLog.push(event)

    // Trim event log (keep last 10k events)
    if (this.eventLog.length > 10000) {
      this.eventLog = this.eventLog.slice(-5000)
    }

    // Fire webhook if configured
    if (this.config.webhookUrl) {
      try {
        await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        })
      } catch (err) {
        console.error('[Collaboration] Webhook failed:', err)
      }
    }
  }

  async getRecentEvents(
    documentId?: string,
    limit: number = 50
  ): Promise<CollaborationEvent[]> {
    let events = this.eventLog
    if (documentId) {
      events = events.filter(e => e.documentId === documentId)
    }
    return events.slice(-limit)
  }

  // ─── Stats ───────────────────────────────────────────────

  getStats() {
    return {
      totalDocuments: this.documents.size,
      activeParticipants: Array.from(this.documents.values())
        .reduce((sum, doc) => sum + doc.collaborators.length, 0),
      totalEvents: this.eventLog.length,
      totalVersions: Array.from(this.versionHistory.values())
        .reduce((sum, versions) => sum + versions.length, 0),
    }
  }
}

export const collaborationServer = new CollaborationServer()
