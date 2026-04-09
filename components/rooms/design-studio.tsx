"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRoomEvents } from "@/lib/hooks/use-room-events";
import { usePathname } from "next/navigation";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useSession } from "next-auth/react";
import {
    Palette,
    Play,
    Share2,
    Settings,
    Smartphone,
    Monitor,
    Tablet,
    Loader2,
    Users,
    GitBranch,
    Layers,
    Zap,
    Eye,
    Code,
    Save,
    Undo,
    Redo,
    Sparkles,
    Wand2,
    Accessibility,
    Layout,
    RefreshCw,
    ZoomIn,
    ZoomOut,
    Download,
    ChevronDown,
    ChevronRight,
    Search,
    Plus,
    X,
    AlertCircle,
    CheckCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import InfiniteCanvas from "./design-studio/InfiniteCanvas";
import ComponentLibrary from "./design-studio/ComponentLibrary";
import ColorPalette from "./design-studio/ColorPalette";
import FigmaImportDialog from "./design-studio/FigmaImportDialog";
import DesignToCode from "./design-studio/DesignToCode";
import DesignSystemManager from "./design-studio/DesignSystemManager";
import VersionHistory from "./design-studio/VersionHistory";
import CollaborationPanel from "./design-studio/CollaborationPanel";
import PrototypePlayer from "./design-studio/PrototypePlayer";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useWorkspace } from "@/lib/contexts/workspace-context";
import * as Y from "yjs";
// Dynamic import for browser-only module
const getWebsocketProvider = () => import("y-websocket").then(m => m.WebsocketProvider);

// ─── Design Token Data ───────────────────────────────────────────────────────
const DESIGN_COLORS = [
    { name: "Primary",   hex: "#ec4899" },
    { name: "Secondary", hex: "#8b5cf6" },
    { name: "Accent",    hex: "#06b6d4" },
    { name: "Success",   hex: "#22c55e" },
    { name: "Warning",   hex: "#f59e0b" },
    { name: "Danger",    hex: "#ef4444" },
    { name: "Surface",   hex: "#1e293b" },
    { name: "Muted",     hex: "#64748b" },
];
const DESIGN_TYPOGRAPHY = [
    { name: "Display", size: "3rem",    weight: "700" },
    { name: "Heading", size: "1.5rem",  weight: "600" },
    { name: "Body",    size: "1rem",    weight: "400" },
    { name: "Caption", size: "0.75rem", weight: "400" },
];
const DESIGN_SPACING = [4, 8, 12, 16, 24, 32, 48, 64];

// ─── Frame Templates ─────────────────────────────────────────────────────────
const FRAME_TEMPLATES = [
    { label: "Mobile (375×812)",   width: 375,  height: 812  },
    { label: "Tablet (768×1024)",  width: 768,  height: 1024 },
    { label: "Desktop (1440×900)", width: 1440, height: 900  },
] as const;

// ─── Sample Components ────────────────────────────────────────────────────────
const SAMPLE_COMPONENTS = [
    { name: "Button",  category: "Basic",      icon: "🔘" },
    { name: "Input",   category: "Form",       icon: "📝" },
    { name: "Card",    category: "Layout",     icon: "🃏" },
    { name: "Modal",   category: "Overlay",    icon: "🪟" },
    { name: "Nav",     category: "Navigation", icon: "🧭" },
    { name: "Footer",  category: "Layout",     icon: "🦶" },
    { name: "Hero",    category: "Marketing",  icon: "🦸" },
    { name: "Form",    category: "Form",       icon: "📋" },
    { name: "Table",   category: "Data",       icon: "📊" },
    { name: "Badge",   category: "Basic",      icon: "🏷️" },
    { name: "Avatar",  category: "Basic",      icon: "👤" },
    { name: "Tooltip", category: "Overlay",    icon: "💬" },
];

// ─── Auto Layout Types ───────────────────────────────────────────────────────
type LayoutDirection = 'horizontal' | 'vertical';
type LayoutAlign = 'start' | 'center' | 'end' | 'stretch';
type LayoutJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around';
type ConstraintType = 'fixed' | 'fill' | 'hug';
interface AutoLayoutConfig {
    direction: LayoutDirection;
    gap: number;
    padding: { top: number; right: number; bottom: number; left: number };
    align: LayoutAlign;
    justify: LayoutJustify;
    wrap: boolean;
    widthConstraint: ConstraintType;
    heightConstraint: ConstraintType;
}
const DEFAULT_AUTO_LAYOUT: AutoLayoutConfig = {
    direction: 'vertical',
    gap: 8,
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    align: 'stretch',
    justify: 'start',
    wrap: false,
    widthConstraint: 'fill',
    heightConstraint: 'hug',
};

