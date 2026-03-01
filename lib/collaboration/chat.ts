/**
 * Collaboration Chat Service
 * 
 * Real-time in-editor chat for Azora BuildSpaces.
 * Supports: contextual chat (file/line/selection), threads, reactions, mentions.
 * Backed by Yjs CRDT for conflict-free real-time sync.
 */

import * as Y from 'yjs'

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  userColor: string
  userAvatar?: string
  content: string
  type: 'text' | 'code' | 'system' | 'suggestion' | 'review'
  timestamp: number
  editedAt?: number
  context?: ChatContext
  threadId?: string
  replyTo?: string
  reactions: ChatReaction[]
  mentions: string[]
  attachments: ChatAttachment[]
  isResolved?: boolean
}

export interface ChatContext {
  type: 'global' | 'file' | 'line' | 'selection'
  filePath?: string
  startLine?: number
  endLine?: number
  startColumn?: number
  endColumn?: number
  codeSnippet?: string
  language?: string
}

export interface ChatReaction {
  emoji: string
  userIds: string[]
}

export interface ChatAttachment {
  id: string
  name: string
  type: 'image' | 'file' | 'code-snippet' | 'diff'
  url?: string
  content?: string
  language?: string
}

export interface ChatThread {
  id: string
  parentMessageId: string
  messages: ChatMessage[]
  participantIds: string[]
  isResolved: boolean
  createdAt: number
  lastActivityAt: number
}

export interface ChatRoom {
  id: string
  name: string
  type: 'workspace' | 'file' | 'review' | 'direct'
  participantIds: string[]
  messages: ChatMessage[]
  threads: Map<string, ChatThread>
  createdAt: number
  lastActivityAt: number
  isArchived: boolean
}

export interface ChatUser {
  id: string
  name: string
  color: string
  avatar?: string
  status: 'online' | 'away' | 'dnd' | 'offline'
  lastSeen: number
  isTyping: boolean
  currentFile?: string
}

export interface ChatNotification {
  id: string
  type: 'mention' | 'reply' | 'reaction' | 'review-request'
  fromUserId: string
  messageId: string
  roomId: string
  read: boolean
  createdAt: number
}

// ═══════════════════════════════════════════════════════════
// CHAT SERVICE
// ═══════════════════════════════════════════════════════════

export class CollaborationChatService {
  private rooms: Map<string, ChatRoom> = new Map()
  private users: Map<string, ChatUser> = new Map()
  private notifications: Map<string, ChatNotification[]> = new Map()
  private yDoc: Y.Doc | null = null
  private messageListeners: Array<(message: ChatMessage, roomId: string) => void> = []
  private typingListeners: Array<(userId: string, roomId: string, isTyping: boolean) => void> = []

  constructor(yDoc?: Y.Doc) {
    this.yDoc = yDoc || null
  }

  /**
   * Initialize with a Yjs document for real-time sync
   */
  initWithYDoc(doc: Y.Doc): void {
    this.yDoc = doc
  }

