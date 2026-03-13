"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Bell,
  X,
  Check,
  Info,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCheck,
  Settings,
  ExternalLink,
  BellOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useNotifications, type NotificationType } from "@/lib/stores/notification-store"

const typeConfig: Record<NotificationType, { icon: any; color: string; bgColor: string }> = {
  info: { icon: Info, color: "text-blue-400", bgColor: "bg-blue-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", bgColor: "bg-yellow-500/10" },
  error: { icon: AlertCircle, color: "text-red-400", bgColor: "bg-red-500/10" },
  success: { icon: Check, color: "text-green-400", bgColor: "bg-green-500/10" },
}

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  if (diff < 60000) return "just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}

export function NotificationsCenter() {
  const { notifications, doNotDisturb, markRead, markAllRead, dismiss, clear, toggleDoNotDisturb, info } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Seed initial notifications if none exist (first load)
  useEffect(() => {
    if (notifications.length === 0) {
      info("Welcome to Buildspaces", "Your cloud IDE workspace is ready. Start coding!", "System")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = notifications.filter((n) => !n.read).length
  const filtered = filter === "unread" ? notifications.filter((n) => !n.read) : notifications

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-[22px] px-1.5 text-muted-foreground hover:text-foreground"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center leading-none animate-in zoom-in">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[380px] p-0 bg-popover/98 backdrop-blur-md border-border/60 shadow-2xl rounded-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
              title="Mark all read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-muted-foreground hover:text-foreground"
              onClick={clear}
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0.5 px-3 py-1.5 border-b border-border/20">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              className={cn(
                "px-2.5 py-0.5 text-[11px] rounded-md transition-colors capitalize",
                filter === f
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
              )}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[360px]">
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {filtered.map((notification) => {
                const config = typeConfig[notification.type]
                const Icon = config.icon
                const isExpanded = expandedId === notification.id

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative px-3 py-2.5 hover:bg-accent/30 transition-colors cursor-pointer",
                      !notification.read && "bg-primary/[0.03]"
                    )}
                    onClick={() => {
                      markRead(notification.id)
                      setExpandedId(isExpanded ? null : notification.id)
                    }}
                  >
                    <div className="flex gap-2.5">
                      {/* Icon */}
                      <div className={cn("mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center", config.bgColor)}>
                        <Icon className={cn("w-3 h-3", config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[12px] leading-tight", !notification.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                              {notification.title}
                            </p>
                            <p className={cn(
                              "text-[11px] text-muted-foreground mt-0.5 leading-snug",
                              !isExpanded && "line-clamp-2"
                            )}>
                              {notification.message}
                            </p>
                          </div>

                          {/* Dismiss */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              dismiss(notification.id)
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-2 mt-1.5">
                          {notification.source && (
                            <span className="text-[10px] text-muted-foreground/70 bg-accent/30 px-1.5 py-0.5 rounded">
                              {notification.source}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/50">
                            {notification.timestamp ? formatTime(new Date(notification.timestamp)) : 'just now'}
                          </span>
                          {!notification.read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>

                        {/* Progress Bar */}
                        {notification.progress !== undefined && (
                          <div className="mt-2 h-1 bg-accent/40 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${notification.progress}%` }}
                            />
                          </div>
                        )}

                        {/* Actions */}
                        {notification.actions && isExpanded && (
                          <div className="flex items-center gap-1.5 mt-2">
                            {notification.actions.map((action, i) => (
                              <Button
                                key={i}
                                variant={i === 0 ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                  "h-6 px-2.5 text-[11px]",
                                  i === 0 && "bg-primary/90 hover:bg-primary"
                                )}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  action.action()
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-border/40 bg-accent/5">
          <button
            className={cn(
              "text-[11px] transition-colors flex items-center gap-1",
              doNotDisturb ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={toggleDoNotDisturb}
          >
            <BellOff className="w-3 h-3" />
            {doNotDisturb ? "Do Not Disturb: On" : "Do Not Disturb"}
          </button>
          <button className="text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            <Settings className="w-3 h-3" />
            Configure
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
