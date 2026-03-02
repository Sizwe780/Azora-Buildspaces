"use client"

import { useState, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ActivityBar } from "./activity-bar"
import { TitleBar } from "./title-bar"
import { StatusBar } from "./status-bar"
import { Sidebar } from "./sidebar"
import { Panel } from "./panel"
import { CommandPalette } from "./command-palette"
import { useWorkbench } from "@/lib/stores/workbench-store"

interface WorkbenchLayoutProps {
    sidebarContent: React.ReactNode
    editorContent: React.ReactNode
    panelContent: React.ReactNode
    projectName?: string
}

export function WorkbenchLayout({ sidebarContent, editorContent, panelContent, projectName }: WorkbenchLayoutProps) {
    const { isSidebarVisible, isPanelVisible, toggleSidebar, togglePanel, toggleZenMode, isZenMode, splitEditor, editorGroups, closeDiffEditor, diffEditor } = useWorkbench()
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

    // Global keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Command Palette: Ctrl+Shift+P
            if (e.key === "P" && e.ctrlKey && e.shiftKey) {
                e.preventDefault()
                setCommandPaletteOpen(true)
            }
            // Toggle Sidebar: Ctrl+B
            if (e.key === "b" && e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.preventDefault()
                toggleSidebar()
            }
            // Toggle Panel: Ctrl+J
            if (e.key === "j" && e.ctrlKey && !e.shiftKey && !e.altKey) {
                e.preventDefault()
                togglePanel()
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
            // Zen Mode: Ctrl+K Z
            if (e.key === "k" && e.ctrlKey && !e.shiftKey) {
                const handleZ = (e2: KeyboardEvent) => {
                    if (e2.key === "z" || e2.key === "Z") {
                        e2.preventDefault()
                        toggleZenMode()
                    }
                }
                document.addEventListener("keydown", handleZ, { once: true })
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar, togglePanel, toggleZenMode, splitEditor, closeDiffEditor, diffEditor.isOpen])

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
                {/* Activity Bar - hidden in Zen Mode */}
                {!isZenMode && <ActivityBar />}

                {/* Main Resizable Area */}
                <ResizablePanelGroup direction="horizontal" className="flex-1">

                    {/* Sidebar */}
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
                    <ResizablePanel defaultSize={isSidebarVisible ? 80 : 100}>
                        <ResizablePanelGroup direction="vertical">

                            {/* Editor Area */}
                            <ResizablePanel defaultSize={70} minSize={30}>
                                <div className="h-full w-full bg-editor-background">
                                    {editorContent}
                                </div>
                            </ResizablePanel>

                            {/* Bottom Panel */}
                            {isPanelVisible && (
                                <>
                                    <ResizableHandle />
                                    <ResizablePanel defaultSize={30} minSize={10}>
                                        <Panel>
                                            {panelContent}
                                        </Panel>
                                    </ResizablePanel>
                                </>
                            )}

                        </ResizablePanelGroup>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>

            {/* Status Bar - hidden in Zen Mode */}
            {!isZenMode && <StatusBar />}

            {/* Command Palette */}
            <CommandPalette
                open={commandPaletteOpen}
                onOpenChange={setCommandPaletteOpen}
            />

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
        </div>
    )
}