  /**
   * Create or join a chat room
   */
  createRoom(id: string, name: string, type: ChatRoom['type'], participantIds: string[]): ChatRoom {
    const existing = this.rooms.get(id)
    if (existing) return existing

    const room: ChatRoom = {
      id,
      name,
      type,
      participantIds,
      messages: [],
      threads: new Map(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isArchived: false,
    }

    this.rooms.set(id, room)

    // Sync with Yjs if available
    if (this.yDoc) {
      const yMessages = this.yDoc.getArray<any>(`chat-${id}`)
      yMessages.observe((event) => {
        // Handle remote changes
        for (const delta of event.changes.delta) {
          if (delta.insert) {
            for (const msg of delta.insert as any[]) {
              this.handleRemoteMessage(id, msg)
            }
          }
        }
      })
    }

    return room
  }

  /**
   * Send a message to a chat room
   */
  sendMessage(
    roomId: string,
    userId: string,
    content: string,
    options?: {
      type?: ChatMessage['type']
      context?: ChatContext
      threadId?: string
      replyTo?: string
      mentions?: string[]
      attachments?: ChatAttachment[]
    }
  ): ChatMessage {
    const room = this.rooms.get(roomId)
    if (!room) throw new Error(`Chat room ${roomId} not found`)

    const user = this.users.get(userId)
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      userName: user?.name || 'Unknown',
      userColor: user?.color || '#888888',
      userAvatar: user?.avatar,
      content,
      type: options?.type || 'text',
      timestamp: Date.now(),
      context: options?.context,
      threadId: options?.threadId,
      replyTo: options?.replyTo,
      reactions: [],
      mentions: options?.mentions || [],
      attachments: options?.attachments || [],
    }

    // Extract mentions from content
    const mentionMatches = content.match(/@(\w+)/g)
    if (mentionMatches) {
      message.mentions = [...new Set([...message.mentions, ...mentionMatches.map(m => m.slice(1))])]
    }

    // Add to room or thread
    if (options?.threadId) {
      const thread = room.threads.get(options.threadId)
      if (thread) {
        thread.messages.push(message)
        thread.lastActivityAt = Date.now()
        if (!thread.participantIds.includes(userId)) {
          thread.participantIds.push(userId)
        }
      }
    } else {
      room.messages.push(message)
    }

    room.lastActivityAt = Date.now()

    // Sync with Yjs
    if (this.yDoc) {
      const yMessages = this.yDoc.getArray<any>(`chat-${roomId}`)
      yMessages.push([message])
    }

    // Generate notifications
    this.generateNotifications(message, roomId)

    // Notify listeners
    for (const listener of this.messageListeners) {
      listener(message, roomId)
    }

    return message
  }

  /**
   * Edit a message
   */
  editMessage(roomId: string, messageId: string, userId: string, newContent: string): ChatMessage | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const message = room.messages.find(m => m.id === messageId)
    if (!message || message.userId !== userId) return null

    message.content = newContent
    message.editedAt = Date.now()

