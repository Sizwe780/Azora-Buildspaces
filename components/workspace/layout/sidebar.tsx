"use client"

import { useWorkbench } from "@/lib/stores/workbench-store"
import { PanelLeftClose } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface SidebarProps {
    children: React.ReactNode
}

const VIEW_TITLES: Record<string, string> = {
    explorer: 'EXPLORER',
    search: 'SEARCH',
    git: 'SOURCE CONTROL',
    extensions: 'EXTENSIONS',
    chat: 'COLLABORATION',
    'ai-assistant': 'AI ASSISTANT',
    'code-analysis': 'CODE ANALYSIS',
    refactoring: 'REFACTORING',
    snippets: 'SNIPPETS',
    themes: 'THEMES & ACCESSIBILITY',
    cloud: 'CLOUD EMULATION',
    cicd: 'CI/CD PIPELINES',
    web3: 'WEB3 TOOLING',
    packages: 'PACKAGE MANAGER',
    security: 'SECURITY',
    figma: 'FIGMA TO CODE',
    'qa-testing': 'QA & TESTING',
    telemetry: 'TELEMETRY',
    observability: 'OBSERVABILITY',
    deployment: 'DEPLOY & EXPORT',
    settings: 'SETTINGS',
}

export function Sidebar({ children }: SidebarProps) {
    const { activeSidebarView, toggleSidebar } = useWorkbench()

    const title = VIEW_TITLES[activeSidebarView] || 'SIDEBAR'

    return (
        <TooltipProvider delayDuration={400}>
            <div className="flex flex-col h-full bg-background/60 backdrop-blur-sm text-foreground border-r border-border/40">
                {/* Sidebar header */}
                <div className="h-9 flex items-center justify-between px-3 border-b border-border/20 bg-background/40 flex-shrink-0">
                    <span className="text-[11px] font-semibold text-muted-foreground tracking-wider select-none truncate">
                        {title}
                    </span>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-5 h-5 text-muted-foreground hover:text-foreground"
                                onClick={toggleSidebar}
                            >
                                <PanelLeftClose className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                            Toggle Sidebar <kbd className="ml-1 text-[10px] opacity-60">Ctrl+B</kbd>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </div>
        </TooltipProvider>
    )
}
