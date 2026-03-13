"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Trash2, Copy, ChevronUp, ChevronDown, Save, Download,
  Upload, Eye, EyeOff, Presentation, GripVertical
} from "lucide-react";

interface Slide {
    id: string;
    title: string;
    content: string;
    notes: string;
}

const STORAGE_KEY = 'azora-slide-deck';

export default function SlideEditor() {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [activeSlideId, setActiveSlideId] = useState<string>("");
    const [showPreview, setShowPreview] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);

    const activeSlide = slides.find(s => s.id === activeSlideId) || slides[0];
    const activeIdx = slides.findIndex(s => s.id === (activeSlideId || slides[0]?.id));

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setSlides(parsed);
                    setActiveSlideId(parsed[0].id);
                    return;
                }
            }
        } catch { /* ignore */ }
    }, []);

    // Auto-save
    useEffect(() => {
        if (slides.length === 0 || !isDirty) return;
        const timer = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
            setIsDirty(false);
            // Signal to InnovationTheater that slides changed
            window.dispatchEvent(new CustomEvent('design:version-save', {
                detail: { type: 'slides', count: slides.length, timestamp: Date.now() }
            }));
        }, 1000);
        return () => clearTimeout(timer);
    }, [slides, isDirty]);

    // Ctrl+S explicit save
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(slides));
                setIsDirty(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [slides]);

    const addSlide = () => {
        const newSlide: Slide = {
            id: Date.now().toString(),
            title: 'New Slide',
            content: '# New Slide\n\nAdd content here.',
            notes: ''
        };
        setSlides(prev => [...prev, newSlide]);
        setActiveSlideId(newSlide.id);
        setIsDirty(true);
    };

    const duplicateSlide = () => {
        if (!activeSlide) return;
        const clone: Slide = {
            ...activeSlide,
            id: Date.now().toString(),
            title: `${activeSlide.title} (copy)`,
        };
        const idx = slides.findIndex(s => s.id === activeSlide.id);
        const updated = [...slides];
        updated.splice(idx + 1, 0, clone);
        setSlides(updated);
        setActiveSlideId(clone.id);
        setIsDirty(true);
    };

    const deleteSlide = () => {
        if (!activeSlide || slides.length <= 1) return;
        const idx = slides.findIndex(s => s.id === activeSlide.id);
        const updated = slides.filter(s => s.id !== activeSlide.id);
        setSlides(updated);
        setActiveSlideId(updated[Math.min(idx, updated.length - 1)]?.id || '');
        setIsDirty(true);
    };

    const moveSlide = (dir: -1 | 1) => {
        const idx = slides.findIndex(s => s.id === activeSlide?.id);
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= slides.length) return;
        const updated = [...slides];
        [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
        setSlides(updated);
        setIsDirty(true);
    };

    const updateSlide = (field: keyof Slide, value: string) => {
        setSlides(slides.map(s => s.id === activeSlideId ? { ...s, [field]: value } : s));
        setIsDirty(true);
    };

    const exportDeck = () => {
        const blob = new Blob([JSON.stringify(slides, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'slide-deck.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const importDeck = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const imported = JSON.parse(text);
                if (Array.isArray(imported) && imported.length > 0 && imported[0].title) {
                    setSlides(imported);
                    setActiveSlideId(imported[0].id);
                    setIsDirty(true);
                }
            } catch { /* ignore bad file */ }
        };
        input.click();
    };

    // Simple markdown to HTML (headings, bold, italic, lists)
    const renderMarkdown = (text: string) => {
        if (!text) return '';
        return text
            .split('\n')
            .map(line => {
                if (line.startsWith('### ')) return `<h3 class="text-lg font-semibold mb-2">${line.slice(4)}</h3>`;
                if (line.startsWith('## ')) return `<h2 class="text-xl font-bold mb-2">${line.slice(3)}</h2>`;
                if (line.startsWith('# ')) return `<h1 class="text-2xl font-bold mb-3">${line.slice(2)}</h1>`;
                if (line.startsWith('- ')) return `<li class="ml-4 list-disc text-base">${line.slice(2)}</li>`;
                if (line.startsWith('* ')) return `<li class="ml-4 list-disc text-base">${line.slice(2)}</li>`;
                if (line.trim() === '') return '<br/>';
                return `<p class="text-base mb-1">${line}</p>`;
            })
            .join('')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-slate-200 dark:bg-slate-800 px-1 rounded text-sm">$1</code>');
    };

    // Slide drag reorder
    const onDragStart = (e: React.DragEvent, idx: number) => {
        e.dataTransfer.setData('text/plain', idx.toString());
        setDragIdx(idx);
    };
    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
    const onDrop = (e: React.DragEvent, targetIdx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === targetIdx) return;
        const updated = [...slides];
        const [moved] = updated.splice(dragIdx, 1);
        updated.splice(targetIdx, 0, moved);
        setSlides(updated);
        setDragIdx(null);
        setIsDirty(true);
    };

    return (
        <div className="h-full flex bg-background">
            {/* Slide List */}
            <div className="w-52 border-r flex flex-col bg-muted/10">
                <div className="p-2 border-b space-y-1">
                    <Button onClick={addSlide} className="w-full gap-2" variant="outline" size="sm">
                        <Plus className="w-4 h-4" />
                        New Slide
                    </Button>
                    <div className="flex gap-1">
                        <Button onClick={duplicateSlide} variant="ghost" size="sm" className="flex-1 h-7 text-[10px]" disabled={!activeSlide}>
                            <Copy className="w-3 h-3 mr-1" />Copy
                        </Button>
                        <Button onClick={deleteSlide} variant="ghost" size="sm" className="flex-1 h-7 text-[10px] text-red-500" disabled={slides.length <= 1}>
                            <Trash2 className="w-3 h-3 mr-1" />Delete
                        </Button>
                    </div>
                    <div className="flex gap-1">
                        <Button onClick={() => moveSlide(-1)} variant="ghost" size="sm" className="flex-1 h-7 text-[10px]" disabled={activeIdx <= 0}>
                            <ChevronUp className="w-3 h-3 mr-1" />Up
                        </Button>
                        <Button onClick={() => moveSlide(1)} variant="ghost" size="sm" className="flex-1 h-7 text-[10px]" disabled={activeIdx >= slides.length - 1}>
                            <ChevronDown className="w-3 h-3 mr-1" />Down
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {slides.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <Presentation className="w-8 h-8 text-muted-foreground/30 mb-2" />
                            <p className="text-[10px] text-muted-foreground">No slides yet. Click &quot;New Slide&quot; to start building your deck.</p>
                        </div>
                    ) : (
                        slides.map((slide, index) => (
                            <div
                                key={slide.id}
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={onDragOver}
                                onDrop={(e) => onDrop(e, index)}
                                onClick={() => setActiveSlideId(slide.id)}
                                className={`p-2 rounded-md border cursor-pointer transition-colors ${activeSlideId === slide.id
                                        ? 'bg-purple-500/10 border-purple-500/50'
                                        : 'bg-card hover:bg-accent'
                                    }`}
                            >
                                <div className="flex items-center gap-1 mb-1">
                                    <GripVertical className="w-3 h-3 text-muted-foreground/40" />
                                    <div className="text-xs font-semibold truncate flex-1">
                                        {index + 1}. {slide.title}
                                    </div>
                                </div>
                                <div className="aspect-video bg-background rounded border border-dashed flex items-center justify-center text-[8px] text-muted-foreground overflow-hidden p-1">
                                    {slide.content.substring(0, 40)}...
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Import/Export */}
                <div className="p-2 border-t flex gap-1">
                    <Button onClick={exportDeck} variant="ghost" size="sm" className="flex-1 h-7 text-[10px]" disabled={slides.length === 0}>
                        <Download className="w-3 h-3 mr-1" />Export
                    </Button>
                    <Button onClick={importDeck} variant="ghost" size="sm" className="flex-1 h-7 text-[10px]">
                        <Upload className="w-3 h-3 mr-1" />Import
                    </Button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b">
                    <div className="flex items-center gap-2">
                        {isDirty && <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-amber-500 border-amber-500/30">Unsaved</Badge>}
                        {!isDirty && slides.length > 0 && <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-emerald-500 border-emerald-500/30">Saved</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)} className="h-7 gap-1 text-[10px]">
                            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(slides)); setIsDirty(false); }} className="h-7 gap-1 text-[10px]">
                            <Save className="w-3 h-3" />Save
                        </Button>
                    </div>
                </div>

                {!activeSlide ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <Presentation className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">Create your first slide to get started</p>
                            <Button onClick={addSlide} className="mt-3 gap-2" size="sm">
                                <Plus className="w-4 h-4" />Add Slide
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Edit panel */}
                        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r`}>
                            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Title</label>
                                    <Input
                                        className="text-lg font-bold bg-transparent"
                                        value={activeSlide.title}
                                        onChange={(e) => updateSlide('title', e.target.value)}
                                        placeholder="Slide Title"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Content (Markdown)</label>
                                    <textarea
                                        className="w-full min-h-[300px] resize-none bg-muted/30 border rounded-lg p-3 outline-none text-sm font-mono leading-relaxed focus:ring-1 focus:ring-purple-500/50"
                                        value={activeSlide.content}
                                        onChange={(e) => updateSlide('content', e.target.value)}
                                        placeholder="# Heading\n\n- Bullet point\n- Another point\n\n**Bold text** and *italic*"
                                    />
                                </div>
                            </div>

                            {/* Speaker Notes */}
                            <div className="h-28 border-t bg-background p-3">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Speaker Notes</label>
                                <textarea
                                    className="w-full h-[calc(100%-20px)] bg-transparent border-none outline-none resize-none text-xs"
                                    value={activeSlide.notes}
                                    onChange={(e) => updateSlide('notes', e.target.value)}
                                    placeholder="Add speaker notes here..."
                                />
                            </div>
                        </div>

                        {/* Preview panel */}
                        {showPreview && (
                            <div className="w-1/2 p-6 bg-slate-100 dark:bg-slate-900 overflow-y-auto flex items-start justify-center">
                                <Card className="aspect-video w-full max-w-2xl bg-white dark:bg-black shadow-2xl p-8 flex flex-col">
                                    <div className="text-[8px] text-muted-foreground mb-4 uppercase tracking-widest">
                                        Slide {activeIdx + 1} of {slides.length}
                                    </div>
                                    <div
                                        className="flex-1 prose prose-sm dark:prose-invert max-w-none"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(activeSlide.content) }}
                                    />
                                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                        <span className="text-[9px] text-muted-foreground">Azora Buildspaces</span>
                                        <span className="text-[9px] text-muted-foreground font-mono">{activeIdx + 1}/{slides.length}</span>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
