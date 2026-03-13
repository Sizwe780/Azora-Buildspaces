"use client"

import { useState, useEffect, useMemo } from "react"
import { GitBranch, AlertCircle, CheckCircle2, Bell, Wifi, WifiOff, Cpu, Bot, Sparkles, Radio } from "lucide-react"
import { motion } from "framer-motion"
import { getLanguageByExtension } from "@/lib/languages"
import { useWorkbench } from "@/lib/stores/workbench-store"

interface StatusBarProps {
  activeFile: string
  agentCount: number
  activeAgents: number
}

function StatusBarItem({ children, onClick, title, className = "" }: {
  children: React.ReactNode
  onClick?: () => void
  title?: string
  className?: string
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1 px-1.5 h-full hover:bg-[var(--ide-statusbar-item-hover)] transition-colors cursor-default ${className}`}
      onClick={onClick}
      title={title}
      tabIndex={-1}
    >
      {children}
    </button>
  )
}

export function StatusBar({ activeFile, agentCount, activeAgents }: StatusBarProps) {
  const [cpuUsage, setCpuUsage] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(true)
  const { cursorLine, cursorColumn, editorIndentation, editorEOL, currentGitBranch, diagnosticErrors, diagnosticWarnings } = useWorkbench()

  const detectedLang = useMemo(() => {
    if (!activeFile) return null
    const ext = "." + activeFile.split(".").pop()
    return getLanguageByExtension(ext)
  }, [activeFile])

  // Real CPU metrics from backend (disabled until implemented)
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch('/api/metrics/system')
        if (res.ok) {
          setIsConnected(true)
          const data = await res.json()
          setCpuUsage(data.cpu)
        } else {
          setIsConnected(true)
          setCpuUsage(null)
        }
      } catch {
        setIsConnected(false)
        setCpuUsage(null)
      }
    }
    checkBackend()
    const interval = setInterval(checkBackend, 10000)
    return () => clearInterval(interval)
  }, [])

  const hasErrors = diagnosticErrors > 0
  const hasWarnings = diagnosticWarnings > 0

  return (
    <div
      className="h-[22px] flex items-center justify-between text-[11px] shrink-0 select-none"
      style={{
        backgroundColor: 'var(--ide-statusbar-bg)',
        color: 'var(--ide-statusbar-fg)',
        borderTop: '1px solid var(--ide-statusbar-border)',
      }}
    >
      {/* Left Section */}
      <div className="flex items-center h-full">
        {/* Remote indicator (VS Code style) */}
        <StatusBarItem title="BuildSpaces: Connected" className="bg-[var(--ide-statusbar-prominent-bg)] hover:brightness-110">
          <Radio className="w-3.5 h-3.5" />
        </StatusBarItem>

        {/* Git branch */}
        <StatusBarItem title={`Git Branch: ${currentGitBranch || 'main'}`}>
          <GitBranch className="w-3.5 h-3.5" />
          <span>{currentGitBranch || 'main'}</span>
        </StatusBarItem>

        {/* Diagnostics */}
        <StatusBarItem title={`${diagnosticErrors} Errors, ${diagnosticWarnings} Warnings`}>
          {hasErrors ? (
            <AlertCircle className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>{diagnosticErrors}</span>
          <AlertCircle className="w-3.5 h-3.5 ml-0.5" />
          <span>{diagnosticWarnings}</span>
        </StatusBarItem>
      </div>

      {/* Center: Elara AI status */}
      <div className="flex items-center h-full">
        <StatusBarItem title="Elara AI Assistant">
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}>
            <Sparkles className="w-3 h-3" />
          </motion.div>
          <span className="font-medium">Elara</span>
          <span className="opacity-75 ml-0.5">
            {activeAgents}/{agentCount}
          </span>
        </StatusBarItem>
      </div>

      {/* Right Section */}
      <div className="flex items-center h-full">
        {/* Cursor position */}
        <StatusBarItem title="Go to Line/Column">
          <span>Ln {cursorLine}, Col {cursorColumn}</span>
        </StatusBarItem>

        {/* Indentation */}
        <StatusBarItem title="Select Indentation">
          <span>{editorIndentation}</span>
        </StatusBarItem>

        {/* EOL */}
        <StatusBarItem title="Select End of Line Sequence">
          <span>{editorEOL}</span>
        </StatusBarItem>

        {/* Encoding */}
        <StatusBarItem title="Select Encoding">
          <span>UTF-8</span>
        </StatusBarItem>

        {/* Language */}
        <StatusBarItem title="Select Language Mode">
          {detectedLang ? (
            <span>{detectedLang.name}</span>
          ) : (
            <span>Plain Text</span>
          )}
        </StatusBarItem>

        {/* Connection */}
        <StatusBarItem title={isConnected ? "Connected to BuildSpaces" : "Disconnected"}>
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 opacity-60" />
          )}
        </StatusBarItem>

        {/* Notifications bell */}
        <StatusBarItem title="Notifications">
          <Bell className="w-3.5 h-3.5" />
        </StatusBarItem>
      </div>
    </div>
  )
}
