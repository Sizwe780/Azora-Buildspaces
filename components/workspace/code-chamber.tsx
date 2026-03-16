"use client"

import { useEffect, useMemo, useCallback, useState } from "react"
import * as Y from "yjs"
import { WebrtcProvider } from "y-webrtc"
import { useWorkspaceSession } from "@/lib/hooks/use-workspace-session"
import { usePathname, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useFileSystem } from "@/lib/stores/file-system"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { WorkbenchLayout } from "./layout/workbench-layout"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { ExplorerView } from "./views/explorer-view"
import { IntegratedExplorer } from "./views/integrated-explorer"
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
import { TerminalWorkbenchPanel } from "./panels/terminal-workbench-panel"
import { EditorPanel } from "./editor-panel"
import { ProjectWelcome } from "./project-welcome"
import { CollaborationChatPanel } from "./collaboration-chat-panel"
import { CopilotChatPanel } from "./copilot-chat-panel"
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
import { PortsView } from "./panels/ports-view"
import { SecondarySidebarHeader } from "./layout/secondary-sidebar-header"
import { OutlineView } from "./views/outline-view"
import { TaskRunner } from "./views/task-runner"

interface CodeChamberProps {
    id?: string
}

export function CodeChamber({ id }: CodeChamberProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const sessionResult = useSession()
    const session = sessionResult?.data ?? null
    const userName = session?.user?.name || session?.user?.email || 'Anonymous'
    const userId = session?.user?.email || `user-${Date.now()}`
    const projectId = useMemo(() => {
        const projectParam = searchParams?.get('project');
        if (projectParam) return projectParam;

        if (id && id.trim().length > 0) return id
        const parts = pathname?.split("/").filter(Boolean) ?? []
        return parts[parts.length - 1] || "default"
    }, [id, pathname, searchParams])

    // Real-time synchronization
    const [yDoc, setYDoc] = useState<Y.Doc | null>(null)
    const [provider, setProvider] = useState<WebrtcProvider | null>(null)

    useEffect(() => {
        if (!projectId) return;
        const rootDoc = new Y.Doc();
        const roomName = `buildspaces-project-${projectId}`;
        const webrtcProvider = new WebrtcProvider(roomName, rootDoc, {
            signaling: [
                'wss://signaling.yjs.dev',
                'wss://y-webrtc-signaling-eu.herokuapp.com',
                'wss://y-webrtc-signaling-us.herokuapp.com'
            ]
        });
        setYDoc(rootDoc);
        setProvider(webrtcProvider);

        return () => {
            webrtcProvider.disconnect();
            rootDoc.destroy();
        }
    }, [projectId]);

    const {
        rootId,
        activeFileId,
        openFiles,
        setActiveFile: setFileSystemActiveFile,
        closeFile: closeFileSystemFile,
        createFile,
        openFile,
        fileMap,
        loadProject,
        restoreSessionState,
    } = useFileSystem()

    const {
        activeSidebarView,
        activePanelView,
        setSidebarView,
        diffEditor,
        editorGroups,
        activeGroupId,
        setActiveGroup,
        closeEditorGroup,
        splitDirection,
        activeSecondarySidebarView,
        toggleSecondarySidebar,
        setActiveFile: setWorkbenchActiveFile,
        closeFile: closeWorkbenchFile,
        restoreEditorState,
    } = useWorkbench()

    useEffect(() => {
        if (!projectId) return

        let cancelled = false

        const initializeProject = async () => {
            await loadProject(projectId)
            if (cancelled || typeof window === 'undefined') return

            const currentFileMap = useFileSystem.getState().fileMap
            const availableFilePaths = new Set(
                Object.values(currentFileMap)
                    .filter((node) => node.type === 'file')
                    .map((node) => node.path)
            )

            let restoredAnyFile = false

            // Restore session state (open files, active file) from localStorage
            try {
                const savedSession = localStorage.getItem(`buildspaces.session.${projectId}`)
                if (savedSession) {
                    const session = JSON.parse(savedSession)

                    const validOpenFiles = Array.isArray(session.openFiles)
                        ? session.openFiles.filter((filePath: unknown): filePath is string =>
                            typeof filePath === 'string' && availableFilePaths.has(filePath)
                        )
                        : []

                    validOpenFiles.forEach((filePath) => {
                        openFile(filePath)
                        setWorkbenchActiveFile(filePath)
                        restoredAnyFile = true
                    })

                    if (Array.isArray(session.editorGroups)) {
                        const sanitizedGroups = session.editorGroups.map((group: any) => {
                            const groupOpenFiles = Array.isArray(group.openFiles)
                                ? group.openFiles.filter((filePath: unknown): filePath is string =>
                                    typeof filePath === 'string' && availableFilePaths.has(filePath)
                                )
                                : []
                            const groupActiveFile =
                                typeof group.activeFile === 'string' && groupOpenFiles.includes(group.activeFile)
                                    ? group.activeFile
                                    : (groupOpenFiles[0] || null)

                            return {
                                ...group,
                                openFiles: groupOpenFiles,
                                activeFile: groupActiveFile,
                            }
                        })

                        restoreEditorState(sanitizedGroups, session.activeGroupId, session.splitDirection)
                    }

                    const hasValidActiveFile =
                        typeof session.activeFile === 'string' && availableFilePaths.has(session.activeFile)
                    const activeFileToRestore = hasValidActiveFile
                        ? session.activeFile
                        : (validOpenFiles[0] || null)

                    if (activeFileToRestore) {
                        setFileSystemActiveFile(activeFileToRestore)
                        setWorkbenchActiveFile(activeFileToRestore)
                        restoredAnyFile = true
                    }
                }
            } catch (e) {
                console.warn('[CodeChamber] Failed to restore session:', e)
            }

            if (!restoredAnyFile && availableFilePaths.size > 0) {
                const fallbackFile = Array.from(availableFilePaths).sort()[0]
                openFile(fallbackFile)
                setFileSystemActiveFile(fallbackFile)
                setWorkbenchActiveFile(fallbackFile)
            } else if (!restoredAnyFile) {
                // Workspace has no files yet; clear stale persisted editor tabs.
                restoreSessionState([], null)
                restoreEditorState([{ id: 'group-1', activeFile: null, openFiles: [] }], 'group-1', 'horizontal')
            }
        }

        initializeProject()

        return () => {
            cancelled = true
        }
    }, [projectId, loadProject, openFile, restoreEditorState, restoreSessionState, setFileSystemActiveFile, setWorkbenchActiveFile])

    // Auto-save session on navigate away / close
    useEffect(() => {
        if (!projectId || typeof window === 'undefined') return

        const saveSession = () => {
            try {
                const sessionOpenFiles = [...new Set(editorGroups.flatMap((group) => group.openFiles))]
                const activeEditorGroup = editorGroups.find((group) => group.id === activeGroupId)
                const session = {
                    openFiles: sessionOpenFiles,
                    activeFile: activeEditorGroup?.activeFile || activeFileId,
                    activeGroupId,
                    editorGroups,
                    splitDirection,
                    timestamp: Date.now(),
                }
                localStorage.setItem(`buildspaces.session.${projectId}`, JSON.stringify(session))
            } catch { /* ignore storage errors */ }
        }

        // Save every 10s
        const interval = setInterval(saveSession, 10000)
        // Save on unload
        window.addEventListener('beforeunload', saveSession)

        return () => {
            clearInterval(interval)
            window.removeEventListener('beforeunload', saveSession)
            saveSession() // save on unmount
        }
    }, [projectId, activeFileId, activeGroupId, editorGroups, splitDirection])

    const handleFileSelect = (fileId: string, groupId?: string) => {
        if (groupId) {
            setActiveGroup(groupId)
        }
        setFileSystemActiveFile(fileId)
        setWorkbenchActiveFile(fileId, groupId)
    }

    const handleCloseFile = (fileId: string, groupId?: string) => {
        closeFileSystemFile(fileId)
        closeWorkbenchFile(fileId, groupId)
    }

    const handleNavigateToFile = useCallback((filePath: string, line?: number) => {
        openFile(filePath)
        setWorkbenchActiveFile(filePath)

        if (typeof window !== 'undefined' && typeof line === 'number' && line > 0) {
            window.dispatchEvent(new CustomEvent('azora:openFile', {
                detail: { path: filePath, line, column: 1 }
            }))
            return
        }

        setFileSystemActiveFile(filePath)
    }, [openFile, setFileSystemActiveFile, setWorkbenchActiveFile])

    const renderSecondarySidebar = () => {
        const content = () => {
            switch (activeSecondarySidebarView) {
                case 'chat':
                    return (
                        <CollaborationChatPanel
                            roomId={projectId}
                            currentUserId={userId}
                            currentUserName={userName}
                            currentUserColor="#6366f1"
                            activeFile={activeFileId || undefined}
                            onNavigateToFile={(filePath) => handleNavigateToFile(filePath)}
                        />
                    )
                case 'ai-assistant':
                    return (
                        <AIAssistantSidebar
                            activeFile={activeFileId}
                            onClose={toggleSecondarySidebar}
                        />
                    )
                case 'copilot':
                    return <CopilotChatPanel agent="elara" />
                case 'outline':
                    return (
                        <OutlineView
                            activeFile={activeFileId}
                            onNavigateToLine={(file, line) => handleNavigateToFile(file, line)}
                        />
                    )
                case 'timeline':
                    return (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-4">
                            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="text-sm font-medium">Timeline</span>
                            <span className="text-xs text-zinc-600 mt-1">File history coming soon</span>
                        </div>
                    )
                default:
                    return <CopilotChatPanel agent="elara" />
            }
        }
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <SecondarySidebarHeader onClose={toggleSecondarySidebar} />
                <div className="flex-1 overflow-hidden">
                    {content()}
                </div>
            </div>
        )
    }

    const renderSidebar = () => {
        switch (activeSidebarView) {
            case 'explorer': return <IntegratedExplorer activeFile={activeFileId} onNavigateToLine={(file, line) => handleNavigateToFile(file, line)} />
            case 'outline': return <OutlineView activeFile={activeFileId} onNavigateToLine={(file, line) => handleNavigateToFile(file, line)} />
            case 'search': return <SearchReplaceView />
            case 'git': return <GitSourceControlView />
            case 'task-runner': return <TaskRunner workspaceId={projectId} />
            case 'extensions': return <ExtensionsMarketplaceView />
            case 'chat': return (
                <CollaborationChatPanel
                    roomId={projectId}
                    currentUserId={userId}
                    currentUserName={userName}
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
            case 'terminal': return <TerminalWorkbenchPanel />
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
            case 'ports': return <PortsView />
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
            default: return <TerminalWorkbenchPanel />
        }
    }

    // Build editor content with diff editor & split editor support
    const renderEditorContent = () => {
        const hasFiles = Object.values(fileMap).some((node) => node.type === 'file')

        if (!rootId || !hasFiles) {
            return <ProjectWelcome onProjectSelect={(newProjectId) => {
                if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.set('project', newProjectId);
                    window.history.pushState({}, '', url.toString());
                }
                loadProject(newProjectId);
            }} />
        }

        // Diff editor mode
        if (diffEditor.isOpen) {
            return (
                <DiffEditorView
                    projectId={projectId}
                    originalFile={diffEditor.originalFile || undefined}
                    modifiedFile={diffEditor.modifiedFile || undefined}
                    originalContent={diffEditor.originalContent || undefined}
                    modifiedContent={diffEditor.modifiedContent || undefined}
                />
            )
        }

        // Split editor groups – rendered with proper resizable panels
        if (editorGroups.length > 1) {
            return (
                <ResizablePanelGroup direction={splitDirection === 'vertical' ? 'vertical' : 'horizontal'} className="h-full">
                    {editorGroups.map((group, i) => (
                        <div key={group.id} className="contents">
                            {i > 0 && <ResizableHandle className="data-[resize-handle-active]:bg-primary/40" />}
                            <ResizablePanel defaultSize={Math.floor(100 / editorGroups.length)} minSize={15}>
                                <div
                                    className={`h-full w-full relative ${group.id === activeGroupId ? 'ring-1 ring-primary/20 ring-inset' : ''}`}
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
                                        groupId={group.id}
                                        activeFile={group.activeFile || ""}
                                        openFiles={group.openFiles}
                                        onFileSelect={handleFileSelect}
                                        onCloseFile={handleCloseFile}                                        yDoc={yDoc}
                                        provider={provider}                                    />
                                </div>
                            </ResizablePanel>
                        </div>
                    ))}
                </ResizablePanelGroup>
            )
        }

        // Single editor (default)
        return (
            <EditorPanel
                activeFile={activeFileId || ""}
                openFiles={openFiles}
                onFileSelect={handleFileSelect}
                onCloseFile={handleCloseFile}
                yDoc={yDoc}
                provider={provider}
            />
        )
    }

    return (
        <WorkbenchLayout
            sidebarContent={renderSidebar()}
            secondarySidebarContent={renderSecondarySidebar()}
            projectName={projectId}
            editorContent={renderEditorContent()}
            panelContent={renderPanel()}
        />
    )
}
