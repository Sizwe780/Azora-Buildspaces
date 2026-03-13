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

interface AgentDef {
    id: string;
    name: string;
    role: string;
    color?: string;
}

interface AgentGraphProps {
    agents?: AgentDef[];
}

const ROLE_COLORS: Record<string, string> = {
    orchestrator: '#8b5cf6',
    code: '#3b82f6',
    backend: '#f59e0b',
    security: '#ef4444',
    knowledge: '#10b981',
    data: '#06b6d4',
    testing: '#ec4899',
    default: '#6b7280',
};

const defaultAgents: AgentDef[] = [
    { id: 'elara', name: 'Elara', role: 'orchestrator' },
    { id: 'sankofa', name: 'Sankofa', role: 'code' },
    { id: 'themba', name: 'Themba', role: 'backend' },
    { id: 'jabari', name: 'Jabari', role: 'security' },
    { id: 'knowledge', name: 'Knowledge Ocean', role: 'knowledge' },
];

function buildGraph(agents: AgentDef[]) {
    if (agents.length === 0) return { nodes: [], edges: [] };

    // First agent is orchestrator (center top), rest are arranged below
    const orchestrator = agents[0];
    const workers = agents.slice(1);
    const spacing = 200;
    const startX = Math.max(0, 250 - ((workers.length - 1) * spacing) / 2);

    const nodes: Node[] = [
        {
            id: orchestrator.id,
            position: { x: 250, y: 0 },
            data: { label: `${orchestrator.name} (${orchestrator.role})` },
            style: {
                background: orchestrator.color || ROLE_COLORS[orchestrator.role] || ROLE_COLORS.default,
                color: 'white', border: 'none', borderRadius: '8px', padding: '10px',
            },
        },
        ...workers.map((a, i) => ({
            id: a.id,
            position: { x: startX + i * spacing, y: 150 },
            data: { label: `${a.name} (${a.role})` },
            style: {
                background: a.color || ROLE_COLORS[a.role] || ROLE_COLORS.default,
                color: 'white', border: 'none', borderRadius: '8px', padding: '10px',
            },
        })),
    ];

    const edges: Edge[] = workers.map((a, i) => ({
        id: `e-${orchestrator.id}-${a.id}`,
        source: orchestrator.id,
        target: a.id,
        animated: true,
        label: 'delegate',
    }));

    return { nodes, edges };
}

export default function AgentGraph({ agents }: AgentGraphProps) {
    const graph = useMemo(() => buildGraph(agents || defaultAgents), [agents]);
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
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            </ReactFlow>
        </div>
    );
}
