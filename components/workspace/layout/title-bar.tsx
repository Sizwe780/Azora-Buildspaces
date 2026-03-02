"use client"

import { useState } from "react"
import {
  Code2,
  Minus,
  Square,
  X,
  ChevronDown,
  PanelLeft,
  Search,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  LayoutGrid,
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
} from "@/components/ui/dropdown-menu"
import { useWorkbench } from "@/lib/stores/workbench-store"

interface TitleBarProps {
  onOpenCommandPalette?: () => void
  projectName?: string
}

const menus = [
  {
    label: "File",
    items: [
      { label: "New File", shortcut: "Ctrl+N" },
      { label: "New Window", shortcut: "Ctrl+Shift+N" },
      { type: "separator" as const },
      { label: "Open File...", shortcut: "Ctrl+O" },
      { label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O" },
      { label: "Open Recent", hasSubmenu: true },
      { type: "separator" as const },
      { label: "Save", shortcut: "Ctrl+S" },
      { label: "Save As...", shortcut: "Ctrl+Shift+S" },
      { label: "Save All", shortcut: "Ctrl+K S" },
      { type: "separator" as const },
      { label: "Auto Save" },
      { label: "Preferences", hasSubmenu: true },
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
    label: "View",
    items: [
      { label: "Command Palette...", shortcut: "Ctrl+Shift+P" },
      { label: "Open View...", shortcut: "Ctrl+Q" },
      { type: "separator" as const },
      { label: "Explorer", shortcut: "Ctrl+Shift+E" },
      { label: "Search", shortcut: "Ctrl+Shift+F" },
      { label: "Source Control", shortcut: "Ctrl+Shift+G" },
      { label: "Extensions", shortcut: "Ctrl+Shift+X" },
      { type: "separator" as const },
      { label: "Terminal", shortcut: "Ctrl+`" },
      { label: "Problems", shortcut: "Ctrl+Shift+M" },
      { label: "Output", shortcut: "Ctrl+Shift+U" },
      { label: "Debug Console", shortcut: "Ctrl+Shift+Y" },
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
      { label: "Go to Type Definition" },
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
      { label: "New Breakpoint", hasSubmenu: true },
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
      { label: "Run Active File" },
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

export function TitleBar({ onOpenCommandPalette, projectName }: TitleBarProps) {
  const { toggleSidebar, togglePanel } = useWorkbench()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  return (
    <div className="h-[30px] flex items-center bg-background/90 backdrop-blur-sm border-b border-border/40 select-none shrink-0">
      {/* Menu Bar */}
      <div className="flex items-center h-full">
        {menus.map((menu) => (
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
                onMouseEnter={() => {
                  if (activeMenu) setActiveMenu(menu.label)
                }}
              >
                {menu.label}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={0}
              className="min-w-[220px] bg-popover/98 backdrop-blur-md border-border/60 shadow-xl rounded-lg"
            >
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
      <div className="flex items-center gap-0.5 pr-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
          onClick={toggleSidebar}
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 text-muted-foreground hover:text-foreground"
          onClick={togglePanel}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
