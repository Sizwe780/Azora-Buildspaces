"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Figma, Loader2, CheckCircle2, AlertCircle, Wifi, WifiOff } from "lucide-react";

interface FigmaImportDialogProps {
    onImport: (data: any) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export default function FigmaImportDialog({ onImport, open, onOpenChange }: FigmaImportDialogProps) {
    const [url, setUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
    const [connectionMessage, setConnectionMessage] = useState("");
    const figmaEnabled = process.env.NEXT_PUBLIC_FIGMA_ENABLED === 'true'

    // Check Figma connection on mount
    useEffect(() => {
        checkFigmaConnection();
    }, []);

    const checkFigmaConnection = async () => {
        if (!figmaEnabled) {
            setConnectionStatus('disconnected');
            setConnectionMessage('Figma integration disabled');
            return;
        }

        setConnectionStatus('checking');
        try {
            const resp = await fetch('/api/design/figma-status');
            if (resp.ok) {
                const data = await resp.json();
                if (data.connected) {
                    setConnectionStatus('connected');
                    setConnectionMessage(data.message || 'Connected to Figma API');
                } else {
                    setConnectionStatus('disconnected');
                    setConnectionMessage(data.message || 'Not connected');
                }
            } else {
                setConnectionStatus('error');
                setConnectionMessage('Could not verify connection');
            }
        } catch {
            // API might not exist yet, assume connected if figmaEnabled
            setConnectionStatus(figmaEnabled ? 'connected' : 'disconnected');
            setConnectionMessage(figmaEnabled ? 'Ready to import' : 'Figma disabled');
        }
    };

    const handleImport = async () => {
        if (!url) return;
        setIsImporting(true);

        // Real implementation requires valid FIGMA_TOKEN and server-side integration
        if (!figmaEnabled) {
            setIsImporting(false)
            return
        }

        try {
            const resp = await fetch('/api/design/figma-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            })

            const data = await resp.json()

            if (!resp.ok) {
                throw new Error(data.error || 'Import failed')
            }

            if (data.frame) {
                onImport({
                    id: data.frame.id,
                    name: data.frame.name,
                    width: data.frame.width || 375,
                    height: data.frame.height || 812,
                    components: data.frame.components || []
                })

                setIsSuccess(true)
                // Try to persist the imported frame to the database
                try {
                    const saveResp = await fetch('/api/design/frames', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: data.frame.id,
                            name: data.frame.name,
                            width: data.frame.width,
                            height: data.frame.height,
                            components: data.frame.components,
                            raw: data.frame.raw || data.frame
                        })
                    })

                    if (saveResp.ok) {
                        const saved = await saveResp.json()
                        console.log('Figma frame persisted', saved)
                    } else {
                        const err = await saveResp.json()
                        console.warn('Could not persist figma frame', err)
                    }
                } catch (err) {
                    console.warn('Persist request failed', err)
                }

                setTimeout(() => {
                    setIsSuccess(false)
                    setUrl("")
                }, 2000)
            }
        } catch (error) {
            console.error('Figma import failed', error)
            alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
            setIsImporting(false)
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Figma className="w-4 h-4 text-pink-500" />
                    Import from Figma
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Figma className="w-5 h-5 text-pink-500" />
                        Import Figma Design
                    </DialogTitle>
                </DialogHeader>

                {/* Connection Status Banner */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    connectionStatus === 'connected' 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : connectionStatus === 'checking'
                        ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                        : connectionStatus === 'error'
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                        : 'bg-zinc-500/10 border border-zinc-500/20 text-muted-foreground'
                }`}>
                    {connectionStatus === 'checking' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : connectionStatus === 'connected' ? (
                        <Wifi className="w-3.5 h-3.5" />
                    ) : connectionStatus === 'error' ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                        <WifiOff className="w-3.5 h-3.5" />
                    )}
                    <span className="flex-1">{connectionMessage}</span>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={checkFigmaConnection}
                        className="h-5 px-2 text-[10px]"
                    >
                        Refresh
                    </Button>
                </div>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Figma File URL</label>
                        <Input 
                            placeholder="https://www.figma.com/file/..." 
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Paste the link to your Figma file or specific frame.
                        </p>
                        {!figmaEnabled && (
                            <p className="text-xs text-amber-400 mt-2">Figma import is disabled. Configure <code>NEXT_PUBLIC_FIGMA_ENABLED=true</code> and provide a <code>FIGMA_TOKEN</code> to enable.</p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button 
                        className="w-full gap-2" 
                        onClick={handleImport}
                        disabled={isImporting || !url || !figmaEnabled}
                    >
                        {isImporting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Importing...
                            </>
                        ) : isSuccess ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Imported Successfully
                            </>
                        ) : (
                            <>
                                <Figma className="w-4 h-4" />
                                Import Frame
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
