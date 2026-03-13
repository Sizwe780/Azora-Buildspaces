"use client";

import { useCallback, useMemo } from 'react';
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface LayerDef {
    id: string;
    label: string;
    type: 'input' | 'conv' | 'pool' | 'linear' | 'activation' | 'flatten' | 'output' | 'norm' | 'dropout' | 'attention';
}

interface ModelVisualizerProps {
    layers?: LayerDef[];
}

const LAYER_COLORS: Record<string, string> = {
    input: '#3b82f6',
    conv: '#8b5cf6',
    pool: '#ec4899',
    linear: '#10b981',
    activation: '#f59e0b',
    flatten: '#f59e0b',
    output: '#3b82f6',
    norm: '#06b6d4',
    dropout: '#6b7280',
    attention: '#dc2626',
};

const defaultLayers: LayerDef[] = [
    { id: 'input', label: 'Input Layer (28x28)', type: 'input' },
    { id: 'conv1', label: 'Conv2d (32, 3x3)', type: 'conv' },
    { id: 'pool1', label: 'MaxPool2d (2x2)', type: 'pool' },
    { id: 'conv2', label: 'Conv2d (64, 3x3)', type: 'conv' },
    { id: 'pool2', label: 'MaxPool2d (2x2)', type: 'pool' },
    { id: 'flatten', label: 'Flatten', type: 'flatten' },
    { id: 'fc1', label: 'Linear (128)', type: 'linear' },
    { id: 'output', label: 'Output (10)', type: 'output' },
];

function buildModelGraph(layers: LayerDef[]) {
    const nodes: Node[] = layers.map((layer, i) => ({
        id: layer.id,
        position: { x: 250, y: i * 100 },
        data: { label: layer.label },
        style: {
            background: LAYER_COLORS[layer.type] || LAYER_COLORS.linear,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '12px',
        },
    }));

    const edges: Edge[] = layers.slice(1).map((layer, i) => ({
        id: `e-${layers[i].id}-${layer.id}`,
        source: layers[i].id,
        target: layer.id,
        animated: true,
    }));

    return { nodes, edges };
}

export default function ModelVisualizer({ layers }: ModelVisualizerProps) {
    const graph = useMemo(() => buildModelGraph(layers || defaultLayers), [layers]);
    const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
        [setEdges],
    );

    return (
        <div className="h-full w-full bg-slate-50 dark:bg-slate-950">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                attributionPosition="bottom-right"
            >
                <Controls />
                <Background variant={BackgroundVariant.Lines} gap={20} size={1} />
            </ReactFlow>
        </div>
    );
}
