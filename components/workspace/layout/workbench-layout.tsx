"use client"

import { useState, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ActivityBar } from "./activity-bar"
import { TitleBar } from "./title-bar"
import { StatusBar } from "./status-bar"
import { Sidebar } from "./sidebar"
import { Panel } from "./panel"
import { CommandPalette } from "./command-palette"
import { QuickOpen } from "./quick-open"
import { GoToLineDialog } from "./go-to-line"
import { WorkspaceSymbolSearch } from "./workspace-symbol-search"
import { NotificationToasts } from "@/components/workspace/notification-toasts"
import { TerminalWorkbenchPanel } from "@/components/workspace/panels/terminal-workbench-panel"
import { InlineAIPrompt } from "@/components/workspace/inline-ai-prompt"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { useLayoutStore } from "@/lib/stores/layout-store"

interface WorkbenchLayoutProps {
    sidebarContent: React.ReactNode
    secondarySidebarContent?: React.ReactNode
    editorContent: React.ReactNode
    panelContent: React.ReactNode
    projectName?: string
}

export function WorkbenchLayout({ sidebarContent, secondarySidebarContent, editorContent, panelContent, projectName }: WorkbenchLayoutProps) {
    const {
        isSidebarVisible, isPanelVisible, toggleSidebar, togglePanel,
        toggleZenMode, isZenMode, splitEditor, editorGroups, closeDiffEditor, diffEditor,
        isSecondarySidebarVisible, toggleSecondarySidebar,
        isActivityBarVisible, isStatusBarVisible,
        toggleActivityBar, toggleStatusBar,
        isQuickOpenVisible, setQuickOpenVisible,
        isGoToLineVisible, setGoToLineVisible,
        panelPosition, setPanelPosition,
        isPanelMaximized, togglePanelMaximized,
        isTerminalOverlay, toggleTerminalOverlay,
    } = useWorkbench()
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
    const [symbolSearchOpen, setSymbolSearchOpen] = useState(false)
    const [inlineAIVisible, setInlineAIVisible] = useState(false)
    const { savedLayouts, saveLayout, loadLayout, resetLayout } = useLayoutStore()

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'

            // Command Palette: Ctrl+Shift+P
            if (e.key === "P" && e.ctrlKey && e.shiftKey) {
                e.preventDefault()
                setCommandPaletteOpen(true)
            }
            // Command Palette: Ctrl+K / Cmd+K (modern IDE convention)
            if (e.key === "k" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && !inInput) {
                e.preventDefault()
                setCommandPaletteOpen(true)
            }
            // Quick Open: Ctrl+P (without Shift)
            if (e.key === "p" && e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.preventDefault()
                setQuickOpenVisible(true)
            }
            // Go to Line: Ctrl+G
            if (e.key === "g" && e.ctrlKey && !e.shiftKey && !e.altKey && !inInput) {
                e.preventDefault()
                setGoToLineVisible(true)
            }
            // Toggle Primary Sidebar: Ctrl+B
            if (e.key === "b" && e.ctrlKey && !e.shiftKey && !e.altKey && !inInput) {
                e.preventDefault()
                toggleSidebar()
            }
            // Toggle Secondary Sidebar: Ctrl+Alt+B
            if (e.key === "b" && e.ctrlKey && e.altKey && !e.shiftKey) {
                e.preventDefault()
                toggleSecondarySidebar()
            }
            // Toggle Panel: Ctrl+J
            if (e.key === "j" && e.ctrlKey && !e.shiftKey && !e.altKey && !inInput) {
                e.preventDefault()
                togglePanel()
            }
            // Toggle Overlay Terminal: Ctrl+Shift+`
            if (e.key === "`" && e.ctrlKey && e.shiftKey && !e.altKey) {
                e.preventDefault()
                toggleTerminalOverlay()
            }
            // Inline AI Prompt: Ctrl+I
            if (e.key === "i" && e.ctrlKey && !e.shiftKey && !e.altKey && !inInput) {
                e.preventDefault()
                setInlineAIVisible(v => !v)
            }
            // Split Editor Right: Ctrl+\
            if (e.key === "\\" && e.ctrlKey && !e.shiftKey) {
                e.preventDefault()
                splitEditor('horizontal')
            }
            // Close Diff Editor: Escape (when diff is open)
            if (e.key === "Escape" && diffEditor.isOpen) {
                e.preventDefault()
                closeDiffEditor()
            }
            // Exit Zen Mode quickly with Escape
            if (e.key === "Escape" && isZenMode && !inInput) {
                e.preventDefault()
                toggleZenMode()
            }
            // Zen Mode: Ctrl+K Z
            if (e.key === "k" && e.ctrlKey && !e.shiftKey && !inInput) {
                const handleZ = (e2: KeyboardEvent) => {
                    if (e2.key === "z" || e2.key === "Z") {
                        e2.preventDefault()
                        toggleZenMode()
                    }
                    // Ctrl+K S = Save Layout
                    if (e2.key === "s" || e2.key === "S") {
                        e2.preventDefault()
                        saveLayout(`Layout ${savedLayouts.length + 1}`)
                    }
                    // Ctrl+K R = Reset Layout
                    if (e2.key === "r" || e2.key === "R") {
                        e2.preventDefault()
                        resetLayout()
                    }
                }
                document.addEventListener("keydown", handleZ, { once: true })
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar, togglePanel, toggleSecondarySidebar, toggleZenMode, splitEditor, closeDiffEditor, diffEditor.isOpen, isZenMode, saveLayout, savedLayouts.length, resetLayout, toggleTerminalOverlay])

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            {/* Title Bar - hidden in Zen Mode */}
            {!isZenMode && (
                <TitleBar
                    onOpenCommandPalette={() => setCommandPaletteOpen(true)}
                    projectName={projectName}
                />
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* Activity Bar - hidden in Zen Mode or when toggled off */}
                {!isZenMode && isActivityBarVisible && (
                    <ActivityBar
                        onZenMode={toggleZenMode}
                        onCollapse={toggleActivityBar}
                    />
                )}

                {/* Main Resizable Area */}
                <ResizablePanelGroup direction="horizontal" className="flex-1">

                    {/* Primary Sidebar (left) */}
                    {isSidebarVisible && (
                        <>
                            <ResizablePanel defaultSize={20} minSize={15} maxSize={40} className="min-w-[200px]">
                                <Sidebar>
                                    {sidebarContent}
                                </Sidebar>
                            </ResizablePanel>
                            <ResizableHandle />
                        </>
                    )}

                    {/* Editor & Panel Group */}
                    <ResizablePanel defaultSize={isSidebarVisible ? (isSecondarySidebarVisible ? 60 : 80) : (isSecondarySidebarVisible ? 80 : 100)}>
                        {panelPosition === 'right' ? (
                            <ResizablePanelGroup direction="horizontal">
                                {/* Editor Area */}
                                <ResizablePanel defaultSize={isPanelMaximized ? 0 : 70} minSize={isPanelMaximized ? 0 : 30}>
                                    <div className={`h-full w-full bg-editor-background transition-all duration-300 ${isZenMode ? 'max-w-[1000px] mx-auto' : ''}`}>
                                        {editorContent}
                                    </div>
                                </ResizablePanel>

                                {/* Right Panel */}
                                {isPanelVisible && (
                                    <>
                                        <ResizableHandle />
                                        <ResizablePanel defaultSize={isPanelMaximized ? 100 : 30} minSize={10}>
                                            <Panel>
                                                {panelContent}
                                            </Panel>
                                        </ResizablePanel>
                                    </>
                                )}
                            </ResizablePanelGroup>
                        ) : (
                            <ResizablePanelGroup direction="vertical">
                                {/* Editor Area */}
                                <ResizablePanel defaultSize={isPanelMaximized ? 0 : 70} minSize={isPanelMaximized ? 0 : 30}>
                                    <div className={`h-full w-full bg-editor-background transition-all duration-300 ${isZenMode ? 'max-w-[1000px] mx-auto' : ''}`}>
                                        {editorContent}
                                    </div>
                                </ResizablePanel>

                                {/* Bottom Panel */}
                                {isPanelVisible && (
                                    <>
                                        <ResizableHandle />
                                        <ResizablePanel defaultSize={isPanelMaximized ? 100 : 30} minSize={10}>
                                            <Panel>
                                                {panelContent}
                                            </Panel>
                                        </ResizablePanel>
                                    </>
                                )}
                            </ResizablePanelGroup>
                        )}
                    </ResizablePanel>

                    {/* Secondary Sidebar (right) */}
                    {isSecondarySidebarVisible && secondarySidebarContent && (
                        <>
                            <ResizableHandle />
                            <ResizablePanel defaultSize={20} minSize={14} maxSize={40} className="min-w-[220px]">
                                <div className="h-full flex flex-col border-l border-border/20 bg-sidebar overflow-hidden">
                                    {secondarySidebarContent}
                                </div>
                            </ResizablePanel>
                        </>
                    )}

                </ResizablePanelGroup>
            </div>

            {/* Status Bar - hidden in Zen Mode or when toggled off */}
            {!isZenMode && isStatusBarVisible && <StatusBar />}

            {/* Command Palette */}
            <CommandPalette
                open={commandPaletteOpen}
                onOpenChange={setCommandPaletteOpen}
            />

            {/* Quick Open (Ctrl+P) */}
            <QuickOpen
                open={isQuickOpenVisible}
                onOpenChange={setQuickOpenVisible}
                onFileSelect={(path) => {
                    // Dispatch event for editor to open the file
                    window.dispatchEvent(new CustomEvent('azora:openFile', { detail: { path } }))
                }}
            />

            {/* Go to Line (Ctrl+G) */}
            <GoToLineDialog
                open={isGoToLineVisible}
                onOpenChange={setGoToLineVisible}
            />

            {/* Workspace Symbol Search (Ctrl+T) */}
            <WorkspaceSymbolSearch
                open={symbolSearchOpen}
                onOpenChange={setSymbolSearchOpen}
                onNavigate={(path, line) => {
                    window.dispatchEvent(new CustomEvent('azora:openFile', { detail: { path, line } }))
                }}
            />

            {/* Notification Toasts */}
            <NotificationToasts />

            {/* Inline AI Prompt (Ctrl+I) */}
            {inlineAIVisible && (
                <InlineAIPrompt
                    onClose={() => setInlineAIVisible(false)}
                />
            )}

            {/* Zen Mode exit hint */}
            {isZenMode && (
                <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 opacity-0 hover:opacity-100 transition-opacity duration-500">
                    <button
                        className="px-3 py-1 text-[11px] bg-background/80 backdrop-blur-md border border-border/40 rounded-md text-muted-foreground hover:text-foreground shadow-lg"
                        onClick={toggleZenMode}
                    >
                        Press <kbd className="font-mono text-[10px] bg-accent/40 px-1 py-0.5 rounded mx-0.5">Ctrl+K Z</kbd> to exit Zen Mode
                    </button>
                </div>
            )}

            {/* Translucent Overlay Terminal — does not shift editor scroll position */}
            {isTerminalOverlay && (
                <div className="fixed inset-x-0 bottom-0 z-40 h-[40vh] max-h-[50vh]">
                    <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-xl border-t border-emerald-500/15 rounded-t-lg shadow-2xl">
                        <div className="flex items-center justify-between px-3 h-8 border-b border-zinc-800/60">
                            <span className="text-[11px] text-zinc-400 font-medium tracking-wide uppercase">Overlay Terminal</span>
                            <div className="flex items-center gap-1">
                                <kbd className="text-[9px] text-zinc-600 font-mono bg-zinc-800/60 px-1.5 py-0.5 rounded">Ctrl+Shift+`</kbd>
                                <button
                                    onClick={toggleTerminalOverlay}
                                    className="ml-1 w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                        <div className="h-[calc(100%-2rem)] overflow-hidden">
                            <TerminalWorkbenchPanel />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

