'use client'

import React, { useCallback, useMemo } from 'react'
import { useRoomEvents } from '@/lib/hooks/use-room-events'
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow'
import { MiniMap } from '@reactflow/minimap'
import { Controls } from '@reactflow/controls'
import { Background } from '@reactflow/background'
import 'reactflow/dist/style.css'
import yaml from 'js-yaml'

/* ─── Build graph nodes/edges from parsed spec ─── */
function buildGraphFromSpec(content: string): { nodes: Node[]; edges: Edge[] } {
  let spec: any
  try {
    spec = yaml.load(content) as any
  } catch {
    return {
      nodes: [{ id: 'error', position: { x: 200, y: 100 }, data: { label: '⚠ Invalid YAML — cannot visualize' }, style: { background: '#7f1d1d', color: '#fca5a5', border: '1px solid #991b1b', borderRadius: 8, padding: 12 } }],
      edges: [],
    }
  }
  if (!spec || typeof spec !== 'object') {
    return {
      nodes: [{ id: 'empty', position: { x: 200, y: 100 }, data: { label: 'Empty spec — edit the YAML to see a graph' }, style: { background: '#1c1917', color: '#a1a1aa', border: '1px solid #3f3f46', borderRadius: 8, padding: 12 } }],
      edges: [],
    }
  }

  const nodes: Node[] = []
  const edges: Edge[] = []
  const nodeStyle = { background: '#18181b', color: '#e4e4e7', border: '1px solid #3f3f46', borderRadius: 8, padding: 8, fontSize: 12 }
  const highlightStyle = { ...nodeStyle, border: '1px solid #a855f7', background: '#1e1b4b' }
  const colW = 260
  const rowH = 70
  let y = 0

  // Root node
  const rootLabel = spec.name || spec.title || spec.id || 'Spec'
  nodes.push({ id: 'root', position: { x: colW, y: 0 }, data: { label: `📋 ${rootLabel} (${spec.type || 'spec'})` }, style: highlightStyle })
  y += rowH

  // Requirements
  if (Array.isArray(spec.requirements)) {
    const reqGroupId = 'grp-req'
    nodes.push({ id: reqGroupId, position: { x: 0, y }, data: { label: '📌 Requirements' }, style: { ...nodeStyle, background: '#172554', border: '1px solid #1d4ed8' } })
    edges.push({ id: 'e-root-req', source: 'root', target: reqGroupId, animated: true })
    y += rowH
    spec.requirements.forEach((r: string, i: number) => {
      const nid = `req-${i}`
      nodes.push({ id: nid, position: { x: 0, y }, data: { label: r }, style: nodeStyle })
      edges.push({ id: `e-req-${i}`, source: reqGroupId, target: nid })
      y += rowH * 0.7
    })
    y += rowH * 0.3
  }

  // Props (component specs)
  if (Array.isArray(spec.props)) {
    const grpId = 'grp-props'
    nodes.push({ id: grpId, position: { x: colW, y }, data: { label: '⚙ Props' }, style: { ...nodeStyle, background: '#0c4a6e', border: '1px solid #0284c7' } })
    edges.push({ id: 'e-root-props', source: 'root', target: grpId, animated: true })
    y += rowH
    spec.props.forEach((p: any, i: number) => {
      const nid = `prop-${i}`
      const label = `${p.name}: ${p.type}${p.required ? ' (required)' : ''}`
      nodes.push({ id: nid, position: { x: colW, y }, data: { label }, style: nodeStyle })
      edges.push({ id: `e-prop-${i}`, source: grpId, target: nid })
      y += rowH * 0.7
    })
    y += rowH * 0.3
  }

  // Endpoints (API specs)
  if (Array.isArray(spec.endpoints)) {
    const grpId = 'grp-ep'
    nodes.push({ id: grpId, position: { x: colW * 2, y }, data: { label: '🌐 Endpoints' }, style: { ...nodeStyle, background: '#14532d', border: '1px solid #16a34a' } })
    edges.push({ id: 'e-root-ep', source: 'root', target: grpId, animated: true })
    y += rowH
    spec.endpoints.forEach((ep: any, i: number) => {
      const nid = `ep-${i}`
      const label = `${ep.method || 'GET'} ${ep.path || ep.url || ''}`
      nodes.push({ id: nid, position: { x: colW * 2, y }, data: { label }, style: nodeStyle })
      edges.push({ id: `e-ep-${i}`, source: grpId, target: nid })
      y += rowH * 0.7
    })
    y += rowH * 0.3
  }

  // Tables (DB specs)
  if (Array.isArray(spec.tables)) {
    const grpId = 'grp-tbl'
    nodes.push({ id: grpId, position: { x: 0, y }, data: { label: '🗄 Tables' }, style: { ...nodeStyle, background: '#431407', border: '1px solid #ea580c' } })
    edges.push({ id: 'e-root-tbl', source: 'root', target: grpId, animated: true })
    y += rowH
    spec.tables.forEach((tbl: any, i: number) => {
      const nid = `tbl-${i}`
      const colNames = Array.isArray(tbl.columns) ? tbl.columns.map((c: any) => c.name).join(', ') : ''
      nodes.push({ id: nid, position: { x: 0, y }, data: { label: `${tbl.name} [${colNames}]` }, style: nodeStyle })
      edges.push({ id: `e-tbl-${i}`, source: grpId, target: nid })
      y += rowH * 0.7
    })
    y += rowH * 0.3
  }

  // Steps / workflow
  if (Array.isArray(spec.steps)) {
    const startId = 'wf-start'
    nodes.push({ id: startId, position: { x: colW, y }, data: { label: '▶ Start' }, style: { ...nodeStyle, background: '#422006', border: '1px solid #d97706' } })
    edges.push({ id: 'e-root-wf', source: 'root', target: startId, animated: true })
    y += rowH
    let prevId = startId
    spec.steps.forEach((step: any, i: number) => {
      const nid = `step-${i}`
      nodes.push({ id: nid, position: { x: colW, y }, data: { label: `${i + 1}. ${step.name || step.title || step}` }, style: nodeStyle })
      edges.push({ id: `e-step-${i}`, source: prevId, target: nid, animated: true })
      prevId = nid
      y += rowH
    })
    const endId = 'wf-end'
    nodes.push({ id: endId, position: { x: colW, y }, data: { label: '⏹ End' }, style: { ...nodeStyle, background: '#422006', border: '1px solid #d97706' } })
    edges.push({ id: 'e-wf-end', source: prevId, target: endId, animated: true })
  }

  if (nodes.length === 1) {
    // Only the root node — add generic children from top-level keys
    const ignoreKeys = new Set(['id', 'type', 'name', 'title', 'version', 'description'])
    let cx = 0
    Object.keys(spec).filter(k => !ignoreKeys.has(k)).forEach((key, i) => {
      const nid = `key-${i}`
      const val = spec[key]
      const preview = typeof val === 'string' ? val.slice(0, 40) : Array.isArray(val) ? `[${val.length} items]` : typeof val
      nodes.push({ id: nid, position: { x: cx, y: rowH }, data: { label: `${key}: ${preview}` }, style: nodeStyle })
      edges.push({ id: `e-key-${i}`, source: 'root', target: nid })
      cx += colW
    })
  }

  return { nodes, edges }
}

interface VisualBuilderProps {
  content?: string
}

export function VisualBuilder({ content = '' }: VisualBuilderProps) {
  const { emit, ROOM_EVENTS } = useRoomEvents('visual-builder')
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildGraphFromSpec(content), [content])
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Re-sync when content changes
  React.useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildGraphFromSpec(content)
    setNodes(newNodes)
    setEdges(newEdges)
  }, [content, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Controls className="bg-muted border-border fill-zinc-300" />
        <MiniMap className="bg-muted" maskColor="rgba(255, 255, 255, 0.1)" />
        <Background color="#3f3f46" gap={16} />
      </ReactFlow>
    </div>
  )
}
