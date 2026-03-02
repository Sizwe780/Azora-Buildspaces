"use client"

import {
    Terminal,
    FileOutput,
    AlertTriangle,
    Bug,
    FlaskConical,
    Gauge,
    GitPullRequest,
    Globe,
    X,
    Maximize2,
    Minimize2,
    ChevronDown
} from "lucide-react"
import { useWorkbench, PanelView } from "@/lib/stores/workbench-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface PanelProps {
    children: React.ReactNode
}

export function Panel({ children }: PanelProps) {
    const { activePanelView, setPanelView, togglePanel } = useWorkbench()
    const [isMaximized, setIsMaximized] = useState(false)

    const tabs: { view: PanelView; label: string; icon: any; badge?: number; color?: string }[] = [
        { view: 'terminal', label: 'Terminal', icon: Terminal },
        { view: 'output', label: 'Output', icon: FileOutput },
        { view: 'problems', label: 'Problems', icon: AlertTriangle, badge: 3, color: 'text-yellow-500' },
        { view: 'debug', label: 'Debug Console', icon: Bug, color: 'text-orange-500' },
        { view: 'testing', label: 'Testing', icon: FlaskConical, color: 'text-green-500' },
        { view: 'performance', label: 'Performance', icon: Gauge, color: 'text-blue-500' },
        { view: 'code-review', label: 'Review', icon: GitPullRequest, color: 'text-purple-500' },
        { view: 'live-preview', label: 'Preview', icon: Globe, color: 'text-emerald-500' },
    ]

    return (
        <div className={cn("flex flex-col h-full bg-background/95 backdrop-blur-sm border-t border-border/40", isMaximized && "fixed inset-0 z-50")}>
            {/* Tab Bar */}
            <div className="flex items-center h-9 bg-muted/20 border-b border-border/30 select-none">
                {/* Tabs */}
                <div className="flex items-center flex-1 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.view}
                            onClick={() => setPanelView(tab.view)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 h-9 text-[11px] font-medium uppercase tracking-wider transition-all whitespace-nowrap border-b-2",
                                activePanelView === tab.view
                                    ? "text-foreground border-primary bg-background/60"
                                    : "text-muted-foreground border-transparent hover:text-foreground/80 hover:bg-muted/30"
                            )}
                        >
                            <tab.icon className={cn("w-3.5 h-3.5", activePanelView === tab.view && tab.color)} />
                            <span>{tab.label}</span>
                            {tab.badge !== undefined && tab.badge > 0 && (
                                <span className={cn(
                                    "min-w-[16px] h-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center leading-none",
                                    activePanelView === tab.view
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted-foreground/20 text-muted-foreground"
                                )}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Panel Actions */}
                <div className="flex items-center gap-0.5 px-1.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setIsMaximized(!isMaximized)}
                    >
                        {isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 text-muted-foreground hover:text-foreground"
                        onClick={togglePanel}
                    >
                        <X className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}
