"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
    Controls,
    MiniMap,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    ReactFlowInstance,
    Panel,
} from 'reactflow';
import { NodeResizer } from '@reactflow/node-resizer';
import '@reactflow/node-resizer/dist/style.css';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, Undo2, Redo2, Copy, Trash2, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type FrameNodeData = {
    label: string
    width: number
    height: number
    content: React.ReactNode
    componentType?: string
}

/* ─── Component preview renderers ─── */
function componentPreview(type: string, name: string) {
    switch (type) {
        case 'button': return <div className="h-10 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-medium px-4">Button</div>;
        case 'input': return <div className="h-10 bg-white border border-slate-300 rounded px-3 flex items-center text-xs text-slate-400">Input field...</div>;
        case 'textarea': return <div className="h-24 bg-white border border-slate-300 rounded p-2 text-xs text-slate-400">Textarea...</div>;
        case 'text': return <div className="text-sm text-slate-700">Sample text block</div>;
        case 'heading': return <div className="text-lg font-bold text-slate-900">Heading</div>;
        case 'image': return <div className="h-32 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-300">Image Placeholder</div>;
        case 'card': return <div className="bg-white border rounded-lg p-3 shadow-sm space-y-2"><div className="h-4 bg-slate-200 rounded w-3/4" /><div className="h-3 bg-slate-100 rounded w-full" /><div className="h-3 bg-slate-100 rounded w-2/3" /></div>;
        case 'container': return <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 min-h-[80px] flex items-center justify-center text-xs text-slate-400">Container</div>;
        case 'grid': return <div className="grid grid-cols-2 gap-2"><div className="h-16 bg-slate-100 rounded" /><div className="h-16 bg-slate-100 rounded" /><div className="h-16 bg-slate-100 rounded" /><div className="h-16 bg-slate-100 rounded" /></div>;
        case 'stack': return <div className="space-y-2"><div className="h-8 bg-slate-100 rounded" /><div className="h-8 bg-slate-100 rounded" /><div className="h-8 bg-slate-100 rounded" /></div>;
        case 'checkbox': return <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-slate-400 rounded" /><span className="text-xs text-slate-600">Checkbox label</span></div>;
        case 'select': return <div className="h-10 bg-white border border-slate-300 rounded px-3 flex items-center justify-between text-xs text-slate-400"><span>Select option...</span><span>▼</span></div>;
        case 'toggle': return <div className="w-12 h-6 bg-blue-500 rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" /></div>;
        case 'slider': return <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-slate-200 rounded-full relative"><div className="w-1/2 h-full bg-blue-500 rounded-full" /><div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/4 w-4 h-4 bg-white border-2 border-blue-500 rounded-full" /></div></div>;
        case 'table': return <div className="border rounded text-xs"><div className="grid grid-cols-3 gap-px bg-slate-200"><div className="bg-slate-100 p-1 font-medium">Col 1</div><div className="bg-slate-100 p-1 font-medium">Col 2</div><div className="bg-slate-100 p-1 font-medium">Col 3</div><div className="bg-white p-1">data</div><div className="bg-white p-1">data</div><div className="bg-white p-1">data</div></div></div>;
        case 'list': return <div className="space-y-1">{[1,2,3].map(i => <div key={i} className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /><div className="h-3 bg-slate-100 rounded flex-1" /></div>)}</div>;
        case 'divider': return <div className="border-t border-slate-300 w-full" />;
        case 'sidebar': return <div className="flex h-full"><div className="w-1/3 bg-slate-100 border-r p-2 space-y-2"><div className="h-3 bg-slate-200 rounded" /><div className="h-3 bg-slate-200 rounded" /><div className="h-3 bg-slate-300 rounded" /></div><div className="flex-1 p-2"><div className="h-3 bg-slate-100 rounded mb-2" /><div className="h-12 bg-slate-50 rounded" /></div></div>;
        default: return <div className="h-12 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-500">{name}</div>;
    }
}

