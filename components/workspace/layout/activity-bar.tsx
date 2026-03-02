"use client"

import { useState } from "react"
import {
    Files,
    Search,
    GitBranch,
    Box,
    MessageSquare,
    Settings,
    User,
    Cpu,
    Zap,
    Sparkles,
    Code2,
    Palette,
    Database,
    Cloud,
    Shield,
    BarChart3,
    Scissors,
    Paintbrush,
    Hexagon,
    Rocket,
    Package,
    Figma,
    ChevronDown,
    ChevronUp,
    FlaskConical,
    Activity,
    LineChart
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkbench, SidebarView } from "@/lib/stores/workbench-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWorkspace } from "@/lib/contexts/workspace-context"

export function ActivityBar() {
    const { activeSidebarView, setSidebarView, isSidebarVisible, toggleSidebar } = useWorkbench()
    const { activeRoom } = useWorkspace()
    const [showMore, setShowMore] = useState(false)

    // Primary items always visible
    const primaryItems: { view: SidebarView; icon: any; label: string; badge?: string; notification?: number }[] = [
        { view: 'explorer', icon: Files, label: 'Explorer', badge: 'Ctrl+Shift+E' },
        { view: 'search', icon: Search, label: 'Search', badge: 'Ctrl+Shift+F' },
        { view: 'git', icon: GitBranch, label: 'Source Control', badge: 'Ctrl+Shift+G', notification: 3 },
        { view: 'extensions', icon: Box, label: 'Extensions', badge: 'Ctrl+Shift+X' },
        { view: 'ai-assistant', icon: Sparkles, label: 'AI Assistant', badge: 'Ctrl+Shift+I' },
        { view: 'chat', icon: MessageSquare, label: 'Collaboration', badge: 'Ctrl+Shift+A' },
    ]

    // Secondary items in overflow
    const secondaryItems: { view: SidebarView; icon: any; label: string; badge?: string }[] = [
        { view: 'code-analysis', icon: BarChart3, label: 'Code Analysis' },
        { view: 'refactoring', icon: Zap, label: 'Refactoring' },
        { view: 'snippets', icon: Scissors, label: 'Snippets' },
        { view: 'themes', icon: Paintbrush, label: 'Themes & Accessibility' },
        { view: 'cloud', icon: Cloud, label: 'Cloud Emulation' },
        { view: 'cicd', icon: Rocket, label: 'CI/CD Pipelines' },
        { view: 'web3', icon: Hexagon, label: 'Web3 Tooling' },
        { view: 'packages', icon: Package, label: 'Package Manager' },
        { view: 'security', icon: Shield, label: 'Security' },
        { view: 'figma', icon: Figma, label: 'Figma to Code' },
        { view: 'qa-testing', icon: FlaskConical, label: 'QA & Testing' },
        { view: 'telemetry', icon: LineChart, label: 'Telemetry' },
        { view: 'observability', icon: Activity, label: 'Observability' },
        { view: 'deployment', icon: Rocket, label: 'Deploy & Export' },
    ]

    const roomSpecificItems = () => {
        switch (activeRoom) {
            case 'design-studio':
                return [
                    { view: 'explorer' as SidebarView, icon: Palette, label: 'Design Assets', badge: 'Ctrl+Shift+D' },
                    { view: 'search' as SidebarView, icon: Search, label: 'Search Designs', badge: 'Ctrl+Shift+F' },
                ]
            case 'maker-lab':
                return [
                    { view: 'explorer' as SidebarView, icon: Cpu, label: 'Hardware', badge: 'Ctrl+Shift+H' },
                    { view: 'search' as SidebarView, icon: Database, label: 'IoT Data', badge: 'Ctrl+Shift+T' },
                ]
            case 'spec-chamber':
                return [
                    { view: 'explorer' as SidebarView, icon: Shield, label: 'Specifications', badge: 'Ctrl+Shift+S' },
                    { view: 'search' as SidebarView, icon: Cloud, label: 'Requirements', badge: 'Ctrl+Shift+Q' },
                ]
            default:
                return null
        }
    }

    const overrideItems = roomSpecificItems()
    const displayPrimary = overrideItems || primaryItems
    const displaySecondary = overrideItems ? [] : secondaryItems

    const handleClick = (view: SidebarView) => {
        if (activeSidebarView === view && isSidebarVisible) {
            toggleSidebar()
        } else {
            setSidebarView(view)
        }
    }

    const renderItem = (item: typeof primaryItems[0], compact = false) => (
        <Tooltip key={item.view}>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "w-10 h-10 rounded-lg transition-all duration-200 relative group",
                        activeSidebarView === item.view && isSidebarVisible
                            ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px] shadow-primary/25"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                    onClick={() => handleClick(item.view)}
                >
                    <item.icon className={cn("w-[18px] h-[18px] transition-transform", activeSidebarView === item.view && isSidebarVisible && "scale-110")} />

                    {/* Active indicator bar */}
                    {activeSidebarView === item.view && isSidebarVisible && (
                        <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-primary rounded-r-full" />
                    )}

                    {/* Notification badge */}
                    {'notification' in item && item.notification && item.notification > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                            {item.notification}
                        </span>
                    )}

                    {/* Subtle glow on hover */}
                    <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 bg-gradient-to-br from-primary/5 to-transparent transition-opacity duration-300" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="bg-popover/95 backdrop-blur-md border border-border/60 shadow-xl">
                <div className="text-sm py-0.5">
                    <div className="font-semibold">{item.label}</div>
                    {item.badge && (
                        <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{item.badge}</div>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    )

    return (
        <TooltipProvider delayDuration={300}>
            <div className="w-12 flex flex-col items-center py-2 bg-background/80 backdrop-blur-sm border-r border-border/40 h-full">
                {/* Logo */}
                <div className="mb-3 mt-0.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-violet-600/20">
                        <Code2 className="w-4 h-4 text-white" />
                    </div>
                </div>

                {/* Divider */}
                <div className="w-6 h-px bg-border/60 mb-2" />

                {/* Primary Items */}
                <div className="flex-1 space-y-0.5 w-full flex flex-col items-center overflow-y-auto scrollbar-hide">
                    {displayPrimary.map((item) => renderItem(item))}

                    {/* Overflow toggle */}
                    {displaySecondary.length > 0 && (
                        <>
                            <div className="w-5 h-px bg-border/40 my-1.5" />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-10 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                                        onClick={() => setShowMore(!showMore)}
                                    >
                                        {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={8}>
                                    {showMore ? 'Show fewer tools' : 'Show more tools'}
                                </TooltipContent>
                            </Tooltip>

                            {showMore && displaySecondary.map((item) => renderItem(item, true))}
                        </>
                    )}
                </div>

                {/* Bottom Section */}
                <div className="mt-auto space-y-0.5 flex flex-col items-center">
                    <div className="w-5 h-px bg-border/40 mb-1.5" />

                    {/* User Avatar */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-10 h-10 rounded-lg hover:bg-accent/50 transition-all"
                            >
                                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background">
                                    U
                                </div>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                            <div className="text-sm">
                                <div className="font-semibold">User Profile</div>
                                <div className="text-[11px] text-muted-foreground">Account & Settings</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>

                    {/* Settings */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "w-10 h-10 rounded-lg transition-all",
                                    activeSidebarView === 'settings' && isSidebarVisible
                                        ? "bg-primary/15 text-primary"
                                        : "hover:bg-accent/50"
                                )}
                                onClick={() => handleClick('settings')}
                            >
                                <Settings className="w-[18px] h-[18px]" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                            <div className="text-sm">
                                <div className="font-semibold">Settings</div>
                                <div className="text-[11px] text-muted-foreground font-mono">Ctrl+,</div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    )
}
