"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"

interface VirtualItem {
  index: number
  start: number
  size: number
}

interface UseVirtualListOptions {
  itemCount: number
  itemHeight: number
  overscan?: number
}

/**
 * Lightweight virtual list hook for rendering 10k+ items efficiently.
 * Uses fixed-height rows and viewport-aware rendering.
 * No external dependencies required.
 */
export function useVirtualList({ itemCount, itemHeight, overscan = 5 }: UseVirtualListOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(container)
    setContainerHeight(container.clientHeight)

    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (container) {
      setScrollTop(container.scrollTop)
    }
  }, [])

  const totalHeight = itemCount * itemHeight

  const virtualItems = useMemo<VirtualItem[]>(() => {
    if (containerHeight === 0) return []

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const items: VirtualItem[] = []
    for (let i = startIndex; i <= endIndex; i++) {
      items.push({
        index: i,
        start: i * itemHeight,
        size: itemHeight,
      })
    }
    return items
  }, [scrollTop, containerHeight, itemCount, itemHeight, overscan])

  return {
    containerRef,
    handleScroll,
    totalHeight,
    virtualItems,
    containerHeight,
  }
}
