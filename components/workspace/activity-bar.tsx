"use client"

import { useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Files,
  Search,
  GitBranch,
  Bug,
  Puzzle,
  Settings,
  Menu,
  GripVertical,
  ListTree,
  Maximize2,
  ChevronsLeft,
} from "lucide-react"

/**
 * Compact BuildSpaces Hex-Logo for the Activity Bar.
 * This is the "Home/Pivot" point — clicking navigates to the workspace root.
 */
function HexLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hex-grad" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      {/* Hexagonal shape */}
      <path d="M12 2 L21.5 7.5 L21.5 16.5 L12 22 L2.5 16.5 L2.5 7.5 Z" fill="url(#hex-grad)" />
      {/* Central spire */}
      <path d="M12 6 L12 16" stroke="#0d1117" strokeWidth="1.8" strokeLinecap="round" />
      {/* Wings */}
      <path d="M8 9 L8 15 L11 13" stroke="#6EE7B7" strokeWidth="1" fill="none" opacity="0.9" />
      <path d="M16 9 L16 15 L13 13" stroke="#6EE7B7" strokeWidth="1" fill="none" opacity="0.9" />
      {/* Core */}
      <circle cx="12" cy="11" r="2" fill="#0d1117" stroke="#34D399" strokeWidth="0.8" />
      <circle cx="12" cy="11" r="0.9" fill="#6EE7B7" />
    </svg>
  )
}

interface ActivityBarItem {
  id: string
  icon: React.ComponentType<any>
  label: string
  badge?: number
  action: () => void
}

interface ActivityBarProps {
  items: ActivityBarItem[]
  activeItem?: string
  onItemChange?: (itemId: string) => void
  onReorder?: (items: ActivityBarItem[]) => void
  onZenMode?: () => void
  onCollapse?: () => void
  className?: string
}

export function ActivityBar({
  items,
  activeItem,
  onItemChange,
  onReorder,
  onZenMode,
  onCollapse,
  className
}: ActivityBarProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [internalActiveItem, setInternalActiveItem] = useState(activeItem || items[0]?.id)
  const [internalItems, setInternalItems] = useState(items)

  const currentActiveItem = activeItem !== undefined ? activeItem : internalActiveItem
  const currentItems = onReorder ? items : internalItems

  const handleItemClick = (itemId: string) => {
    if (onItemChange) {
      onItemChange(itemId)
    } else {
      setInternalActiveItem(itemId)
    }

    const item = currentItems.find(i => i.id === itemId)
    item?.action()
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()

    if (!draggedItem) return

    const draggedIndex = currentItems.findIndex(item => item.id === draggedItem)
    if (draggedIndex === -1 || draggedIndex === dropIndex) return

    const newItems = [...currentItems]
    const [dragged] = newItems.splice(draggedIndex, 1)
    newItems.splice(dropIndex, 0, dragged)

    if (onReorder) {
      onReorder(newItems)
    } else {
      setInternalItems(newItems)
    }

    setDraggedItem(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
  }

  return (
    <div role="toolbar" aria-label="Activity Bar" aria-orientation="vertical" className={cn("flex flex-col w-11 bg-[var(--ide-activity-bar-bg)] border-r border-[var(--ide-border)]", className)}>
      {/* BuildSpaces Hex-Logo — Home/Pivot point */}
      <div className="flex items-center justify-center h-10 border-b border-[var(--ide-border)]">
        <Button
          variant="ghost"
          className="w-11 h-10 p-0 rounded-none flex items-center justify-center hover:bg-[var(--ide-hover-bg)]"
          title="BuildSpaces Home"
          aria-label="BuildSpaces Home"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('workspace:goto-room', { detail: 'home' }))
            }
          }}
        >
          <HexLogo />
        </Button>
      </div>

      {currentItems.map((item, index) => {
        const Icon = item.icon
        const isActive = item.id === currentActiveItem
        const isDragged = item.id === draggedItem
        const isDragOver = index === dragOverIndex

        return (
          <div
            key={item.id}
            className={cn(
              "relative group",
              isDragOver && "bg-[var(--ide-hover-bg)]",
              isDragged && "opacity-50"
            )}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
          >
            <Button
              variant="ghost"
              className={cn(
                "w-11 h-10 p-0 rounded-none flex flex-col items-center justify-center relative transition-all duration-150",
                isActive
                  ? "bg-[var(--ide-hover-bg)] text-[var(--ide-text)] border-l-2 border-l-[var(--ide-tab-active-indicator)]"
                  : "text-[var(--ide-text-muted)] hover:text-[var(--ide-text)] hover:bg-[var(--ide-hover-bg)]"
              )}
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleItemClick(item.id)}
              title={item.label}
            >
              <Icon className={cn("w-[18px] h-[18px] transition-transform duration-150", !isActive && "group-hover:scale-110")} />

              {/* Badge counter */}
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}

              {/* Drag handle (visible on hover) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <GripVertical className="w-3 h-3 text-white/25" />
              </div>
            </Button>
          </div>
        )
      })}

      {/* Bottom actions: Zen Mode + Collapse */}
      <div className="mt-auto border-t border-[var(--ide-border)] flex flex-col">
        {/* Deep Flow / Zen Mode toggle */}
        {onZenMode && (
          <Button
            variant="ghost"
            className={cn(
              "w-11 h-10 p-0 rounded-none flex items-center justify-center",
              "text-[var(--ide-text-muted)] hover:text-emerald-400 hover:bg-[var(--ide-hover-bg)] transition-colors"
            )}
            title="Deep Flow Mode (Ctrl+K Z)"
            aria-label="Deep Flow Mode"
            onClick={onZenMode}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        )}
        {/* Collapse Activity Bar */}
        {onCollapse && (
          <Button
            variant="ghost"
            className={cn(
              "w-11 h-10 p-0 rounded-none flex items-center justify-center",
              "text-[var(--ide-text-muted)] hover:text-[var(--ide-text)] hover:bg-[var(--ide-hover-bg)] transition-colors"
            )}
            title="Collapse Activity Bar"
            aria-label="Collapse Activity Bar"
            onClick={onCollapse}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-11 h-10 p-0 rounded-none flex items-center justify-center",
            "text-[var(--ide-text-muted)] hover:text-[var(--ide-text)] hover:bg-[var(--ide-hover-bg)]"
          )}
          title="Manage"
          aria-label="Manage"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// Pre-configured activity bar items
export const createDefaultActivityBarItems = (
  onExplorer: () => void,
  onSearch: () => void,
  onGit: () => void,
  onDebug: () => void,
  onExtensions: () => void,
  onSettings: () => void,
  onOutline: () => void
): ActivityBarItem[] => [
  {
    id: "explorer",
    icon: Files,
    label: "Explorer",
    action: onExplorer,
  },
  {
    id: "outline",
    icon: ListTree,
    label: "Outline",
    action: onOutline,
  },
  {
    id: "search",
    icon: Search,
    label: "Search",
    action: onSearch,
  },
  {
    id: "git",
    icon: GitBranch,
    label: "Source Control",
    badge: 0, // Can be updated dynamically
    action: onGit,
  },
  {
    id: "debug",
    icon: Bug,
    label: "Run and Debug",
    action: onDebug,
  },
  {
    id: "extensions",
    icon: Puzzle,
    label: "Extensions",
    badge: 0, // Can be updated dynamically
    action: onExtensions,
  },
  {
    id: "settings",
    icon: Settings,
    label: "Settings",
    action: onSettings,
  },
]