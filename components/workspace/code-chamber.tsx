"use client"

import { useEffect, useMemo, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useFileSystem } from "@/lib/stores/file-system"
import { WorkbenchLayout } from "./layout/workbench-layout"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { ExplorerView } from "./views/explorer-view"
import { SearchView } from "./views/search-view"
import { SourceControlView } from "./views/source-control-view"
import { ExtensionsMarketplaceView } from "./views/extensions-marketplace-view"
import { AIAssistantSidebar } from "./views/ai-assistant-sidebar"
import { OutputView } from "./panels/output-view"
import { ProblemsView } from "./panels/problems-view"
import { DebugPanel } from "./panels/debug-panel-full"
import { TestingPanel } from "./panels/testing-panel-full"
import { PerformanceProfilerFull } from "./panels/performance-profiler-full"
import { CodeReviewPanelFull } from "./panels/code-review-panel-full"
import { XTerminal } from "./x-terminal"
import { EditorPanel } from "./editor-panel"
import { ProjectWelcome } from "./project-welcome"
import { CollaborationChatPanel } from "./collaboration-chat-panel"

interface CodeChamberProps {
    id?: string
}

export function CodeChamber({ id }: CodeChamberProps) {
    const pathname = usePathname()
    const projectId = useMemo(() => {
        if (id && id.trim().length > 0) return id
        const parts = pathname?.split("/").filter(Boolean) ?? []
        return parts[parts.length - 1] || "default"
    }, [id, pathname])

    const {
        rootId,
        activeFileId,
        openFiles,
        setActiveFile,
        closeFile,
        createFile,
        openFile,
        fileMap,
        loadProject
    } = useFileSystem()

    useEffect(() => {
        if (projectId) {
            loadProject(projectId)
        }
    }, [projectId, loadProject])

    const handleFileSelect = (fileId: string) => {
        setActiveFile(fileId)
    }

    const handleCloseFile = (fileId: string) => {
        closeFile(fileId)
    }

    const handleNavigateToFile = useCallback((filePath: string, line?: number) => {
        openFile(filePath)
        setActiveFile(filePath)
    }, [openFile, setActiveFile])

    const { activeSidebarView, activePanelView, setSidebarView } = useWorkbench()

    const renderSidebar = () => {
        switch (activeSidebarView) {
            case 'explorer': return <ExplorerView />
            case 'search': return <SearchView />
            case 'git': return <SourceControlView />
            case 'extensions': return <ExtensionsMarketplaceView />
            case 'chat': return (
                <CollaborationChatPanel
                    roomId={projectId}
                    currentUserId="current-user"
                    currentUserName="You"
                    currentUserColor="#6366f1"
                    activeFile={activeFileId || undefined}
                    onNavigateToFile={(filePath) => handleNavigateToFile(filePath)}
                />
            )
            case 'ai-assistant': return (
                <AIAssistantSidebar
                    activeFile={activeFileId}
                    onClose={() => setSidebarView('explorer')}
                />
            )
            case 'code-analysis': return (
                <AIAssistantSidebar
                    activeFile={activeFileId}
                    onClose={() => setSidebarView('explorer')}
                />
            )
            case 'refactoring': return (
                <AIAssistantSidebar
                    activeFile={activeFileId}
                    onClose={() => setSidebarView('explorer')}
                />
            )
            default: return <ExplorerView />
        }
    }

    const renderPanel = () => {
        switch (activePanelView) {
            case 'terminal': return <XTerminal />
            case 'output': return <OutputView />
            case 'problems': return <ProblemsView />
            case 'debug': return (
                <DebugPanel
                    projectId={projectId}
                    activeFile={activeFileId || undefined}
                    onNavigateToFile={handleNavigateToFile}
                />
            )
            case 'testing': return (
                <TestingPanel
                    projectId={projectId}
                    activeFile={activeFileId}
                    onNavigateToFile={handleNavigateToFile}
                />
            )
            case 'performance': return <PerformanceProfilerFull projectId={projectId} />
            case 'code-review': return (
                <CodeReviewPanelFull
                    projectId={projectId}
                    activeFile={activeFileId}
                    onNavigateToFile={handleNavigateToFile}
                />
            )
            default: return <XTerminal />
        }
    }

    return (
        <WorkbenchLayout
            sidebarContent={renderSidebar()}
            editorContent={
                rootId ? (
                    <EditorPanel
                        activeFile={activeFileId || ""}
                        openFiles={openFiles}
                        onFileSelect={handleFileSelect}
                        onCloseFile={handleCloseFile}
                    />
                ) : (
                    <ProjectWelcome onProjectSelect={(projectId) => loadProject(projectId)} />
                )
            }
            panelContent={renderPanel()}
        />
    )
}
