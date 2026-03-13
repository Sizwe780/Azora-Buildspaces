"use client"

/**
 * Workspace Context - The "Nervous System"
 * 
 * Constitutional Compliance:
 * - SINGLE SOURCE OF TRUTH: All editor state flows through this context
 * - AGENT AWARENESS: AI agents can see what the user is working on
 * - NO MOCKS: Real state management connected to real file system
 * 
 * This context provides:
 * - Current file being edited
 * - Current file content (synced with editor)
 * - File system operations
 * - Layout preferences
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { fileSystem, type FileNode } from './file-system'

export interface WorkspaceState {
  // Current project
  projectName: string | null
  projectRoot: string | null

  // Active file in editor
  activeFilePath: string | null
  activeFileContent: string
  
  // Editor navigation history
  editorHistory: string[]
  historyIndex: number
  
  // Open files (tabs)
  openFiles: string[]
  
  // File tree
  fileTree: FileNode[]
  
  // Layout state
  layoutPreferences: {
    sidebarVisible: boolean
    panelVisible: boolean
    agentRailVisible: boolean
    sidebarWidth: number
    panelHeight: number
    sidebarPosition: 'left' | 'right'
    panelPosition: 'bottom' | 'right'
    editorLayout: 'single' | 'horizontal-split' | 'vertical-split' | 'grid-2x2'
  }
  
  // Loading states
  isLoadingFile: boolean
  isLoadingProject: boolean
}

export interface WorkspaceActions {
  // Project operations
  initProject: (name: string) => Promise<void>
  loadProject: (name: string) => Promise<void>
  
  // File operations
  openFile: (path: string) => Promise<void>
  closeFile: (path: string) => void
  saveFile: (path: string, content: string) => Promise<void>
  createFile: (path: string, content?: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  
  // Editor state
  updateActiveFileContent: (content: string) => void
  
  // Editor navigation
  navigateBack: () => void
  navigateForward: () => void
  canNavigateBack: () => boolean
  canNavigateForward: () => boolean
  
  // Layout operations
  toggleSidebar: () => void
  togglePanel: () => void
  toggleAgentRail: () => void
  setSidebarWidth: (width: number) => void
  setPanelHeight: (height: number) => void
  setSidebarPosition: (position: 'left' | 'right') => void
  setPanelPosition: (position: 'bottom' | 'right') => void
  setEditorLayout: (layout: 'single' | 'horizontal-split' | 'vertical-split' | 'grid-2x2') => void
  
  // File tree
  refreshFileTree: () => Promise<void>
}

type WorkspaceContextType = WorkspaceState & WorkspaceActions

const WorkspaceContext = createContext<WorkspaceContextType | null>(null)

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}

interface WorkspaceProviderProps {
  children: React.ReactNode
  initialProject?: string
}

export function WorkspaceProvider({ children, initialProject }: WorkspaceProviderProps) {
  // Load layout preferences from localStorage
  const loadLayoutPreferences = () => {
    if (typeof window === 'undefined') return {
      sidebarVisible: true,
      panelVisible: true,
      agentRailVisible: true,
      sidebarWidth: 250,
      panelHeight: 200,
      sidebarPosition: 'left' as const,
      panelPosition: 'bottom' as const,
      editorLayout: 'single' as const,
    }
    
    try {
      const saved = localStorage.getItem('azora-workspace-layout')
      return saved ? { ...JSON.parse(saved) } : {
        sidebarVisible: true,
        panelVisible: true,
        agentRailVisible: true,
        sidebarWidth: 250,
        panelHeight: 200,
        sidebarPosition: 'left' as const,
        panelPosition: 'bottom' as const,
        editorLayout: 'single' as const,
      }
    } catch {
      return {
        sidebarVisible: true,
        panelVisible: true,
        agentRailVisible: true,
        sidebarWidth: 250,
        panelHeight: 200,
        sidebarPosition: 'left' as const,
        panelPosition: 'bottom' as const,
        editorLayout: 'single' as const,
      }
    }
  }

  const [state, setState] = useState<WorkspaceState>({
    projectName: null,
    projectRoot: null,
    activeFilePath: null,
    activeFileContent: '',
    editorHistory: [],
    historyIndex: -1,
    openFiles: [],
    fileTree: [],
    layoutPreferences: loadLayoutPreferences(),
    isLoadingFile: false,
    isLoadingProject: false,
  })

  // Save layout preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('azora-workspace-layout', JSON.stringify(state.layoutPreferences))
      } catch {
        // Ignore storage failures (private mode / restricted contexts)
      }
    }
  }, [state.layoutPreferences])

  // Initialize default project on mount if none exists
  useEffect(() => {
    const init = async () => {
      const projectName = initialProject || 'my-buildspaces-project'
      await initProject(projectName)
    }
    init()
  }, [initialProject])

  const initProject = useCallback(async (name: string) => {
    setState(s => ({ ...s, isLoadingProject: true }))
    try {
      await fileSystem.initProject(name)
      await loadProject(name)
    } catch (error) {
      console.error('Failed to initialize project:', error)
    } finally {
      setState(s => ({ ...s, isLoadingProject: false }))
    }
  }, [])

  const loadProject = useCallback(async (name: string) => {
    setState(s => ({ ...s, isLoadingProject: true }))
    try {
      const projectRoot = `/${name}`
      const exists = await fileSystem.exists(projectRoot)
      
      if (!exists) {
        await fileSystem.initProject(name)
      }
      
      const fileTree = await fileSystem.listFiles(projectRoot)
      
      setState(s => ({
        ...s,
        projectName: name,
        projectRoot,
        fileTree,
        isLoadingProject: false,
      }))
      
      // Open default file if nothing is open
      if (state.openFiles.length === 0) {
        const defaultFile = `${projectRoot}/src/app/page.tsx`
        if (await fileSystem.exists(defaultFile)) {
          await openFile(defaultFile)
        }
      }
    } catch (error) {
      console.error('Failed to load project:', error)
      setState(s => ({ ...s, isLoadingProject: false }))
    }
  }, [state.openFiles.length])

  const openFile = useCallback(async (path: string) => {
    setState(s => ({ ...s, isLoadingFile: true }))
    try {
      const content = await fileSystem.readFile(path)
      
      setState(s => {
        // Update history
        const newHistory = s.editorHistory.slice(0, s.historyIndex + 1)
        if (s.activeFilePath && s.activeFilePath !== path) {
          newHistory.push(s.activeFilePath)
        }
        
        return {
          ...s,
          activeFilePath: path,
          activeFileContent: content,
          openFiles: s.openFiles.includes(path) ? s.openFiles : [...s.openFiles, path],
          editorHistory: newHistory,
          historyIndex: newHistory.length - 1,
          isLoadingFile: false,
        }
      })
    } catch (error) {
      console.error('Failed to open file:', error)
      setState(s => ({ ...s, isLoadingFile: false }))
    }
  }, [])

  const closeFile = useCallback((path: string) => {
    setState(s => {
      const newOpenFiles = s.openFiles.filter(f => f !== path)
      let newActivePath = s.activeFilePath
      
      // If we're closing the active file, switch to another open file
      if (s.activeFilePath === path && newOpenFiles.length > 0) {
        newActivePath = newOpenFiles[newOpenFiles.length - 1]
      } else if (newOpenFiles.length === 0) {
        newActivePath = null
      }
      
      return {
        ...s,
        openFiles: newOpenFiles,
        activeFilePath: newActivePath,
      }
    })
  }, [])

  const saveFile = useCallback(async (path: string, content: string) => {
    try {
      await fileSystem.writeFile(path, content)
      // Update content in state if this is the active file
      setState(s => ({
        ...s,
        activeFileContent: s.activeFilePath === path ? content : s.activeFileContent,
      }))
    } catch (error) {
      console.error('Failed to save file:', error)
      throw error
    }
  }, [])

  const createFile = useCallback(async (path: string, content: string = '') => {
    try {
      await fileSystem.writeFile(path, content)
      await refreshFileTree()
    } catch (error) {
      console.error('Failed to create file:', error)
      throw error
    }
  }, [])

  const deleteFile = useCallback(async (path: string) => {
    try {
      await fileSystem.deleteFile(path)
      closeFile(path)
      await refreshFileTree()
    } catch (error) {
      console.error('Failed to delete file:', error)
      throw error
    }
  }, [closeFile])

  const updateActiveFileContent = useCallback((content: string) => {
    setState(s => ({ ...s, activeFileContent: content }))
  }, [])

  // File watching for auto-refresh
  useEffect(() => {
    if (!state.projectRoot) return

    const unwatch = fileSystem.watchFiles(state.projectRoot, (event) => {
      // Refresh file tree on any file system change
      refreshFileTree()
    })

    return unwatch
  }, [state.projectRoot])

  const refreshFileTree = useCallback(async () => {
    if (!state.projectRoot) return
    try {
      const fileTree = await fileSystem.listFiles(state.projectRoot)
      setState(s => ({ ...s, fileTree }))
    } catch (error) {
      console.error('Failed to refresh file tree:', error)
    }
  }, [state.projectRoot])

  const toggleSidebar = useCallback(() => {
    setState(s => ({
      ...s,
      layoutPreferences: {
        ...s.layoutPreferences,
        sidebarVisible: !s.layoutPreferences.sidebarVisible,
      },
    }))
  }, [])

  const togglePanel = useCallback(() => {
    setState(s => ({
      ...s,
      layoutPreferences: {
        ...s.layoutPreferences,
        panelVisible: !s.layoutPreferences.panelVisible,
      },
    }))
  }, [])

  const toggleAgentRail = useCallback(() => {
    setState(s => ({
      ...s,
      layoutPreferences: {
        ...s.layoutPreferences,
        agentRailVisible: !s.layoutPreferences.agentRailVisible,
      },
    }))
  }, [])

  const setSidebarWidth = useCallback((width: number) => {
    setState(s => ({
      ...s,
      layoutPreferences: { ...s.layoutPreferences, sidebarWidth: width },
    }))
  }, [])

  const setPanelHeight = useCallback((height: number) => {
    setState(s => ({
      ...s,
      layoutPreferences: { ...s.layoutPreferences, panelHeight: height },
    }))
  }, [])

  const setSidebarPosition = useCallback((position: 'left' | 'right') => {
    setState(s => ({
      ...s,
      layoutPreferences: { ...s.layoutPreferences, sidebarPosition: position },
    }))
  }, [])

  const setPanelPosition = useCallback((position: 'bottom' | 'right') => {
    setState(s => ({
      ...s,
      layoutPreferences: { ...s.layoutPreferences, panelPosition: position },
    }))
  }, [])

  const setEditorLayout = useCallback((layout: 'single' | 'horizontal-split' | 'vertical-split' | 'grid-2x2') => {
    setState(s => ({
      ...s,
      layoutPreferences: { ...s.layoutPreferences, editorLayout: layout },
    }))
  }, [])

  const navigateBack = useCallback(() => {
    setState(s => {
      if (s.historyIndex > 0) {
        const newIndex = s.historyIndex - 1
        const targetFile = s.editorHistory[newIndex]
        return {
          ...s,
          historyIndex: newIndex,
          activeFilePath: targetFile,
          activeFileContent: s.activeFileContent,
        }
      }
      return s
    })
  }, [])

  const navigateForward = useCallback(() => {
    setState(s => {
      if (s.historyIndex < s.editorHistory.length - 1) {
        const newIndex = s.historyIndex + 1
        const targetFile = s.editorHistory[newIndex]
        return {
          ...s,
          historyIndex: newIndex,
          activeFilePath: targetFile,
          activeFileContent: s.activeFileContent,
        }
      }
      return s
    })
  }, [])

  const canNavigateBack = useCallback(() => {
    return state.historyIndex > 0
  }, [state.historyIndex])

  const canNavigateForward = useCallback(() => {
    return state.historyIndex < state.editorHistory.length - 1
  }, [state.historyIndex])

  const value: WorkspaceContextType = {
    ...state,
    initProject,
    loadProject,
    openFile,
    closeFile,
    saveFile,
    createFile,
    deleteFile,
    updateActiveFileContent,
    toggleSidebar,
    togglePanel,
    toggleAgentRail,
    setSidebarWidth,
    setPanelHeight,
    setSidebarPosition,
    setPanelPosition,
    setEditorLayout,
    navigateBack,
    navigateForward,
    canNavigateBack,
    canNavigateForward,
    refreshFileTree,
  }

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}
