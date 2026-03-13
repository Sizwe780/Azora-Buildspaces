"use client"

import { useState, useEffect } from "react"
import { X, TerminalIcon, Plus, Trash2, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { XTerminal } from "./x-terminal"

interface TerminalPanelProps {
  onClose: () => void
}

export function TerminalPanel({ onClose }: TerminalPanelProps) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [terminalEnabled] = useState(() => process.env.NEXT_PUBLIC_TERMINAL_ENABLED === 'true')

  useEffect(() => {
    if (!terminalEnabled) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsHost = process.env.NEXT_PUBLIC_TERMINAL_HOST || 'localhost:3001'
    const socketUrl = `${wsProtocol}://${wsHost}?type=terminal&sessionId=default`

    const socket = new WebSocket(socketUrl)

    socket.onopen = () => setIsConnected(true)
    socket.onerror = () => setIsConnected(false)
    socket.onclose = () => setIsConnected(false)

    setWs(socket)

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close()
      }
    }
  }, [terminalEnabled])

  const handleData = (data: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--ide-terminal-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--ide-settings-border)] bg-[var(--ide-terminal-bg)]/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <TerminalIcon className="w-4 h-4 text-[var(--ide-settings-muted)]" />
            <span className="text-[var(--ide-settings-text)] font-medium">Terminal</span>
            {!terminalEnabled && (
              <span className="text-[10px] text-[var(--ide-settings-muted)] bg-[var(--ide-sidebar-bg)] border border-[var(--ide-settings-surface)] rounded px-1.5 py-0.5">
                local mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--ide-settings-muted)] hover:text-[var(--ide-settings-text)] hover:bg-[var(--ide-settings-surface)]">
              <Plus className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--ide-settings-muted)] hover:text-[var(--ide-settings-text)] hover:bg-[var(--ide-settings-surface)]">
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {terminalEnabled ? (
            <>
              {isConnected ? (
                <Wifi className="w-3 h-3 text-emerald-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-[var(--ide-settings-muted)]" />
              )}
            </>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[var(--ide-settings-muted)] hover:text-[var(--ide-settings-text)] hover:bg-[var(--ide-settings-surface)]"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden">
        <XTerminal onData={handleData} socket={ws} />
      </div>
    </div>
  )
}
