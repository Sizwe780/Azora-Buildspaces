"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  MessageSquare,
  Send,
  Smile,
  Paperclip,
  AtSign,
  Hash,
  Reply,
  MoreHorizontal,
  X,
  Code2,
  FileCode,
  Check,
  CheckCheck,
  Edit2,
  Trash2,
  MessageCircle,
  Search,
  ChevronDown,
  Pin,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ChatMessage {
  id: string
  userId: string
  userName: string
  userColor: string
  userAvatar?: string
  content: string
  type: "text" | "code" | "system" | "suggestion" | "review"
  timestamp: number
  editedAt?: number
  context?: {
    type: "global" | "file" | "line" | "selection"
    filePath?: string
    startLine?: number
    endLine?: number
    codeSnippet?: string
    language?: string
  }
  threadId?: string
  replyTo?: string
  reactions: { emoji: string; userIds: string[] }[]
  mentions: string[]
  isResolved?: boolean
}

interface ChatUser {
  id: string
  name: string
  color: string
  avatar?: string
  isOnline: boolean
  isTyping?: boolean
}

interface CollaborationChatPanelProps {
  roomId: string
  currentUserId: string
  currentUserName: string
  currentUserColor?: string
  activeFile?: string
  activeLine?: number
  onNavigateToFile?: (filePath: string, line?: number) => void
}

// ═══════════════════════════════════════════════════════════
// EMOJI QUICK PICKER
// ═══════════════════════════════════════════════════════════

const QUICK_REACTIONS = ["👍", "👎", "❤️", "🎉", "🤔", "👀", "🚀", "🐛", "✅", "💡"]

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-full mb-1 left-0 bg-popover border border-border rounded-lg shadow-lg p-2 z-50"
    >
      <div className="grid grid-cols-5 gap-1">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji)
              onClose()
            }}
            className="w-8 h-8 flex items-center justify-center text-base rounded hover:bg-muted/50 transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════
// MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════

