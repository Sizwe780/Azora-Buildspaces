"use client"

import { useState } from "react"
import {
    Files,
    Search,
    GitBranch,
    Box,
    MessageSquare,
    Settings,
    Cpu,
    Zap,
    Sparkles,
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
    LineChart,
    Play,
    ListTree,
    Menu,
    LayoutDashboard,
    Code,
    FileText,
    Lightbulb,
    Wand2,
    Focus,
    BookOpen,
    ClipboardList,
    Trophy,
    Store,
    Users,
    Theater,
    Wrench,
    Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkbench, SidebarView } from "@/lib/stores/workbench-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useWorkspace, RoomType } from "@/lib/contexts/workspace-context"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ActivityBar({ onZenMode, onCollapse }: { onZenMode?: () => void; onCollapse?: () => void } = {}) {
    const { activeSidebarView, setSidebarView, isSidebarVisible, toggleSidebar } = useWorkbench()
    const { activeRoom, setActiveRoom } = useWorkspace()
    const [showMore, setShowMore] = useState(false)

    // Primary items always visible
    const primaryItems: { view: SidebarView; icon: any; label: string; badge?: string; notification?: number }[] = [
        { view: 'explorer', icon: Files, label: 'Explorer', badge: 'Ctrl+Shift+E' },
        { view: 'outline', icon: ListTree, label: 'Outline', badge: 'Ctrl+Shift+O' },
        { view: 'search', icon: Search, label: 'Search', badge: 'Ctrl+Shift+F' },
        { view: 'git', icon: GitBranch, label: 'Source Control', badge: 'Ctrl+Shift+G', notification: 3 },
        { view: 'task-runner', icon: Play, label: 'Tasks', badge: 'Ctrl+Shift+T' },
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

    // Room definitions for hamburger menu
    const rooms: { id: RoomType; label: string; icon: any }[] = [
        { id: 'code-chamber', label: 'Code Chamber', icon: Code },
        { id: 'spec-chamber', label: 'Spec Chamber', icon: FileText },
        { id: 'design-studio', label: 'Design Studio', icon: Palette },
        { id: 'ai-studio', label: 'AI Studio', icon: Sparkles },
        { id: 'command-desk', label: 'Command Desk', icon: LayoutDashboard },
        { id: 'maker-lab', label: 'Maker Lab', icon: Wrench },
        { id: 'collaboration-pod', label: 'Collab Pod', icon: Users },
        { id: 'innovation-theater', label: 'Innovation Theater', icon: Theater },
        { id: 'deep-focus', label: 'Deep Focus', icon: Focus },
        { id: 'knowledge-ocean', label: 'Knowledge Ocean', icon: BookOpen },
        { id: 'task-board', label: 'Task Board', icon: ClipboardList },
        { id: 'collectible-showcase', label: 'Collectibles', icon: Trophy },
        { id: 'marketplace', label: 'Marketplace', icon: Store },
    ]

    return (
        <TooltipProvider delayDuration={300}>
            <div className="w-12 flex flex-col items-center py-2 bg-background/80 backdrop-blur-sm border-r border-border/20 h-full">
                {/* Buildspaces Logo + Hamburger Room Menu */}
                <div className="mb-3 mt-0.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center group relative transition-all hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                                {/* Buildspaces brand icon — teal/gold gradient */}
                                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="bs-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#21d4b3" />
                                            <stop offset="100%" stopColor="#0d5c4d" />
                                        </linearGradient>
                                        <linearGradient id="bs-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#f5c349" />
                                            <stop offset="100%" stopColor="#7a5c1f" />
                                        </linearGradient>
                                    </defs>
                                    {/* Citadel "A" tower */}
                                    <path d="M8 26 L16 6 L24 26 M11 18 L21 18" stroke="url(#bs-teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                    {/* Gold convergence dot */}
                                    <circle cx="16" cy="12" r="1.5" fill="url(#bs-gold)" />
                                </svg>
                                {/* Hamburger indicator on hover */}
                                <div className="absolute inset-0 rounded-lg bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Menu className="w-3.5 h-3.5 text-primary/60" />
                                </div>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-56 bg-popover/95 backdrop-blur-md border border-border/40 shadow-xl">
                            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Switch Room</div>
                            {rooms.map((room) => (
                                <DropdownMenuItem
                                    key={room.id}
                                    onClick={() => setActiveRoom(room.id)}
                                    className={cn(
                                        "flex items-center gap-2 cursor-pointer",
                                        activeRoom === room.id && "bg-primary/10 text-primary"
                                    )}
                                >
                                    <room.icon className="w-4 h-4" />
                                    <span className="flex-1 text-sm">{room.label}</span>
                                    {activeRoom === room.id && <Check className="w-3.5 h-3.5 text-primary" />}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.location.href = '/features/buildspaces'
                                    }
                                }}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                <span className="text-sm">Back to Dashboard</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Divider */}
                <div className="w-6 h-px bg-border/40 mb-2" />

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

                {/* Bottom Section — Settings only (profile/secondary sidebar removed) */}
                <div className="mt-auto space-y-0.5 flex flex-col items-center">
                    <div className="w-5 h-px bg-border/40 mb-1.5" />

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
