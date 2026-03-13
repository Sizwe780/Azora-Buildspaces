"use client"

import { useState } from "react"
import { Files, ListTree, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { ExplorerView } from "./explorer-view"
import { OutlineView } from "./outline-view"
import { useFileSystem } from "@/lib/stores/file-system"

type ExplorerTab = "files" | "outline" | "timeline"

interface IntegratedExplorerProps {
  activeFile?: string | null
  onNavigateToLine?: (file: string, line: number) => void
}

const tabs: { id: ExplorerTab; label: string; icon: React.ComponentType<any> }[] = [
  { id: "files", label: "Explorer", icon: Files },
  { id: "outline", label: "Outline", icon: ListTree },
  { id: "timeline", label: "Timeline", icon: Clock },
]

export function IntegratedExplorer({ activeFile, onNavigateToLine }: IntegratedExplorerProps) {
  const [activeTab, setActiveTab] = useState<ExplorerTab>("files")
  const { activeFileId } = useFileSystem()
  const currentFile = activeFile ?? activeFileId

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Firebase Studio-inspired tab strip */}
      <div className="flex items-center border-b border-border/40 bg-sidebar shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors",
              "hover:bg-accent/40",
              activeTab === id
                ? "text-foreground border-b-2 border-primary bg-accent/20"
                : "text-muted-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "files" && <ExplorerView />}
        {activeTab === "outline" && (
          <OutlineView
            activeFile={currentFile}
            onNavigateToLine={onNavigateToLine || (() => {})}
          />
        )}
        {activeTab === "timeline" && <TimelinePlaceholder />}
      </div>
    </div>
  )
}

function TimelinePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-4 gap-2">
      <Clock className="w-8 h-8 text-zinc-600" />
      <span className="text-sm font-medium">Timeline</span>
      <span className="text-xs text-zinc-600 text-center leading-relaxed">
        Git-backed file history and local edit timeline. Tracks every save and commit for the active file.
      </span>
      <div className="mt-4 space-y-2 w-full max-w-[200px]">
        {["3 min ago — Edited", "12 min ago — Saved", "1h ago — Committed"].map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] text-zinc-600 opacity-50">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            {entry}
          </div>
        ))}
      </div>
    </div>
  )
}