function ChatMessageItem({
  message,
  currentUserId,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onThreadOpen,
  onNavigateToFile,
}: {
  message: ChatMessage
  currentUserId: string
  onReply: (msg: ChatMessage) => void
  onReact: (msgId: string, emoji: string) => void
  onEdit: (msgId: string, content: string) => void
  onDelete: (msgId: string) => void
  onThreadOpen: (msgId: string) => void
  onNavigateToFile?: (filePath: string, line?: number) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const isOwn = message.userId === currentUserId
  const timeStr = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  if (message.type === "system") {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground px-2">{message.content}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    )
  }

  return (
    <div
      className="group relative px-4 py-1.5 hover:bg-muted/30 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false)
        setShowEmojiPicker(false)
      }}
    >
      {/* Context Badge */}
      {message.context && message.context.type !== "global" && (
        <button
          onClick={() =>
            message.context?.filePath &&
            onNavigateToFile?.(message.context.filePath, message.context.startLine)
          }
          className="flex items-center gap-1.5 mb-1 px-2 py-0.5 rounded-md bg-muted/50 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors w-fit"
        >
          <FileCode className="w-3 h-3" />
          <span>
            {message.context.filePath?.split("/").pop()}
            {message.context.startLine && `:${message.context.startLine}`}
            {message.context.endLine && message.context.endLine !== message.context.startLine
              ? `-${message.context.endLine}`
              : ""}
          </span>
        </button>
      )}

      {/* Code Snippet */}
      {message.context?.codeSnippet && (
        <div className="mb-1.5 mx-0 rounded-md overflow-hidden border border-border">
          <div className="px-2 py-1 bg-muted/50 text-[10px] text-muted-foreground flex items-center gap-1.5">
            <Code2 className="w-3 h-3" />
            <span>{message.context.language || "code"}</span>
          </div>
          <pre className="px-3 py-2 text-[11px] font-mono bg-background/50 overflow-x-auto max-h-32">
            <code>{message.context.codeSnippet}</code>
          </pre>
        </div>
      )}

      {/* Message */}
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
          style={{ backgroundColor: message.userColor }}
        >
          {message.userAvatar || message.userName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name + Time */}
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold" style={{ color: message.userColor }}>
              {message.userName}
            </span>
            <span className="text-[10px] text-muted-foreground">{timeStr}</span>
            {message.editedAt && <span className="text-[10px] text-muted-foreground">(edited)</span>}
            {message.isResolved && (
              <span className="flex items-center gap-0.5 text-[10px] text-green-400">
                <CheckCheck className="w-3 h-3" /> resolved
              </span>
            )}
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave()
                  if (e.key === "Escape") setIsEditing(false)
                }}
                className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button onClick={handleEditSave} className="text-xs text-primary hover:underline">
                Save
              </button>
              <button onClick={() => setIsEditing(false)} className="text-xs text-muted-foreground hover:underline">
                Cancel
              </button>
            </div>
          ) : message.type === "code" ? (
            <pre className="mt-0.5 text-xs font-mono bg-muted/30 rounded px-2 py-1 overflow-x-auto">
              <code>{message.content}</code>
            </pre>
          ) : (
            <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Reactions */}
          {message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {message.reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onClick={() => onReact(message.id, reaction.emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${
                    reaction.userIds.includes(currentUserId)
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span className="text-[10px]">{reaction.userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      <AnimatePresence>
        {showActions && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-0 right-2 -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.5 bg-popover border border-border rounded-md shadow-sm"
          >
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                title="React"
              >
                <Smile className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <EmojiPicker
                    onSelect={(emoji) => onReact(message.id, emoji)}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => onReply(message)}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onThreadOpen(message.id)}
              className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Start Thread"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => {
                    setEditContent(message.content)
                    setIsEditing(true)
                  }}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(message.id)}
                  className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TYPING INDICATOR
// ═══════════════════════════════════════════════════════════

function TypingIndicator({ users }: { users: ChatUser[] }) {
  if (users.length === 0) return null

  const names = users.map((u) => u.name)
  let text = ""
  if (names.length === 1) text = `${names[0]} is typing`
  else if (names.length === 2) text = `${names[0]} and ${names[1]} are typing`
  else text = `${names[0]} and ${names.length - 1} others are typing`

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-muted-foreground">
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
      </div>
      <span>{text}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// MAIN CHAT PANEL
// ═══════════════════════════════════════════════════════════

export function CollaborationChatPanel({
  roomId,
  currentUserId,
  currentUserName,
  currentUserColor = "#6366f1",
  activeFile,
  activeLine,
  onNavigateToFile,
}: CollaborationChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [contextMode, setContextMode] = useState<"global" | "file" | "line">("global")
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([])
  const [typingUsers, setTypingUsers] = useState<ChatUser[]>([])
  const [showMentionList, setShowMentionList] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const params = new URLSearchParams({ roomId })
        if (contextMode === "file" && activeFile) params.set("fileId", activeFile)
        const res = await fetch(`/api/collaboration/chat?${params}`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages) setMessages(data.messages)
        }
      } catch (err) {
        console.error("Failed to load messages:", err)
      }
    }
    loadMessages()
  }, [roomId, contextMode, activeFile])

  // Typing indicator management
  const emitTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    // In a real implementation, emit to Yjs or websocket
    typingTimeoutRef.current = setTimeout(() => {
      // Clear typing state
    }, 2000)
  }, [])

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim()) return

    const context =
      contextMode === "file" && activeFile
        ? { type: "file" as const, filePath: activeFile }
        : contextMode === "line" && activeFile && activeLine
        ? { type: "line" as const, filePath: activeFile, startLine: activeLine }
        : { type: "global" as const }

    // Extract mentions
    const mentionRegex = /@(\w+)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(inputValue)) !== null) {
      mentions.push(match[1])
    }

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      userId: currentUserId,
      userName: currentUserName,
      userColor: currentUserColor,
      content: inputValue.trim(),
      type: inputValue.trim().startsWith("```") ? "code" : "text",
      timestamp: Date.now(),
      context,
      replyTo: replyingTo?.id,
      reactions: [],
      mentions,
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
    setReplyingTo(null)

    // Persist via API
    try {
      await fetch("/api/collaboration/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId: currentUserId,
          userName: currentUserName,
          userColor: currentUserColor,
          content: newMessage.content,
          type: newMessage.type,
          contextType: context.type,
          filePath: context.type !== "global" ? ("filePath" in context ? context.filePath : undefined) : undefined,
          line: context.type === "line" && "startLine" in context ? context.startLine : undefined,
          replyToId: replyingTo?.id,
          mentions,
        }),
      })
    } catch (err) {
      console.error("Failed to send message:", err)
    }
  }

  // Reaction toggle
  const handleReact = async (messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg
        const reactions = [...msg.reactions]
        const existing = reactions.find((r) => r.emoji === emoji)
        if (existing) {
          if (existing.userIds.includes(currentUserId)) {
            existing.userIds = existing.userIds.filter((id) => id !== currentUserId)
            if (existing.userIds.length === 0) {
              return { ...msg, reactions: reactions.filter((r) => r.emoji !== emoji) }
            }
          } else {
            existing.userIds.push(currentUserId)
          }
        } else {
          reactions.push({ emoji, userIds: [currentUserId] })
        }
        return { ...msg, reactions }
      })
    )

    try {
      await fetch("/api/collaboration/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "react", messageId, emoji, userId: currentUserId }),
      })
    } catch (err) {
      console.error("Failed to react:", err)
    }
  }

  // Edit message
  const handleEdit = async (messageId: string, newContent: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, content: newContent, editedAt: Date.now() } : msg
      )
    )

    try {
      await fetch("/api/collaboration/chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", messageId, content: newContent, userId: currentUserId }),
      })
    } catch (err) {
      console.error("Failed to edit:", err)
    }
  }

  // Delete message
  const handleDelete = async (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))

    try {
      await fetch(`/api/collaboration/chat?messageId=${messageId}&userId=${currentUserId}`, {
        method: "DELETE",
      })
    } catch (err) {
      console.error("Failed to delete:", err)
    }
  }

  // Search
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages

  // Input key handling
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === "@") {
      setShowMentionList(true)
    }
    emitTyping()
  }

  // Mention autocomplete
  const handleMentionSelect = (user: ChatUser) => {
    setInputValue((prev) => prev + `@${user.name} `)
    setShowMentionList(false)
    inputRef.current?.focus()
  }

  const contextModes = [
    { key: "global" as const, label: "All", icon: <Hash className="w-3 h-3" /> },
    { key: "file" as const, label: "File", icon: <FileCode className="w-3 h-3" /> },
    { key: "line" as const, label: "Line", icon: <Code2 className="w-3 h-3" /> },
  ]

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">Chat</span>
          {onlineUsers.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {onlineUsers.length} online
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Context Mode Toggle */}
          <div className="flex items-center gap-0.5 px-1 py-0.5 bg-muted/30 rounded-md">
            {contextModes.map((mode) => (
              <button
                key={mode.key}
                onClick={() => setContextMode(mode.key)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                  contextMode === mode.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={`Show ${mode.label.toLowerCase()} messages`}
              >
                {mode.icon}
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs bg-transparent focus:outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery("") }}>
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <span className="text-xs">
              {searchQuery ? "No messages found" : "No messages yet. Start the conversation!"}
            </span>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              currentUserId={currentUserId}
              onReply={setReplyingTo}
              onReact={handleReact}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onThreadOpen={(id) => console.log("Open thread:", id)}
              onNavigateToFile={onNavigateToFile}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <TypingIndicator users={typingUsers} />

      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20">
              <Reply className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground">
                Replying to{" "}
                <span className="font-medium" style={{ color: replyingTo.userColor }}>
                  {replyingTo.userName}
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground truncate flex-1">
                {replyingTo.content.slice(0, 50)}
                {replyingTo.content.length > 50 ? "..." : ""}
              </span>
              <button onClick={() => setReplyingTo(null)}>
                <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="border-t border-border p-2">
        {/* Mention Popup */}
        <AnimatePresence>
          {showMentionList && onlineUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mb-2 bg-popover border border-border rounded-md shadow-lg p-1 max-h-32 overflow-y-auto"
            >
              {onlineUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleMentionSelect(user)}
                  className="w-full flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0)}
                  </div>
                  <span>{user.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1.5">
          <button
            className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder={
                contextMode === "line" && activeLine
                  ? `Comment on line ${activeLine}...`
                  : contextMode === "file" && activeFile
                  ? `Message about ${activeFile.split("/").pop()}...`
                  : "Send a message..."
              }
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (!e.target.value.includes("@")) setShowMentionList(false)
              }}
              onKeyDown={handleInputKeyDown}
              className="w-full text-xs bg-muted/30 border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          <button
            className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Mention"
            onClick={() => {
              setInputValue((prev) => prev + "@")
              setShowMentionList(true)
              inputRef.current?.focus()
            }}
          >
            <AtSign className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
