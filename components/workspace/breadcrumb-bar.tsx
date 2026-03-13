"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronRight,
  File,
  Folder,
  Home,
} from "lucide-react"

interface BreadcrumbItem {
  label: string
  path?: string
  type: 'file' | 'folder' | 'root'
  children?: BreadcrumbItem[]
}

interface BreadcrumbBarProps {
  items: BreadcrumbItem[]
  onItemClick?: (item: BreadcrumbItem) => void
  className?: string
}

export function BreadcrumbBar({ items, onItemClick, className }: BreadcrumbBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const getIcon = (type: BreadcrumbItem['type']) => {
    switch (type) {
      case 'root':
        return <Home className="w-3.5 h-3.5" />
      case 'folder':
        return <Folder className="w-3.5 h-3.5" />
      case 'file':
        return <File className="w-3.5 h-3.5" />
      default:
        return <File className="w-3.5 h-3.5" />
    }
  }

  const handleItemClick = (item: BreadcrumbItem, index: number) => {
    onItemClick?.(item)
  }

  return (
    <div className={cn("flex items-center h-6 px-3 bg-[var(--ide-breadcrumb-light-bg)] dark:bg-[var(--ide-breadcrumb-bg)] border-b border-[var(--ide-breadcrumb-light-border)] dark:border-[var(--ide-breadcrumb-border)] text-xs", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const hasChildren = item.children && item.children.length > 0

        return (
          <div key={`${item.path || item.label}-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-3 h-3 mx-1 text-[var(--ide-breadcrumb-light-text)] dark:text-[var(--ide-breadcrumb-text)]" />
            )}

            {hasChildren ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-5 px-1.5 text-xs font-normal hover:bg-[var(--ide-breadcrumb-light-hover)] dark:hover:bg-[var(--ide-breadcrumb-hover)] flex items-center gap-1",
                      isLast && "font-medium",
                      hoveredIndex === index && "bg-[var(--ide-breadcrumb-light-hover)] dark:bg-[var(--ide-breadcrumb-hover)]"
                    )}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {getIcon(item.type)}
                    <span className="truncate max-w-[120px]">{item.label}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[200px] bg-[var(--ide-breadcrumb-light-bg)] dark:bg-[var(--ide-breadcrumb-bg)] border-[var(--ide-breadcrumb-light-border)] dark:border-[var(--ide-breadcrumb-border)]">
                  {item.children?.map((child) => (
                    <DropdownMenuItem
                      key={child.path || child.label}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--ide-breadcrumb-light-hover)] dark:hover:bg-[var(--ide-breadcrumb-hover)] cursor-pointer"
                      onClick={() => handleItemClick(child, index)}
                    >
                      {getIcon(child.type)}
                      <span>{child.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                className={cn(
                  "h-5 px-1.5 text-xs font-normal hover:bg-[var(--ide-breadcrumb-light-hover)] dark:hover:bg-[var(--ide-breadcrumb-hover)] flex items-center gap-1",
                  isLast && "font-medium",
                  hoveredIndex === index && "bg-[var(--ide-breadcrumb-light-hover)] dark:bg-[var(--ide-breadcrumb-hover)]"
                )}
                onClick={() => handleItemClick(item, index)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {getIcon(item.type)}
                <span className="truncate max-w-[120px]">{item.label}</span>
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Utility function to create breadcrumb items from a file path
export function createBreadcrumbItems(filePath: string, workspaceRoot?: string): BreadcrumbItem[] {
  if (!filePath) return []

  // Remove workspace root if provided
  const relativePath = workspaceRoot && filePath.startsWith(workspaceRoot)
    ? filePath.slice(workspaceRoot.length).replace(/^\/+/, '')
    : filePath

  const parts = relativePath.split('/').filter(Boolean)

  const items: BreadcrumbItem[] = []

  // Add root/workspace item
  items.push({
    label: workspaceRoot ? 'workspace' : 'root',
    path: workspaceRoot || '/',
    type: 'root',
  })

  // Add intermediate folders
  let currentPath = workspaceRoot || '/'
  for (let i = 0; i < parts.length - 1; i++) {
    currentPath += (currentPath.endsWith('/') ? '' : '/') + parts[i]
    items.push({
      label: parts[i],
      path: currentPath,
      type: 'folder',
    })
  }

  // Add file
  if (parts.length > 0) {
    const fileName = parts[parts.length - 1]
    const filePath = currentPath + (currentPath.endsWith('/') ? '' : '/') + fileName
    items.push({
      label: fileName,
      path: filePath,
      type: 'file',
    })
  }

  return items
}