'use client'
// NOTE: Real-time cursor sync is handled via Y.js awareness protocol over WebSocket (/api/collab).
// MonacoBinding wires editor content + cursor/selection awareness automatically.
import { useEffect, useRef } from 'react'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import type * as Monaco from 'monaco-editor'

interface UseYjsMonacoOptions {
  ydoc: Y.Doc | null
  awareness: any | null
  editor: Monaco.editor.IStandaloneCodeEditor | null
  fileName: string
}

export function useYjsMonaco({ ydoc, awareness, editor, fileName }: UseYjsMonacoOptions) {
  const bindingRef = useRef<MonacoBinding | null>(null)

  useEffect(() => {
    if (!ydoc || !awareness || !editor) return

    // Get or create a Y.Text for this file
    const yText = ydoc.getText(fileName)

    // Create Monaco binding — syncs editor content + cursor/selection via awareness
    const binding = new MonacoBinding(
      yText,
      editor.getModel()!,
      new Set([editor]),
      awareness
    )
    bindingRef.current = binding

    return () => {
      binding.destroy()
      bindingRef.current = null
    }
  }, [ydoc, awareness, editor, fileName])

  return bindingRef
}
