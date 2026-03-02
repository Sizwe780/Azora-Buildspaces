import { create } from 'zustand'

export type SidebarView = 'explorer' | 'search' | 'git' | 'extensions' | 'chat' | 'ai-assistant' | 'code-analysis' | 'refactoring' | 'snippets' | 'themes' | 'cloud' | 'cicd' | 'web3' | 'packages' | 'security' | 'figma' | 'qa-testing' | 'telemetry' | 'observability' | 'deployment' | 'settings'
export type PanelView = 'terminal' | 'output' | 'problems' | 'debug' | 'testing' | 'performance' | 'code-review' | 'live-preview' | 'qa-testing' | 'telemetry' | 'observability'

export interface EditorGroup {
    id: string
    activeFile: string | null
    openFiles: string[]
}

export type SplitDirection = 'horizontal' | 'vertical'

export interface DiffEditorState {
    isOpen: boolean
    originalFile: string | null
    modifiedFile: string | null
    originalContent: string | null
    modifiedContent: string | null
}

interface WorkbenchState {
    // Sidebar State
    activeSidebarView: SidebarView
    isSidebarVisible: boolean
    setSidebarView: (view: SidebarView) => void
    toggleSidebar: () => void

    // Panel State
    activePanelView: PanelView
    isPanelVisible: boolean
    setPanelView: (view: PanelView) => void
    togglePanel: () => void

    // Editor Groups (Split Editor)
    editorGroups: EditorGroup[]
    activeGroupId: string
    splitDirection: SplitDirection
    splitEditor: (direction?: SplitDirection) => void
    closeEditorGroup: (groupId: string) => void
    setActiveGroup: (groupId: string) => void

    // Diff Editor
    diffEditor: DiffEditorState
    openDiffEditor: (original: string, modified: string, origContent?: string, modContent?: string) => void
    closeDiffEditor: () => void

    // Zen Mode
    isZenMode: boolean
    toggleZenMode: () => void

    // Layout State
    sidebarWidth: number
    panelHeight: number
    setSidebarWidth: (width: number) => void
    setPanelHeight: (height: number) => void
}

let groupCounter = 1

export const useWorkbench = create<WorkbenchState>((set, get) => ({
    // Sidebar Defaults
    activeSidebarView: 'explorer',
    isSidebarVisible: true,
    setSidebarView: (view) => set({ activeSidebarView: view, isSidebarVisible: true }),
    toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),

    // Panel Defaults
    activePanelView: 'terminal',
    isPanelVisible: true,
    setPanelView: (view) => set({ activePanelView: view, isPanelVisible: true }),
    togglePanel: () => set((state) => ({ isPanelVisible: !state.isPanelVisible })),

    // Editor Groups
    editorGroups: [{ id: 'group-1', activeFile: null, openFiles: [] }],
    activeGroupId: 'group-1',
    splitDirection: 'horizontal' as SplitDirection,
    splitEditor: (direction?: SplitDirection) => {
        const state = get()
        const dir = direction || 'horizontal'
        const newId = `group-${++groupCounter}`
        const activeGroup = state.editorGroups.find(g => g.id === state.activeGroupId)
        set({
            editorGroups: [
                ...state.editorGroups,
                {
                    id: newId,
                    activeFile: activeGroup?.activeFile || null,
                    openFiles: activeGroup?.activeFile ? [activeGroup.activeFile] : [],
                },
            ],
            activeGroupId: newId,
            splitDirection: dir,
        })
    },
    closeEditorGroup: (groupId) => {
        const state = get()
        if (state.editorGroups.length <= 1) return
        const remaining = state.editorGroups.filter(g => g.id !== groupId)
        set({
            editorGroups: remaining,
            activeGroupId: state.activeGroupId === groupId ? remaining[0].id : state.activeGroupId,
        })
    },
    setActiveGroup: (groupId) => set({ activeGroupId: groupId }),

    // Diff Editor
    diffEditor: { isOpen: false, originalFile: null, modifiedFile: null, originalContent: null, modifiedContent: null },
    openDiffEditor: (original, modified, origContent, modContent) => set({
        diffEditor: {
            isOpen: true,
            originalFile: original,
            modifiedFile: modified,
            originalContent: origContent || null,
            modifiedContent: modContent || null,
        },
    }),
    closeDiffEditor: () => set({
        diffEditor: { isOpen: false, originalFile: null, modifiedFile: null, originalContent: null, modifiedContent: null },
    }),

    // Zen Mode
    isZenMode: false,
    toggleZenMode: () => set((state) => ({
        isZenMode: !state.isZenMode,
        isSidebarVisible: state.isZenMode ? true : false,
        isPanelVisible: state.isZenMode ? true : false,
    })),

    // Layout Defaults
    sidebarWidth: 20, // Percentage
    panelHeight: 30, // Percentage
    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    setPanelHeight: (height) => set({ panelHeight: height }),
}))
