"use client"

import { useState, useMemo } from "react"
import {
    File, Settings, Terminal, GitBranch, Package, Zap, Command, Play, Cloud, Eye, BookOpen, Bot,
    Search, Box, Sparkles, MessageSquare, Scissors, Paintbrush, Hexagon, Rocket, Shield, Figma,
    FlaskConical, Activity, LineChart, BarChart3, SplitSquareVertical, Maximize, X, Layout,
    Moon, Sun, Type, Code2, RefreshCw, Download, Upload, FolderOpen, Bug, Wand2, GitCompare
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { useWorkbench, type SidebarView, type PanelView } from "@/lib/stores/workbench-store"

interface CommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface CommandEntry {
    id: string
    title: string
    description?: string
    icon?: any
    shortcut?: string
    action: () => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
    const [value, setValue] = useState("")
    const router = useRouter()
    const {
        setSidebarView, setPanelView, toggleSidebar, togglePanel,
        toggleZenMode, splitEditor, isZenMode, openDiffEditor, closeDiffEditor
    } = useWorkbench()

    const dispatch = (event: string, detail?: unknown) => {
        window.dispatchEvent(new CustomEvent(event, { detail }))
    }

    const openView = (view: SidebarView) => () => setSidebarView(view)
    const openPanel = (panel: PanelView) => () => setPanelView(panel)

    const commands: CommandEntry[] = useMemo(() => [
        // File Operations
        { id: "file.save", title: "File: Save", description: "Save the current file", icon: File, shortcut: "Ctrl+S", action: () => dispatch("workspace:save") },
        { id: "file.saveAll", title: "File: Save All", description: "Save all open files", icon: File, shortcut: "Ctrl+K S", action: () => dispatch("workspace:save-all") },
        { id: "file.new", title: "File: New File", description: "Create a new file", icon: File, shortcut: "Ctrl+N", action: () => dispatch("workspace:new-file") },
        { id: "file.upload", title: "File: Upload Files", description: "Upload from your computer", icon: Upload, action: () => dispatch("workspace:upload-files") },
        { id: "file.openFolder", title: "File: Open Folder...", description: "Open a folder in the workspace", icon: FolderOpen, shortcut: "Ctrl+K Ctrl+O", action: () => dispatch("workspace:open-folder") },

        // View Operations
        { id: "view.explorer", title: "View: Show Explorer", description: "Open the file explorer", icon: File, shortcut: "Ctrl+Shift+E", action: openView('explorer') },
        { id: "view.search", title: "View: Show Search", description: "Open search across files", icon: Search, shortcut: "Ctrl+Shift+F", action: openView('search') },
        { id: "view.git", title: "View: Show Source Control", description: "Open source control panel", icon: GitBranch, shortcut: "Ctrl+Shift+G", action: openView('git') },
        { id: "view.extensions", title: "View: Show Extensions", description: "Browse and install extensions", icon: Box, shortcut: "Ctrl+Shift+X", action: openView('extensions') },
        { id: "view.ai", title: "View: Show AI Assistant", description: "Open the Elara AI assistant", icon: Sparkles, shortcut: "Ctrl+Shift+I", action: openView('ai-assistant') },
        { id: "view.chat", title: "View: Show Collaboration Chat", description: "Open real-time collaboration", icon: MessageSquare, shortcut: "Ctrl+Shift+A", action: openView('chat') },
        { id: "view.snippets", title: "View: Show Snippets", description: "Manage code snippets", icon: Scissors, action: openView('snippets') },
        { id: "view.themes", title: "View: Show Themes", description: "Theme and accessibility settings", icon: Paintbrush, action: openView('themes') },
        { id: "view.cloud", title: "View: Show Cloud Emulation", description: "Cloud environment simulation", icon: Cloud, action: openView('cloud') },
        { id: "view.cicd", title: "View: Show CI/CD Pipelines", description: "Continuous integration pipelines", icon: Rocket, action: openView('cicd') },
        { id: "view.web3", title: "View: Show Web3 Tooling", description: "Blockchain development tools", icon: Hexagon, action: openView('web3') },
        { id: "view.packages", title: "View: Show Package Manager", description: "Manage project dependencies", icon: Package, action: openView('packages') },
        { id: "view.security", title: "View: Show Security Scanner", description: "Security analysis and scanning", icon: Shield, action: openView('security') },
        { id: "view.figma", title: "View: Show Figma to Code", description: "Convert Figma designs to code", icon: Figma, action: openView('figma') },
        { id: "view.qaTesting", title: "View: Show QA & Testing", description: "Test runner and coverage", icon: FlaskConical, action: openView('qa-testing') },
        { id: "view.telemetry", title: "View: Show Telemetry", description: "Event tracking and analytics", icon: LineChart, action: openView('telemetry') },
        { id: "view.observability", title: "View: Show Observability", description: "System health and monitoring", icon: Activity, action: openView('observability') },
        { id: "view.deployment", title: "View: Show Deployment", description: "Deploy and export your project", icon: Rocket, action: openView('deployment') },
        { id: "view.settings", title: "Preferences: Open Settings", description: "Open workspace settings editor", icon: Settings, shortcut: "Ctrl+,", action: openView('settings') },
        { id: "view.codeAnalysis", title: "View: Show Code Analysis", description: "Code metrics, complexity, and dependency analysis", icon: BarChart3, shortcut: "Ctrl+Shift+A", action: openView('code-analysis') },
        { id: "view.refactoring", title: "View: Show Refactoring", description: "AI-powered refactoring suggestions", icon: Wand2, action: openView('refactoring') },

        // Panel Operations
        { id: "panel.terminal", title: "View: Toggle Terminal", description: "Show or hide the integrated terminal", icon: Terminal, shortcut: "Ctrl+`", action: openPanel('terminal') },
        { id: "panel.output", title: "View: Show Output", description: "Show output channel", icon: Terminal, shortcut: "Ctrl+Shift+U", action: openPanel('output') },
        { id: "panel.problems", title: "View: Show Problems", description: "Show errors and warnings", icon: X, shortcut: "Ctrl+Shift+M", action: openPanel('problems') },
        { id: "panel.debug", title: "View: Show Debug Console", description: "Debug console output", icon: Bug, shortcut: "Ctrl+Shift+Y", action: openPanel('debug') },
        { id: "panel.testing", title: "View: Show Testing", description: "Test explorer and results", icon: FlaskConical, action: openPanel('testing') },
        { id: "panel.performance", title: "View: Show Performance", description: "Performance profiler", icon: Zap, action: openPanel('performance') },
        { id: "panel.codeReview", title: "View: Show Code Review", description: "Code review panel", icon: BarChart3, action: openPanel('code-review') },
        { id: "panel.livePreview", title: "View: Show Live Preview", description: "Live preview of web pages", icon: Eye, action: openPanel('live-preview') },

        // Layout
        { id: "layout.toggleSidebar", title: "View: Toggle Primary Sidebar", description: "Show or hide the sidebar", icon: Layout, shortcut: "Ctrl+B", action: toggleSidebar },
        { id: "layout.togglePanel", title: "View: Toggle Panel", description: "Show or hide the bottom panel", icon: Layout, shortcut: "Ctrl+J", action: togglePanel },
        { id: "layout.splitEditor", title: "View: Split Editor Right", description: "Split the editor to the right", icon: SplitSquareVertical, shortcut: "Ctrl+\\", action: () => splitEditor('horizontal') },
        { id: "layout.splitEditorDown", title: "View: Split Editor Down", description: "Split the editor downward", icon: SplitSquareVertical, action: () => splitEditor('vertical') },
        { id: "layout.zenMode", title: "View: Toggle Zen Mode", description: "Distraction-free editing mode", icon: Maximize, shortcut: "Ctrl+K Z", action: toggleZenMode },
        { id: "layout.diffEditor", title: "View: Open Diff Editor", description: "Open side-by-side diff comparison", icon: GitCompare, action: () => openDiffEditor("Original", "Modified") },
        { id: "layout.closeDiff", title: "View: Close Diff Editor", description: "Close the diff comparison view", icon: X, action: closeDiffEditor },

        // Rooms
        { id: "room.codeChamber", title: "Go to: Code Chamber", description: "Switch to the code editor", icon: Code2, shortcut: "Ctrl+1", action: () => dispatch("workspace:goto-room", "code-chamber") },
        { id: "room.designStudio", title: "Go to: Design Studio", description: "Switch to the design tool", icon: Paintbrush, shortcut: "Ctrl+3", action: () => dispatch("workspace:goto-room", "design-studio") },
        { id: "room.aiStudio", title: "Go to: AI Studio", description: "Switch to the AI studio", icon: Sparkles, shortcut: "Ctrl+2", action: () => dispatch("workspace:goto-room", "ai-studio") },
        { id: "room.knowledge", title: "Go to: Knowledge Ocean", description: "Open the knowledge base", icon: BookOpen, action: () => dispatch("workspace:goto-room", "knowledge-ocean") },

        // Git Operations
        { id: "git.commit", title: "Git: Commit", description: "Commit staged changes", icon: GitBranch, action: () => dispatch("workspace:git-commit") },
        { id: "git.push", title: "Git: Push", description: "Push commits to remote", icon: GitBranch, action: () => dispatch("workspace:git-push") },
        { id: "git.pull", title: "Git: Pull", description: "Pull latest changes", icon: GitBranch, action: () => dispatch("workspace:git-pull") },
        { id: "git.createBranch", title: "Git: Create Branch...", description: "Create a new branch", icon: GitBranch, action: () => dispatch("workspace:git-create-branch") },

        // Run & Debug
        { id: "dev.run", title: "Run: Start Debugging", description: "Start the debugger", icon: Play, shortcut: "F5", action: () => dispatch("workspace:start-debug") },
        { id: "dev.runNoDebug", title: "Run: Run Without Debugging", description: "Run without debugger", icon: Play, shortcut: "Ctrl+F5", action: () => dispatch("workspace:run-no-debug") },
        { id: "dev.deploy", title: "Deploy: Push to Cloud", description: "Deploy the project to cloud", icon: Cloud, action: openView('deployment') },
        { id: "dev.runTests", title: "Testing: Run All Tests", description: "Run all test suites", icon: FlaskConical, action: openView('qa-testing') },

    ], [setSidebarView, setPanelView, toggleSidebar, togglePanel, toggleZenMode, splitEditor, openDiffEditor, closeDiffEditor])

    const filteredCommands = value
        ? commands.filter(cmd =>
            cmd.title.toLowerCase().includes(value.toLowerCase()) ||
            (cmd.description && cmd.description.toLowerCase().includes(value.toLowerCase()))
          )
        : commands

    const handleSelect = (cmd: CommandEntry) => {
        cmd.action()
        onOpenChange(false)
        setValue("")
    }

    const groups = [
        { heading: "Files", prefix: "file." },
        { heading: "Views", prefix: "view." },
        { heading: "Panel", prefix: "panel." },
        { heading: "Layout", prefix: "layout." },
        { heading: "Rooms", prefix: "room." },
        { heading: "Git", prefix: "git." },
        { heading: "Run & Debug", prefix: "dev." },
    ]

    const renderItem = (cmd: CommandEntry) => (
        <CommandItem
            key={cmd.id}
            value={cmd.title}
            onSelect={() => handleSelect(cmd)}
            className="flex items-center gap-3 px-3 py-2"
        >
            {cmd.icon && <cmd.icon className="w-4 h-4 shrink-0 text-muted-foreground" />}
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{cmd.title}</div>
                {cmd.description && (
                    <div className="text-xs text-muted-foreground truncate">{cmd.description}</div>
                )}
            </div>
            {cmd.shortcut && (
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                    {cmd.shortcut}
                </Badge>
            )}
        </CommandItem>
    )

    const handleOpenChange = (v: boolean) => {
        onOpenChange(v)
        if (!v) setValue("")
    }

    return (
        <CommandDialog open={open} onOpenChange={handleOpenChange}>
            <CommandInput
                placeholder="Type a command or search..."
                value={value}
                onValueChange={setValue}
            />
            <CommandList className="max-h-[400px]">
                <CommandEmpty>No results found.</CommandEmpty>
                {groups.map((group, idx) => {
                    const items = filteredCommands.filter(cmd => cmd.id.startsWith(group.prefix))
                    if (items.length === 0) return null
                    return (
                        <div key={group.prefix}>
                            {idx > 0 && <CommandSeparator />}
                            <CommandGroup heading={group.heading}>
                                {items.map(renderItem)}
                            </CommandGroup>
                        </div>
                    )
                })}
            </CommandList>
        </CommandDialog>
    )
}
