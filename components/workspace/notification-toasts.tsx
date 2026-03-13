"use client"

import { useEffect, useState } from "react"
import { useNotifications, type Notification } from "@/lib/stores/notification-store"
import { X, Info, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface ToastItem {
  notification: Notification
  visible: boolean
}

const TOAST_DURATION = 5000
const MAX_TOASTS = 4

const typeConfig = {
  info: { icon: Info, color: 'text-blue-400', bg: 'border-blue-500/30 bg-blue-500/5' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'border-yellow-500/30 bg-yellow-500/5' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'border-red-500/30 bg-red-500/5' },
  success: { icon: CheckCircle2, color: 'text-green-400', bg: 'border-green-500/30 bg-green-500/5' },
}

export function NotificationToasts() {
  const { notifications, doNotDisturb, dismiss } = useNotifications()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // Watch for new notifications and show toast
  useEffect(() => {
    if (doNotDisturb) return

    const newNotifications = notifications.filter(n => !seenIds.has(n.id) && !n.read)
    if (newNotifications.length === 0) return

    const newIds = new Set(seenIds)
    const newToasts: ToastItem[] = []

    newNotifications.slice(0, MAX_TOASTS).forEach(n => {
      newIds.add(n.id)
      newToasts.push({ notification: n, visible: true })
    })

    setSeenIds(newIds)
    // Deduplicate by id to prevent React duplicate-key warnings when
    // the store emits the same notification twice (e.g. in StrictMode).
    setToasts(prev => {
      const existing = new Set(prev.map(t => t.notification.id))
      const deduped = newToasts.filter(t => !existing.has(t.notification.id))
      return [...deduped, ...prev].slice(0, MAX_TOASTS)
    })

    // Auto-dismiss after duration
    newNotifications.forEach(n => {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.notification.id !== n.id))
      }, TOAST_DURATION)
    })
  }, [notifications, doNotDisturb, seenIds])

  const handleDismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.notification.id !== id))
    dismiss(id)
  }

  return (
    <div className="fixed bottom-8 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const config = typeConfig[toast.notification.type] || typeConfig.info
          const Icon = config.icon
          return (
            <motion.div
              key={toast.notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "pointer-events-auto w-[360px] rounded-lg border shadow-xl backdrop-blur-md p-3 flex gap-3",
                "bg-popover/95",
                config.bg
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.color)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{toast.notification.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{toast.notification.message}</div>
                {toast.notification.source && (
                  <div className="text-[10px] text-muted-foreground/60 mt-1">{toast.notification.source}</div>
                )}
                {toast.notification.progress !== undefined && (
                  <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${toast.notification.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDismiss(toast.notification.id)}
                className="p-0.5 rounded hover:bg-muted/80 shrink-0"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
