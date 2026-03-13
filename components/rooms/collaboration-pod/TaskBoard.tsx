"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, MoreHorizontal, Calendar, MessageSquare, Paperclip,
    Users, CheckCircle, Clock, AlertCircle, X, Tag, BarChart3,
    ChevronDown, ChevronRight
} from "lucide-react";
import * as Y from "yjs";
// Dynamic import for browser-only module
const getWebsocketProvider = () => import("y-websocket").then(m => m.WebsocketProvider);

interface Task {
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    assignee: string;
    avatar: string;
    dueDate: string;
    comments: number;
    attachments: number;
    progress?: number;
    label?: string;
    status: "todo" | "in-progress" | "review" | "done";
}

interface TaskBoardProps {
    ydoc: Y.Doc;
    provider: any;
}

const COLUMNS: { id: Task["status"]; title: string; accent: string; dot: string }[] = [
    { id: "todo",        title: "To Do",       accent: "border-slate-500/30",  dot: "bg-slate-400" },
    { id: "in-progress", title: "In Progress", accent: "border-blue-500/30",   dot: "bg-blue-400" },
    { id: "review",      title: "Review",      accent: "border-amber-500/30",  dot: "bg-amber-400" },
    { id: "done",        title: "Done",        accent: "border-emerald-500/30",dot: "bg-emerald-400" },
];

