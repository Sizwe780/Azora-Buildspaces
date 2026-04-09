"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play, Pause, SkipForward, SkipBack, Smartphone, Monitor, Tablet,
  Maximize2, RotateCcw, ChevronRight, Pointer, Layers, History
} from "lucide-react";

type DevicePreview = "desktop" | "tablet" | "mobile";

interface CanvasFrame {
  id: string;
  label: string;
  width: number;
  height: number;
  componentType?: string;
}

interface Hotspot {
  id: string;
  frameId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  targetFrameId: string;
  transition: "push" | "fade" | "slide";
}

/* ─── Component preview matching InfiniteCanvas ─── */
function renderPreview(type: string, name: string) {
  switch (type) {
    case 'button': return <div className="h-10 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-medium px-4">Button</div>;
    case 'input': return <div className="h-10 bg-white border border-slate-300 rounded px-3 flex items-center text-xs text-slate-400">Input field...</div>;
    case 'textarea': return <div className="h-24 bg-white border border-slate-300 rounded p-2 text-xs text-slate-400">Textarea...</div>;
    case 'text': return <div className="text-sm text-slate-700">Sample text block</div>;
    case 'heading': return <div className="text-lg font-bold text-slate-900">Heading</div>;
    case 'image': return <div className="h-32 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-300">Image</div>;
    case 'card': return <div className="bg-white border rounded-lg p-3 shadow-sm space-y-2"><div className="h-4 bg-slate-200 rounded w-3/4" /><div className="h-3 bg-slate-100 rounded w-full" /><div className="h-3 bg-slate-100 rounded w-2/3" /></div>;
    case 'container': return <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 min-h-[80px] flex items-center justify-center text-xs text-slate-400">Container</div>;
    case 'grid': return <div className="grid grid-cols-2 gap-2"><div className="h-16 bg-slate-100 rounded" /><div className="h-16 bg-slate-100 rounded" /><div className="h-16 bg-slate-100 rounded" /><div className="h-16 bg-slate-100 rounded" /></div>;
    case 'table': return <div className="border rounded text-xs"><div className="grid grid-cols-3 gap-px bg-slate-200"><div className="bg-slate-100 p-1 font-medium">Col 1</div><div className="bg-slate-100 p-1 font-medium">Col 2</div><div className="bg-slate-100 p-1 font-medium">Col 3</div><div className="bg-white p-1">data</div><div className="bg-white p-1">data</div><div className="bg-white p-1">data</div></div></div>;
    default: return <div className="h-12 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-500">{name}</div>;
  }
}

const STORAGE_KEY = 'azora-canvas-state';

