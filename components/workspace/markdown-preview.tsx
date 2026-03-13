"use client"

import { useState, useEffect, useMemo } from "react"
import { Eye, Code, Image as ImageIcon, FileText, Columns } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarkdownPreviewProps {
  content: string
  filePath: string
  className?: string
}

/**
 * Markdown & Image Preview Panel
 * Renders markdown with syntax highlighting preview, or shows images inline.
 */
export function MarkdownPreview({ content, filePath, className }: MarkdownPreviewProps) {
  const [mode, setMode] = useState<'preview' | 'source' | 'split'>('preview')

  const isImage = useMemo(() => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'].includes(ext || '')
  }, [filePath])

  const isMarkdown = useMemo(() => {
    const ext = filePath.split('.').pop()?.toLowerCase()
    return ['md', 'mdx', 'markdown'].includes(ext || '')
  }, [filePath])

  // Simple markdown to HTML converter (no external dependency)
  const renderedHtml = useMemo(() => {
    if (!isMarkdown) return ''
    let html = content
      // Headings
      .replace(/^######\s(.+)$/gm, '<h6 class="text-xs font-bold mt-3 mb-1 text-foreground">$1</h6>')
      .replace(/^#####\s(.+)$/gm, '<h5 class="text-sm font-bold mt-3 mb-1 text-foreground">$1</h5>')
      .replace(/^####\s(.+)$/gm, '<h4 class="text-base font-bold mt-4 mb-1 text-foreground">$1</h4>')
      .replace(/^###\s(.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2 text-foreground">$1</h3>')
      .replace(/^##\s(.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2 text-foreground border-b border-border pb-1">$1</h2>')
      .replace(/^#\s(.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-foreground border-b border-border pb-1">$1</h1>')
      // Bold / Italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono text-primary">$1</code>')
      // Code blocks
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted/50 border border-border rounded-md p-3 my-2 overflow-x-auto"><code class="text-sm font-mono">$2</code></pre>')
      // Blockquotes
      .replace(/^>\s(.+)$/gm, '<blockquote class="border-l-4 border-primary/40 pl-3 my-2 text-muted-foreground italic">$1</blockquote>')
      // Horizontal rules
      .replace(/^---$/gm, '<hr class="border-border my-4" />')
      // Unordered lists
      .replace(/^[-*]\s(.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      // Ordered lists
      .replace(/^\d+\.\s(.+)$/gm, '<li class="ml-4 list-decimal text-sm">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline hover:text-primary/80" target="_blank">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full rounded-md my-2" />')
      // Line breaks  
      .replace(/\n\n/g, '</p><p class="text-sm leading-relaxed my-1">')
      .replace(/\n/g, '<br />')
    
    return `<div class="prose prose-invert max-w-none"><p class="text-sm leading-relaxed my-1">${html}</p></div>`
  }, [content, isMarkdown])

  if (isImage) {
    // Try to render as data URL for virtual FS images, or file path
    const isDataUrl = content.startsWith('data:')
    const isSvg = filePath.endsWith('.svg')
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-editor-background p-8", className)}>
        <div className="mb-4 flex items-center gap-2 text-muted-foreground text-sm">
          <ImageIcon className="w-4 h-4" />
          <span>{filePath.split('/').pop()}</span>
        </div>
        {isSvg && !isDataUrl ? (
          <div className="max-w-[80%] max-h-[60vh]" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <img
            src={isDataUrl ? content : `/api/fs/content?path=${encodeURIComponent(filePath)}&raw=true`}
            alt={filePath}
            className="max-w-[80%] max-h-[60vh] object-contain rounded-md border border-border shadow-lg"
          />
        )}
      </div>
    )
  }

  if (!isMarkdown) return null

  return (
    <div className={cn("flex flex-col h-full bg-editor-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/30">
        <button
          className={cn("p-1.5 rounded text-xs flex items-center gap-1", mode === 'preview' && "bg-primary/20 text-primary")}
          onClick={() => setMode('preview')}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          className={cn("p-1.5 rounded text-xs flex items-center gap-1", mode === 'source' && "bg-primary/20 text-primary")}
          onClick={() => setMode('source')}
        >
          <Code className="w-3.5 h-3.5" />
          Source
        </button>
        <button
          className={cn("p-1.5 rounded text-xs flex items-center gap-1", mode === 'split' && "bg-primary/20 text-primary")}
          onClick={() => setMode('split')}
        >
          <Columns className="w-3.5 h-3.5" />
          Split
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {(mode === 'source' || mode === 'split') && (
          <div className={cn("overflow-auto p-4 font-mono text-sm whitespace-pre-wrap", mode === 'split' ? "w-1/2 border-r border-border" : "w-full")}>
            {content}
          </div>
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div
            className={cn("overflow-auto p-4", mode === 'split' ? "w-1/2" : "w-full")}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </div>
  )
}
