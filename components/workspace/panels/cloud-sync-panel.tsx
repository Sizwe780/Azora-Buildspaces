"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertTriangle,
  Loader2,
  Settings,
  Monitor,
  Smartphone,
  Laptop,
} from "lucide-react"
import { useCloudSync } from "@/lib/services/cloud-sync-service"

export function CloudSyncPanel() {
  const {
    syncItems,
    isSyncing,
    lastSyncTime,
    isEnabled,
    conflicts,
    deviceId,
    syncProgress,
    toggleSync,
    syncNow,
    resolveConflict,
    toggleItem,
  } = useCloudSync()

  useEffect(() => {
    // Auto-sync on mount if enabled
    if (isEnabled && !isSyncing) {
      syncNow()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (ts: number | null) => {
    if (!ts) return "Never"
    const diff = Date.now() - ts
    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full bg-background text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Cloud className="w-4 h-4 text-blue-500" />
          ) : (
            <CloudOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium">Cloud Sync</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={syncNow}
            disabled={isSyncing || !isEnabled}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded hover:bg-blue-500/20 text-blue-500 disabled:opacity-40 transition-colors"
          >
            {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Sync Now
          </button>
          <button
            onClick={toggleSync}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              isEnabled
                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {isEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>

      {/* Sync Progress */}
      {isSyncing && syncProgress > 0 && (
        <div className="px-3 py-1.5 border-b border-border">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Syncing...</span>
            <span>{syncProgress}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${syncProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status */}
      <div className="px-3 py-2 border-b border-border bg-muted/5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Last sync:</span>
          <span>{formatTime(lastSyncTime)}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] mt-1">
          <span className="text-muted-foreground">Device:</span>
          <div className="flex items-center gap-1">
            <Laptop className="w-3 h-3" />
            <span className="font-mono text-[9px]">{deviceId?.slice(0, 8) || "unknown"}</span>
          </div>
        </div>
      </div>

      {/* Sync Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Sync Items</span>
        </div>
        {syncItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/30 transition-colors">
            <button
              onClick={() => toggleItem(item.id)}
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                item.enabled
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {item.enabled && <Check className="w-2.5 h-2.5" />}
            </button>
            <Settings className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs flex-1 capitalize">{item.type.replace(/-/g, " ")}</span>
            <span className={`text-[10px] ${
              item.status === "synced" ? "text-green-500" :
              item.status === "pending" ? "text-amber-500" :
              item.status === "error" ? "text-red-500" : "text-muted-foreground"
            }`}>
              {item.status}
            </span>
          </div>
        ))}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="mt-3">
            <div className="px-3 py-2">
              <span className="text-[10px] text-amber-500 uppercase tracking-wider font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Conflicts ({conflicts.length})
              </span>
            </div>
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="px-3 py-2 mx-2 mb-1 rounded border border-amber-500/30 bg-amber-500/5">
                <p className="text-xs">{conflict.item.key}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <button
                    onClick={() => resolveConflict(conflict.id, "local")}
                    className="px-2 py-0.5 text-[10px] rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                  >
                    Keep Local
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.id, "cloud")}
                    className="px-2 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-500 hover:bg-purple-500/20"
                  >
                    Keep Cloud
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.id, "merge")}
                    className="px-2 py-0.5 text-[10px] rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"
                  >
                    Merge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
