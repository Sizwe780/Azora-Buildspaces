// Customizable UI Layouts Store for Code Chamber IDE
// Supports drag-and-drop panels, split views, saved layouts, floating windows

import { create } from 'zustand'

export type PanelPosition = 'left' | 'right' | 'bottom' | 'center' | 'floating'

export interface LayoutPanel {
  id: string
  title: string
  component: string // component key for dynamic rendering
  position: PanelPosition
  size: number // percentage
  minSize: number
  maxSize: number
  isVisible: boolean
  isCollapsed: boolean
  order: number
  // Floating window props
  floatingX?: number
  floatingY?: number
  floatingWidth?: number
  floatingHeight?: number
}

export interface SavedLayout {
  id: string
  name: string
  panels: LayoutPanel[]
  createdAt: number
  isDefault: boolean
}

export interface LayoutState {
  panels: LayoutPanel[]
  savedLayouts: SavedLayout[]
  activeLayoutId: string | null
  isDragging: boolean
  dragSource: string | null

  // Actions
  movePanel: (panelId: string, newPosition: PanelPosition) => void
  resizePanel: (panelId: string, size: number) => void
  togglePanel: (panelId: string) => void
  collapsePanel: (panelId: string) => void
  floatPanel: (panelId: string, x: number, y: number, width: number, height: number) => void
  dockPanel: (panelId: string, position: PanelPosition) => void
  reorderPanel: (panelId: string, newOrder: number) => void
  saveLayout: (name: string) => void
  loadLayout: (layoutId: string) => void
  deleteLayout: (layoutId: string) => void
  resetLayout: () => void
  setDragging: (isDragging: boolean, source: string | null) => void
}

const LAYOUTS_KEY = 'buildspaces.layouts'
const ACTIVE_LAYOUT_KEY = 'buildspaces.activeLayout'

const DEFAULT_PANELS: LayoutPanel[] = [
  { id: 'explorer', title: 'Explorer', component: 'explorer', position: 'left', size: 20, minSize: 15, maxSize: 40, isVisible: true, isCollapsed: false, order: 0 },
  { id: 'search', title: 'Search', component: 'search', position: 'left', size: 20, minSize: 15, maxSize: 40, isVisible: false, isCollapsed: false, order: 1 },
  { id: 'git', title: 'Source Control', component: 'git', position: 'left', size: 20, minSize: 15, maxSize: 40, isVisible: false, isCollapsed: false, order: 2 },
  { id: 'extensions', title: 'Extensions', component: 'extensions', position: 'left', size: 20, minSize: 15, maxSize: 40, isVisible: false, isCollapsed: false, order: 3 },
  { id: 'editor', title: 'Editor', component: 'editor', position: 'center', size: 60, minSize: 30, maxSize: 100, isVisible: true, isCollapsed: false, order: 0 },
  { id: 'terminal', title: 'Terminal', component: 'terminal', position: 'bottom', size: 25, minSize: 10, maxSize: 50, isVisible: true, isCollapsed: false, order: 0 },
  { id: 'output', title: 'Output', component: 'output', position: 'bottom', size: 25, minSize: 10, maxSize: 50, isVisible: false, isCollapsed: false, order: 1 },
  { id: 'problems', title: 'Problems', component: 'problems', position: 'bottom', size: 25, minSize: 10, maxSize: 50, isVisible: false, isCollapsed: false, order: 2 },
  { id: 'debug', title: 'Debug Console', component: 'debug', position: 'bottom', size: 25, minSize: 10, maxSize: 50, isVisible: false, isCollapsed: false, order: 3 },
  { id: 'ai-assistant', title: 'AI Assistant', component: 'ai-assistant', position: 'right', size: 25, minSize: 15, maxSize: 40, isVisible: false, isCollapsed: false, order: 0 },
  { id: 'collaboration', title: 'Collaboration', component: 'collaboration', position: 'right', size: 25, minSize: 15, maxSize: 40, isVisible: false, isCollapsed: false, order: 1 },
]

function loadSavedLayouts(): SavedLayout[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(LAYOUTS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function persistLayouts(layouts: SavedLayout[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts))
  }
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  panels: [...DEFAULT_PANELS],
  savedLayouts: loadSavedLayouts(),
  activeLayoutId: null,
  isDragging: false,
  dragSource: null,

  movePanel: (panelId: string, newPosition: PanelPosition) => {
    set((state) => ({
      panels: state.panels.map(p =>
        p.id === panelId ? { ...p, position: newPosition } : p
      ),
    }))
  },

  resizePanel: (panelId: string, size: number) => {
    set((state) => ({
      panels: state.panels.map(p =>
        p.id === panelId
          ? { ...p, size: Math.max(p.minSize, Math.min(p.maxSize, size)) }
          : p
      ),
    }))
  },

  togglePanel: (panelId: string) => {
    set((state) => ({
      panels: state.panels.map(p =>
        p.id === panelId ? { ...p, isVisible: !p.isVisible } : p
      ),
    }))
  },

  collapsePanel: (panelId: string) => {
    set((state) => ({
      panels: state.panels.map(p =>
        p.id === panelId ? { ...p, isCollapsed: !p.isCollapsed } : p
      ),
    }))
  },

  floatPanel: (panelId: string, x: number, y: number, width: number, height: number) => {
    set((state) => ({
      panels: state.panels.map(p =>
        p.id === panelId
          ? { ...p, position: 'floating' as PanelPosition, floatingX: x, floatingY: y, floatingWidth: width, floatingHeight: height }
          : p
      ),
    }))
  },

  dockPanel: (panelId: string, position: PanelPosition) => {
    set((state) => ({
      panels: state.panels.map(p =>
        p.id === panelId
          ? { ...p, position, floatingX: undefined, floatingY: undefined, floatingWidth: undefined, floatingHeight: undefined }
          : p
      ),
    }))
  },

  reorderPanel: (panelId: string, newOrder: number) => {
    set((state) => ({
      panels: state.panels.map(p =>
        p.id === panelId ? { ...p, order: newOrder } : p
      ),
    }))
  },

  saveLayout: (name: string) => {
    const layout: SavedLayout = {
      id: `layout-${Date.now()}`,
      name,
      panels: [...get().panels],
      createdAt: Date.now(),
      isDefault: false,
    }
    const layouts = [...get().savedLayouts, layout]
    set({ savedLayouts: layouts, activeLayoutId: layout.id })
    persistLayouts(layouts)
  },

  loadLayout: (layoutId: string) => {
    const layout = get().savedLayouts.find(l => l.id === layoutId)
    if (layout) {
      set({ panels: [...layout.panels], activeLayoutId: layoutId })
    }
  },

  deleteLayout: (layoutId: string) => {
    const layouts = get().savedLayouts.filter(l => l.id !== layoutId)
    set({ savedLayouts: layouts })
    persistLayouts(layouts)
  },

  resetLayout: () => {
    set({ panels: [...DEFAULT_PANELS], activeLayoutId: null })
  },

  setDragging: (isDragging: boolean, source: string | null) => {
    set({ isDragging, dragSource: source })
  },
}))
