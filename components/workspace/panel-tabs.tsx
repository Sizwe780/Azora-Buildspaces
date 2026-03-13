"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Terminal,
  AlertCircle,
  Bug,
  Play,
  X,
  Plus,
} from "lucide-react"

interface PanelTab {
  id: string
  label: string
  icon: React.ComponentType<any>
  content: React.ReactNode
  closable?: boolean
}

interface PanelTabsProps {
  tabs: PanelTab[]
  activeTab?: string
  onTabChange?: (tabId: string) => void
  onTabClose?: (tabId: string) => void
  onNewTab?: () => void
  className?: string
}

export function PanelTabs({
  tabs,
  activeTab,
  onTabChange,
  onTabClose,
  onNewTab,
  className
}: PanelTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab || tabs[0]?.id)

  const currentActiveTab = activeTab !== undefined ? activeTab : internalActiveTab

  const handleTabChange = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId)
    } else {
      setInternalActiveTab(tabId)
    }
  }

  const handleTabClose = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onTabClose?.(tabId)
  }

  const activeTabData = tabs.find(tab => tab.id === currentActiveTab)

  return (
    <div className={cn("flex flex-col h-full bg-[var(--ide-editor-bg)]", className)}>
      {/* Tab Bar */}
      <div className="flex items-center border-b border-[var(--ide-border)] bg-[var(--ide-tab-inactive-bg)] min-h-[30px]">
        <ScrollArea className="flex-1">
          <div className="flex items-center">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = tab.id === currentActiveTab

              return (
                <div
                  key={tab.id}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 border-r border-[var(--ide-border)] cursor-pointer group relative min-w-0",
                    isActive
                      ? "bg-[var(--ide-editor-bg)] text-[var(--ide-text)] border-b-2 border-b-[var(--ide-tab-active-indicator)]"
                      : "text-[var(--ide-text-muted)] hover:text-[var(--ide-text)] hover:bg-[var(--ide-hover-bg)]"
                  )}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[12px] truncate max-w-[120px]">{tab.label}</span>

                  {tab.closable && (
                    <button
                      className={cn(
                        "ml-1 p-0.5 rounded hover:bg-[var(--ide-border)] opacity-0 group-hover:opacity-100 transition-opacity",
                        isActive && "opacity-100"
                      )}
                      onClick={(e) => handleTabClose(tab.id, e)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {onNewTab && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 mx-1 text-[var(--ide-text-muted)] hover:text-[var(--ide-text)] hover:bg-[var(--ide-hover-bg)]"
            onClick={onNewTab}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTabData?.content || (
          <div className="h-full flex items-center justify-center text-[var(--ide-text-muted)]">
            No content available
          </div>
        )}
      </div>
    </div>
  )
}

// Pre-configured panel tabs for common use cases
export const createDefaultPanelTabs = (
  terminalContent: React.ReactNode,
  outputContent: React.ReactNode,
  problemsContent: React.ReactNode,
  debugContent: React.ReactNode
): PanelTab[] => [
  {
    id: "terminal",
    label: "Terminal",
    icon: Terminal,
    content: terminalContent,
  },
  {
    id: "output",
    label: "Output",
    icon: Play,
    content: outputContent,
  },
  {
    id: "problems",
    label: "Problems",
    icon: AlertCircle,
    content: problemsContent,
  },
  {
    id: "debug",
    label: "Debug Console",
    icon: Bug,
    content: debugContent,
  },
]