const FrameNode = ({ data, selected }: { data: FrameNodeData; selected: boolean }) => {
    return (
        <div className={`bg-white dark:bg-slate-900 border-2 ${selected ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-lg shadow-sm min-w-[200px] min-h-[100px] relative group transition-shadow`}>
            <NodeResizer minWidth={100} minHeight={50} isVisible={selected} />
            <div className="px-3 py-1 border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-t-lg flex justify-between">
                <span>{data.label}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{data.width}x{data.height}</span>
            </div>
            <div className="p-4">
                {data.content}
            </div>
        </div>
    );
};

const nodeTypes = {
    frame: FrameNode,
};

const STORAGE_KEY = 'azora-canvas-state';

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'frame',
        position: { x: 100, y: 100 },
        data: { label: 'Login Screen', width: 375, height: 667, content: <div className="space-y-2"><div className="h-8 bg-slate-100 rounded" /><div className="h-8 bg-slate-100 rounded" /><div className="h-10 bg-blue-500 rounded mt-4" /></div> },
        style: { width: 300, height: 500 }
    },
    {
        id: '2',
        type: 'frame',
        position: { x: 500, y: 100 },
        data: { label: 'Dashboard', width: 1024, height: 768, content: <div className="grid grid-cols-2 gap-2"><div className="h-20 bg-slate-100 rounded" /><div className="h-20 bg-slate-100 rounded" /><div className="col-span-2 h-40 bg-slate-100 rounded" /></div> },
        style: { width: 400, height: 300 }
    },
];

