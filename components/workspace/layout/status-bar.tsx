"use client"

import { useState, useEffect, memo } from "react"
import {
    GitBranch,
    Wifi,
    WifiOff,
    Cpu,
    Zap,
    Radio,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Cloud,
    Lock,
    Flame,
    Coins,
    Maximize2,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { NotificationsCenter } from "@/components/workspace/notifications-center"
import { cn } from "@/lib/utils"

const StatusItem = memo(function StatusItem({ children, className, tooltip, tooltipSub, onClick }: {
    children: React.ReactNode
    className?: string
    tooltip?: string
    tooltipSub?: string
    onClick?: () => void
}) {
    const content = (
        <div
            className={cn(
                "flex items-center gap-1 px-1.5 py-0 rounded-sm cursor-default text-xs transition-colors hover:bg-white/10",
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    )

    if (!tooltip) return content

    return (
        <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="top" className="bg-popover/95 backdrop-blur-md shadow-xl border-border/60">
                <div className="text-sm">
                    <div className="font-semibold">{tooltip}</div>
                    {tooltipSub && <div className="text-[11px] text-muted-foreground mt-0.5">{tooltipSub}</div>}
                </div>
            </TooltipContent>
        </Tooltip>
    )
}
)

export function StatusBar() {
    const { cursorLine, cursorColumn, editorLanguage, editorIndentation, editorEOL, editorEncoding, toggleGoToLine, diagnosticErrors, diagnosticWarnings, currentGitBranch, gitAhead, gitBehind, setPanelView, setSidebarView, isZenMode, toggleZenMode } = useWorkbench()
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
    const [cpuUsage, setCpuUsage] = useState<number | null>(null)
    const [memoryUsage, setMemoryUsage] = useState<number | null>(null)
    const [networkUsage, setNetworkUsage] = useState<{ rxPerSec: number | null; txPerSec: number | null } | null>(null)
    const [sessionXP, setSessionXP] = useState(0)
    const [totalAZR, setTotalAZR] = useState(0)
    const [streak, setStreak] = useState(0)

    const formatBytesPerSecond = (value: number | null) => {
        if (value === null || !Number.isFinite(value)) return 'n/a'
        if (value < 1024) return `${Math.round(value)} B/s`
        if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB/s`
        if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB/s`
        return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB/s`
    }

    useEffect(() => {
        // Load XP/AZR from localStorage
        if (typeof window !== 'undefined') {
            try {
                const xp = parseInt(localStorage.getItem('buildspaces.session.xp') || '0', 10)
                const azr = parseFloat(localStorage.getItem('buildspaces.total.azr') || '0')
                const s = parseInt(localStorage.getItem('buildspaces.streak') || '0', 10)
                setSessionXP(xp)
                setTotalAZR(azr)
                setStreak(s)
            } catch { /* ignore */ }
        }
    }, [])

    // Poll real system metrics from backend
    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const response = await fetch('/api/metrics/system', { cache: 'no-store' })
                if (!response.ok) throw new Error('Metrics endpoint unavailable')
                const data = await response.json()

                setCpuUsage(typeof data?.cpu === 'number' ? data.cpu : null)
                setMemoryUsage(typeof data?.memory?.percent === 'number' ? data.memory.percent : null)
                setNetworkUsage(data?.network
                    ? {
                        rxPerSec: typeof data.network.rxPerSec === 'number' ? data.network.rxPerSec : null,
                        txPerSec: typeof data.network.txPerSec === 'number' ? data.network.txPerSec : null,
                    }
                    : null)
                setConnectionStatus('connected')
            } catch {
                setCpuUsage(null)
                setMemoryUsage(null)
                setNetworkUsage(null)
                setConnectionStatus('disconnected')
            }
        }

        void fetchMetrics()
        const interval = setInterval(() => {
            void fetchMetrics()
        }, 10000)

        return () => clearInterval(interval)
    }, [])

    // Increment XP over time (1 XP per 30s of active coding)
    useEffect(() => {
        const interval = setInterval(() => {
            // Award session XP for active coding time
            setSessionXP(prev => {
                const next = prev + 1
                if (typeof window !== 'undefined') {
                    try { localStorage.setItem('buildspaces.session.xp', String(next)) } catch { }
                }
                return next
            })
        }, 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <TooltipProvider delayDuration={400}>
            <div role="status" aria-label="Editor Status" className="h-5 bg-[hsl(var(--primary))] text-primary-foreground flex items-center justify-between px-1.5 text-[11px] select-none font-medium">
                {/* Left Section */}
                <div className="flex items-center gap-0.5" aria-label="Source control and diagnostics">
                    {/* Remote indicator */}
                    <StatusItem
                        tooltip="Remote Connection"
                        tooltipSub={
                            connectionStatus === 'connected'
                                ? 'Connected to Azora Cloud'
                                : connectionStatus === 'connecting'
                                    ? 'Checking metrics endpoint...'
                                    : 'System metrics endpoint unavailable'
                        }
                    >
                        {connectionStatus === 'connected' ? (
                            <Wifi className="w-3 h-3" />
                        ) : connectionStatus === 'connecting' ? (
                            <Radio className="w-3 h-3" />
                        ) : (
                            <WifiOff className="w-3 h-3 text-red-300" />
                        )}
                    </StatusItem>

                    {/* Git Branch */}
                    <StatusItem tooltip={`Git Branch: ${currentGitBranch}`} tooltipSub={`${gitAhead} ahead, ${gitBehind} behind`}>
                        <GitBranch className="w-3 h-3" />
                        <span>{currentGitBranch}</span>
                        {gitAhead > 0 && <span className="opacity-70">↑{gitAhead}</span>}
                        {gitBehind > 0 && <span className="opacity-70">↓{gitBehind}</span>}
                    </StatusItem>

                    {/* Sync indicator */}
                    {(gitAhead > 0 || gitBehind > 0) && (
                        <StatusItem tooltip="Synchronize Changes" tooltipSub={gitAhead > 0 ? `Push ${gitAhead} commit${gitAhead > 1 ? 's' : ''}` : `Pull ${gitBehind} commit${gitBehind > 1 ? 's' : ''}`}>
                            <Cloud className="w-3 h-3" />
                        </StatusItem>
                    )}

                    {/* Errors & Warnings */}
                    <StatusItem tooltip="Problems" tooltipSub={`${diagnosticErrors} error${diagnosticErrors !== 1 ? 's' : ''}, ${diagnosticWarnings} warning${diagnosticWarnings !== 1 ? 's' : ''}`} onClick={() => setPanelView('problems')}>
                        <XCircle className="w-3 h-3" />
                        <span>{diagnosticErrors}</span>
                        <AlertTriangle className="w-3 h-3 ml-0.5" />
                        <span>{diagnosticWarnings}</span>
                    </StatusItem>

                    {/* Citadel XP & AZR */}
                    <StatusItem tooltip={`Session XP: ${sessionXP}`} tooltipSub={`Total AZR: ${totalAZR.toFixed(2)}`}>
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-300">{sessionXP} XP</span>
                    </StatusItem>

                    {totalAZR > 0 && (
                        <StatusItem tooltip="AZR Tokens" tooltipSub="Proof-of-Knowledge rewards">
                            <Coins className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">{totalAZR.toFixed(1)}</span>
                        </StatusItem>
                    )}

                    {streak > 0 && (
                        <StatusItem tooltip={`${streak}-day coding streak`} tooltipSub="Keep building to maintain your streak!">
                            <Flame className="w-3 h-3 text-orange-400" />
                            <span className="text-orange-300">{streak}</span>
                        </StatusItem>
                    )}
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-0.5" aria-label="Editor information">
                    {/* Cursor Position */}
                    <StatusItem tooltip="Go to Line/Column" tooltipSub="Ctrl+G" onClick={toggleGoToLine}>
                        <span>Ln {cursorLine}, Col {cursorColumn}</span>
                    </StatusItem>

                    {/* Spaces */}
                    <StatusItem tooltip="Indentation" tooltipSub={editorIndentation}>
                        <span>{editorIndentation}</span>
                    </StatusItem>

                    {/* Encoding */}
                    <StatusItem tooltip="File Encoding">
                        <span>{editorEncoding}</span>
                    </StatusItem>

                    {/* EOL */}
                    <StatusItem tooltip="End of Line Sequence">
                        <span>{editorEOL}</span>
                    </StatusItem>

                    {/* Language */}
                    <StatusItem tooltip="Language Mode" tooltipSub={`${editorLanguage}`}>
                        <span>{editorLanguage}</span>
                    </StatusItem>

                    {/* AI Status */}
                    <StatusItem tooltip="Azora AI" tooltipSub="AI assistant ready" className="gap-1" onClick={() => setSidebarView('ai-assistant')}>
                        <Sparkles className="w-3 h-3" />
                        <span>AI</span>
                    </StatusItem>

                    {/* Formatter */}
                    <StatusItem tooltip="Formatting" tooltipSub="Prettier active" onClick={() => setPanelView('problems')}>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Prettier</span>
                    </StatusItem>

                    {/* Performance */}
                    <StatusItem
                        tooltip={`CPU: ${cpuUsage !== null ? `${Math.round(cpuUsage)}%` : 'n/a'}`}
                        tooltipSub={`Memory: ${memoryUsage !== null ? `${Math.round(memoryUsage)}%` : 'n/a'}${networkUsage ? ` • Net ↓${formatBytesPerSecond(networkUsage.rxPerSec)} ↑${formatBytesPerSecond(networkUsage.txPerSec)}` : ''}`}
                        onClick={() => setPanelView('performance')}
                    >
                        <Cpu className="w-3 h-3" />
                        <span>{cpuUsage !== null ? `${Math.round(cpuUsage)}%` : 'N/A'}</span>
                    </StatusItem>

                    {/* Copilot-style status */}
                    <StatusItem tooltip="Secure Workspace" tooltipSub="HTTPS • Sandboxed" onClick={() => setSidebarView('security')}>
                        <Lock className="w-3 h-3" />
                    </StatusItem>

                    {/* Zen Mode Toggle (8F) */}
                    <StatusItem
                        tooltip={isZenMode ? "Exit Zen Mode" : "Enter Zen Mode"}
                        tooltipSub="Ctrl+K Z · Distraction-free coding"
                        onClick={toggleZenMode}
                        className={isZenMode ? 'text-emerald-300' : ''}
                    >
                        <Maximize2 className="w-3 h-3" />
                        {isZenMode && <span>Zen</span>}
                    </StatusItem>

                    {/* Notifications */}
                    <NotificationsCenter />
                </div>
            </div>
        </TooltipProvider>
    )
}
