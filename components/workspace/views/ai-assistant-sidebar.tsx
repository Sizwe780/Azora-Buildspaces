"use client"

import { AICodeAssistant } from "@/components/code-chamber/ai-code-assistant"

interface AIAssistantSidebarProps {
  activeFile: string | null
  onClose?: () => void
}

/**
 * Sidebar wrapper for the AI Code Assistant.
 * Passes the active file context and handles close behavior.
 */
export function AIAssistantSidebar({ activeFile, onClose }: AIAssistantSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <AICodeAssistant
        activeFile={activeFile}
        onClose={onClose || (() => {})}
      />
    </div>
  )
}