export default function PrototypePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [device, setDevice] = useState<DevicePreview>("desktop");
  const [currentScreen, setCurrentScreen] = useState(0);
  const [frames, setFrames] = useState<CanvasFrame[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [navigationHistory, setNavigationHistory] = useState<number[]>([0]);
  const [transition, setTransition] = useState<string>("");
  const [isAddingHotspot, setIsAddingHotspot] = useState(false);
  const [hotspotStart, setHotspotStart] = useState<{x: number; y: number} | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const totalScreens = frames.length;

  const deviceDimensions: Record<DevicePreview, { w: string; maxW: string; h: string; label: string; resolution: string }> = {
    desktop: { w: "w-full", maxW: "max-w-4xl", h: "h-full", label: "Desktop", resolution: "1920×1080" },
    tablet: { w: "w-[768px]", maxW: "max-w-[768px]", h: "max-h-[1024px]", label: "iPad", resolution: "768×1024" },
    mobile: { w: "w-[375px]", maxW: "max-w-[375px]", h: "max-h-[812px]", label: "iPhone", resolution: "375×812" },
  };

  // Load frames from canvas state
  useEffect(() => {
    const loadFrames = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { nodes } = JSON.parse(saved);
          if (nodes?.length > 0) {
            const canvasFrames: CanvasFrame[] = nodes.map((n: any) => ({
              id: n.id,
              label: n.data?.label || 'Untitled',
              width: n.data?.width || 375,
              height: n.data?.height || 667,
              componentType: n.data?.componentType || '',
            }));
            setFrames(canvasFrames);
          }
        }
      } catch { /* ignore */ }
    };

    loadFrames();

    // Listen for canvas saves to refresh
    const handler = () => loadFrames();
    window.addEventListener('design:canvas-saved', handler);
    return () => window.removeEventListener('design:canvas-saved', handler);
  }, []);

  // Autoplay
  useEffect(() => {
    if (isPlaying && totalScreens > 1) {
      autoplayRef.current = setInterval(() => {
        setCurrentScreen(prev => {
          const next = (prev + 1) % totalScreens;
          setTransition("animate-slide-in");
          setTimeout(() => setTransition(""), 300);
          return next;
        });
      }, 3000);
    }
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [isPlaying, totalScreens]);

  const navigateTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= totalScreens) return;
    setTransition("animate-fade-in");
    setTimeout(() => setTransition(""), 300);
    setCurrentScreen(idx);
    setNavigationHistory(prev => [...prev, idx]);
  }, [totalScreens]);

  const goBack = useCallback(() => {
    if (navigationHistory.length <= 1) return;
    const prev = navigationHistory[navigationHistory.length - 2];
    setNavigationHistory(h => h.slice(0, -1));
    setCurrentScreen(prev);
    setTransition("animate-fade-in");
    setTimeout(() => setTransition(""), 300);
  }, [navigationHistory]);

  // Hotspot click handler
  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked on a hotspot
    const currentHotspots = hotspots.filter(h => h.frameId === frames[currentScreen]?.id);
    const clicked = currentHotspots.find(h =>
      x >= h.x && x <= h.x + h.width && y >= h.y && y <= h.y + h.height
    );
    if (clicked) {
      const targetIdx = frames.findIndex(f => f.id === clicked.targetFrameId);
      if (targetIdx >= 0) navigateTo(targetIdx);
    }
  }, [hotspots, frames, currentScreen, navigateTo]);

  const activeFrame = frames[currentScreen];
  const dim = deviceDimensions[device];

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigateTo(currentScreen - 1);
      if (e.key === 'ArrowRight') navigateTo(currentScreen + 1);
      if (e.key === 'Escape') { setIsPlaying(false); setIsAddingHotspot(false); }
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentScreen, navigateTo]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">
            Prototype
          </Badge>
          {totalScreens > 0 && (
            <span className="text-xs text-muted-foreground">
              Screen {currentScreen + 1} of {totalScreens}
            </span>
          )}
          {activeFrame && (
            <span className="text-[10px] text-gray-600 font-mono">{activeFrame.label}</span>
          )}
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-1">
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
            onClick={goBack}
            disabled={navigationHistory.length <= 1}
            title="Back"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
            onClick={() => navigateTo(currentScreen - 1)}
            disabled={currentScreen <= 0}
          >
            <SkipBack className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant={isPlaying ? "destructive" : "ghost"}
            className={`h-7 w-7 p-0 ${isPlaying ? '' : 'text-muted-foreground hover:text-white'}`}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={totalScreens <= 1}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
            onClick={() => navigateTo(currentScreen + 1)}
            disabled={currentScreen >= totalScreens - 1}
          >
            <SkipForward className="w-3 h-3" />
          </Button>
        </div>

        {/* Device selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-0.5">
            {([
              { id: "desktop" as DevicePreview, icon: Monitor },
              { id: "tablet" as DevicePreview, icon: Tablet },
              { id: "mobile" as DevicePreview, icon: Smartphone },
            ]).map(({ id, icon: Icon }) => (
              <Button
                key={id}
                size="sm"
                variant="ghost"
                className={`h-6 px-2 gap-1 ${device === id ? "text-white bg-white/10" : "text-muted-foreground"}`}
                onClick={() => setDevice(id)}
              >
                <Icon className="w-3 h-3" />
                <span className="text-[9px] hidden lg:inline">{deviceDimensions[id].label}</span>
              </Button>
            ))}
          </div>
          <span className="text-[9px] text-gray-600 font-mono">{dim.resolution}</span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Screen list sidebar */}
        {totalScreens > 0 && (
          <div className="w-44 border-r border-white/[0.06] bg-white/[0.01] flex flex-col">
            <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2">
              <Layers className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Screens</span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {frames.map((frame, idx) => (
                  <button
                    key={frame.id}
                    onClick={() => navigateTo(idx)}
                    className={`w-full text-left rounded-lg overflow-hidden border transition-all ${
                      currentScreen === idx
                        ? "border-purple-500 ring-1 ring-purple-500/30 bg-purple-500/5"
                        : "border-white/[0.06] hover:border-white/20 bg-white/[0.02]"
                    }`}
                  >
                    <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 p-1.5 flex flex-col justify-between">
                      <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">
                        {idx + 1}
                      </span>
                      <div className="text-[9px] font-medium text-white truncate">{frame.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto relative">
          {totalScreens === 0 ? (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto border border-white/10">
                <Maximize2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300">Prototype Preview</p>
                <p className="text-xs text-gray-600 mt-1">
                  Add frames to your canvas and save to preview them here.
                </p>
                <p className="text-[10px] text-gray-700 mt-2">
                  Drag components from the library → Save canvas (Ctrl+S) → Preview updates automatically
                </p>
              </div>
            </div>
          ) : (
            <div className={`${dim.w} ${dim.maxW} ${dim.h} mx-auto flex flex-col`}>
              {/* Device chrome */}
              {device !== "desktop" && (
                <div className="flex items-center justify-center py-2">
                  <div className={`${device === 'mobile' ? 'w-20' : 'w-8'} h-1 bg-white/10 rounded-full`} />
                </div>
              )}

              {/* Frame content */}
              <div
                ref={previewRef}
                onClick={handlePreviewClick}
                className={`
                  flex-1 rounded-xl border border-white/[0.08] bg-white overflow-auto
                  transition-all duration-300 relative
                  ${device === 'mobile' ? 'rounded-[2rem] border-[3px] border-slate-700' : ''}
                  ${device === 'tablet' ? 'rounded-2xl border-2 border-slate-700' : ''}
                  ${transition}
                `}
                style={{ cursor: isAddingHotspot ? 'crosshair' : 'default' }}
              >
                <div className="p-6 min-h-full">
                  {/* Frame label */}
                  <div className="mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-xs font-semibold text-slate-700">{activeFrame.label}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{activeFrame.width}×{activeFrame.height}</span>
                  </div>

                  {/* Rendered component */}
                  <div className="space-y-4">
                    {activeFrame.componentType ? (
                      renderPreview(activeFrame.componentType, activeFrame.label)
                    ) : (
                      /* Default screen wireframe */
                      <div className="space-y-3">
                        <div className="h-12 bg-slate-100 rounded-lg flex items-center px-4">
                          <div className="h-6 w-6 bg-slate-200 rounded" />
                          <div className="ml-3 h-3 bg-slate-200 rounded w-24" />
                          <div className="ml-auto flex gap-2">
                            <div className="h-3 w-12 bg-slate-200 rounded" />
                            <div className="h-3 w-12 bg-slate-200 rounded" />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-3">
                            <div className="h-6 bg-slate-200 rounded w-3/4" />
                            <div className="h-4 bg-slate-100 rounded w-full" />
                            <div className="h-4 bg-slate-100 rounded w-5/6" />
                            <div className="h-32 bg-slate-50 rounded border border-slate-200 mt-4 flex items-center justify-center text-xs text-slate-400">
                              {activeFrame.label} Content Area
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="h-20 bg-slate-50 rounded border border-slate-200 p-2">
                              <div className="h-2 bg-slate-200 rounded w-2/3 mb-2" />
                              <div className="h-2 bg-slate-100 rounded" />
                            </div>
                            <div className="h-20 bg-slate-50 rounded border border-slate-200 p-2">
                              <div className="h-2 bg-slate-200 rounded w-1/2 mb-2" />
                              <div className="h-2 bg-slate-100 rounded" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hotspot overlays */}
                  {hotspots
                    .filter(h => h.frameId === activeFrame.id)
                    .map(h => (
                      <div
                        key={h.id}
                        className="absolute border-2 border-blue-500/50 bg-blue-500/10 rounded cursor-pointer hover:bg-blue-500/20 transition-colors group"
                        style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.width}%`, height: `${h.height}%` }}
                      >
                        <div className="absolute -top-5 left-0 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          <ChevronRight className="w-2 h-2 inline" /> {frames.find(f => f.id === h.targetFrameId)?.label}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Navigation dots */}
              {totalScreens > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {frames.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => navigateTo(idx)}
                      className={`rounded-full transition-all ${
                        currentScreen === idx
                          ? "w-6 h-2 bg-purple-500"
                          : "w-2 h-2 bg-white/20 hover:bg-white/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer status bar */}
      {totalScreens > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/[0.06] bg-white/[0.01] text-[10px] text-gray-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Pointer className="w-3 h-3" />{hotspots.filter(h => h.frameId === activeFrame?.id).length} hotspots</span>
            <span className="flex items-center gap-1"><History className="w-3 h-3" />{navigationHistory.length - 1} navigations</span>
          </div>
          <div className="flex items-center gap-3">
            <span>←→ Navigate</span>
            <span>Space Play/Pause</span>
            <span>Esc Stop</span>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