    return message
  }

  /**
   * Delete a message
   */
  deleteMessage(roomId: string, messageId: string, userId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) return false

    const index = room.messages.findIndex(m => m.id === messageId && m.userId === userId)
    if (index === -1) return false

    room.messages.splice(index, 1)
    return true
  }

  /**
   * Add a reaction to a message
   */
  addReaction(roomId: string, messageId: string, userId: string, emoji: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    const message = this.findMessage(room, messageId)
    if (!message) return

    const reaction = message.reactions.find(r => r.emoji === emoji)
    if (reaction) {
      if (!reaction.userIds.includes(userId)) {
        reaction.userIds.push(userId)
      }
    } else {
      message.reactions.push({ emoji, userIds: [userId] })
    }
  }

  /**
   * Create a thread from a message
   */
  createThread(roomId: string, parentMessageId: string, userId: string): ChatThread {
    const room = this.rooms.get(roomId)
    if (!room) throw new Error(`Room ${roomId} not found`)

    const threadId = `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const thread: ChatThread = {
      id: threadId,
      parentMessageId,
      messages: [],
      participantIds: [userId],
      isResolved: false,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    }

    room.threads.set(threadId, thread)
    return thread
  }

  /**
   * Resolve a thread (mark code review as done, etc.)
   */
  resolveThread(roomId: string, threadId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    const thread = room.threads.get(threadId)
    if (thread) {
      thread.isResolved = true
    }
  }

  /**
   * Register a user
   */
  registerUser(user: ChatUser): void {
    this.users.set(user.id, user)
  }

  /**
   * Update user status
   */
  updateUserStatus(userId: string, status: ChatUser['status']): void {
    const user = this.users.get(userId)
    if (user) {
      user.status = status
      user.lastSeen = Date.now()
    }
  }

  /**
   * Set typing indicator
   */
  setTyping(userId: string, roomId: string, isTyping: boolean): void {
    const user = this.users.get(userId)
    if (user) {
      user.isTyping = isTyping
    }
    for (const listener of this.typingListeners) {
      listener(userId, roomId, isTyping)
    }
  }

  /**
   * Get messages for a room
   */
  getMessages(roomId: string, options?: { limit?: number; before?: number; after?: number }): ChatMessage[] {
    const room = this.rooms.get(roomId)
    if (!room) return []

    let messages = [...room.messages]

    if (options?.before) {
      messages = messages.filter(m => m.timestamp < options.before!)
    }
    if (options?.after) {
      messages = messages.filter(m => m.timestamp > options.after!)
    }
    if (options?.limit) {
      messages = messages.slice(-options.limit)
    }

    return messages
  }

  /**
   * Get messages for a specific file context
   */
  getFileMessages(roomId: string, filePath: string): ChatMessage[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return room.messages.filter(m => m.context?.filePath === filePath)
  }

  /**
   * Get messages for a specific line range
   */
  getLineMessages(roomId: string, filePath: string, startLine: number, endLine: number): ChatMessage[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return room.messages.filter(m => {
      if (!m.context || m.context.filePath !== filePath) return false
      if (m.context.startLine == null) return false
      return m.context.startLine >= startLine && (m.context.endLine || m.context.startLine) <= endLine
    })
  }

  /**
   * Search messages
   */
  searchMessages(query: string, roomId?: string): Array<{ message: ChatMessage; roomId: string }> {
    const results: Array<{ message: ChatMessage; roomId: string }> = []
    const lowerQuery = query.toLowerCase()

    const rooms = roomId ? [this.rooms.get(roomId)].filter(Boolean) : Array.from(this.rooms.values())
    
    for (const room of rooms) {
      if (!room) continue
      for (const message of room.messages) {
        if (message.content.toLowerCase().includes(lowerQuery)) {
          results.push({ message, roomId: room.id })
        }
      }
    }

    return results
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(userId: string): number {
    const userNotifications = this.notifications.get(userId) || []
    return userNotifications.filter(n => !n.read).length
  }

  /**
   * Get notifications for a user
   */
  getNotifications(userId: string): ChatNotification[] {
    return this.notifications.get(userId) || []
  }

  /**
   * Mark notifications as read
   */
  markNotificationsRead(userId: string, notificationIds?: string[]): void {
    const userNotifications = this.notifications.get(userId) || []
    for (const n of userNotifications) {
      if (!notificationIds || notificationIds.includes(n.id)) {
        n.read = true
      }
    }
  }

  /**
   * Listen for new messages
   */
  onMessage(callback: (message: ChatMessage, roomId: string) => void): () => void {
    this.messageListeners.push(callback)
    return () => {
      this.messageListeners = this.messageListeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Listen for typing indicators
   */
  onTyping(callback: (userId: string, roomId: string, isTyping: boolean) => void): () => void {
    this.typingListeners.push(callback)
    return () => {
      this.typingListeners = this.typingListeners.filter(cb => cb !== callback)
    }
  }

  /**
   * Get all online users in a room
   */
  getOnlineUsers(roomId: string): ChatUser[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return room.participantIds
      .map(id => this.users.get(id))
      .filter((u): u is ChatUser => u != null && u.status !== 'offline')
  }

  // ═══════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════

  private findMessage(room: ChatRoom, messageId: string): ChatMessage | undefined {
    let message = room.messages.find(m => m.id === messageId)
    if (message) return message

    for (const thread of room.threads.values()) {
      message = thread.messages.find(m => m.id === messageId)
      if (message) return message
    }
    return undefined
  }

  private handleRemoteMessage(roomId: string, msgData: any): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    // Avoid duplicates
    if (room.messages.some(m => m.id === msgData.id)) return

    room.messages.push(msgData)
    for (const listener of this.messageListeners) {
      listener(msgData, roomId)
    }
  }

  private generateNotifications(message: ChatMessage, roomId: string): void {
    // Notify mentioned users
    for (const mentionedUser of message.mentions) {
      const userNotifications = this.notifications.get(mentionedUser) || []
      userNotifications.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'mention',
        fromUserId: message.userId,
        messageId: message.id,
        roomId,
        read: false,
        createdAt: Date.now(),
      })
      this.notifications.set(mentionedUser, userNotifications)
    }

    // Notify thread participants for replies
    if (message.threadId) {
      const room = this.rooms.get(roomId)
      const thread = room?.threads.get(message.threadId)
      if (thread) {
        for (const participantId of thread.participantIds) {
          if (participantId === message.userId) continue
          const userNotifications = this.notifications.get(participantId) || []
          userNotifications.push({
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'reply',
            fromUserId: message.userId,
            messageId: message.id,
            roomId,
            read: false,
            createdAt: Date.now(),
          })
          this.notifications.set(participantId, userNotifications)
        }
      }
    }
  }
}

export const collaborationChat = new CollaborationChatService()
