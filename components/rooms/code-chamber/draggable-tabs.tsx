"use client"

import { useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { X, Circle } from "lucide-react"

interface EditorTab {
    id: string
    name: string
    icon: React.ReactNode
    hasErrors: boolean
    isModified: boolean
}

interface DraggableTabBarProps {
    tabs: EditorTab[]
    activeTabId: string | null
    onSelect: (id: string) => void
    onClose: (id: string) => void
    onReorder: (tabs: EditorTab[]) => void
    getFileIcon: (name: string) => React.ReactNode
}

export function DraggableTabBar({ tabs, activeTabId, onSelect, onClose, onReorder, getFileIcon }: DraggableTabBarProps) {
    const [draggedId, setDraggedId] = useState<string | null>(null)
    const [dragOverId, setDragOverId] = useState<string | null>(null)
    const [dragSide, setDragSide] = useState<"left" | "right" | null>(null)
    const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

    const handleDragStart = useCallback((e: React.DragEvent, tabId: string) => {
        setDraggedId(tabId)
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", tabId)
        // Create ghost image
        const el = tabRefs.current.get(tabId)
        if (el) {
            const ghost = el.cloneNode(true) as HTMLElement
            ghost.style.opacity = "0.7"
            ghost.style.position = "absolute"
            ghost.style.top = "-1000px"
            document.body.appendChild(ghost)
            e.dataTransfer.setDragImage(ghost, 20, 16)
            requestAnimationFrame(() => ghost.remove())
        }
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent, tabId: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        if (tabId === draggedId) return

        const el = tabRefs.current.get(tabId)
        if (el) {
            const rect = el.getBoundingClientRect()
            const midX = rect.left + rect.width / 2
            setDragSide(e.clientX < midX ? "left" : "right")
        }
        setDragOverId(tabId)
    }, [draggedId])

    const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
        e.preventDefault()
        if (!draggedId || draggedId === targetId) {
            setDraggedId(null)
            setDragOverId(null)
            setDragSide(null)
            return
        }

        const newTabs = [...tabs]
        const dragIdx = newTabs.findIndex(t => t.id === draggedId)
        const targetIdx = newTabs.findIndex(t => t.id === targetId)
        if (dragIdx === -1 || targetIdx === -1) return

        const [removed] = newTabs.splice(dragIdx, 1)
        const insertIdx = dragSide === "left" ? targetIdx : targetIdx + 1
        newTabs.splice(dragIdx < targetIdx ? insertIdx - 1 : insertIdx, 0, removed)

        onReorder(newTabs)
        setDraggedId(null)
        setDragOverId(null)
        setDragSide(null)
    }, [draggedId, dragSide, tabs, onReorder])

    const handleDragEnd = useCallback(() => {
        setDraggedId(null)
        setDragOverId(null)
        setDragSide(null)
    }, [])

    if (tabs.length === 0) {
        return <div className="h-[35px] bg-[#010409] border-b border-[#1b1f27] shrink-0" />
    }

    return (
        <div className="flex items-center bg-[#010409] border-b border-[#1b1f27] overflow-x-auto shrink-0 scrollbar-none min-h-[35px]">
            {tabs.map((tab) => {
                const isActive = activeTabId === tab.id
                const isDragging = draggedId === tab.id
                const isDragOver = dragOverId === tab.id

                return (
                    <button
                        key={tab.id}
                        ref={(el) => { if (el) tabRefs.current.set(tab.id, el); else tabRefs.current.delete(tab.id) }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, tab.id)}
                        onDragOver={(e) => handleDragOver(e, tab.id)}
                        onDrop={(e) => handleDrop(e, tab.id)}
                        onDragEnd={handleDragEnd}
                        onDragLeave={() => { if (dragOverId === tab.id) { setDragOverId(null); setDragSide(null) } }}
                        onClick={() => onSelect(tab.id)}
                        className={cn(
                            "group flex items-center gap-2 h-[35px] px-3 text-[13px] border-r border-[#1b1f27] transition-all shrink-0 relative",
                            isActive
                                ? "bg-[#0d1117] text-white border-t-2 border-t-[#1f6feb]"
                                : "bg-[#010409] text-[#8b949e] hover:text-[#c9d1d9] border-t-2 border-t-transparent",
                            isDragging && "opacity-40",
                            isDragOver && dragSide === "left" && "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-[#1f6feb]",
                            isDragOver && dragSide === "right" && "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-0.5 after:bg-[#1f6feb]"
                        )}
                    >
                        {tab.icon}
                        <span className={cn(tab.hasErrors && "text-red-400", tab.isModified && "italic")}>
                            {tab.name}
                        </span>
                        {tab.isModified && !tab.hasErrors && (
                            <Circle className="w-2 h-2 fill-white text-white opacity-60" />
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onClose(tab.id) }}
                            className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#30363d] transition-all"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </button>
                )
            })}
        </div>
    )
}
