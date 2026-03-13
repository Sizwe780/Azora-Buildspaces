"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWorkbench } from "@/lib/stores/workbench-store"
import { useFileSystem } from "@/lib/stores/file-system"

interface MenuItem {
  label?: string
  shortcut?: string
  action?: () => void
  type?: "separator"
}

interface MenuDef {
  id: string
  label: string
  items: MenuItem[]
}

interface MenuBarProps {
  className?: string
}

export function MenuBar({ className }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const wb = useWorkbench()
  const fs = useFileSystem()

    {/* Show recent files after separator */}
    const recentFilesItems: MenuItem[] = wb.recentFiles.length > 0 ? [
    { type: "separator" },
    ...wb.recentFiles.slice(0, 5).map(f => ({
      label: `  ${f.name}`,
      action: () => {
        window.dispatchEvent(new CustomEvent('workbench:open-file', { detail: { fileId: f.fileId } }))
      },
    })),
    { type: "separator" },
    { label: "Clear Recently Opened", action: () => wb.clearRecentFiles() },
  ] : []

  const menus: MenuDef[] = [
    {
      id: "file",
      label: "File",
      items: [
        { label: "New File", shortcut: "Ctrl+N", action: () => {
          const name = window.prompt("Enter filename:", "untitled.ts")
          if (name) {
            fs.createFile(null, name.trim(), "").then(fileId => {
              fs.setActiveFile(fileId)
            }).catch(() => {})
          }
        } },
        { label: "Open File...", shortcut: "Ctrl+O", action: () => wb.setQuickOpenVisible(true) },
        { label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O", action: () => wb.setSidebarView("explorer") },
        { type: "separator" },
        { label: "Save", shortcut: "Ctrl+S", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true })) },
        { label: "Save All", shortcut: "Ctrl+K S", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true })) },
        { type: "separator" },
        { label: "Close Editor", shortcut: "Ctrl+F4", action: () => {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "F4", ctrlKey: true }))
        }},
        ...recentFilesItems,
        { type: "separator" },
        { label: "Preferences", action: () => wb.setSidebarView("settings") },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", action: () => document.execCommand("undo") },
        { label: "Redo", shortcut: "Ctrl+Y", action: () => document.execCommand("redo") },
        { type: "separator" },
        { label: "Cut", shortcut: "Ctrl+X", action: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "Ctrl+V", action: () => document.execCommand("paste") },
        { type: "separator" },
        { label: "Find", shortcut: "Ctrl+F", action: () => { /* Monaco built-in find */ } },
        { label: "Replace", shortcut: "Ctrl+H", action: () => { /* Monaco built-in replace */ } },
        { label: "Find in Files", shortcut: "Ctrl+Shift+F", action: () => wb.setSidebarView("search") },
        { type: "separator" },
        { label: "Toggle Line Comment", shortcut: "Ctrl+/", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", ctrlKey: true, bubbles: true })) },
        { label: "Toggle Block Comment", shortcut: "Ctrl+Shift+/", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", ctrlKey: true, shiftKey: true, bubbles: true })) },
      ],
    },
    {
      id: "selection",
      label: "Selection",
      items: [
        { label: "Select All", shortcut: "Ctrl+A", action: () => document.execCommand('selectAll') },
        { type: "separator" },
        { label: "Expand Selection", shortcut: "Shift+Alt+Right", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, altKey: true, bubbles: true })) },
        { label: "Shrink Selection", shortcut: "Shift+Alt+Left", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", shiftKey: true, altKey: true, bubbles: true })) },
        { type: "separator" },
        { label: "Copy Line Up", shortcut: "Shift+Alt+Up", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", shiftKey: true, altKey: true, bubbles: true })) },
        { label: "Copy Line Down", shortcut: "Shift+Alt+Down", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", shiftKey: true, altKey: true, bubbles: true })) },
        { label: "Move Line Up", shortcut: "Alt+Up", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true })) },
        { label: "Move Line Down", shortcut: "Alt+Down", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true })) },
        { type: "separator" },
        { label: "Add Cursor Above", shortcut: "Ctrl+Alt+Up", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", ctrlKey: true, altKey: true, bubbles: true })) },
        { label: "Add Cursor Below", shortcut: "Ctrl+Alt+Down", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", ctrlKey: true, altKey: true, bubbles: true })) },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: "Command Palette...", shortcut: "Ctrl+Shift+P", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "P", ctrlKey: true, shiftKey: true })) },
        { label: "Quick Open", shortcut: "Ctrl+P", action: () => wb.setQuickOpenVisible(true) },
        { type: "separator" },
        { label: "Explorer", shortcut: "Ctrl+Shift+E", action: () => wb.setSidebarView("explorer") },
        { label: "Search", shortcut: "Ctrl+Shift+F", action: () => wb.setSidebarView("search") },
        { label: "Git", shortcut: "Ctrl+Shift+G", action: () => wb.setSidebarView("git") },
        { label: "Debug", shortcut: "Ctrl+Shift+D", action: () => wb.setPanelView("debug") },
        { label: "Extensions", shortcut: "Ctrl+Shift+X", action: () => wb.setSidebarView("extensions") },
        { type: "separator" },
        { label: "Terminal", shortcut: "Ctrl+`", action: () => wb.setPanelView("terminal") },
        { label: "Problems", shortcut: "Ctrl+Shift+M", action: () => wb.setPanelView("problems") },
        { label: "Output", shortcut: "Ctrl+Shift+U", action: () => wb.setPanelView("output") },
        { type: "separator" },
        { label: "Toggle Sidebar", shortcut: "Ctrl+B", action: () => wb.toggleSidebar() },
        { label: "Toggle Panel", shortcut: "Ctrl+J", action: () => wb.togglePanel() },
        { label: "Toggle Zen Mode", shortcut: "Ctrl+K Z", action: () => wb.toggleZenMode() },
        { type: "separator" },
        { label: "Split Editor", shortcut: "Ctrl+\\", action: () => wb.splitEditor("horizontal") },
      ],
    },
    {
      id: "go",
      label: "Go",
      items: [
        { label: "Go to File...", shortcut: "Ctrl+P", action: () => wb.setQuickOpenVisible(true) },
        { label: "Go to Line/Column...", shortcut: "Ctrl+G", action: () => wb.setGoToLineVisible(true) },
        { type: "separator" },
        { label: "Go to Definition", shortcut: "F12", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "F12", bubbles: true })) },
        { label: "Peek Definition", shortcut: "Alt+F12", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "F12", altKey: true, bubbles: true })) },
        { label: "Go to References", shortcut: "Shift+F12", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "F12", shiftKey: true, bubbles: true })) },
        { type: "separator" },
        { label: "Go Back", shortcut: "Alt+Left", action: () => wb.navigateBack() },
        { label: "Go Forward", shortcut: "Alt+Right", action: () => wb.navigateForward() },
        { type: "separator" },
        { label: "Next Problem", shortcut: "F8", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "F8", bubbles: true })) },
        { label: "Previous Problem", shortcut: "Shift+F8", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "F8", shiftKey: true, bubbles: true })) },
      ],
    },
    {
      id: "run",
      label: "Run",
      items: [
        { label: "Start Debugging", shortcut: "F5", action: () => wb.setPanelView("debug") },
        { label: "Run Without Debugging", shortcut: "Ctrl+F5", action: () => wb.setPanelView("terminal") },
        { label: "Stop Debugging", shortcut: "Shift+F5", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "F5", shiftKey: true, bubbles: true })) },
        { type: "separator" },
        { label: "Run Build Task", shortcut: "Ctrl+Shift+B", action: () => wb.setSidebarView("task-runner") },
        { label: "Run Test Task", action: () => wb.setSidebarView("task-runner") },
      ],
    },
    {
      id: "terminal",
      label: "Terminal",
      items: [
        { label: "New Terminal", shortcut: "Ctrl+Shift+`", action: () => {
          wb.setPanelView("terminal")
          window.dispatchEvent(new CustomEvent('terminal:new'))
        }},
        { label: "Split Terminal", action: () => {
          wb.setPanelView("terminal")
          window.dispatchEvent(new CustomEvent('terminal:split'))
        }},
        { type: "separator" },
        { label: "Run Active File", action: () => {
          wb.setPanelView("terminal")
          const activeId = fs.activeFileId
          if (activeId) {
            const file = fs.fileMap[activeId]
            if (file) {
              const ext = file.name.split('.').pop()?.toLowerCase()
              let cmd = ''
              if (ext === 'ts' || ext === 'tsx') cmd = `npx tsx ${file.path}`
              else if (ext === 'js' || ext === 'jsx') cmd = `node ${file.path}`
              else if (ext === 'py') cmd = `python ${file.path}`
              else if (ext === 'sh') cmd = `bash ${file.path}`
              else if (ext === 'go') cmd = `go run ${file.path}`
              else if (ext === 'rs') cmd = `cargo run`
              else cmd = `cat ${file.path}`
              window.dispatchEvent(new CustomEvent('terminal:run', { detail: { command: cmd } }))
            }
          }
        }},
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Welcome", action: () => window.dispatchEvent(new CustomEvent('workbench:show-welcome')) },
        { label: "Show All Commands", shortcut: "Ctrl+Shift+P", action: () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "P", ctrlKey: true, shiftKey: true })) },
        { type: "separator" },
        { label: "Documentation", action: () => window.open("/docs", "_blank") },
        { label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S", action: () => wb.setSidebarView("settings") },
        { type: "separator" },
        { label: "About", action: () => window.dispatchEvent(new CustomEvent('workbench:show-about')) },
      ],
    },
  ]

  return (
    <div className={cn("flex items-center h-10 bg-[var(--ide-menu-bar-bg)] border-b border-[var(--ide-menu-border)] select-none", className)}>
      {menus.map((menu) => (
        <DropdownMenu key={menu.id} onOpenChange={(open) => setActiveMenu(open ? menu.id : null)}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "h-10 px-3 rounded-none border-0 hover:bg-[var(--ide-menu-active-bg)] text-[var(--ide-text)] font-normal",
                activeMenu === menu.id && "bg-[var(--ide-menu-active-bg)]"
              )}
            >
              {menu.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 bg-[var(--ide-menu-bg)] border-[var(--ide-menu-border)] text-[var(--ide-text)]">
            {menu.items.map((item, index) => {
              if (item.type === "separator") {
                return <DropdownMenuSeparator key={index} className="bg-[var(--ide-menu-border)]" />
              }
              return (
                <DropdownMenuItem
                  key={index}
                  className="flex items-center justify-between px-3 py-1.5 hover:bg-[var(--ide-hover-bg)] cursor-pointer"
                  onClick={item.action}
                >
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <span className="text-xs text-[var(--ide-text-muted)] ml-4">{item.shortcut}</span>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  )
}
