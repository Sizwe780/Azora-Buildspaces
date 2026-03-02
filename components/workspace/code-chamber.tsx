"use client"

import { useEffect, useMemo, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useFileSystem } from "@/lib/stores/file-system"
import { WorkbenchLayout } from "./layout/workbench-layout"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { ExplorerView } from "./views/explorer-view"
import { SearchReplaceView } from "./search-replace-view"
import { GitSourceControlView } from "./git-source-control"
import { ExtensionsMarketplaceView } from "./views/extensions-marketplace-view"
import { AIAssistantSidebar } from "./views/ai-assistant-sidebar"
import { CodeAnalysisView } from "./views/code-analysis-view"
import { RefactoringView } from "./views/refactoring-view"
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
import { SnippetsView } from "./views/snippets-view"
import { ThemeAccessibilityPanel } from "./views/theme-accessibility-view"
import { CloudEmulationView } from "./views/cloud-emulation-view"
import { CICDView } from "./views/cicd-view"
import { Web3View } from "./views/web3-view"
import { PackageManagementView } from "./views/package-management-view"
import { SecurityView } from "./views/security-view"
import { FigmaToCodeView } from "./views/figma-to-code-view"
import { QATestingView } from "./views/qa-testing-view"
import { TelemetryView } from "./views/telemetry-view"
import { ObservabilityView } from "./views/observability-view"
import { DeploymentView } from "./views/deployment-view"
import { SettingsView } from "./views/settings-view"
import { LivePreviewPanel } from "./panels/live-preview-panel"
import { DiffEditorView } from "./diff-editor"
import { DebugVariablesPanel } from "./debug-variables-panel"

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

    const { activeSidebarView, activePanelView, setSidebarView, diffEditor, closeDiffEditor, editorGroups, activeGroupId, setActiveGroup, closeEditorGroup, splitDirection } = useWorkbench()

    const renderSidebar = () => {
        switch (activeSidebarView) {
            case 'explorer': return <ExplorerView />
            case 'search': return <SearchReplaceView />
            case 'git': return <GitSourceControlView />
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
            case 'code-analysis': return <CodeAnalysisView />
            case 'refactoring': return <RefactoringView />
            case 'snippets': return <SnippetsView />
            case 'themes': return <ThemeAccessibilityPanel />
            case 'cloud': return <CloudEmulationView />
            case 'cicd': return <CICDView />
            case 'web3': return <Web3View />
            case 'packages': return <PackageManagementView />
            case 'security': return <SecurityView />
            case 'figma': return <FigmaToCodeView />
            case 'qa-testing': return <QATestingView />
            case 'telemetry': return <TelemetryView />
            case 'observability': return <ObservabilityView />
            case 'deployment': return <DeploymentView />
            case 'settings': return <SettingsView />
            default: return <ExplorerView />
        }
    }

    const renderPanel = () => {
        switch (activePanelView) {
            case 'terminal': return <XTerminal />
            case 'output': return <OutputView />
            case 'problems': return <ProblemsView />
            case 'debug': return (
                <div className="flex h-full">
                    <div className="flex-1 min-w-0">
                        <DebugPanel
                            projectId={projectId}
                            activeFile={activeFileId || undefined}
                            onNavigateToFile={handleNavigateToFile}
                        />
                    </div>
                    <div className="w-[280px] border-l border-border/30 shrink-0">
                        <DebugVariablesPanel />
                    </div>
                </div>
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
            case 'live-preview': return <LivePreviewPanel projectId={projectId} />
            case 'qa-testing': return <QATestingView />
            case 'telemetry': return <TelemetryView />
            case 'observability': return <ObservabilityView />
            default: return <XTerminal />
        }
    }

    // Build editor content with diff editor & split editor support
    const renderEditorContent = () => {
        if (!rootId) {
            return <ProjectWelcome onProjectSelect={(projectId) => loadProject(projectId)} />
        }

        // Diff editor mode
        if (diffEditor.isOpen) {
            return (
                <DiffEditorView
                    originalFile={diffEditor.originalFile || undefined}
                    modifiedFile={diffEditor.modifiedFile || undefined}
                    originalContent={diffEditor.originalContent || undefined}
                    modifiedContent={diffEditor.modifiedContent || undefined}
                />
            )
        }

        // Split editor groups
        if (editorGroups.length > 1) {
            return (
                <div className={`flex h-full ${splitDirection === 'vertical' ? 'flex-col' : 'flex-row'}`}>
                    {editorGroups.map((group, i) => (
                        <div
                            key={group.id}
                            className={`${splitDirection === 'vertical' ? 'w-full' : 'h-full'} flex-1 min-w-0 min-h-0 relative ${
                                i > 0 ? (splitDirection === 'vertical' ? 'border-t border-border/30' : 'border-l border-border/30') : ''
                            } ${group.id === activeGroupId ? 'ring-1 ring-primary/20 ring-inset' : ''}`}
                            onClick={() => setActiveGroup(group.id)}
                        >
                            {/* Group close button */}
                            <button
                                onClick={(e) => { e.stopPropagation(); closeEditorGroup(group.id) }}
                                className="absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent/40 transition-colors"
                                title="Close editor group"
                            >
                                ×
                            </button>
                            <EditorPanel
                                activeFile={group.activeFile || activeFileId || ""}
                                openFiles={group.openFiles.length > 0 ? group.openFiles : openFiles}
                                onFileSelect={handleFileSelect}
                                onCloseFile={handleCloseFile}
                            />
                        </div>
                    ))}
                </div>
            )
        }

        // Single editor (default)
        return (
            <EditorPanel
                activeFile={activeFileId || ""}
                openFiles={openFiles}
                onFileSelect={handleFileSelect}
                onCloseFile={handleCloseFile}
            />
        )
    }

    return (
        <WorkbenchLayout
            sidebarContent={renderSidebar()}
            projectName={projectId}
            editorContent={renderEditorContent()}
            panelContent={renderPanel()}
        />
    )
}