const LABELS = ["Feature", "Bug", "Improvement", "Chore", "Design", "Docs"];
const PRIORITY_COLORS: Record<string, string> = {
    high: "text-red-400 bg-red-400/10 border-red-400/20",
    medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

export default function TaskBoard({ ydoc, provider }: TaskBoardProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [labelFilter, setLabelFilter] = useState<string | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [newComment, setNewComment] = useState("");
    const sharedComments = ydoc.getMap<string[]>("task-comments");
    const [comments, setComments] = useState<Record<string, string[]>>({});
    const sharedTasks = ydoc.getMap<Task>("tasks-map");

    // Sync comments from Yjs shared map
    useEffect(() => {
        const updateComments = () => {
            const c: Record<string, string[]> = {};
            sharedComments.forEach((val, key) => { c[key] = val; });
            setComments(c);
        };
        sharedComments.observe(updateComments);
        updateComments();
        return () => sharedComments.unobserve(updateComments);
    }, [ydoc]);

    useEffect(() => {
        const update = () => setTasks(Array.from(sharedTasks.values()));
        sharedTasks.observe(update);
        update();
        return () => sharedTasks.unobserve(update);
    }, [ydoc]);

    const addTask = (status: Task["status"]) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newTask: Task = {
            id, title: "New Task", description: "Click to edit",
            priority: "medium", assignee: "You", avatar: "Y",
            dueDate: "TBD", comments: 0, attachments: 0, status,
            label: LABELS[Math.floor(Math.random() * LABELS.length)],
        };
        sharedTasks.set(id, newTask);
    };

    const moveTask = (taskId: string, newStatus: Task["status"]) => {
        const task = sharedTasks.get(taskId);
        if (task) sharedTasks.set(taskId, { ...task, status: newStatus });
    };

    const saveTaskEdits = () => {
        if (!selectedTask) return;
        sharedTasks.set(selectedTask.id, { ...selectedTask, title: editTitle, description: editDesc });
        setSelectedTask(prev => prev ? { ...prev, title: editTitle, description: editDesc } : null);
    };

    const openTask = (task: Task) => {
        setSelectedTask(task);
        setEditTitle(task.title);
        setEditDesc(task.description);
    };

    /* ── Metrics ── */
    const total = tasks.length;
    const done = tasks.filter(t => t.status === "done").length;
    const inProgress = tasks.filter(t => t.status === "in-progress").length;

    /* ── Drag handlers ── */
    const onDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
        setDraggingId(taskId);
    };
    const onDragEnd = () => { setDraggingId(null); setDragOverCol(null); };
    const onDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        setDragOverCol(colId);
    };
    const onDrop = (e: React.DragEvent, colId: Task["status"]) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) moveTask(taskId, colId);
        setDraggingId(null);
        setDragOverCol(null);
    };

    const filteredTasks = labelFilter ? tasks.filter(t => t.label === labelFilter) : tasks;

    return (
        <div className="h-full flex flex-col bg-slate-900 relative">
            {/* Metrics bar */}
            <div className="flex items-center gap-6 px-5 py-2.5 border-b border-white/10 bg-slate-900/80 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span className="font-semibold text-white">{total}</span> tasks
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-white font-semibold">{inProgress}</span> in progress
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-white font-semibold">{done}</span> done
                </div>
                {total > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-slate-500">{Math.round((done / total) * 100)}% complete</span>
                        <Progress value={total > 0 ? (done / total) * 100 : 0} className="w-20 h-1.5 bg-slate-700" />
                    </div>
                )}
            </div>

            {/* Header + label filter */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter</span>
                    {LABELS.map(label => (
                        <button key={label} onClick={() => setLabelFilter(labelFilter === label ? null : label)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                labelFilter === label
                                    ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                                    : "border-white/10 text-slate-500 hover:border-white/30 hover:text-slate-300"
                            }`}>
                            {label}
                        </button>
                    ))}
                </div>
                <Button size="sm" className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => addTask("todo")}>
                    <Plus className="w-3.5 h-3.5" />New Task
                </Button>
            </div>

            {/* Kanban columns */}
            <div className="flex-1 flex gap-3 p-4 overflow-x-auto">
                {COLUMNS.map(col => {
                    const colTasks = filteredTasks.filter(t => t.status === col.id);
                    const isDropTarget = dragOverCol === col.id;
                    return (
                        <div
                            key={col.id}
                            className={`flex-1 min-w-[240px] flex flex-col rounded-xl border transition-colors ${
                                isDropTarget ? "border-blue-500/60 bg-blue-500/5" : `${col.accent} bg-slate-800/20`
                            }`}
                            onDragOver={e => onDragOver(e, col.id)}
                            onDrop={e => onDrop(e, col.id)}
                        >
                            {/* Column header */}
                            <div className="flex items-center justify-between px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                                    <span className="text-sm font-semibold text-white">{col.title}</span>
                                    <span className="text-[11px] text-slate-500 font-medium">{colTasks.length}</span>
                                </div>
                                <button onClick={() => addTask(col.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <ScrollArea className="flex-1 px-3 pb-3">
                                <div className="space-y-2">
                                    {colTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={e => onDragStart(e, task.id)}
                                            onDragEnd={onDragEnd}
                                            onClick={() => openTask(task)}
                                            className={`p-3 rounded-lg bg-slate-800 border border-white/5 cursor-pointer hover:border-blue-500/40 transition-all select-none ${
                                                draggingId === task.id ? "opacity-40 scale-95" : ""
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-1 mb-1.5">
                                                <Badge className={`text-[9px] border ${PRIORITY_COLORS[task.priority]}`}>
                                                    {task.priority}
                                                </Badge>
                                                {task.label && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                                                        {task.label}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-medium text-white mb-1 leading-tight">{task.title}</p>
                                            <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">{task.description}</p>

                                            {task.progress !== undefined && (
                                                <Progress value={task.progress} className="h-1 bg-slate-700 mb-2" />
                                            )}

                                            <div className="flex items-center justify-between">
                                                <Avatar className="w-5 h-5">
                                                    <AvatarFallback className="text-[9px] bg-blue-600">{task.avatar}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex items-center gap-2 text-slate-600 text-[10px]">
                                                    <span className="flex items-center gap-0.5"><MessageSquare className="w-2.5 h-2.5" />{task.comments}</span>
                                                    <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{task.dueDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    );
                })}
            </div>

            {/* Task Detail Drawer */}
            {selectedTask && (
                <div className="absolute inset-y-0 right-0 w-80 bg-slate-900 border-l border-white/10 flex flex-col z-20 shadow-2xl">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <span className="text-sm font-semibold text-white">Task Detail</span>
                        <button onClick={() => setSelectedTask(null)} className="text-slate-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Title</label>
                                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                                    className="mt-1 bg-slate-800 border-white/10 text-white text-sm" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Description</label>
                                <Textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                                    className="mt-1 bg-slate-800 border-white/10 text-white text-sm min-h-[80px] resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Priority</label>
                                    <p className="mt-1"><Badge className={`text-xs border ${PRIORITY_COLORS[selectedTask.priority]}`}>{selectedTask.priority}</Badge></p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Status</label>
                                    <p className="mt-1 text-sm text-slate-300 capitalize">{selectedTask.status.replace("-", " ")}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Assignee</label>
                                    <p className="mt-1 text-sm text-slate-300">{selectedTask.assignee}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Due</label>
                                    <p className="mt-1 text-sm text-slate-300">{selectedTask.dueDate}</p>
                                </div>
                            </div>

                            {/* Move to column */}
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Move to</label>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {COLUMNS.filter(c => c.id !== selectedTask.status).map(c => (
                                        <button key={c.id} onClick={() => { moveTask(selectedTask.id, c.id); setSelectedTask(null); }}
                                            className="px-2.5 py-1 rounded-full text-[11px] border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
                                            {c.title}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Comments */}
                            <div>
                                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Comments</label>
                                <div className="mt-2 space-y-2">
                                    {(comments[selectedTask.id] || []).map((c, i) => (
                                        <div key={i} className="p-2 bg-slate-800/50 rounded-lg border border-white/5">
                                            <div className="text-[10px] text-slate-500 mb-0.5">You</div>
                                            <p className="text-xs text-slate-300">{c}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === "Enter" && newComment.trim()) {
                                                const existing = sharedComments.get(selectedTask.id) || [];
                                                sharedComments.set(selectedTask.id, [...existing, newComment.trim()]);
                                                setNewComment("");
                                            }
                                        }}
                                        placeholder="Add comment..."
                                        className="bg-slate-800 border-white/10 text-white text-xs h-8"
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t border-white/10">
                        <Button onClick={saveTaskEdits} className="w-full bg-blue-600 hover:bg-blue-700 text-sm">
                            Save Changes
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
