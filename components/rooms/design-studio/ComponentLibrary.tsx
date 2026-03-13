"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Layout, Type, Image as ImageIcon, Box, MousePointer2, GripVertical, ToggleLeft, ListOrdered, Sliders, Table2, Radio, Calendar, Upload, Link2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface ComponentDef {
    name: string;
    icon: any;
    type: string;
    defaultWidth: number;
    defaultHeight: number;
}

const COMPONENTS: Record<string, ComponentDef[]> = {
    layout: [
        { name: 'Container', icon: Box, type: 'container', defaultWidth: 400, defaultHeight: 300 },
        { name: 'Grid', icon: Layout, type: 'grid', defaultWidth: 400, defaultHeight: 300 },
        { name: 'Stack', icon: Layout, type: 'stack', defaultWidth: 300, defaultHeight: 400 },
        { name: 'Card', icon: Box, type: 'card', defaultWidth: 320, defaultHeight: 200 },
        { name: 'Sidebar', icon: Layout, type: 'sidebar', defaultWidth: 250, defaultHeight: 600 },
    ],
    basic: [
        { name: 'Button', icon: MousePointer2, type: 'button', defaultWidth: 120, defaultHeight: 40 },
        { name: 'Text', icon: Type, type: 'text', defaultWidth: 200, defaultHeight: 30 },
        { name: 'Heading', icon: Type, type: 'heading', defaultWidth: 300, defaultHeight: 40 },
        { name: 'Image', icon: ImageIcon, type: 'image', defaultWidth: 300, defaultHeight: 200 },
        { name: 'Icon', icon: Box, type: 'icon', defaultWidth: 40, defaultHeight: 40 },
        { name: 'Divider', icon: GripVertical, type: 'divider', defaultWidth: 300, defaultHeight: 2 },
        { name: 'Badge', icon: Box, type: 'badge', defaultWidth: 80, defaultHeight: 24 },
        { name: 'Link', icon: Link2, type: 'link', defaultWidth: 100, defaultHeight: 24 },
    ],
    forms: [
        { name: 'Input', icon: Type, type: 'input', defaultWidth: 250, defaultHeight: 40 },
        { name: 'Textarea', icon: Type, type: 'textarea', defaultWidth: 300, defaultHeight: 100 },
        { name: 'Checkbox', icon: Box, type: 'checkbox', defaultWidth: 150, defaultHeight: 24 },
        { name: 'Select', icon: ListOrdered, type: 'select', defaultWidth: 200, defaultHeight: 40 },
        { name: 'Toggle', icon: ToggleLeft, type: 'toggle', defaultWidth: 60, defaultHeight: 30 },
        { name: 'Slider', icon: Sliders, type: 'slider', defaultWidth: 200, defaultHeight: 30 },
        { name: 'Radio', icon: Radio, type: 'radio', defaultWidth: 150, defaultHeight: 24 },
        { name: 'Date Picker', icon: Calendar, type: 'datepicker', defaultWidth: 250, defaultHeight: 40 },
        { name: 'File Upload', icon: Upload, type: 'upload', defaultWidth: 300, defaultHeight: 100 },
    ],
    data: [
        { name: 'Table', icon: Table2, type: 'table', defaultWidth: 500, defaultHeight: 300 },
        { name: 'List', icon: ListOrdered, type: 'list', defaultWidth: 300, defaultHeight: 200 },
        { name: 'Chart', icon: Box, type: 'chart', defaultWidth: 400, defaultHeight: 250 },
    ],
};

const CATEGORY_LABELS: Record<string, string> = {
    layout: 'Layout',
    basic: 'Basic',
    forms: 'Forms',
    data: 'Data Display',
};

export default function ComponentLibrary() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredComponents = useMemo(() => {
        if (!searchQuery.trim()) return COMPONENTS;
        const q = searchQuery.toLowerCase();
        const result: Record<string, ComponentDef[]> = {};
        for (const [cat, comps] of Object.entries(COMPONENTS)) {
            const filtered = comps.filter(c => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
            if (filtered.length > 0) result[cat] = filtered;
        }
        return result;
    }, [searchQuery]);

    const totalCount = Object.values(filteredComponents).reduce((s, c) => s + c.length, 0);

    const handleDragStart = (e: React.DragEvent, comp: ComponentDef) => {
        e.dataTransfer.setData("application/azora-component", JSON.stringify({
            type: comp.type,
            name: comp.name,
            defaultWidth: comp.defaultWidth,
            defaultHeight: comp.defaultHeight,
        }));
        e.dataTransfer.effectAllowed = "copy";
    };

    return (
        <div className="h-full flex flex-col bg-background border-r">
            <div className="p-4 border-b space-y-2">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search components..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{totalCount} components</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">Drag to canvas</Badge>
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-4">
                    <Accordion type="multiple" defaultValue={Object.keys(filteredComponents)} className="space-y-4">
                        {Object.entries(filteredComponents).map(([category, comps]) => (
                            <AccordionItem key={category} value={category} className="border-none">
                                <AccordionTrigger className="py-2 hover:no-underline">
                                    <span className="flex items-center gap-2">
                                        {CATEGORY_LABELS[category] || category}
                                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{comps.length}</Badge>
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-2 gap-2">
                                        {comps.map((comp) => (
                                            <Button
                                                key={comp.name}
                                                variant="outline"
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, comp)}
                                                className="h-20 flex flex-col gap-2 hover:border-pink-500 hover:bg-pink-500/5 cursor-grab active:cursor-grabbing transition-all"
                                            >
                                                <comp.icon className="w-6 h-6" />
                                                <span className="text-xs">{comp.name}</span>
                                            </Button>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </ScrollArea>
        </div>
    );
}
