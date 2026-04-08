"use client"

import { useCollaboration } from "@/lib/collaboration/collaboration-service"
import { Badge } from "@/components/ui/badge"
import { Users, Wifi, WifiOff } from "lucide-react"

export function CollaborationStatus() {
  const isConnected = useCollaboration((state) => state.isConnected)
  const collaborators = useCollaboration((state) => state.collaborators)

  return (
    <div className="flex items-center gap-2 px-2 text-xs h-full">
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <div className="flex items-center gap-1.5 text-green-500">
            <Wifi className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[10px] font-medium uppercase tracking-wider">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-red-500/70">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[10px] font-medium uppercase tracking-wider">Offline</span>
          </div>
        )}
      </div>
      
      <div className="h-3 w-px bg-border/50 mx-1" />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer" title="Manage Collaborators">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-medium tabular-nums">{collaborators.length}</span>
        </div>
        
        <div className="flex -space-x-1.5 items-center">
            {collaborators.slice(0, 3).map((user) => (
            <div
                key={user.id}
                className="w-5 h-5 rounded-full border border-background flex items-center justify-center text-[8px] font-bold text-white shadow-sm ring-1 ring-background"
                style={{ backgroundColor: user.color }}
                title={user.name}
            >
                {user.name.slice(0, 2).toUpperCase()}
            </div>
            ))}
            {collaborators.length > 3 && (
            <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] font-bold text-muted-foreground shadow-sm ring-1 ring-background">
                +{collaborators.length - 3}
            </div>
            )}
        </div>
      </div>
    </div>
  )
}
