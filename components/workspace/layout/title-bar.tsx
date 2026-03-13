"use client"

import { useState } from "react"
import {
  Code2,
  Search,
  PanelLeft,
  PanelRight,
  PanelBottom,
  LayoutGrid,
  Eye,
  EyeOff,
  SplitSquareHorizontal,
  Maximize2,
  MessageSquare,
  Bot,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { useWorkbench } from "@/lib/stores/workbench-store"
import type { SecondarySidebarView } from "@/lib/stores/workbench-store"

interface TitleBarProps {
  onOpenCommandPalette?: () => void
  projectName?: string
}

export function TitleBar({ onOpenCommandPalette, projectName }: TitleBarProps) {
  const {
    toggleSidebar, togglePanel, toggleSecondarySidebar, toggleZenMode,
    toggleActivityBar, toggleStatusBar, splitEditor,
    isSidebarVisible, isPanelVisible, isSecondarySidebarVisible,
    isActivityBarVisible, isStatusBarVisible, isZenMode,
    setSidebarView, setSecondarySidebarView, showSecondarySidebar,
    setPanelView,
  } = useWorkbench()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const viewMenuItems: Array<{ label?: string; shortcut?: string; type?: 'separator'; checked?: boolean; action?: () => void; hasSubmenu?: boolean }> = [
    { label: "Command Palette...", shortcut: "Ctrl+Shift+P", action: onOpenCommandPalette },
    { type: "separator" },
    { label: "Explorer", shortcut: "Ctrl+Shift+E", action: () => setSidebarView('explorer') },
    { label: "Search", shortcut: "Ctrl+Shift+F", action: () => setSidebarView('search') },
    { label: "Source Control", shortcut: "Ctrl+Shift+G", action: () => setSidebarView('git') },
    { label: "Extensions", shortcut: "Ctrl+Shift+X", action: () => setSidebarView('extensions') },
    { type: "separator" },
    { label: "Terminal", shortcut: "Ctrl+`", action: () => setPanelView('terminal') },
    { label: "Problems", shortcut: "Ctrl+Shift+M", action: () => setPanelView('problems') },
    { label: "Output", shortcut: "Ctrl+Shift+U", action: () => setPanelView('output') },
    { label: "Ports", action: () => setPanelView('ports') },
    { type: "separator" },
    { label: "Toggle Primary Side Bar", shortcut: "Ctrl+B", checked: isSidebarVisible, action: toggleSidebar },
    { label: "Toggle Secondary Side Bar", shortcut: "Ctrl+Alt+B", checked: isSecondarySidebarVisible, action: toggleSecondarySidebar },
    { label: "Toggle Panel", shortcut: "Ctrl+J", checked: isPanelVisible, action: togglePanel },
    { label: "Toggle Activity Bar", checked: isActivityBarVisible, action: toggleActivityBar },
    { label: "Toggle Status Bar", checked: isStatusBarVisible, action: toggleStatusBar },
    { type: "separator" },
    { label: "Split Editor Right", shortcut: "Ctrl+\\", action: () => splitEditor('horizontal') },
    { label: "Split Editor Down", action: () => splitEditor('vertical') },
    { type: "separator" },
    { label: "Zen Mode", shortcut: "Ctrl+K Z", checked: isZenMode, action: toggleZenMode },
  ]

  const staticMenus = [
    {
      label: "File",
      items: [
        { label: "New File", shortcut: "Ctrl+N" },
        { label: "New Window", shortcut: "Ctrl+Shift+N" },
        { type: "separator" as const },
        { label: "Open File...", shortcut: "Ctrl+O" },
        { label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O" },
        { type: "separator" as const },
        { label: "Save", shortcut: "Ctrl+S" },
        { label: "Save As...", shortcut: "Ctrl+Shift+S" },
        { label: "Save All", shortcut: "Ctrl+K S" },
        { type: "separator" as const },
        { label: "Auto Save" },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z" },
        { label: "Redo", shortcut: "Ctrl+Shift+Z" },
        { type: "separator" as const },
        { label: "Cut", shortcut: "Ctrl+X" },
        { label: "Copy", shortcut: "Ctrl+C" },
        { label: "Paste", shortcut: "Ctrl+V" },
        { type: "separator" as const },
        { label: "Find", shortcut: "Ctrl+F" },
        { label: "Replace", shortcut: "Ctrl+H" },
        { type: "separator" as const },
        { label: "Find in Files", shortcut: "Ctrl+Shift+F" },
        { label: "Replace in Files", shortcut: "Ctrl+Shift+H" },
      ],
    },
    {
      label: "Selection",
      items: [
        { label: "Select All", shortcut: "Ctrl+A" },
        { label: "Expand Selection", shortcut: "Shift+Alt+→" },
        { label: "Shrink Selection", shortcut: "Shift+Alt+←" },
        { type: "separator" as const },
        { label: "Copy Line Up", shortcut: "Shift+Alt+↑" },
        { label: "Copy Line Down", shortcut: "Shift+Alt+↓" },
        { label: "Move Line Up", shortcut: "Alt+↑" },
        { label: "Move Line Down", shortcut: "Alt+↓" },
      ],
    },
    {
      label: "Go",
      items: [
        { label: "Back", shortcut: "Alt+←" },
        { label: "Forward", shortcut: "Alt+→" },
        { type: "separator" as const },
        { label: "Go to File...", shortcut: "Ctrl+P" },
        { label: "Go to Symbol...", shortcut: "Ctrl+Shift+O" },
        { label: "Go to Line...", shortcut: "Ctrl+G" },
        { type: "separator" as const },
        { label: "Go to Definition", shortcut: "F12" },
        { label: "Go to Implementation", shortcut: "Ctrl+F12" },
        { label: "Go to References", shortcut: "Shift+F12" },
      ],
    },
    {
      label: "Run",
      items: [
        { label: "Start Debugging", shortcut: "F5" },
        { label: "Run Without Debugging", shortcut: "Ctrl+F5" },
        { label: "Stop Debugging", shortcut: "Shift+F5" },
        { label: "Restart Debugging", shortcut: "Ctrl+Shift+F5" },
        { type: "separator" as const },
        { label: "Toggle Breakpoint", shortcut: "F9" },
      ],
    },
    {
      label: "Terminal",
      items: [
        { label: "New Terminal", shortcut: "Ctrl+Shift+`" },
        { label: "Split Terminal", shortcut: "Ctrl+Shift+5" },
        { type: "separator" as const },
        { label: "Run Task..." },
        { label: "Run Build Task...", shortcut: "Ctrl+Shift+B" },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Welcome" },
        { label: "Documentation" },
        { label: "Release Notes" },
        { type: "separator" as const },
        { label: "Keyboard Shortcuts", shortcut: "Ctrl+K Ctrl+S" },
        { label: "Report Issue..." },
        { type: "separator" as const },
        { label: "About Azora Code Chamber" },
      ],
    },
  ]

  return (
    <div className="h-[28px] flex items-center bg-background/90 backdrop-blur-sm border-b border-border/40 select-none shrink-0">
      {/* Menu Bar */}
      <div className="flex items-center h-full">
        {/* Static menus */}
        {staticMenus.map((menu) => (
          <DropdownMenu
            key={menu.label}
            open={activeMenu === menu.label}
            onOpenChange={(open) => setActiveMenu(open ? menu.label : null)}
          >
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "h-full px-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors outline-none",
                  activeMenu === menu.label && "bg-accent/60 text-foreground"
                )}
                onMouseEnter={() => { if (activeMenu) setActiveMenu(menu.label) }}
              >
                {menu.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={0} className="min-w-[220px] bg-popover/98 backdrop-blur-md border-border/60 shadow-xl rounded-lg">
              {menu.items.map((item, i) =>
                'type' in item && item.type === "separator" ? (
                  <DropdownMenuSeparator key={i} className="bg-border/40" />
                ) : (
                  <DropdownMenuItem key={i} className="text-[12px] h-7 px-3 cursor-pointer focus:bg-primary/10">
                    <span className="flex-1">{item.label}</span>
                    {'shortcut' in item && item.shortcut && (
                      <DropdownMenuShortcut className="text-[11px] text-muted-foreground/70 ml-6">
                        {item.shortcut}
                      </DropdownMenuShortcut>
                    )}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        {/* View menu - fully wired */}
        <DropdownMenu
          open={activeMenu === "View"}
          onOpenChange={(open) => setActiveMenu(open ? "View" : null)}
        >
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "h-full px-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors outline-none",
                activeMenu === "View" && "bg-accent/60 text-foreground"
              )}
              onMouseEnter={() => { if (activeMenu) setActiveMenu("View") }}
            >
              View
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={0} className="min-w-[260px] bg-popover/98 backdrop-blur-md border-border/60 shadow-xl rounded-lg">
            {viewMenuItems.map((item, i) =>
              item.type === "separator" ? (
                <DropdownMenuSeparator key={i} className="bg-border/40" />
              ) : item.checked !== undefined ? (
                <DropdownMenuCheckboxItem
                  key={i}
                  checked={item.checked}
                  onCheckedChange={() => item.action?.()}
                  className="text-[12px] h-7 px-3 cursor-pointer focus:bg-primary/10"
                >
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <DropdownMenuShortcut className="text-[11px] text-muted-foreground/70 ml-6">
                      {item.shortcut}
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuCheckboxItem>
              ) : (
                <DropdownMenuItem
                  key={i}
                  onSelect={() => { item.action?.(); setActiveMenu(null) }}
                  className="text-[12px] h-7 px-3 cursor-pointer focus:bg-primary/10"
                >
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <DropdownMenuShortcut className="text-[11px] text-muted-foreground/70 ml-6">
                      {item.shortcut}
                    </DropdownMenuShortcut>
                  )}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center - Project Title / Quick Nav */}
      <div className="flex-1 flex items-center justify-center">
        <button
          className="flex items-center gap-2 px-3 h-[22px] rounded-md bg-accent/30 hover:bg-accent/50 text-[11px] text-muted-foreground hover:text-foreground transition-all max-w-[400px] border border-border/30"
          onClick={onOpenCommandPalette}
        >
          <Search className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {projectName || "Azora Code Chamber"} — Search or run a command
          </span>
          <kbd className="ml-1 text-[10px] opacity-60 font-mono">Ctrl+Shift+P</kbd>
        </button>
      </div>

      {/* Right - Layout Controls */}
      <div className="flex items-center gap-0.5 pr-2">
        {/* Toggle Primary Sidebar */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("w-7 h-7 transition-colors", isSidebarVisible ? "text-foreground" : "text-muted-foreground/40")}
          onClick={toggleSidebar}
          title="Toggle Primary Side Bar (Ctrl+B)"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Toggle Panel */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("w-7 h-7 transition-colors", isPanelVisible ? "text-foreground" : "text-muted-foreground/40")}
          onClick={togglePanel}
          title="Toggle Panel (Ctrl+J)"
        >
          <PanelBottom className="w-3.5 h-3.5" />
        </Button>

        {/* Toggle Secondary Sidebar with AI Chat quick-open */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("w-7 h-7 transition-colors", isSecondarySidebarVisible ? "text-primary" : "text-muted-foreground/60")}
              title="Toggle Secondary Side Bar (Ctrl+Alt+B)"
            >
              <PanelRight className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px] bg-popover/98 backdrop-blur-md border-border/60 shadow-xl rounded-lg">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">Secondary Sidebar</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => showSecondarySidebar('chat')} className="text-[12px] gap-2 cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" /> Chat
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => showSecondarySidebar('ai-assistant')} className="text-[12px] gap-2 cursor-pointer">
              <Bot className="w-3.5 h-3.5 text-purple-400" /> AI Assistant
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => showSecondarySidebar('outline')} className="text-[12px] gap-2 cursor-pointer">
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" /> Outline
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggleSecondarySidebar} className="text-[12px] gap-2 cursor-pointer text-muted-foreground">
              {isSecondarySidebarVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {isSecondarySidebarVisible ? "Hide" : "Show"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Customize Layout */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-muted-foreground hover:text-foreground"
              title="Customize Layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px] bg-popover/98 backdrop-blur-md border-border/60 shadow-xl rounded-lg">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">Customize Layout</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={isSidebarVisible} onCheckedChange={toggleSidebar} className="text-[12px] gap-2 cursor-pointer">
              <PanelLeft className="w-3.5 h-3.5" /> Primary Side Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={isSecondarySidebarVisible} onCheckedChange={toggleSecondarySidebar} className="text-[12px] gap-2 cursor-pointer">
              <PanelRight className="w-3.5 h-3.5" /> Secondary Side Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={isPanelVisible} onCheckedChange={togglePanel} className="text-[12px] gap-2 cursor-pointer">
              <PanelBottom className="w-3.5 h-3.5" /> Panel
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={isActivityBarVisible} onCheckedChange={toggleActivityBar} className="text-[12px] gap-2 cursor-pointer">
              Activity Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={isStatusBarVisible} onCheckedChange={toggleStatusBar} className="text-[12px] gap-2 cursor-pointer">
              Status Bar
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => splitEditor('horizontal')} className="text-[12px] gap-2 cursor-pointer">
              <SplitSquareHorizontal className="w-3.5 h-3.5" /> Split Editor
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleZenMode} className="text-[12px] gap-2 cursor-pointer">
              <Maximize2 className="w-3.5 h-3.5" /> {isZenMode ? "Exit Zen Mode" : "Zen Mode"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

