"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import {
    Bell, X, CheckCircle, AlertTriangle, XCircle, Info,
    Trash2, Check, ExternalLink, BellOff
} from "lucide-react"

export interface Notification {
    id: string
    type: "info" | "success" | "warning" | "error"
    title: string
    message?: string
    timestamp: number
    read: boolean
    action?: { label: string; handler: () => void }
    source?: string
}

interface NotificationCenterProps {
    notifications: Notification[]
    onDismiss: (id: string) => void
    onDismissAll: () => void
    onMarkRead: (id: string) => void
    onMarkAllRead: () => void
}

export function NotificationCenter({ notifications, onDismiss, onDismissAll, onMarkRead, onMarkAllRead }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [filter, setFilter] = useState<"all" | "unread">("all")
    const panelRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifications.filter(n => !n.read).length

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [isOpen])

    const filteredNotifications = filter === "unread"
        ? notifications.filter(n => !n.read)
        : notifications

    const getIcon = (type: string) => {
        switch (type) {
            case "success": return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            case "error": return <XCircle className="w-4 h-4 text-red-400 shrink-0" />
            default: return <Info className="w-4 h-4 text-blue-400 shrink-0" />
        }
    }

    const formatTime = (ts: number) => {
        const diff = Date.now() - ts
        if (diff < 60000) return "just now"
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
        return new Date(ts).toLocaleDateString()
    }

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-1 rounded transition-colors",
                    isOpen ? "text-white bg-[#30363d]" : "text-[#484f58] hover:text-[#8b949e]"
                )}
            >
                <Bell className="w-3.5 h-3.5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#1f6feb] text-[8px] text-white flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-[380px] max-h-[480px] rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/60 overflow-hidden z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1b1f27] shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-white">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-[#1f6feb]/20 text-[10px] text-[#58a6ff] font-medium">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={onMarkAllRead}
                                    className="p-1 rounded text-[#484f58] hover:text-[#8b949e] transition-colors"
                                    title="Mark all as read"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={onDismissAll}
                                    className="p-1 rounded text-[#484f58] hover:text-red-400 transition-colors"
                                    title="Clear all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex items-center gap-0 px-3 py-1.5 border-b border-[#1b1f27] shrink-0">
                        <button
                            onClick={() => setFilter("all")}
                            className={cn(
                                "px-2.5 py-1 text-[11px] rounded-md transition-colors",
                                filter === "all" ? "bg-[#30363d] text-white" : "text-[#484f58] hover:text-[#8b949e]"
                            )}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={cn(
                                "px-2.5 py-1 text-[11px] rounded-md transition-colors",
                                filter === "unread" ? "bg-[#30363d] text-white" : "text-[#484f58] hover:text-[#8b949e]"
                            )}
                        >
                            Unread ({unreadCount})
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-[#484f58]">
                                <BellOff className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-[13px]">{filter === "unread" ? "No unread notifications" : "No notifications"}</p>
                            </div>
                        ) : (
                            filteredNotifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={cn(
                                        "flex items-start gap-3 px-4 py-3 border-b border-[#1b1f27] hover:bg-[#1f1f1f] transition-colors cursor-pointer",
                                        !notif.read && "bg-[#1f6feb]/5"
                                    )}
                                    onClick={() => onMarkRead(notif.id)}
                                >
                                    <div className="mt-0.5">{getIcon(notif.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[12px] font-medium truncate", notif.read ? "text-[#8b949e]" : "text-white")}>
                                                {notif.title}
                                            </span>
                                            {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-[#1f6feb] shrink-0" />}
                                        </div>
                                        {notif.message && (
                                            <p className="text-[11px] text-[#484f58] mt-0.5 line-clamp-2">{notif.message}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-[#30363d]">{formatTime(notif.timestamp)}</span>
                                            {notif.source && <span className="text-[10px] text-[#30363d]">· {notif.source}</span>}
                                        </div>
                                        {notif.action && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); notif.action!.handler() }}
                                                className="flex items-center gap-1 mt-1.5 text-[11px] text-[#58a6ff] hover:underline"
                                            >
                                                {notif.action.label}
                                                <ExternalLink className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDismiss(notif.id) }}
                                        className="p-0.5 rounded text-[#30363d] hover:text-[#484f58] transition-colors shrink-0 mt-0.5"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
