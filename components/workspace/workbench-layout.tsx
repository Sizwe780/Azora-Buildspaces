"use client"

/**
 * WorkbenchLayout - Resizable Split-Pane IDE Layout
 * 
 * Constitutional Compliance:
 * - NO MOCKS: Real resizable panels using react-resizable-panels
 * - PERSISTENT: Layout preferences saved to localStorage
 * - Built per BLUEPRINT.md Room 1: Code Chamber specifications
 * 
 * Layout Structure:
 * ┌─────────────────────────────────────────────────┐
 * │  Sidebar  │   Main Editor   │   Agent Rail      │
 * │  (Files)  │   (Monaco)      │   (Elara)         │
 * │           ├─────────────────┤                   │
 * │           │  Panel (Term)   │                   │
 * └─────────────────────────────────────────────────┘
 */

import React from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useWorkspace } from '@/lib/workspace/workspace-context'
import { GripVertical, GripHorizontal } from 'lucide-react'

interface WorkbenchLayoutProps {
  /** Left sidebar content (file explorer) */
  sidebarContent: React.ReactNode
  /** Main editor area content - can be a single editor or editor groups */
  editorContent: React.ReactNode
  /** Bottom panel content (terminal, output, etc.) */
  panelContent?: React.ReactNode
  /** Right agent rail content (AI assistant) */
  agentRailContent?: React.ReactNode
  /** Editor layout mode: 'single', 'horizontal-split', 'vertical-split', 'grid-2x2' */
  editorLayout?: 'single' | 'horizontal-split' | 'vertical-split' | 'grid-2x2'
}

export function WorkbenchLayout({
  sidebarContent,
  editorContent,
  panelContent,
  agentRailContent,
  editorLayout = 'single',
}: WorkbenchLayoutProps) {
  const { layoutPreferences } = useWorkspace()

  // Render editor content based on layout mode
  const renderEditorContent = () => {
    switch (editorLayout) {
      case 'horizontal-split':
        return (
          <PanelGroup direction="vertical">
            <Panel defaultSize={50} minSize={20}>
              {editorContent}
            </Panel>
            <ResizeHandle direction="horizontal" />
            <Panel defaultSize={50} minSize={20}>
              {/* Second editor group would go here */}
              <div className="h-full w-full bg-[var(--ide-editor-bg)] flex items-center justify-center text-gray-500">
                Second Editor Group
              </div>
            </Panel>
          </PanelGroup>
        )

      case 'vertical-split':
        return (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={50} minSize={20}>
              {editorContent}
            </Panel>
            <ResizeHandle direction="vertical" />
            <Panel defaultSize={50} minSize={20}>
              {/* Second editor group would go here */}
              <div className="h-full w-full bg-[var(--ide-editor-bg)] flex items-center justify-center text-gray-500">
                Second Editor Group
              </div>
            </Panel>
          </PanelGroup>
        )

      case 'grid-2x2':
        return (
          <PanelGroup direction="vertical">
            <Panel defaultSize={50} minSize={20}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={50} minSize={20}>
                  {editorContent}
                </Panel>
                <ResizeHandle direction="vertical" />
                <Panel defaultSize={50} minSize={20}>
                  <div className="h-full w-full bg-[var(--ide-editor-bg)] flex items-center justify-center text-gray-500">
                    Top-Right Editor
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
            <ResizeHandle direction="horizontal" />
            <Panel defaultSize={50} minSize={20}>
              <PanelGroup direction="horizontal">
                <Panel defaultSize={50} minSize={20}>
                  <div className="h-full w-full bg-[var(--ide-editor-bg)] flex items-center justify-center text-gray-500">
                    Bottom-Left Editor
                  </div>
                </Panel>
                <ResizeHandle direction="vertical" />
                <Panel defaultSize={50} minSize={20}>
                  <div className="h-full w-full bg-[var(--ide-editor-bg)] flex items-center justify-center text-gray-500">
                    Bottom-Right Editor
                  </div>
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        )

      default:
        return editorContent
    }
  }

  return (
    <div className="h-full w-full bg-[var(--ide-editor-bg)]">
      <PanelGroup direction="horizontal" className="h-full">
        {/* Sidebar (File Explorer) */}
        {layoutPreferences.sidebarVisible && (
          <>
            <Panel
              defaultSize={20}
              minSize={15}
              maxSize={35}
              className="bg-[var(--ide-sidebar-bg)] border-r border-[var(--ide-border)]"
            >
              {sidebarContent}
            </Panel>
            <ResizeHandle direction="vertical" />
          </>
        )}

        {/* Main Content Area (Editor + Panel) */}
        <Panel defaultSize={layoutPreferences.agentRailVisible ? 60 : 80} minSize={40}>
          <PanelGroup direction="vertical">
            {/* Editor */}
            <Panel defaultSize={layoutPreferences.panelVisible ? 70 : 100} minSize={30}>
              {renderEditorContent()}
            </Panel>

            {/* Bottom Panel (Terminal/Output) */}
            {layoutPreferences.panelVisible && panelContent && (
              <>
                <ResizeHandle direction="horizontal" />
                <Panel defaultSize={30} minSize={10} maxSize={50} className="bg-[var(--ide-editor-bg)]">
                  {panelContent}
                </Panel>
              </>
            )}
          </PanelGroup>
        </Panel>

        {/* Agent Rail (AI Assistant) */}
        {layoutPreferences.agentRailVisible && agentRailContent && (
          <>
            <ResizeHandle direction="vertical" />
            <Panel
              defaultSize={20}
              minSize={15}
              maxSize={35}
              className="bg-[var(--ide-sidebar-bg)] border-l border-[var(--ide-border)]"
            >
              {agentRailContent}
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  )
}

/**
 * Resize Handle Component
 * Visual indicator for resizable panel boundaries
 */
function ResizeHandle({ direction }: { direction: 'horizontal' | 'vertical' }) {
  return (
    <PanelResizeHandle
      className={`group relative ${
        direction === 'vertical'
          ? 'w-[1px] hover:w-[3px] active:w-[3px] transition-all duration-150'
          : 'h-[1px] hover:h-[3px] active:h-[3px] transition-all duration-150'
      } bg-[var(--ide-border)]/50 hover:bg-[var(--ide-tab-active-indicator)] active:bg-[var(--ide-tab-active-indicator)] flex items-center justify-center`}
    >
      <div
        className={`absolute ${
          direction === 'vertical' ? 'w-full h-8' : 'w-8 h-full'
        } flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}
      >
        {direction === 'vertical' ? (
          <GripVertical className="w-4 h-4 text-gray-400" />
        ) : (
          <GripHorizontal className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </PanelResizeHandle>
  )
}
