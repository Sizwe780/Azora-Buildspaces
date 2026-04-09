"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Server, 
    Trash2, 
    Code, 
    Copy, 
    Check, 
    Loader2, 
    ChevronDown, 
    ChevronUp, 
    Save, 
    Terminal, 
    FileJson, 
    Zap,
    ExternalLink,
    Play
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Endpoint {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
}

export default function APIEndpointGenerator({ projectName }: { projectName: string }) {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([
        { id: "1", method: "GET", path: "/api/users", description: "Get all users" },
        { id: "2", method: "POST", path: "/api/users", description: "Create a new user" }
    ]);
    const [generatedCode, setGeneratedCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showCode, setShowCode] = useState(false);

    const addEndpoint = () => {
        const newEndpoint: Endpoint = {
            id: Date.now().toString(),
            method: "GET",
            path: "/api/new-endpoint",
            description: "New endpoint description"
        };
        setEndpoints([...endpoints, newEndpoint]);
    };

    const removeEndpoint = (id: string) => {
        setEndpoints(endpoints.filter(e => e.id !== id));
    };

    const updateMethod = (id: string, method: Endpoint['method']) => {
        setEndpoints(endpoints.map(e => e.id === id ? { ...e, method } : e));
    };

    const handleGenerate = useCallback(async () => {
        if (endpoints.length === 0) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Generate a single Next.js App Router route.ts file that handles these endpoints:\n${endpoints.map(e => `${e.method} ${e.path} - ${e.description}`).join('\n')}\n\nRequirements:\n- Use NextRequest and NextResponse\n- Standardize on a single file structure (use switch/case on URL patterns or exported methods if common path)\n- Include Zod validation schemas for POST/PUT\n- Use a mock database pattern for now.`,
                    language: 'typescript',
                }),
            });
            
            const data = await res.json();
            if (res.ok && (data.code || data.result)) {
                setGeneratedCode(data.code || data.result);
                setShowCode(true);
                toast({ title: "API Routes Generated", description: "Standardized Next.js handlers created." });
            } else {
                throw new Error("AI Generation failed");
            }
        } catch (err) {
            toast({ title: "Generation Error", description: "Falling back to local template.", variant: "destructive" });
            // Fallback to basic template logic (original code had generateRouteCode)
            const fallbackCode = `// Fallback generated routes for ${projectName}\nimport { NextRequest, NextResponse } from 'next/server';\n\n// TODO: Implement endpoints\n`;
            setGeneratedCode(fallbackCode);
            setShowCode(true);
        } finally {
            setIsGenerating(false);
        }
    }, [endpoints, projectName]);

    const handleSaveToWorkspace = async () => {
        if (!generatedCode) return;
        setIsSaving(true);
        try {
            // Default path for generated API
            const targetPath = endpoints.length > 0 ? `app${endpoints[0].path}/route.ts` : 'app/api/generated/route.ts';
            
            const res = await fetch('/api/fs/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: targetPath,
                    content: generatedCode
                })
            });

            if (res.ok) {
                toast({
                    title: "Saved to Workspace",
                    description: `File created at ${targetPath}`,
                });
            } else {
                throw new Error("Failed to write file");
            }
        } catch (error) {
            toast({
                title: "Save Failed",
                description: "Environment permissions or path error.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const METHODS: Endpoint['method'][] = ['GET', 'POST', 'PUT', 'DELETE'];

    return (
        <div className="h-full flex flex-col gap-6 p-6 bg-background">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">API Scaffolding</h2>
                    <p className="text-sm text-muted-foreground">Rapidly generate backend routes and type-safe schemas.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addEndpoint}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Endpoint
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={handleGenerate} 
                        disabled={isGenerating || endpoints.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                        Generate Routes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
                {/* Endpoints List */}
                <div className="space-y-4 overflow-y-auto pr-2">
                    {endpoints.map((endpoint) => (
                        <Card key={endpoint.id} className="border-border shadow-none hover:border-blue-500/50 transition-colors">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div 
                                    onClick={() => {
                                        const idx = METHODS.indexOf(endpoint.method);
                                        updateMethod(endpoint.id, METHODS[(idx + 1) % METHODS.length]);
                                    }}
                                    className={`w-16 flex items-center justify-center py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                        endpoint.method === 'GET' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                        endpoint.method === 'POST' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                        endpoint.method === 'PUT' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                        'bg-destructive/10 text-destructive border border-destructive/20'
                                    }`}
                                >
                                    {endpoint.method}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Input 
                                        value={endpoint.path} 
                                        
                                        onChange={(e) => {
                                            const newEndpoints = [...endpoints];
                                            const index = newEndpoints.findIndex(en => en.id === endpoint.id);
                                            newEndpoints[index].path = e.target.value;
                                            setEndpoints(newEndpoints);
                                        }}
                                        className="h-7 text-xs font-mono px-0 focus-visible:ring-0"
                                    />
                                    <Input 
                                        value={endpoint.description} 
                                        
                                        onChange={(e) => {
                                            const newEndpoints = [...endpoints];
                                            const index = newEndpoints.findIndex(en => en.id === endpoint.id);
                                            newEndpoints[index].description = e.target.value;
                                            setEndpoints(newEndpoints);
                                        }}
                                        placeholder="Description..."
                                        className="h-6 text-[11px] text-muted-foreground px-0 focus-visible:ring-0"
                                    />
                                </div>
                                <Button  size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeEndpoint(endpoint.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                    {endpoints.length === 0 && (
                        <div className="h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                            <Server className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">No endpoints defined yet.</p>
                            <Button variant="link" size="sm" onClick={addEndpoint}>Add your first route</Button>
                        </div>
                    )}
                </div>

                {/* Preview & Output */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    {showCode ? (
                        <Card className="flex-1 flex flex-col overflow-hidden border-border bg-slate-950">
                            <CardHeader className="py-2 px-4 flex flex-row items-center justify-between border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                    <FileJson className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">route.ts</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button  size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={handleCopy}>
                                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                    <Button 
                                         
                                        size="icon" 
                                        className="h-7 w-7 text-slate-400 hover:text-emerald-500" 
                                        onClick={handleSaveToWorkspace}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    </Button>
                                </div>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <pre className="p-4 text-[11px] font-mono text-slate-300 whitespace-pre-wrap">{generatedCode}</pre>
                            </ScrollArea>
                        </Card>
                    ) : (
                        <Card className="flex-1 flex flex-col items-center justify-center border-dashed border-2 bg-muted/5">
                            <Code className="w-12 h-12 text-muted-foreground/20 mb-4" />
                            <p className="text-sm text-muted-foreground">Define endpoints and click generate to see code.</p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

