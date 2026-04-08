"use client"

import { useState, useMemo, useEffect } from "react"
import { Pin, Clock } from "lucide-react"
import {
    File, Settings, Terminal, GitBranch, Package, Zap, Command, Play, Cloud, Eye, BookOpen, Bot,
    Search, Box, Sparkles, MessageSquare, Scissors, Paintbrush, Hexagon, Rocket, Shield, Figma,
    FlaskConical, Activity, LineChart, BarChart3, SplitSquareVertical, Maximize, X, Layout,
    Moon, Sun, Type, Code2, RefreshCw, Download, Upload, FolderOpen, Bug, Wand2, GitCompare,
    PanelRight, ZoomIn, ZoomOut, RotateCcw, FileText,
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
import { extensionRuntime } from "@/lib/services/extension-runtime"
import { PanelView, SidebarView, useWorkbench } from "@/lib/stores/workbench-store"

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
    const [recentIds, setRecentIds] = useState<string[]>([])

    useEffect(() => {
        try {
            const saved = localStorage.getItem("buildspaces.recent_commands")
            if (saved) setRecentIds(JSON.parse(saved))
        } catch {}
    }, [])

    const router = useRouter()
    const {
        setSidebarView, setPanelView, toggleSidebar, togglePanel,
        toggleSecondarySidebar, showSecondarySidebar,
        toggleActivityBar, toggleStatusBar,
        toggleZenMode, splitEditor, isZenMode, openDiffEditor, closeDiffEditor
    } = useWorkbench()

    const dispatch = (event: string, detail?: unknown) => {
        window.dispatchEvent(new CustomEvent(event, { detail }))
    }

    const openView = (view: SidebarView) => () => setSidebarView(view)
    const openPanel = (panel: PanelView) => () => setPanelView(panel)

    const commands: CommandEntry[] = useMemo(() => {
        // Get extension commands
        const extensionCommands: CommandEntry[] = extensionRuntime.getCommands().map(cmd => ({
            id: cmd.id,
            title: cmd.title,
            description: `Extension: ${cmd.category || 'Command'}`,
            icon: Package,
            action: () => extensionRuntime.executeCommand(cmd.id)
        }))

        const baseCommands = [
            // File Operations
            { id: "file.save", title: "File: Save", description: "Save the current file", icon: File, shortcut: "Ctrl+S", action: () => dispatch("workspace:save") },
            { id: "file.saveAll", title: "File: Save All", description: "Save all open files", icon: File, shortcut: "Ctrl+K S", action: () => dispatch("workspace:save-all") },
            { id: "file.new", title: "File: New File", description: "Create a new file", icon: File, shortcut: "Ctrl+N", action: () => dispatch("workspace:new-file") },
            { id: "file.upload", title: "File: Upload Files", description: "Upload from your computer", icon: Upload, action: () => dispatch("workspace:upload-files") },
            { id: "file.openFolder", title: "File: Open Folder...", description: "Open a folder in the workspace", icon: FolderOpen, shortcut: "Ctrl+K Ctrl+O", action: () => dispatch("workspace:open-folder") },

            // View Operations
            { id: "view.explorer", title: "View: Show Explorer", description: "Open the file explorer", icon: File, shortcut: "Ctrl+Shift+E", action: openView('explorer') },
            { id: "view.search", title: "View: Show Search", description: "Open search across files", icon: Search, shortcut: "Ctrl+Shift+F", action: openView('search') },
            { id: "view.taskRunner", title: "View: Show Task Runner", description: "Open the task runner panel", icon: Play, shortcut: "Ctrl+Shift+T", action: openView('task-runner') },
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
            { id: "layout.toggleSecondarySidebar", title: "View: Toggle Secondary Sidebar", description: "Show or hide the right sidebar", icon: Layout, shortcut: "Ctrl+Alt+B", action: toggleSecondarySidebar },
            { id: "layout.showChat", title: "View: Open Chat in Secondary Sidebar", description: "Show collaboration chat on the right", icon: MessageSquare, action: () => showSecondarySidebar('chat') },
            { id: "layout.showAI", title: "View: Open AI Assistant in Secondary Sidebar", description: "Show AI assistant on the right", icon: Bot, action: () => showSecondarySidebar('ai-assistant') },
            { id: "layout.togglePanel", title: "View: Toggle Panel", description: "Show or hide the bottom panel", icon: Layout, shortcut: "Ctrl+J", action: togglePanel },
            { id: "layout.toggleActivityBar", title: "View: Toggle Activity Bar", description: "Show or hide the activity bar", icon: Layout, action: toggleActivityBar },
            { id: "layout.toggleStatusBar", title: "View: Toggle Status Bar", description: "Show or hide the status bar", icon: Layout, action: toggleStatusBar },
            { id: "layout.splitEditor", title: "View: Split Editor Right", description: "Split the editor to the right", icon: SplitSquareVertical, shortcut: "Ctrl+\\", action: () => splitEditor('horizontal') },
            { id: "layout.splitEditorDown", title: "View: Split Editor Down", description: "Split the editor downward", icon: SplitSquareVertical, action: () => splitEditor('vertical') },
            { id: "layout.zenMode", title: "View: Toggle Zen Mode", description: "Distraction-free editing mode", icon: Maximize, shortcut: "Ctrl+K Z", action: toggleZenMode },
            { id: "layout.overlayTerminal", title: "View: Toggle Overlay Terminal", description: "Translucent terminal overlay that doesn't shift editor", icon: Terminal, shortcut: "Ctrl+Shift+`", action: () => dispatch("layout:toggle-overlay-terminal") },
            { id: "layout.inlineAI", title: "Elara: Inline AI Prompt", description: "Quick inline AI interaction", icon: Sparkles, shortcut: "Ctrl+I", action: () => dispatch("layout:toggle-inline-ai") },
            { id: "layout.diffEditor", title: "View: Open Diff Editor", description: "Open side-by-side diff comparison", icon: GitCompare, action: () => openDiffEditor("Original", "Modified") },
            { id: "layout.closeDiff", title: "View: Close Diff Editor", description: "Close the diff comparison view", icon: X, action: closeDiffEditor },

            // Editor Zoom
            { id: "editor.zoomIn", title: "View: Zoom In", description: "Increase editor font size", icon: ZoomIn, shortcut: "Ctrl+=", action: () => dispatch("editor:zoom", { direction: "in" }) },
            { id: "editor.zoomOut", title: "View: Zoom Out", description: "Decrease editor font size", icon: ZoomOut, shortcut: "Ctrl+-", action: () => dispatch("editor:zoom", { direction: "out" }) },
            { id: "editor.zoomReset", title: "View: Reset Zoom", description: "Reset editor font size to default", icon: RotateCcw, shortcut: "Ctrl+0", action: () => dispatch("editor:zoom", { direction: "reset" }) },

            // Multi-cursor Editing
            { id: "editor.multiCursor.addAbove", title: "Multi-Cursor: Add Cursor Above", description: "Add cursor above current position", icon: Type, shortcut: "Ctrl+Alt+Up", action: () => dispatch("editor:action.addCursorAbove") },
            { id: "editor.multiCursor.addBelow", title: "Multi-Cursor: Add Cursor Below", description: "Add cursor below current position", icon: Type, shortcut: "Ctrl+Alt+Down", action: () => dispatch("editor:action.addCursorBelow") },
            { id: "editor.multiCursor.columnSelect", title: "Multi-Cursor: Column Selection", description: "Select column with mouse", icon: Type, shortcut: "Shift+Alt+Click", action: () => dispatch("editor:action.columnSelect") },
            { id: "editor.multiCursor.selectAllOccurrences", title: "Multi-Cursor: Select All Occurrences", description: "Select all occurrences of current word", icon: Type, shortcut: "Ctrl+Shift+L", action: () => dispatch("editor:action.selectAllOccurrences") },

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
            { id: "tasks.runBuild", title: "Tasks: Run Build Task", description: "Run the default build task", icon: Play, shortcut: "Ctrl+Shift+B", action: () => dispatch("tasks:run", { group: "build" }) },
            { id: "tasks.runTest", title: "Tasks: Run Test Task", description: "Run the default test task", icon: Play, action: () => dispatch("tasks:run", { group: "test" }) },
            { id: "dev.deploy", title: "Deploy: Push to Cloud", description: "Deploy the project to cloud", icon: Cloud, action: openView('deployment') },
            { id: "dev.runTests", title: "Testing: Run All Tests", description: "Run all test suites", icon: FlaskConical, action: openView('qa-testing') },

            // Agent Commands (Agentic Workflow)
            { id: "agent.handoff.design", title: "Agent: Handoff to Design Studio", description: "Pass current context to Design Studio agents", icon: Paintbrush, action: () => dispatch("workspace:goto-room", "design-studio") },
            { id: "agent.handoff.spec", title: "Agent: Handoff to Spec Chamber", description: "Send spec context to Spec Chamber", icon: FileText, action: () => dispatch("workspace:goto-room", "spec-chamber") },
            { id: "agent.handoff.ai", title: "Agent: Handoff to AI Studio", description: "Escalate problem to AI Studio", icon: Sparkles, action: () => dispatch("workspace:goto-room", "ai-studio") },
            { id: "agent.elara.explain", title: "Elara: Explain Selection", description: "Ask Elara to explain the selected code", icon: Bot, action: () => dispatch("elara:action", { command: "explain" }) },
            { id: "agent.elara.refactor", title: "Elara: Refactor Code", description: "AI-powered code refactoring", icon: Wand2, action: () => dispatch("elara:action", { command: "refactor" }) },
            { id: "agent.elara.fix", title: "Elara: Fix Errors", description: "Auto-fix detected issues", icon: Bug, action: () => dispatch("elara:action", { command: "fix" }) },
            { id: "agent.elara.test", title: "Elara: Generate Tests", description: "Generate test cases for active file", icon: FlaskConical, action: () => dispatch("elara:action", { command: "test" }) },
            { id: "agent.elara.review", title: "Elara: Code Review", description: "Run agentic code review on changes", icon: Eye, action: () => dispatch("elara:action", { command: "review" }) },
            { id: "agent.staging", title: "Agent: Agentic Staging", description: "Let Elara summarize and stage changes", icon: GitBranch, action: () => dispatch("elara:agentic-staging") },

        ]

        return [...baseCommands, ...extensionCommands]
    }, [setSidebarView, setPanelView, toggleSidebar, togglePanel, toggleSecondarySidebar, showSecondarySidebar, toggleActivityBar, toggleStatusBar, toggleZenMode, splitEditor, openDiffEditor, closeDiffEditor])

    const filteredCommands = useMemo(() => {
        if (!value.trim()) return commands

        // Handle special prefixes
        if (value.startsWith(':')) {
            // Go to line mode
            const lineNumber = parseInt(value.slice(1))
            if (!isNaN(lineNumber) && lineNumber > 0) {
                return [{
                    id: "goto-line",
                    title: `Go to Line ${lineNumber}`,
                    description: "Navigate to specific line number",
                    icon: Type,
                    action: () => {
                        dispatch("azora:gotoLine", { line: lineNumber })
                        onOpenChange(false)
                    }
                }]
            }
            return []
        }

        if (value.startsWith('@')) {
            // Go to symbol / room jump mode
            const symbolQuery = value.slice(1).toLowerCase()
            if (symbolQuery.length > 0) {
                // Room jump: @room-name
                const roomJumps = commands.filter(cmd => cmd.id.startsWith('room.'))
                    .filter(cmd => cmd.title.toLowerCase().includes(symbolQuery) || cmd.id.toLowerCase().includes(symbolQuery))
                const symbolResult: CommandEntry = {
                    id: "goto-symbol",
                    title: `Go to Symbol: ${symbolQuery}`,
                    description: "Search for symbols in workspace",
                    icon: Search,
                    action: () => {
                        dispatch("editor:action.quickOutline")
                        onOpenChange(false)
                    }
                }
                return [symbolResult, ...roomJumps]
            }
            return []
        }

        // Semantic code search: #query
        if (value.startsWith('#')) {
            const codeQuery = value.slice(1).trim()
            if (codeQuery.length >= 2) {
                return [{
                    id: "semantic-search",
                    title: `Search code: "${codeQuery}"`,
                    description: "Search across all workspace files",
                    icon: Search,
                    action: () => {
                        dispatch("workspace:search-files", { query: codeQuery })
                        onOpenChange(false)
                    }
                }]
            }
            return [{ id: "semantic-hint", title: "Type to search code across workspace...", icon: Search, action: () => { } }]
        }

        // Agent slash commands (e.g. /handoff-to-design)
        if (value.startsWith('/')) {
            const slashQuery = value.slice(1).toLowerCase()
            return commands
                .filter(cmd => cmd.id.startsWith('agent.') || cmd.id.startsWith('room.'))
                .filter(cmd =>
                    cmd.title.toLowerCase().includes(slashQuery) ||
                    cmd.id.toLowerCase().includes(slashQuery)
                )
        }

        // Normal command filtering
        return commands.filter(cmd =>
            cmd.title.toLowerCase().includes(value.toLowerCase()) ||
            (cmd.description && cmd.description.toLowerCase().includes(value.toLowerCase()))
        )
    }, [value, commands, dispatch, onOpenChange])

    const handleSelect = (cmd: CommandEntry) => {
        cmd.action()
        onOpenChange(false)
        setValue("")
    }

    const groups = [
        { heading: "Recently Used", prefix: "recent." },
        { heading: "Files", prefix: "file." },
        { heading: "Views", prefix: "view." },
        { heading: "Panel", prefix: "panel." },
        { heading: "Layout", prefix: "layout." },
        { heading: "Editor", prefix: "editor." },
        { heading: "Rooms", prefix: "room." },
        { heading: "Agent Commands", prefix: "agent." },
        { heading: "Git", prefix: "git." },
        { heading: "Run & Debug", prefix: "dev." },
    ]

    const displayCommands = useMemo(() => {
        if (!value.trim()) {
            const recentCommands = recentIds
                .map(id => commands.find(c => c.id === id))
                .filter(Boolean) as CommandEntry[]
            
            const recentMapped = recentCommands.map(cmd => ({
                ...cmd,
                id: `recent.${cmd.id}`,
                originalId: cmd.id
            }))
            
            return [...recentMapped, ...commands]
        }
        return filteredCommands
    }, [value, filteredCommands, recentIds, commands])

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
            <div className="[&_[cmdk-dialog-container]]:bg-popover/80 [&_[cmdk-dialog-container]]:backdrop-blur-xl">
                <CommandInput
                    placeholder={value.startsWith(':') ? "Enter line number (e.g., :42)" :
                        value.startsWith('@') ? "@symbol or @room to jump (e.g., @Dashboard)" :
                            value.startsWith('#') ? "Search code across workspace (e.g., #useState)" :
                                value.startsWith('/') ? "Agent command (e.g., /deploy, /test)" :
                                    "Type a command... (/ agents  @ symbol  # search  : line)"}
                    value={value}
                    onValueChange={setValue}
                />
                <CommandList className="max-h-[400px]">
                    <CommandEmpty>No results found.</CommandEmpty>
                    {groups.map((group, idx) => {
                        const items = displayCommands.filter(cmd => cmd.id.startsWith(group.prefix))
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
            </div>
        </CommandDialog>
    )
}
