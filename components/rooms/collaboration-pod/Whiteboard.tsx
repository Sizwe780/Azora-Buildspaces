"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pen, Eraser, Square, Circle, Type, Undo, Redo, Download, Upload, Users, Palette, Minus, Plus } from "lucide-react";
import * as Y from "yjs";
// Dynamic import for browser-only module
const getWebsocketProvider = () => import("y-websocket").then(m => m.WebsocketProvider);

interface WhiteboardProps {
    ydoc: Y.Doc;
    provider: any;
}

interface Path {
    id: string;
    points: { x: number; y: number }[];
    color: string;
    size: number;
    tool: string;
}

export default function Whiteboard({ ydoc, provider }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<'pen' | 'eraser' | 'rectangle' | 'circle' | 'text'>('pen');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState([5]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [undoStack, setUndoStack] = useState<Path[][]>([]);
    const [redoStack, setRedoStack] = useState<Path[][]>([]);

    const sharedPaths = ydoc.getArray<Path>("whiteboard-paths");

    // Snapshot for undo
    const takeSnapshot = () => {
        setUndoStack(prev => [...prev.slice(-30), sharedPaths.toArray()]);
        setRedoStack([]);
    };

    const undo = () => {
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        setRedoStack(r => [...r, sharedPaths.toArray()]);
        setUndoStack(u => u.slice(0, -1));
        sharedPaths.delete(0, sharedPaths.length);
        if (prev.length > 0) sharedPaths.push(prev);
    };

    const redo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setUndoStack(u => [...u, sharedPaths.toArray()]);
        setRedoStack(r => r.slice(0, -1));
        sharedPaths.delete(0, sharedPaths.length);
        if (next.length > 0) sharedPaths.push(next);
    };

    const downloadCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            sharedPaths.forEach((path) => {
                if (path.points.length < 2) return;
                ctx.strokeStyle = path.tool === 'eraser' ? '#ffffff' : path.color;
                ctx.lineWidth = path.size;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";

                const start = path.points[0];
                const end = path.points[path.points.length - 1];

                if (path.tool === 'rectangle') {
                    ctx.beginPath();
                    const w = end.x - start.x;
                    const h = end.y - start.y;
                    ctx.strokeRect(start.x, start.y, w, h);
                } else if (path.tool === 'circle') {
                    ctx.beginPath();
                    const rx = Math.abs(end.x - start.x) / 2;
                    const ry = Math.abs(end.y - start.y) / 2;
                    const cx = (start.x + end.x) / 2;
                    const cy = (start.y + end.y) / 2;
                    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (path.tool === 'text') {
                    ctx.font = `${Math.max(path.size * 3, 14)}px sans-serif`;
                    ctx.fillStyle = path.color;
                    ctx.fillText('Text', start.x, start.y);
                } else {
                    // pen / eraser — freehand polyline
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    for (let i = 1; i < path.points.length; i++) {
                        ctx.lineTo(path.points[i].x, path.points[i].y);
                    }
                    ctx.stroke();
                }
            });
        };

        sharedPaths.observe(render);
        render();

        // Awareness for cursors
        provider.awareness.on("change", () => {
            const states = Array.from(provider.awareness.getStates().entries()) as [number, any][];
            setCollaborators(states.map(([id, state]) => ({
                id,
                name: state.user?.name || "Anonymous",
                color: state.user?.color || "#3b82f6",
                cursor: state.cursor
            })).filter(c => c.cursor));
        });

        return () => {
            sharedPaths.unobserve(render);
        };
    }, [ydoc, provider]);

    const startDrawing = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        takeSnapshot(); // Snapshot for undo before drawing
        setIsDrawing(true);
        const newPath: Path = {
            id: Math.random().toString(36).substr(2, 9),
            points: [{ x, y }],
            color,
            size: brushSize[0],
            tool
        };
        sharedPaths.push([newPath]);
    };

    const draw = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update cursor position in awareness
        provider.awareness.setLocalStateField("cursor", { x, y });

        if (!isDrawing) return;

        const lastPath = sharedPaths.get(sharedPaths.length - 1);
        if (!lastPath) return;

        if (tool === 'rectangle' || tool === 'circle') {
            // For shapes, keep only start + current endpoint (live preview)
            const start = lastPath.points[0];
            const updated = { ...lastPath, points: [start, { x, y }] };
            sharedPaths.delete(sharedPaths.length - 1);
            sharedPaths.push([updated]);
        } else {
            // pen / eraser — accumulate points
            lastPath.points.push({ x, y });
            sharedPaths.delete(sharedPaths.length - 1);
            sharedPaths.push([lastPath]);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);

    const tools = [
        { id: 'pen', icon: Pen, label: 'Pen' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'rectangle', icon: Square, label: 'Rectangle' },
        { id: 'circle', icon: Circle, label: 'Circle' },
        { id: 'text', icon: Type, label: 'Text' },
    ];

    const colors = [
        '#000000', '#ffffff', '#ef4444', '#10b981', '#3b82f6',
        '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#374151'
    ];

    return (
        <div className="h-full flex flex-col bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-white">Team Whiteboard</h3>
                    <Badge variant="secondary" className="bg-blue-600">{collaborators.length} Active</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {collaborators.map((user) => (
                            <Avatar key={user.id} className="w-8 h-8 border-2 border-slate-800">
                                <AvatarFallback className="text-xs" style={{ backgroundColor: user.color }}>
                                    {user.name[0]}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                    <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        Invite
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-4 p-4 border-b border-white/10 bg-slate-800/50">
                {/* Tools */}
                <div className="flex gap-1">
                    {tools.map((t) => (
                        <Button
                            key={t.id}
                            variant={tool === t.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setTool(t.id as any)}
                            className="w-10 h-10 p-0"
                        >
                            <t.icon className="w-4 h-4" />
                        </Button>
                    ))}
                </div>

                {/* Colors */}
                <div className="flex gap-1">
                    {colors.map((c) => (
                        <button
                            key={c}
                            className={`w-8 h-8 rounded border-2 ${color === c ? 'border-white' : 'border-slate-600'}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                </div>

                {/* Brush Size */}
                <div className="flex items-center gap-2 min-w-32">
                    <Minus className="w-4 h-4 text-slate-400" />
                    <Slider
                        value={brushSize}
                        onValueChange={setBrushSize}
                        max={50}
                        min={1}
                        step={1}
                        className="flex-1"
                    />
                    <Plus className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-400 w-8">{brushSize[0]}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-1 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => { takeSnapshot(); sharedPaths.delete(0, sharedPaths.length); }}>
                        Clear
                    </Button>
                    <Button variant="outline" size="sm" onClick={undo} disabled={undoStack.length === 0} title="Undo">
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={redo} disabled={redoStack.length === 0} title="Redo">
                        <Redo className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCanvas} title="Download as PNG">
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-white overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="w-full h-full cursor-crosshair"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                />

                {/* Collaborator Cursors */}
                {collaborators.map((user) => (
                    <div
                        key={user.id}
                        className="absolute pointer-events-none z-10"
                        style={{
                            left: user.cursor.x,
                            top: user.cursor.y,
                            transform: 'translate(-2px, -2px)'
                        }}
                    >
                        <div
                            className="w-4 h-4 border-2 border-white rounded-full shadow-lg"
                            style={{ backgroundColor: user.color }}
                        />
                        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                            {user.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}