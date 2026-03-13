"use client"

import { MessageSquare, Bot, List, Clock, X, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useWorkbench } from "@/lib/stores/workbench-store"
import type { SecondarySidebarView } from "@/lib/stores/workbench-store"

const VIEWS: { id: SecondarySidebarView; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Chat", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: "ai-assistant", label: "AI Assistant", icon: <Bot className="w-3.5 h-3.5" /> },
  { id: "copilot", label: "Copilot", icon: <Bot className="w-3.5 h-3.5 text-purple-400" /> },
  { id: "outline", label: "Outline", icon: <List className="w-3.5 h-3.5" /> },
  { id: "timeline", label: "Timeline", icon: <Clock className="w-3.5 h-3.5" /> },
]

interface SecondarySidebarHeaderProps {
  onClose?: () => void
}

export function SecondarySidebarHeader({ onClose }: SecondarySidebarHeaderProps) {
  const { activeSecondarySidebarView, setSecondarySidebarView } = useWorkbench()
  const active = VIEWS.find(v => v.id === activeSecondarySidebarView) || VIEWS[0]

  return (
    <div className="flex items-center h-8 shrink-0 px-1.5 border-b border-border/40 bg-sidebar select-none gap-1">
      {/* View tabs */}
      <div className="flex items-center flex-1 gap-0.5 overflow-x-auto scrollbar-none">
        {VIEWS.slice(0, 3).map(view => (
          <button
            key={view.id}
            onClick={() => setSecondarySidebarView(view.id)}
            className={cn(
              "flex items-center gap-1 px-2 h-[24px] text-[11px] rounded transition-colors shrink-0",
              activeSecondarySidebarView === view.id
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
        {/* More views */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-0.5 px-1.5 h-[24px] text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors shrink-0">
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[160px] bg-popover/98 backdrop-blur-md border-border/60 shadow-xl rounded-lg">
            {VIEWS.slice(3).map(view => (
              <DropdownMenuItem
                key={view.id}
                onSelect={() => setSecondarySidebarView(view.id)}
                className={cn("text-[12px] gap-2 cursor-pointer", activeSecondarySidebarView === view.id && "text-primary")}
              >
                {view.icon}
                {view.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setSecondarySidebarView('chat')} className="text-[12px] gap-2 cursor-pointer text-muted-foreground">
              Move to Primary Sidebar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        className="w-5 h-5 shrink-0 text-muted-foreground/60 hover:text-foreground"
        onClick={onClose}
        title="Hide Secondary Sidebar (Ctrl+Alt+B)"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}