export default function InfiniteCanvas({ extraNodes = [] }: { extraNodes?: Node[] }) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [undoStack, setUndoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const [redoStack, setRedoStack] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const nodeIdCounter = useRef(100);

    // Load saved canvas state
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const { nodes: savedNodes, edges: savedEdges } = JSON.parse(saved);
                if (savedNodes?.length > 0) {
                    // Restore nodes — re-create content from componentType
                    const restored = savedNodes.map((n: any) => ({
                        ...n,
                        data: {
                            ...n.data,
                            content: n.data.componentType
                                ? componentPreview(n.data.componentType, n.data.label)
                                : n.data.content,
                        },
                    }));
                    setNodes(restored);
                    setEdges(savedEdges || []);
                }
            }
        } catch { /* ignore corrupt state */ }
    }, []);

    // Sync extra nodes
    useEffect(() => {
        if (extraNodes.length > 0) {
            setNodes((nds: Node[]) => {
                const newNodes = extraNodes.filter(en => !nds.find((n: Node) => n.id === en.id));
                return [...nds, ...newNodes];
            });
        }
    }, [extraNodes, setNodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
        [setEdges],
    );

    // Snapshot for undo
    const snapshot = useCallback(() => {
        setUndoStack(prev => [...prev.slice(-30), { nodes: [...nodes], edges: [...edges] }]);
        setRedoStack([]);
    }, [nodes, edges]);

    const undo = useCallback(() => {
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        setRedoStack(r => [...r, { nodes: [...nodes], edges: [...edges] }]);
        setUndoStack(u => u.slice(0, -1));
        setNodes(prev.nodes);
        setEdges(prev.edges);
    }, [undoStack, nodes, edges, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(u => [...u, { nodes: [...nodes], edges: [...edges] }]);
        setRedoStack(r => r.slice(0, -1));
        setNodes(next.nodes);
        setEdges(next.edges);
    }, [redoStack, nodes, edges, setNodes, setEdges]);

    // Save canvas state
    const saveCanvas = useCallback(() => {
        const serializable = nodes.map(n => ({
            ...n,
            data: {
                label: n.data.label,
                width: n.data.width,
                height: n.data.height,
                componentType: n.data.componentType || '',
            },
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: serializable, edges }));
        window.dispatchEvent(new CustomEvent('design:canvas-saved', { detail: { nodeCount: nodes.length, edgeCount: edges.length } }));
    }, [nodes, edges]);

    // Auto-save every 10 seconds
    useEffect(() => {
        const interval = setInterval(saveCanvas, 10000);
        return () => clearInterval(interval);
    }, [saveCanvas]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCanvas(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [saveCanvas, undo, redo]);

    // Drop handler for ComponentLibrary drag-drop
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        const data = event.dataTransfer.getData('application/azora-component');
        if (!data || !rfInstance || !reactFlowWrapper.current) return;

        try {
            const comp = JSON.parse(data);
            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = rfInstance.project({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            snapshot();
            const id = `comp-${++nodeIdCounter.current}`;
            const newNode: Node = {
                id,
                type: 'frame',
                position,
                data: {
                    label: comp.name,
                    width: comp.defaultWidth,
                    height: comp.defaultHeight,
                    componentType: comp.type,
                    content: componentPreview(comp.type, comp.name),
                },
                style: { width: comp.defaultWidth, height: comp.defaultHeight },
            };

            setNodes((nds: Node[]) => [...nds, newNode]);
        } catch { /* ignore bad drop data */ }
    }, [rfInstance, setNodes, snapshot]);

    // Duplicate selected nodes
    const duplicateSelected = useCallback(() => {
        const selected = nodes.filter(n => n.selected);
        if (selected.length === 0) return;
        snapshot();
        const clones = selected.map(n => ({
            ...n,
            id: `clone-${++nodeIdCounter.current}`,
            position: { x: n.position.x + 40, y: n.position.y + 40 },
            selected: false,
            data: {
                ...n.data,
                content: n.data.componentType
                    ? componentPreview(n.data.componentType, n.data.label)
                    : n.data.content,
            },
        }));
        setNodes((nds: Node[]) => [...nds, ...clones]);
    }, [nodes, setNodes, snapshot]);

    // Delete selected nodes
    const deleteSelected = useCallback(() => {
        const selectedIds = new Set(nodes.filter(n => n.selected).map(n => n.id));
        if (selectedIds.size === 0) return;
        snapshot();
        setNodes((nds: Node[]) => nds.filter(n => !selectedIds.has(n.id)));
        setEdges((eds: Edge[]) => eds.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
    }, [nodes, setNodes, setEdges, snapshot]);

    return (
        <div className="h-full w-full bg-slate-50 dark:bg-slate-950" ref={reactFlowWrapper}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setRfInstance}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                fitView
                className="bg-slate-50 dark:bg-slate-950"
                deleteKeyCode="Delete"
                multiSelectionKeyCode="Shift"
            >
                <Controls />
                <MiniMap
                    nodeStrokeWidth={3}
                    className="bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
                />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

                {/* Toolbar panel */}
                <Panel position="top-right" className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 shadow-lg">
                    <Button variant="ghost" size="sm" onClick={undo} disabled={undoStack.length === 0} className="h-7 w-7 p-0" title="Undo (Ctrl+Z)">
                        <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={redo} disabled={redoStack.length === 0} className="h-7 w-7 p-0" title="Redo (Ctrl+Y)">
                        <Redo2 className="w-3.5 h-3.5" />
                    </Button>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button variant="ghost" size="sm" onClick={duplicateSelected} className="h-7 w-7 p-0" title="Duplicate Selected">
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={deleteSelected} className="h-7 w-7 p-0 text-red-500 hover:text-red-600" title="Delete Selected">
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button variant="ghost" size="sm" onClick={() => rfInstance?.zoomIn()} className="h-7 w-7 p-0" title="Zoom In">
                        <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => rfInstance?.zoomOut()} className="h-7 w-7 p-0" title="Zoom Out">
                        <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => rfInstance?.fitView()} className="h-7 w-7 p-0" title="Fit View">
                        <Maximize className="w-3.5 h-3.5" />
                    </Button>
                    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5" />
                    <Button variant="default" size="sm" onClick={saveCanvas} className="h-7 gap-1 px-2 text-xs" title="Save (Ctrl+S)">
                        <Save className="w-3 h-3" />
                        Save
                    </Button>
                    <Badge variant="secondary" className="text-[9px] h-5 px-1.5">{nodes.length} frames</Badge>
                </Panel>
            </ReactFlow>
        </div>
    );
}
