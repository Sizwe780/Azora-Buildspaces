"use client"

import { useState, useEffect } from "react"
import {
    GitBranch,
    AlertCircle,
    Check,
    Bell,
    Wifi,
    Cpu,
    HardDrive,
    Zap,
    Clock,
    Globe,
    Shield,
    Activity,
    Settings,
    User,
    Radio,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Cloud,
    Lock
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWorkspace } from "@/lib/contexts/workspace-context"
import { NotificationsCenter } from "@/components/workspace/notifications-center"
import { cn } from "@/lib/utils"

function StatusItem({ children, className, tooltip, tooltipSub, onClick }: {
    children: React.ReactNode
    className?: string
    tooltip?: string
    tooltipSub?: string
    onClick?: () => void
}) {
    const content = (
        <div
            className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-sm cursor-default text-xs transition-colors hover:bg-white/10",
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

export function StatusBar() {
    const { activeRoom } = useWorkspace()
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected')
    const [cpuUsage, setCpuUsage] = useState(45)
    const [memoryUsage, setMemoryUsage] = useState(67)
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => {
            setCpuUsage(prev => Math.max(20, Math.min(90, prev + (Math.random() - 0.5) * 10)))
            setMemoryUsage(prev => Math.max(30, Math.min(95, prev + (Math.random() - 0.5) * 5)))
            setCurrentTime(new Date())
        }, 5000)
        return () => clearInterval(interval)
    }, [])

    return (
        <TooltipProvider delayDuration={400}>
            <div className="h-[22px] bg-[hsl(var(--primary))] text-primary-foreground flex items-center justify-between px-2 text-[11px] select-none font-medium">
                {/* Left Section */}
                <div className="flex items-center gap-0.5">
                    {/* Remote indicator */}
                    <StatusItem tooltip="Remote Connection" tooltipSub="Connected to Azora Cloud">
                        <Radio className="w-3 h-3" />
                    </StatusItem>

                    {/* Git Branch */}
                    <StatusItem tooltip="Git Branch: main" tooltipSub="2 commits ahead, 0 behind">
                        <GitBranch className="w-3 h-3" />
                        <span>main</span>
                        <span className="opacity-70">↑2</span>
                    </StatusItem>

                    {/* Sync indicator */}
                    <StatusItem tooltip="Synchronize Changes" tooltipSub="Push 2 commits">
                        <Cloud className="w-3 h-3" />
                    </StatusItem>

                    {/* Errors & Warnings */}
                    <StatusItem tooltip="Problems" tooltipSub="0 errors, 3 warnings">
                        <XCircle className="w-3 h-3" />
                        <span>0</span>
                        <AlertTriangle className="w-3 h-3 ml-0.5" />
                        <span>3</span>
                    </StatusItem>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-0.5">
                    {/* Cursor Position */}
                    <StatusItem tooltip="Go to Line/Column" tooltipSub="Ctrl+G">
                        <span>Ln 42, Col 18</span>
                    </StatusItem>

                    {/* Spaces */}
                    <StatusItem tooltip="Indentation" tooltipSub="Spaces: 2">
                        <span>Spaces: 2</span>
                    </StatusItem>

                    {/* Encoding */}
                    <StatusItem tooltip="File Encoding">
                        <span>UTF-8</span>
                    </StatusItem>

                    {/* EOL */}
                    <StatusItem tooltip="End of Line Sequence">
                        <span>LF</span>
                    </StatusItem>

                    {/* Language */}
                    <StatusItem tooltip="Language Mode" tooltipSub="TypeScript React (.tsx)">
                        <span>TypeScript React</span>
                    </StatusItem>

                    {/* AI Status */}
                    <StatusItem tooltip="Azora AI" tooltipSub="AI assistant ready" className="gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>AI</span>
                    </StatusItem>

                    {/* Formatter */}
                    <StatusItem tooltip="Formatting" tooltipSub="Prettier active">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Prettier</span>
                    </StatusItem>

                    {/* Performance */}
                    <StatusItem tooltip={`CPU: ${Math.round(cpuUsage)}%`} tooltipSub={`Memory: ${Math.round(memoryUsage)}%`}>
                        <Cpu className="w-3 h-3" />
                        <span>{Math.round(cpuUsage)}%</span>
                    </StatusItem>

                    {/* Copilot-style status */}
                    <StatusItem tooltip="Secure Workspace" tooltipSub="HTTPS · Sandboxed">
                        <Lock className="w-3 h-3" />
                    </StatusItem>

                    {/* Notifications */}
                    <NotificationsCenter />
                </div>
            </div>
        </TooltipProvider>
    )
}