// ─── Component Variant Types ──────────────────────────────────────────────────
interface ComponentVariant {
    id: string;
    name: string;
    properties: Record<string, string>;
    overrides: Record<string, any>;
}
interface DesignComponent {
    id: string;
    name: string;
    category: string;
    icon: string;
    variants: ComponentVariant[];
    defaultVariantId: string;
    autoLayout?: AutoLayoutConfig;
}
const INITIAL_DESIGN_COMPONENTS: DesignComponent[] = [
    {
        id: 'btn-1', name: 'Button', category: 'Basic', icon: '🔘',
        defaultVariantId: 'btn-primary',
        variants: [
            { id: 'btn-primary', name: 'Primary', properties: { size: 'md', style: 'filled' }, overrides: { bg: '#ec4899', color: '#fff', borderRadius: '8px' } },
            { id: 'btn-secondary', name: 'Secondary', properties: { size: 'md', style: 'outline' }, overrides: { bg: 'transparent', color: '#ec4899', border: '2px solid #ec4899', borderRadius: '8px' } },
            { id: 'btn-ghost', name: 'Ghost', properties: { size: 'md', style: 'ghost' }, overrides: { bg: 'transparent', color: '#ec4899', borderRadius: '8px' } },
            { id: 'btn-sm', name: 'Small', properties: { size: 'sm', style: 'filled' }, overrides: { bg: '#ec4899', color: '#fff', borderRadius: '6px', padding: '4px 12px', fontSize: '12px' } },
            { id: 'btn-lg', name: 'Large', properties: { size: 'lg', style: 'filled' }, overrides: { bg: '#ec4899', color: '#fff', borderRadius: '10px', padding: '12px 32px', fontSize: '18px' } },
        ],
    },
    {
        id: 'input-1', name: 'Input', category: 'Form', icon: '📝',
        defaultVariantId: 'input-default',
        variants: [
            { id: 'input-default', name: 'Default', properties: { state: 'default' }, overrides: { border: '1px solid #d1d5db', borderRadius: '8px', padding: '8px 12px' } },
            { id: 'input-focus', name: 'Focused', properties: { state: 'focus' }, overrides: { border: '2px solid #ec4899', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 0 0 3px rgba(236,72,153,0.15)' } },
            { id: 'input-error', name: 'Error', properties: { state: 'error' }, overrides: { border: '2px solid #ef4444', borderRadius: '8px', padding: '8px 12px' } },
            { id: 'input-disabled', name: 'Disabled', properties: { state: 'disabled' }, overrides: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', bg: '#f9fafb', opacity: '0.6' } },
        ],
    },
    {
        id: 'card-1', name: 'Card', category: 'Layout', icon: '🃏',
        defaultVariantId: 'card-default',
        autoLayout: { direction: 'vertical', gap: 12, padding: { top: 16, right: 16, bottom: 16, left: 16 }, align: 'stretch', justify: 'start', wrap: false, widthConstraint: 'fill', heightConstraint: 'hug' },
        variants: [
            { id: 'card-default', name: 'Default', properties: { elevation: 'sm' }, overrides: { bg: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } },
            { id: 'card-elevated', name: 'Elevated', properties: { elevation: 'lg' }, overrides: { bg: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' } },
            { id: 'card-outlined', name: 'Outlined', properties: { elevation: 'none' }, overrides: { bg: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' } },
        ],
    },
    {
        id: 'badge-1', name: 'Badge', category: 'Basic', icon: '🏷️',
        defaultVariantId: 'badge-default',
        variants: [
            { id: 'badge-default', name: 'Default', properties: { color: 'primary' }, overrides: { bg: '#ec4899', color: '#fff', borderRadius: '9999px', padding: '2px 10px', fontSize: '12px' } },
            { id: 'badge-success', name: 'Success', properties: { color: 'success' }, overrides: { bg: '#22c55e', color: '#fff', borderRadius: '9999px', padding: '2px 10px', fontSize: '12px' } },
            { id: 'badge-warning', name: 'Warning', properties: { color: 'warning' }, overrides: { bg: '#f59e0b', color: '#fff', borderRadius: '9999px', padding: '2px 10px', fontSize: '12px' } },
            { id: 'badge-outline', name: 'Outline', properties: { color: 'outline' }, overrides: { bg: 'transparent', color: '#ec4899', border: '1px solid #ec4899', borderRadius: '9999px', padding: '2px 10px', fontSize: '12px' } },
        ],
    },
];

// ─── Export Dialog (Upgrade 5) ────────────────────────────────────────────────
type ExportFormat = "PNG" | "SVG" | "PDF";
type ExportScale  = "1x" | "2x" | "3x";

function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
    const [format, setFormat]       = useState<ExportFormat>("PNG");
    const [scale, setScale]         = useState<ExportScale>("1x");
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const scaleNum = parseInt(scale.replace('x', ''), 10) || 1;
            // Find the design canvas element
            const canvas = document.querySelector('[data-design-canvas]') as HTMLElement | null;

            if (format === "SVG") {
                // Serialize the canvas subtree to SVG via XMLSerializer
                const svgEl = canvas?.querySelector('svg');
                if (svgEl) {
                    const serializer = new XMLSerializer();
                    const svgStr = serializer.serializeToString(svgEl);
                    const blob = new Blob([svgStr], { type: "image/svg+xml" });
                    downloadBlob(blob, `design-export.svg`);
                }
            } else {
                // Render canvas DOM to an offscreen <canvas> for PNG/PDF
                // Use the OffscreenCanvas approach with html-to-image (or fallback)
                if (canvas) {
                    // Dynamic import with webpack ignore to avoid build error when package is missing
                    const htmlToImage = await import('html-to-image').then((m: any) => m).catch(() => null);
                    let blob: Blob | null = null;
                    if (htmlToImage) {
                        const dataUrl = await htmlToImage.toPng(canvas, {
                            pixelRatio: scaleNum,
                            backgroundColor: '#0f172a',
                        });
                        const res = await fetch(dataUrl);
                        blob = await res.blob();
                    } else {
                        // Fallback: capture via native canvas if available
                        const svgEl = canvas.querySelector('svg');
                        if (svgEl) {
                            const svgData = new XMLSerializer().serializeToString(svgEl);
                            const img = new Image();
                            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                            const url = URL.createObjectURL(svgBlob);
                            await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = () => reject(new Error('Failed to load SVG image for export'));
                                img.src = url;
                            });
                            const offscreen = document.createElement('canvas');
                            offscreen.width = img.width * scaleNum;
                            offscreen.height = img.height * scaleNum;
                            const ctx = offscreen.getContext('2d');
                            if (ctx) {
                                ctx.scale(scaleNum, scaleNum);
                                ctx.drawImage(img, 0, 0);
                                blob = await new Promise<Blob | null>(r => offscreen.toBlob(r, 'image/png'));
                            }
                            URL.revokeObjectURL(url);
                        }
                    }
                    if (blob) {
                        const ext = format === "PDF" ? "pdf" : "png";
                        downloadBlob(blob, `design-export-${scale}.${ext}`);
                    }
                }
            }
        } finally {
            setIsExporting(false);
            onOpenChange(false);
        }
    };

    function downloadBlob(blob: Blob, filename: string) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> Export Design
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <p className="text-sm font-medium">Format</p>
                        <div className="flex gap-2">
                            {(["PNG", "SVG", "PDF"] as ExportFormat[]).map(f => (
                                <Button key={f} variant={format === f ? "default" : "outline"} size="sm"
                                    className={format === f ? "bg-pink-500 hover:bg-pink-600" : ""}
                                    onClick={() => setFormat(f)}>
                                    {f}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-sm font-medium">Scale</p>
                        <div className="flex gap-2">
                            {(["1x", "2x", "3x"] as ExportScale[]).map(s => (
                                <Button key={s} variant={scale === s ? "default" : "outline"} size="sm"
                                    className={scale === s ? "bg-pink-500 hover:bg-pink-600" : ""}
                                    onClick={() => setScale(s)}>
                                    {s}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>Cancel</Button>
                    <Button onClick={handleExport} disabled={isExporting} className="gap-2 bg-pink-500 hover:bg-pink-600">
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {isExporting ? "Exporting…" : `Export ${format}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Design Tokens Panel (Upgrade 3) ─────────────────────────────────────────
function DesignTokensPanel() {
    const [open, setOpen]           = useState(true);
    const [tokensTab, setTokensTab] = useState<"colors" | "typography" | "spacing">("colors");

    return (
        <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium hover:bg-muted/30 border-b">
                    <span className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-pink-500" /> Design Tokens
                    </span>
                    {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="p-3 space-y-3">
                    <div className="flex gap-1 text-xs">
                        {(["colors", "typography", "spacing"] as const).map(t => (
                            <button key={t} onClick={() => setTokensTab(t)}
                                className={`px-2 py-1 rounded capitalize transition-colors ${
                                    tokensTab === t
                                        ? "bg-pink-500/20 text-pink-400 font-medium"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}>
                                {t}
                            </button>
                        ))}
                    </div>

                    {tokensTab === "colors" && (
                        <div className="grid grid-cols-2 gap-1.5">
                            {DESIGN_COLORS.map(color => (
                                <div key={color.name} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/20 hover:bg-muted/40">
                                    <div className="w-6 h-6 rounded-md shrink-0 border border-black/10" style={{ backgroundColor: color.hex }} />
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-medium truncate">{color.name}</div>
                                        <div className="text-[9px] font-mono text-muted-foreground">{color.hex}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tokensTab === "typography" && (
                        <div className="space-y-2">
                            {DESIGN_TYPOGRAPHY.map(t => (
                                <div key={t.name} className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                                    <span style={{ fontSize: `clamp(0.6rem, ${t.size}, 1.5rem)`, fontWeight: Number(t.weight) }}>Aa</span>
                                    <div className="text-right">
                                        <div className="text-xs font-medium">{t.name}</div>
                                        <div className="text-[10px] text-muted-foreground">{t.size} / {t.weight}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tokensTab === "spacing" && (
                        <div className="space-y-1.5">
                            {DESIGN_SPACING.map(s => (
                                <div key={s} className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground w-8 shrink-0">{s}px</span>
                                    <div className="h-3 bg-pink-500/40 rounded-sm" style={{ width: `${Math.min(s * 2, 160)}px` }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

export default function DesignStudio() {
    const { emit, ROOM_EVENTS } = useRoomEvents('design-studio')
    const { activeRoom } = useWorkspace();
    const pathname = usePathname();
    const projectId = useMemo(() => {
        const parts = pathname?.split("/").filter(Boolean) ?? []
        return parts[parts.length - 1] || "default"
    }, [pathname])
    const activeProject = useMemo(() => ({ id: projectId, name: projectId }), [projectId]);

    // ─── Yjs Collaboration Setup ──────────────────────────────────────
    const ydocRef = useRef<Y.Doc | null>(null)
    const providerRef = useRef<any>(null)
    const [connectedPeers, setConnectedPeers] = useState<string[]>([])
    const [isCollabConnected, setIsCollabConnected] = useState(false)

    useEffect(() => {
        const doc = new Y.Doc()
        ydocRef.current = doc
        let provider: any = null
        let cancelled = false

        getWebsocketProvider().then(WebsocketProvider => {
            if (cancelled) return
            try {
                const wsUrl = process.env.NEXT_PUBLIC_YJS_WS || 'ws://localhost:1234'
                provider = new WebsocketProvider(wsUrl, `design-studio-${projectId}`, doc)
                providerRef.current = provider

                provider.on('status', ({ status }: { status: string }) => {
                    setIsCollabConnected(status === 'connected')
                })

                // Awareness for collaborator cursors
                const awareness = provider.awareness
                awareness.setLocalStateField('user', {
                    name: 'Designer',
                    color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
                })
                const onAwarenessChange = () => {
                    const states = Array.from(awareness.getStates().values())
                    const peers = states.filter((s: any) => s.user?.name).map((s: any) => s.user.name)
                    setConnectedPeers(peers)
                }
                awareness.on('change', onAwarenessChange)
                onAwarenessChange()

                // Sync imported canvas nodes through Yjs shared array
                const sharedNodes = doc.getArray<any>('canvas-nodes')
                sharedNodes.observe(() => {
                    const nodes = sharedNodes.toArray()
                    if (nodes.length > 0) {
                        setImportedNodes(nodes)
                    }
                })
            } catch {
                // WebSocket not available — continue without collab
            }
        }).catch(() => {
            // Dynamic import failed — continue without collab
        })

        return () => {
            cancelled = true
            provider?.destroy()
            doc.destroy()
        }
    }, [projectId])

    // Sync local canvas changes to Yjs when nodes change
    const syncNodesToYjs = useCallback((nodes: any[]) => {
        if (!ydocRef.current) return
        const sharedNodes = ydocRef.current.getArray<any>('canvas-nodes')
        ydocRef.current.transact(() => {
            sharedNodes.delete(0, sharedNodes.length)
            nodes.forEach(n => sharedNodes.push([n]))
        })
    }, [])

    const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [importedNodes, setImportedNodes] = useState<any[]>([]);
    const [activeGenerationFrame, setActiveGenerationFrame] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('canvas');
    const [collaborators, setCollaborators] = useState(3);
    const [isSaved, setIsSaved] = useState(true);
    const [showCollaboration, setShowCollaboration] = useState(false);

    // Update collaborator count from Yjs awareness
    useEffect(() => {
        if (connectedPeers.length > 0) setCollaborators(connectedPeers.length)
    }, [connectedPeers])

    // Sync canvas nodes to Yjs whenever they change locally
    const skipYjsSyncRef = useRef(false)
    useEffect(() => {
        if (skipYjsSyncRef.current) {
            skipYjsSyncRef.current = false
            return
        }
        if (importedNodes.length > 0) syncNodesToYjs(importedNodes)
    }, [importedNodes, syncNodesToYjs])

    // Upgrade 1: Zoom controls
    const [zoomLevel, setZoomLevel] = useState(100);

    // Upgrade 2: Active frame size label
    const [activeFrameLabel, setActiveFrameLabel] = useState<string | null>(null);

    // Upgrade 4: Component search
    const [componentSearch, setComponentSearch] = useState('');

    // Upgrade 5: Export dialog
    const [showExportDialog, setShowExportDialog] = useState(false);

    // ─── User session and additional state ─────────────────────────────────
    const _designSession = useSession()
    const userSession = _designSession?.data ?? null
    const [designDiagnostics, setDesignDiagnostics] = useState<any[]>([])
    const [isA11yChecking, setIsA11yChecking] = useState(false)
    const [a11yScore, setA11yScore] = useState<number | null>(null)
    
    // Hardening: Accessibility & WCAG Integrated Checking
    const runA11yCheck = useCallback(async (code?: string) => {
        setIsA11yChecking(true)
        setDesignDiagnostics(prev => prev.filter(d => d.source !== 'a11y-check'))
        
        try {
            // If no code provided, we'll use a snapshot of the current canvas if available
            // In a real implementation this might use the generated code from DesignToCode
            const codeToAudit = code || "// Sample code from current selection\nexport default function Design() { return <button className=\"bg-pink-500 text-white\">Click Me</button> }";
            
            const resp = await fetch("/api/design/a11y-check", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: codeToAudit }),
            })
            
            if (resp.ok) {
                const data = await resp.json()
                const results = data.results || []
                
                const formattedDiagnostics = results.map((res: any, idx: number) => ({
                    id: `a11y-${Date.now()}-${idx}`,
                    message: `[WCAG] ${res.rule}: ${res.description}`,
                    severity: 'warning',
                    source: 'a11y-check',
                    suggestion: res.suggestion,
                    timestamp: new Date().toISOString()
                }))
                
                setDesignDiagnostics(prev => [...prev, ...formattedDiagnostics])
                
                // Calculate primitive score
                const totalRules = 10; // baseline
                const issuesFound = results.length;
                const score = Math.max(0, 100 - (issuesFound * 15));
                setA11yScore(score);
                
                if (score >= 90) {
                    setDesignDiagnostics(prev => [...prev, {
                        id: 'a11y-score-90',
                        message: 'Accessibility score is excellent (90%+). Design meets baseline WCAG 2.1 AA.',
                        severity: 'info',
                        source: 'a11y-check',
                        timestamp: new Date().toISOString()
                    }])
                }
            }
        } catch (error) {
            console.error('A11y check failed:', error)
        } finally {
            setIsA11yChecking(false)
        }
    }, [setDesignDiagnostics])
    const [designSettings, setDesignSettings] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('design-studio-settings')
            return saved ? JSON.parse(saved) : { autoSave: true, showGrid: true, theme: 'light' }
        }
        return { autoSave: true, showGrid: true, theme: 'light' }
    })
    const [designVersions, setDesignVersions] = useState<any[]>([])

    // ─── Phase 1: Auto Layout State ──────────────────────────────────────
    const [autoLayouts, setAutoLayouts] = useState<Record<string, AutoLayoutConfig>>({})
    const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
    const [showAutoLayoutPanel, setShowAutoLayoutPanel] = useState(false)

    // ─── Phase 1: Component Variants State ───────────────────────────────
    const [designComponents, setDesignComponents] = useState<DesignComponent[]>(INITIAL_DESIGN_COMPONENTS)
    const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
    const [activeVariants, setActiveVariants] = useState<Record<string, string>>({}) // componentId -> activeVariantId
    const [isCreatingVariant, setIsCreatingVariant] = useState(false)
    const [newVariantName, setNewVariantName] = useState('')

    // ─── Auto Layout Helpers ─────────────────────────────────────────────

    // Cross-room bridge: listen for CSS/design file saves from Code Chamber
    useEffect(() => {
        const handler = (e: Event) => {
            const { path, content } = (e as CustomEvent).detail || {}
            if (!path || !content) return
            // React to CSS/SCSS/Tailwind config saves by notifying about token changes
            if (/\.(css|scss|less|tailwind\.config)/.test(path)) {
                setDesignDiagnostics(prev => [...prev, {
                    id: `css-sync-${Date.now()}`,
                    message: `Design tokens may have changed: ${path}`,
                    severity: 'info',
                    source: 'code-chamber-bridge',
                    timestamp: new Date().toISOString(),
                }])
            }
        }
        window.addEventListener('azora:file-saved', handler)
        return () => window.removeEventListener('azora:file-saved', handler)
    }, [])

    const applyAutoLayout = (frameId: string, config?: Partial<AutoLayoutConfig>) => {
        const current = autoLayouts[frameId] || DEFAULT_AUTO_LAYOUT
        const updated = { ...current, ...config }
        setAutoLayouts(prev => ({ ...prev, [frameId]: updated }))
        setDesignDiagnostics(prev => [...prev, {
            id: `layout-${Date.now()}`,
            message: `Auto layout applied to frame: ${frameId}`,
            severity: 'info',
            source: 'auto-layout',
            timestamp: new Date().toISOString()
        }])
    }

    const removeAutoLayout = (frameId: string) => {
        setAutoLayouts(prev => {
            const next = { ...prev }
            delete next[frameId]
            return next
        })
    }

    const getAutoLayoutCSS = (config: AutoLayoutConfig): React.CSSProperties => ({
        display: 'flex',
        flexDirection: config.direction === 'horizontal' ? 'row' : 'column',
        gap: `${config.gap}px`,
        padding: `${config.padding.top}px ${config.padding.right}px ${config.padding.bottom}px ${config.padding.left}px`,
        alignItems: config.align === 'stretch' ? 'stretch' : config.align === 'start' ? 'flex-start' : config.align === 'end' ? 'flex-end' : 'center',
        justifyContent: config.justify === 'start' ? 'flex-start' : config.justify === 'end' ? 'flex-end' : config.justify === 'space-between' ? 'space-between' : config.justify === 'space-around' ? 'space-around' : 'center',
        flexWrap: config.wrap ? 'wrap' : 'nowrap',
        width: config.widthConstraint === 'fill' ? '100%' : config.widthConstraint === 'hug' ? 'fit-content' : undefined,
        height: config.heightConstraint === 'fill' ? '100%' : config.heightConstraint === 'hug' ? 'fit-content' : undefined,
    })

    // ─── Component Variant Helpers ───────────────────────────────────────
    const getActiveVariant = (componentId: string): ComponentVariant | null => {
        const comp = designComponents.find(c => c.id === componentId)
        if (!comp) return null
        const activeId = activeVariants[componentId] || comp.defaultVariantId
        return comp.variants.find(v => v.id === activeId) || comp.variants[0] || null
    }

    const switchVariant = (componentId: string, variantId: string) => {
        setActiveVariants(prev => ({ ...prev, [componentId]: variantId }))
    }

    const addVariant = (componentId: string) => {
        if (!newVariantName.trim()) return
        const comp = designComponents.find(c => c.id === componentId)
        if (!comp) return

        const baseVariant = getActiveVariant(componentId)
        const newVariant: ComponentVariant = {
            id: `${componentId}-${Date.now()}`,
            name: newVariantName.trim(),
            properties: { ...(baseVariant?.properties || {}) },
            overrides: { ...(baseVariant?.overrides || {}) },
        }
        setDesignComponents(prev => prev.map(c =>
            c.id === componentId
                ? { ...c, variants: [...c.variants, newVariant] }
                : c
        ))
        setNewVariantName('')
        setIsCreatingVariant(false)
    }

    const deleteVariant = (componentId: string, variantId: string) => {
        setDesignComponents(prev => prev.map(c => {
            if (c.id !== componentId) return c
            const filtered = c.variants.filter(v => v.id !== variantId)
            return {
                ...c,
                variants: filtered,
                defaultVariantId: c.defaultVariantId === variantId ? (filtered[0]?.id || '') : c.defaultVariantId
            }
        }))
    }

    const updateVariantOverride = (componentId: string, variantId: string, key: string, value: string) => {
        setDesignComponents(prev => prev.map(c => {
            if (c.id !== componentId) return c
            return {
                ...c,
                variants: c.variants.map(v =>
                    v.id === variantId
                        ? { ...v, overrides: { ...v.overrides, [key]: value } }
                        : v
                )
            }
        }))
    }
    useEffect(() => {
        const handleSettingsChange = () => {
            const saved = localStorage.getItem('design-studio-settings')
            if (saved) {
                setDesignSettings(JSON.parse(saved))
            }
        }
        window.addEventListener('azora:settingsChanged', handleSettingsChange)
        return () => window.removeEventListener('azora:settingsChanged', handleSettingsChange)
    }, [])

    // ─── Version management ───────────────────────────────────────────────
    const createDesignVersion = () => {
        const version = {
            id: `v${Date.now()}`,
            timestamp: new Date().toISOString(),
            frames: importedNodes,
            author: userSession?.user?.name || 'Anonymous',
            description: `Version created at ${new Date().toLocaleTimeString()}`
        }
        setDesignVersions(prev => [version, ...prev.slice(0, 49)]) // Keep max 50 versions
    }

    const restoreDesignVersion = (versionId: string) => {
        const version = designVersions.find(v => v.id === versionId)
        if (version) {
            setImportedNodes(version.frames)
            setDesignDiagnostics(prev => [...prev, {
                id: 'version-restored',
                message: `Restored version: ${versionId}`,
                severity: 'info',
                source: 'version-control',
                timestamp: new Date().toISOString()
            }])
        }
    }

    // ─── Settings update function ────────────────────────────────────────
    const updateDesignSettings = (newSettings: Partial<typeof designSettings>) => {
        const updated = { ...designSettings, ...newSettings }
        setDesignSettings(updated)
        localStorage.setItem('design-studio-settings', JSON.stringify(updated))
        window.dispatchEvent(new CustomEvent('azora:settingsChanged', { detail: updated }))
    }

    // AI Design Generation
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiResult, setAiResult] = useState<any>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiAction, setAiAction] = useState<'generate-component' | 'generate-palette' | 'audit-accessibility' | 'suggest-layout'>('generate-component');

    const runAiAction = async () => {
        if (isGeneratingAI) return;
        setIsGeneratingAI(true);
        setAiResult(null);
        try {
            const resp = await fetch('/api/design/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: aiAction, prompt: aiPrompt || 'A modern dashboard card component', framework: 'react-tailwind' }),
            });
            if (resp.ok) {
                setAiResult(await resp.json());
            }
        } catch (err) {
            console.error('AI design action failed:', err);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    // Load project design frames from API
    useEffect(() => {
        const loadFrames = async () => {
            if (!activeProject?.id) return;
            setIsLoading(true);
            try {
                const resp = await fetch(`/api/design/frames?projectId=${activeProject.id}`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.frames) {
                        const nodes = data.frames.map((frame: any) => ({
                            id: frame.id,
                            type: 'frame',
                            position: frame.position || { x: 200, y: 200 },
                            data: {
                                label: frame.name,
                                width: frame.width,
                                height: frame.height,
                                content: (
                                    <div className="space-y-4">
                                        <div className="text-xs font-bold text-pink-500 uppercase tracking-wider">Design Frame</div>
                                        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-400">
                                            {frame.name} Preview
                                        </div>
                                        <Button
                                            size="sm"
                                            className="w-full bg-pink-500 text-[10px] h-7"
                                            onClick={() => setActiveGenerationFrame(frame)}
                                        >
                                            Generate Code
                                        </Button>
                                    </div>
                                )
                            },
                            style: { width: frame.width, height: frame.height }
                        }));
                        setImportedNodes(nodes);
                    }
                }
            } catch (error) {
                console.error('Failed to load frames:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadFrames();
    }, [activeProject?.id]);

    const handleFigmaImport = (data: any) => {
        const components = data.components || []
        const newNode = {
            id: data.id,
            type: 'frame',
            position: { x: 200, y: 200 },
            data: {
                label: data.name,
                width: data.width,
                height: data.height,
                content: (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-pink-500 uppercase tracking-wider">Figma Import</div>
                            <span className="text-[10px] text-slate-500">{data.width}×{data.height}</span>
                        </div>
                        {components.length > 0 ? (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {components.slice(0, 10).map((c: any) => (
                                    <div key={c.id} className="h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-between px-2 text-[10px] text-slate-400">
                                        <span className="truncate">{c.name}</span>
                                        <span className="text-slate-600 shrink-0 ml-1">{c.type}</span>
                                    </div>
                                ))}
                                {components.length > 10 && (
                                    <div className="text-[10px] text-slate-500 text-center">+{components.length - 10} more</div>
                                )}
                            </div>
                        ) : (
                            <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-400">
                                No components extracted
                            </div>
                        )}
                        <Button
                            size="sm"
                            className="w-full bg-pink-500 text-[10px] h-7"
                            onClick={() => setActiveGenerationFrame(data)}
                        >
                            Generate Code
                        </Button>
                    </div>
                )
            },
            style: { width: 300, height: 400 }
        };
        setImportedNodes(prev => [...prev, newNode]);
    };

    // Upgrade 2: Add frame from template
    const addFrameFromTemplate = (tpl: typeof FRAME_TEMPLATES[number] | { label: string; width: number; height: number }) => {
        const id = `frame-${Date.now()}`;
        const newNode = {
            id,
            type: 'frame',
            position: { x: 100 + importedNodes.length * 40, y: 100 },
            data: {
                label: tpl.label,
                width: tpl.width,
                height: tpl.height,
                content: (
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-pink-500 uppercase tracking-wider">{tpl.label}</div>
                        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-[10px] text-slate-400">
                            {tpl.width} × {tpl.height}
                        </div>
                    </div>
                ),
            },
            style: { width: tpl.width, height: tpl.height },
        };
        setImportedNodes(prev => [...prev, newNode]);
        setActiveFrameLabel(tpl.label);
    };

    // Upgrade 1: Zoom helpers
    const zoomIn  = () => setZoomLevel(z => Math.min(z + 10, 300));
    const zoomOut = () => setZoomLevel(z => Math.max(z - 10, 10));
    const zoomReset = () => setZoomLevel(100);

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Enhanced Toolbar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-pink-500/10 text-pink-500 rounded-lg border border-pink-500/20">
                        <Palette className="w-5 h-5" />
                        <span className="text-sm font-medium">Design Studio</span>
                    </div>

                    <span className="text-muted-foreground">/</span>

                    <span className="text-sm font-medium">{activeProject?.name || 'Untitled Project'}</span>

                    {/* Collaboration Status */}
                    <div className="flex items-center gap-2 ml-4">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCollaboration(!showCollaboration)}
                            className="gap-2"
                        >
                            <Users className="w-4 h-4" />
                            {collaborators} online
                            {isCollabConnected && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                        </Button>

                        {/* Save Status */}
                        <div className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${isSaved ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                            <span className="text-xs text-muted-foreground">
                                {isSaved ? 'Saved' : 'Saving...'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1 mr-2">
                        <Button size="sm" variant="ghost">
                            <Undo className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                            <Redo className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg mr-2">
                        <Button
                            size="sm"
                            variant={viewMode === 'desktop' ? 'default' : 'ghost'}
                            onClick={() => setViewMode('desktop')}
                        >
                            <Monitor className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === 'tablet' ? 'default' : 'ghost'}
                            onClick={() => setViewMode('tablet')}
                        >
                            <Tablet className="w-4 h-4" />
                        </Button>
                        <Button
                            size="sm"
                            variant={viewMode === 'mobile' ? 'default' : 'ghost'}
                            onClick={() => setViewMode('mobile')}
                        >
                            <Smartphone className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Action Buttons */}
                    {/* Upgrade 2: New Frame dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1">
                                <Plus className="w-4 h-4" /> New Frame <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {FRAME_TEMPLATES.map(tpl => (
                                <DropdownMenuItem key={tpl.label} onClick={() => addFrameFromTemplate(tpl)}>
                                    {tpl.label}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => addFrameFromTemplate({ label: "Custom Frame", width: 800, height: 600 })}>
                                Custom…
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button size="sm" variant="outline" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Preview
                    </Button>

                    <Button size="sm" variant="outline" className="gap-2">
                        <Share2 className="w-4 h-4" />
                        Share
                    </Button>

                    {/* Upgrade 5: Export button */}
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowExportDialog(true)}>
                        <Download className="w-4 h-4" />
                        Export
                    </Button>

                    <Button size="sm" className="gap-2 bg-pink-500 hover:bg-pink-600">
                        <Save className="w-4 h-4" />
                        Publish
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                    <TabsList role="tablist" aria-label="Design studio tabs" className="grid w-full grid-cols-10 h-12 rounded-none border-b">
                        <TabsTrigger value="canvas" className="gap-2">
                            <Layers className="w-4 h-4" />
                            Canvas
                        </TabsTrigger>
                        <TabsTrigger value="components" className="gap-2">
                            <Zap className="w-4 h-4" />
                            Components
                        </TabsTrigger>
                        <TabsTrigger value="auto-layout" className="gap-2">
                            <Layout className="w-4 h-4" />
                            Auto Layout
                        </TabsTrigger>
                        <TabsTrigger value="variants" className="gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Variants
                        </TabsTrigger>
                        <TabsTrigger value="ai-generate" className="gap-2">
                            <Sparkles className="w-4 h-4" />
                            AI Generate
                        </TabsTrigger>
                        <TabsTrigger value="design-system" className="gap-2">
                            <Palette className="w-4 h-4" />
                            Design System
                        </TabsTrigger>
                        <TabsTrigger value="diagnostics" className="gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Diagnostics
                        </TabsTrigger>
                        <TabsTrigger value="prototype" className="gap-2">
                            <Play className="w-4 h-4" />
                            Prototype
                        </TabsTrigger>
                        <TabsTrigger value="version-history" className="gap-2">
                            <GitBranch className="w-4 h-4" />
                            History
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="canvas" className="h-full m-0">
                        <ResizablePanelGroup direction="horizontal">
                            {/* Left Sidebar */}
                            <ResizablePanel defaultSize={20} minSize={15}>
                                <div className="h-full border-r bg-muted/10">
                                    <Tabs defaultValue="layers" className="h-full">
                                        <TabsList className="grid w-full grid-cols-2 h-10 rounded-none">
                                            <TabsTrigger value="layers">Layers</TabsTrigger>
                                            <TabsTrigger value="assets">Assets</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="layers" className="h-full m-0 p-4">
                                            <div className="text-center text-muted-foreground py-8">
                                                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">Layer management</p>
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="assets" className="h-full m-0 p-4">
                                            <ComponentLibrary />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            {/* Main Canvas */}
                            <ResizablePanel defaultSize={60} minSize={30}>
                                <div className="h-full relative overflow-hidden">
                                    {/* Upgrade 2: Active frame indicator */}
                                    {activeFrameLabel && (
                                        <div className="absolute top-2 left-2 z-10 px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-md border border-pink-500/30">
                                            {activeFrameLabel}
                                        </div>
                                    )}
                                    {isLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="h-full w-full inset-0 absolute">
                                            <ErrorBoundary fallback={() => <div className="h-full flex items-center justify-center text-red-400">Canvas failed to load</div>}>
                                                <Tldraw
                                                    inferDarkMode
                                                    persistenceKey={`azora-design-studio-${projectId}`}
                                                />
                                            </ErrorBoundary>
                                        </div>
                                    )}
                                    {/* Upgrade 1: Zoom toolbar */}
                                    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-background/90 border rounded-lg px-2 py-1 shadow-sm backdrop-blur-sm">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={zoomOut} aria-label="Zoom out">
                                            <ZoomOut className="w-3.5 h-3.5" />
                                        </Button>
                                        <span className="text-xs font-mono w-10 text-center select-none">{zoomLevel}%</span>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={zoomIn} aria-label="Zoom in">
                                            <ZoomIn className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 px-1.5 text-xs" onClick={zoomReset}>100%</Button>
                                    </div>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />

                            {/* Right Sidebar */}
                            <ResizablePanel defaultSize={20} minSize={15}>
                                <div className="h-full border-l bg-muted/10 overflow-y-auto">
                                    <Tabs defaultValue="properties" className="h-full">
                                        <TabsList className="grid w-full grid-cols-2 h-10 rounded-none">
                                            <TabsTrigger value="properties">Properties</TabsTrigger>
                                            <TabsTrigger value="code">Code</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="properties" className="m-0">
                                            <ColorPalette />
                                            {/* Upgrade 3: Design Tokens Panel */}
                                            <DesignTokensPanel />
                                        </TabsContent>
                                        <TabsContent value="code" className="h-full m-0 p-4">
                                            <DesignToCode
                                                frameData={activeGenerationFrame}
                                                onClose={() => setActiveGenerationFrame(null)}
                                            />
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </TabsContent>

                    <TabsContent value="components" className="h-full m-0 p-4 overflow-y-auto">
                        {/* Upgrade 4: Component Search */}
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search components…"
                                    value={componentSearch}
                                    onChange={e => setComponentSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {SAMPLE_COMPONENTS.filter(c =>
                                    c.name.toLowerCase().includes(componentSearch.toLowerCase()) ||
                                    c.category.toLowerCase().includes(componentSearch.toLowerCase())
                                ).map(comp => (
                                    <div key={comp.name}
                                        className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors">
                                        <span className="text-lg">{comp.icon}</span>
                                        <div>
                                            <div className="text-xs font-medium">{comp.name}</div>
                                            <div className="text-[10px] text-muted-foreground">{comp.category}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-4">
                                <ComponentLibrary />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ─── Auto Layout Tab ──────────────────────────────────────────── */}
                    <TabsContent value="auto-layout" className="h-full m-0 p-6 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Auto Layout</h2>
                                    <p className="text-sm text-muted-foreground">Configure responsive flex layouts for frames and components</p>
                                </div>
                                <Badge variant="outline" className="text-pink-500 border-pink-500/30">{Object.keys(autoLayouts).length} layouts configured</Badge>
                            </div>

                            {/* Frame selector */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium">Select Frame</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {importedNodes.length === 0 ? (
                                        <div className="col-span-3 text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                            <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No frames on canvas</p>
                                            <p className="text-xs mt-1">Add frames from Canvas tab first</p>
                                        </div>
                                    ) : importedNodes.map(node => (
                                        <button
                                            key={node.id}
                                            onClick={() => { setSelectedFrameId(node.id); setShowAutoLayoutPanel(true) }}
                                            className={cn(
                                                "p-3 rounded-lg border text-left transition-all hover:border-pink-500/50",
                                                selectedFrameId === node.id ? "border-pink-500 bg-pink-500/10" : "border-border"
                                            )}
                                        >
                                            <div className="text-sm font-medium">{node.data?.label || node.id}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {node.style?.width}×{node.style?.height}
                                            </div>
                                            {autoLayouts[node.id] && (
                                                <Badge variant="outline" className="mt-2 text-[10px]">
                                                    {autoLayouts[node.id].direction} · gap {autoLayouts[node.id].gap}px
                                                </Badge>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Layout configuration panel */}
                            {selectedFrameId && showAutoLayoutPanel && (
                                <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-medium">Layout Configuration — {importedNodes.find(n => n.id === selectedFrameId)?.data?.label || selectedFrameId}</h3>
                                        <div className="flex gap-2">
                                            {autoLayouts[selectedFrameId] && (
                                                <Button size="sm" variant="destructive" onClick={() => removeAutoLayout(selectedFrameId)} className="h-7 text-xs">Remove Layout</Button>
                                            )}
                                            <Button size="sm" onClick={() => applyAutoLayout(selectedFrameId)} className="h-7 text-xs bg-pink-500 hover:bg-pink-600">Apply Layout</Button>
                                        </div>
                                    </div>

                                    {(() => {
                                        const currentLayout = autoLayouts[selectedFrameId] || DEFAULT_AUTO_LAYOUT
                                        return (
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Direction */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Direction</label>
                                                    <div className="flex gap-2">
                                                        {(['horizontal', 'vertical'] as LayoutDirection[]).map(dir => (
                                                            <Button
                                                                key={dir}
                                                                size="sm"
                                                                variant={currentLayout.direction === dir ? 'default' : 'outline'}
                                                                onClick={() => applyAutoLayout(selectedFrameId, { direction: dir })}
                                                                className="h-8 text-xs capitalize flex-1"
                                                            >{dir}</Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Gap */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Gap: {currentLayout.gap}px</label>
                                                    <input
                                                        type="range"
                                                        min={0} max={48} value={currentLayout.gap}
                                                        onChange={(e) => applyAutoLayout(selectedFrameId, { gap: Number(e.target.value) })}
                                                        className="w-full accent-pink-500"
                                                    />
                                                </div>

                                                {/* Align */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Align Items</label>
                                                    <div className="flex gap-1">
                                                        {(['start', 'center', 'end', 'stretch'] as LayoutAlign[]).map(a => (
                                                            <Button
                                                                key={a}
                                                                size="sm"
                                                                variant={currentLayout.align === a ? 'default' : 'outline'}
                                                                onClick={() => applyAutoLayout(selectedFrameId, { align: a })}
                                                                className="h-7 text-[10px] capitalize flex-1 px-1"
                                                            >{a}</Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Justify */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Justify Content</label>
                                                    <div className="flex gap-1">
                                                        {(['start', 'center', 'end', 'space-between'] as LayoutJustify[]).map(j => (
                                                            <Button
                                                                key={j}
                                                                size="sm"
                                                                variant={currentLayout.justify === j ? 'default' : 'outline'}
                                                                onClick={() => applyAutoLayout(selectedFrameId, { justify: j })}
                                                                className="h-7 text-[10px] capitalize flex-1 px-1"
                                                            >{j.replace('-', ' ')}</Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Padding */}
                                                <div className="space-y-2 col-span-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Padding</label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                                                            <div key={side} className="space-y-1">
                                                                <span className="text-[10px] text-muted-foreground capitalize">{side}</span>
                                                                <Input
                                                                    type="number"
                                                                    value={currentLayout.padding[side]}
                                                                    onChange={(e) => applyAutoLayout(selectedFrameId, { padding: { ...currentLayout.padding, [side]: Number(e.target.value) } })}
                                                                    className="h-7 text-xs"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Width/Height Constraints */}
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Width</label>
                                                    <div className="flex gap-1">
                                                        {(['fixed', 'fill', 'hug'] as ConstraintType[]).map(c => (
                                                            <Button
                                                                key={c}
                                                                size="sm"
                                                                variant={currentLayout.widthConstraint === c ? 'default' : 'outline'}
                                                                onClick={() => applyAutoLayout(selectedFrameId, { widthConstraint: c })}
                                                                className="h-7 text-[10px] capitalize flex-1"
                                                            >{c}</Button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-muted-foreground">Height</label>
                                                    <div className="flex gap-1">
                                                        {(['fixed', 'fill', 'hug'] as ConstraintType[]).map(c => (
                                                            <Button
                                                                key={c}
                                                                size="sm"
                                                                variant={currentLayout.heightConstraint === c ? 'default' : 'outline'}
                                                                onClick={() => applyAutoLayout(selectedFrameId, { heightConstraint: c })}
                                                                className="h-7 text-[10px] capitalize flex-1"
                                                            >{c}</Button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Wrap toggle */}
                                                <div className="space-y-2 col-span-2">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={currentLayout.wrap}
                                                            onChange={(e) => applyAutoLayout(selectedFrameId, { wrap: e.target.checked })}
                                                            className="accent-pink-500"
                                                        />
                                                        <span className="text-xs">Enable wrapping</span>
                                                    </label>
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Preview */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Preview</label>
                                        <div
                                            className="rounded-lg border bg-background min-h-[120px] overflow-hidden"
                                            style={getAutoLayoutCSS(autoLayouts[selectedFrameId] || DEFAULT_AUTO_LAYOUT)}
                                        >
                                            {[1, 2, 3, 4].map(i => (
                                                <div key={i} className="px-3 py-2 rounded bg-pink-500/10 border border-pink-500/30 text-xs text-pink-500">
                                                    Item {i}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Generated CSS */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Generated CSS</label>
                                        <pre className="text-[11px] bg-muted p-3 rounded-lg overflow-x-auto font-mono">
{JSON.stringify(getAutoLayoutCSS(autoLayouts[selectedFrameId] || DEFAULT_AUTO_LAYOUT), null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* ─── Component Variants Tab ──────────────────────────────────── */}
                    <TabsContent value="variants" className="h-full m-0 p-6 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold">Component Variants</h2>
                                    <p className="text-sm text-muted-foreground">Manage component states, sizes, and visual variations</p>
                                </div>
                                <Badge variant="outline" className="text-pink-500 border-pink-500/30">
                                    {designComponents.reduce((sum, c) => sum + c.variants.length, 0)} total variants
                                </Badge>
                            </div>

                            {/* Component List */}
                            <div className="grid grid-cols-2 gap-4">
                                {designComponents.map(comp => {
                                    const activeVariant = getActiveVariant(comp.id)
                                    const isSelected = selectedComponentId === comp.id
                                    return (
                                        <div
                                            key={comp.id}
                                            className={cn(
                                                "rounded-lg border transition-all cursor-pointer",
                                                isSelected ? "border-pink-500 ring-2 ring-pink-500/20" : "border-border hover:border-pink-500/40"
                                            )}
                                            onClick={() => setSelectedComponentId(isSelected ? null : comp.id)}
                                        >
                                            <div className="p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{comp.icon}</span>
                                                        <div>
                                                            <span className="font-medium text-sm">{comp.name}</span>
                                                            <p className="text-xs text-muted-foreground">{comp.category} · {comp.variants.length} variants</p>
                                                        </div>
                                                    </div>
                                                    {activeVariant && (
                                                        <Badge variant="secondary" className="text-[10px]">{activeVariant.name}</Badge>
                                                    )}
                                                </div>

                                                {/* Visual preview of active variant */}
                                                {activeVariant && (
                                                    <div className="flex items-center justify-center p-4 rounded-md bg-muted/30 border border-dashed">
                                                        <div
                                                            className="px-4 py-2 text-sm font-medium transition-all"
                                                            style={activeVariant.overrides as React.CSSProperties}
                                                        >
                                                            {comp.name}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Variant switcher pills */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {comp.variants.map(v => (
                                                        <button
                                                            key={v.id}
                                                            onClick={(e) => { e.stopPropagation(); switchVariant(comp.id, v.id) }}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all",
                                                                (activeVariants[comp.id] || comp.defaultVariantId) === v.id
                                                                    ? "bg-pink-500 text-white"
                                                                    : "bg-muted text-muted-foreground hover:bg-pink-500/10 hover:text-pink-500"
                                                            )}
                                                        >
                                                            {v.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Selected Component Detail */}
                            {selectedComponentId && (() => {
                                const comp = designComponents.find(c => c.id === selectedComponentId)
                                if (!comp) return null
                                const activeVar = getActiveVariant(selectedComponentId)
                                return (
                                    <div className="space-y-4 p-4 rounded-lg border bg-muted/20">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-medium">{comp.icon} {comp.name} — Variant Details</h3>
                                            <div className="flex gap-2">
                                                {isCreatingVariant ? (
                                                    <div className="flex gap-2 items-center">
                                                        <Input
                                                            value={newVariantName}
                                                            onChange={(e) => setNewVariantName(e.target.value)}
                                                            placeholder="Variant name"
                                                            className="h-7 text-xs w-32"
                                                            onKeyDown={(e) => e.key === 'Enter' && addVariant(selectedComponentId)}
                                                        />
                                                        <Button size="sm" onClick={() => addVariant(selectedComponentId)} className="h-7 text-xs bg-pink-500 hover:bg-pink-600">Add</Button>
                                                        <Button size="sm" variant="outline" onClick={() => setIsCreatingVariant(false)} className="h-7 text-xs">Cancel</Button>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" variant="outline" onClick={() => setIsCreatingVariant(true)} className="h-7 text-xs gap-1">
                                                        <Plus className="w-3 h-3" /> New Variant
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Variant grid with all variants side by side */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {comp.variants.map(v => (
                                                <div
                                                    key={v.id}
                                                    className={cn(
                                                        "p-3 rounded-lg border transition-all",
                                                        (activeVariants[comp.id] || comp.defaultVariantId) === v.id
                                                            ? "border-pink-500 bg-pink-500/5"
                                                            : "border-border"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium">{v.name}</span>
                                                        <div className="flex items-center gap-1">
                                                            {comp.defaultVariantId === v.id && (
                                                                <Badge variant="outline" className="text-[9px] px-1">Default</Badge>
                                                            )}
                                                            {comp.variants.length > 1 && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); deleteVariant(comp.id, v.id) }}
                                                                    className="text-muted-foreground hover:text-red-500 transition-colors"
                                                                    title="Delete variant"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-center p-3 rounded bg-muted/30 mb-2">
                                                        <div
                                                            className="px-3 py-1.5 text-xs font-medium transition-all"
                                                            style={v.overrides as React.CSSProperties}
                                                        >
                                                            {comp.name}
                                                        </div>
                                                    </div>
                                                    {/* Properties */}
                                                    <div className="space-y-1">
                                                        {Object.entries(v.properties).map(([key, val]) => (
                                                            <div key={key} className="flex items-center justify-between text-[10px]">
                                                                <span className="text-muted-foreground">{key}</span>
                                                                <span className="font-mono">{val}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Override editor */}
                                                    <div className="mt-2 space-y-1">
                                                        <span className="text-[10px] text-muted-foreground font-medium">Overrides</span>
                                                        {Object.entries(v.overrides).map(([key, val]) => (
                                                            <div key={key} className="flex items-center gap-1">
                                                                <span className="text-[10px] text-muted-foreground w-16 truncate">{key}</span>
                                                                <Input
                                                                    value={String(val)}
                                                                    onChange={(e) => updateVariantOverride(comp.id, v.id, key, e.target.value)}
                                                                    className="h-5 text-[10px] font-mono flex-1"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Auto Layout for this component */}
                                        {comp.autoLayout && (
                                            <div className="space-y-2 p-3 rounded border bg-background">
                                                <div className="flex items-center gap-2">
                                                    <Layout className="w-3 h-3 text-pink-500" />
                                                    <span className="text-xs font-medium">Auto Layout</span>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground grid grid-cols-3 gap-2">
                                                    <span>Direction: {comp.autoLayout.direction}</span>
                                                    <span>Gap: {comp.autoLayout.gap}px</span>
                                                    <span>Align: {comp.autoLayout.align}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    </TabsContent>

                    <TabsContent value="ai-generate" className="h-full m-0 p-6 overflow-y-auto">
                        <div className="max-w-3xl mx-auto space-y-6">
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-400 text-xs font-medium">
                                    <Sparkles className="w-3.5 h-3.5" /> AI-Powered Design
                                </div>
                                <h2 className="text-lg font-semibold">Generate with AI</h2>
                                <p className="text-sm text-muted-foreground">Describe what you need and let AI create it for you</p>
                            </div>

                            {/* Action Selector */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'generate-component' as const, icon: Wand2, label: 'Component', desc: 'React + Tailwind with accessibility' },
                                    { key: 'generate-palette' as const, icon: Palette, label: 'Color Palette', desc: 'WCAG AA compliant palettes' },
                                    { key: 'audit-accessibility' as const, icon: Accessibility, label: 'A11y Audit', desc: 'WCAG 2.2 compliance check' },
                                    { key: 'suggest-layout' as const, icon: Layout, label: 'Layout', desc: 'Responsive layout suggestions' },
                                ].map(a => (
                                    <button
                                        key={a.key}
                                        onClick={() => setAiAction(a.key)}
                                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                            aiAction === a.key
                                                ? 'border-pink-500/50 bg-pink-500/10 text-pink-400'
                                                : 'border-border/50 hover:border-border bg-muted/20 text-muted-foreground'
                                        }`}
                                    >
                                        <a.icon className="w-5 h-5 shrink-0" />
                                        <div>
                                            <div className="text-sm font-medium">{a.label}</div>
                                            <div className="text-xs opacity-60">{a.desc}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Prompt Input */}
                            <div className="space-y-2">
                                <Textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder={
                                        aiAction === 'generate-component' ? 'e.g. A pricing card with monthly/yearly toggle, feature list, and CTA button'
                                        : aiAction === 'generate-palette' ? 'e.g. A warm, earthy color palette for a wellness app'
                                        : aiAction === 'audit-accessibility' ? 'Paste your component HTML/JSX here to audit...'
                                        : 'e.g. A two-column dashboard with sidebar navigation, header, and main content area'
                                    }
                                    className="min-h-[80px] resize-none"
                                />
                                <Button
                                    onClick={runAiAction}
                                    disabled={isGeneratingAI}
                                    className="w-full gap-2 bg-pink-500 hover:bg-pink-600"
                                >
                                    {isGeneratingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {isGeneratingAI ? 'Generating…' : 'Generate'}
                                </Button>
                            </div>

                            {/* AI Result */}
                            {aiResult && (
                                <div className="space-y-3">
                                    {aiResult.code && (
                                        <div className="rounded-lg border bg-muted/20 overflow-hidden">
                                            <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                                                <span className="text-xs font-medium text-muted-foreground">Generated Code</span>
                                                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => navigator.clipboard.writeText(aiResult.code)}>Copy</Button>
                                            </div>
                                            <pre className="p-3 text-xs overflow-x-auto max-h-60"><code>{aiResult.code}</code></pre>
                                        </div>
                                    )}
                                    {aiResult.colors && (
                                        <div className="space-y-2">
                                            <span className="text-xs font-medium text-muted-foreground">Palette</span>
                                            <div className="flex gap-2">
                                                {aiResult.colors.map((c: any, i: number) => (
                                                    <div key={i} className="flex-1 text-center">
                                                        <div className="h-16 rounded-lg mb-1" style={{ backgroundColor: c.hex }} />
                                                        <div className="text-[10px] text-muted-foreground">{c.name}</div>
                                                        <div className="text-[10px] font-mono text-muted-foreground/60">{c.hex}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {aiResult.issues && (
                                        <div className="space-y-2">
                                            <span className="text-xs font-medium text-muted-foreground">Accessibility Issues ({aiResult.issues.length})</span>
                                            {aiResult.issues.map((issue: any, i: number) => (
                                                <div key={i} className="p-2 rounded-lg border bg-muted/20 text-xs">
                                                    <span className={`font-medium ${issue.severity === 'critical' ? 'text-red-400' : issue.severity === 'major' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                                        [{issue.severity}]
                                                    </span>{' '}
                                                    {issue.description}
                                                    {issue.fix && <div className="mt-1 text-muted-foreground">Fix: {issue.fix}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {aiResult.layout && (
                                        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                            <span className="text-xs font-medium text-muted-foreground">Layout: {aiResult.layout.name}</span>
                                            <p className="text-xs text-muted-foreground/80">{aiResult.layout.description}</p>
                                            {aiResult.layout.code && (
                                                <pre className="p-2 bg-muted/30 rounded text-xs overflow-x-auto max-h-40"><code>{aiResult.layout.code}</code></pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="design-system" className="h-full m-0 p-4">
                        <DesignSystemManager />
                    </TabsContent>

                    <TabsContent value="diagnostics" className="h-full m-0 p-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">System Diagnostics</h2>
                                <Button size="sm" variant="outline" onClick={() => setDesignDiagnostics([])} className="h-7 text-xs">Clear</Button>
                            </div>
                            {designDiagnostics.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                                    <p className="text-sm text-muted-foreground">All systems operational</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {designDiagnostics.map((diag: any, i: number) => (
                                        <div key={i} className={cn(
                                            "flex items-start gap-3 p-3 rounded border",
                                            diag.severity === 'error' ? 'border-red-500/20 bg-red-500/5' : 
                                            diag.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 
                                            'border-blue-500/20 bg-blue-500/5'
                                        )}>
                                            <div className={cn("text-xs font-bold uppercase shrink-0 mt-0.5",
                                                diag.severity === 'error' ? 'text-red-400' : 
                                                diag.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                                            )}>
                                                {diag.severity === 'error' ? '●' : diag.severity === 'warning' ? '▲' : 'ℹ'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm">{diag.message}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    {diag.source} · {new Date(diag.timestamp || Date.now()).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="settings" className="h-full m-0 p-4">
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold">Design Studio Settings</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium">Auto Save</div>
                                        <div className="text-xs text-muted-foreground">Automatically save changes</div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={designSettings.autoSave ? "default" : "outline"}
                                        onClick={() => updateDesignSettings({ autoSave: !designSettings.autoSave })}
                                    >
                                        {designSettings.autoSave ? "On" : "Off"}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium">Show Grid</div>
                                        <div className="text-xs text-muted-foreground">Display alignment grid</div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant={designSettings.showGrid ? "default" : "outline"}
                                        onClick={() => updateDesignSettings({ showGrid: !designSettings.showGrid })}
                                    >
                                        {designSettings.showGrid ? "On" : "Off"}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium">Theme</div>
                                        <div className="text-xs text-muted-foreground">Interface theme</div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateDesignSettings({ theme: designSettings.theme === 'light' ? 'dark' : 'light' })}
                                    >
                                        {designSettings.theme === 'light' ? 'Dark' : 'Light'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="prototype" className="h-full m-0 p-4">
                        <PrototypePlayer />
                    </TabsContent>

                    <TabsContent value="version-history" className="h-full m-0 p-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Version History</h2>
                                <Button size="sm" onClick={createDesignVersion} className="h-7 text-xs bg-pink-500 hover:bg-pink-600">Create Version</Button>
                            </div>
                            {designVersions.length === 0 ? (
                                <div className="text-center py-8">
                                    <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm text-muted-foreground">No versions saved yet</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">Create your first version to start tracking changes</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {designVersions.map((version: any, i: number) => (
                                        <div key={version.id} className="flex items-center gap-3 p-3 rounded border border-border hover:border-pink-500/50 transition-colors">
                                            <GitBranch className="w-4 h-4 text-pink-400 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium">{version.id}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {version.author} · {new Date(version.timestamp).toLocaleString()} · {version.frames?.length || 0} frames
                                                </div>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => restoreDesignVersion(version.id)} className="h-7 text-xs">Restore</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Collaboration Panel Overlay */}
            {showCollaboration && (
                <div className="absolute top-14 right-4 w-80 bg-background border rounded-lg shadow-lg z-50">
                    <CollaborationPanel
                        onClose={() => setShowCollaboration(false)}
                    />
                </div>
            )}

            {/* Figma Import Dialog */}
            <FigmaImportDialog
                open={false}
                onOpenChange={() => {}}
                onImport={handleFigmaImport}
            />

            {/* Upgrade 5: Export Dialog */}
            <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
        </div>
    );
}
