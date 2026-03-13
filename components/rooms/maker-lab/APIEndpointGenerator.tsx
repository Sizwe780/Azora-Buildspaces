"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Server, Trash2, Code, Copy, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Endpoint {
    id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    description: string;
}

function generateRouteCode(endpoints: Endpoint[], projectName: string): string {
    const imports = `import { NextRequest, NextResponse } from 'next/server';\n\n`;
    const routes = endpoints.map(ep => {
        const fnName = ep.path.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
        const resourceName = ep.path.split('/').filter(Boolean).pop() || 'resource';
        if (ep.method === 'GET') {
            return `// ${ep.description}\nexport async function GET(request: NextRequest) {\n  try {\n    // TODO: Replace with actual database query\n    const ${resourceName} = await fetch(process.env.API_URL + '${ep.path}');\n    const data = await ${resourceName}.json();\n    return NextResponse.json({ data, success: true });\n  } catch (error) {\n    return NextResponse.json({ error: 'Failed to fetch ${resourceName}' }, { status: 500 });\n  }\n}\n`;
        } else if (ep.method === 'POST') {
            return `// ${ep.description}\nexport async function POST(request: NextRequest) {\n  try {\n    const body = await request.json();\n    // TODO: Validate body with zod schema\n    // TODO: Replace with actual database insert\n    const result = await fetch(process.env.API_URL + '${ep.path}', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(body),\n    });\n    const data = await result.json();\n    return NextResponse.json({ data, success: true }, { status: 201 });\n  } catch (error) {\n    return NextResponse.json({ error: 'Failed to create ${resourceName}' }, { status: 500 });\n  }\n}\n`;
        } else if (ep.method === 'PUT') {
            return `// ${ep.description}\nexport async function PUT(request: NextRequest) {\n  try {\n    const body = await request.json();\n    const { searchParams } = new URL(request.url);\n    const id = searchParams.get('id');\n    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });\n    // TODO: Replace with actual database update\n    return NextResponse.json({ success: true, updated: id });\n  } catch (error) {\n    return NextResponse.json({ error: 'Failed to update ${resourceName}' }, { status: 500 });\n  }\n}\n`;
        } else {
            return `// ${ep.description}\nexport async function DELETE(request: NextRequest) {\n  try {\n    const { searchParams } = new URL(request.url);\n    const id = searchParams.get('id');\n    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });\n    // TODO: Replace with actual database delete\n    return NextResponse.json({ success: true, deleted: id });\n  } catch (error) {\n    return NextResponse.json({ error: 'Failed to delete ${resourceName}' }, { status: 500 });\n  }\n}\n`;
        }
    });
    return `// Auto-generated API routes for ${projectName}\n// Generated at ${new Date().toISOString()}\n\n${imports}${routes.join('\n')}`;
}

export default function APIEndpointGenerator({ projectName }: { projectName: string }) {
    const [endpoints, setEndpoints] = useState<Endpoint[]>([
        { id: "1", method: "GET", path: "/api/users", description: "Get all users" },
        { id: "2", method: "POST", path: "/api/users", description: "Create a new user" }
    ]);
    const [generatedCode, setGeneratedCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
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
            // Try AI-powered generation first
            const res = await fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Generate Next.js App Router API route handlers for these endpoints:\n${endpoints.map(e => `${e.method} ${e.path} - ${e.description}`).join('\n')}\n\nUse NextRequest/NextResponse, include error handling, TypeScript types, and TODO comments for database integration.`,
                    language: 'typescript',
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.code || data.result) {
                    setGeneratedCode(data.code || data.result);
                    setShowCode(true);
                    setIsGenerating(false);
                    return;
                }
            }
        } catch { /* fallback below */ }
        // Fallback: local template generation
        const code = generateRouteCode(endpoints, projectName);
        setGeneratedCode(code);
        setShowCode(true);
        setIsGenerating(false);
    }, [endpoints, projectName]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const METHODS: Endpoint['method'][] = ['GET', 'POST', 'PUT', 'DELETE'];

    return (
        <div className="h-full flex flex-col p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-500" />
                    <h3 className="text-lg font-semibold">API Endpoints</h3>
                    <Badge variant="outline" className="text-xs">{endpoints.length} routes</Badge>
                </div>
                <Button size="sm" onClick={addEndpoint}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Endpoint
                </Button>
            </div>

            <div className="grid gap-4">
                {endpoints.map((endpoint) => (
                    <Card key={endpoint.id}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <button
                                onClick={() => {
                                    const idx = METHODS.indexOf(endpoint.method);
                                    updateMethod(endpoint.id, METHODS[(idx + 1) % METHODS.length]);
                                }}
                                className="cursor-pointer"
                            >
                                <Badge className={
                                    endpoint.method === 'GET' ? 'bg-green-500' :
                                    endpoint.method === 'POST' ? 'bg-blue-500' :
                                    endpoint.method === 'PUT' ? 'bg-yellow-500' : 'bg-red-500'
                                }>
                                    {endpoint.method}
                                </Badge>
                            </button>
                            <div className="flex-1">
                                <Input 
                                    value={endpoint.path} 
                                    onChange={(e) => {
                                        const newEndpoints = [...endpoints];
                                        const index = newEndpoints.findIndex(en => en.id === endpoint.id);
                                        newEndpoints[index].path = e.target.value;
                                        setEndpoints(newEndpoints);
                                    }}
                                    className="font-mono text-sm"
                                />
                            </div>
                            <div className="flex-1">
                                <Input 
                                    value={endpoint.description} 
                                    onChange={(e) => {
                                        const newEndpoints = [...endpoints];
                                        const index = newEndpoints.findIndex(en => en.id === endpoint.id);
                                        newEndpoints[index].description = e.target.value;
                                        setEndpoints(newEndpoints);
                                    }}
                                    placeholder="Description"
                                />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeEndpoint(endpoint.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {showCode && generatedCode && (
                <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm">Generated Code</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCopy}>
                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowCode(false)}>
                                <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <pre className="px-4 pb-4 text-xs font-mono overflow-auto max-h-64 text-muted-foreground whitespace-pre-wrap">{generatedCode}</pre>
                    </CardContent>
                </Card>
            )}

            <div className="mt-auto pt-4 border-t">
                <Button className="w-full gap-2" onClick={handleGenerate} disabled={isGenerating || endpoints.length === 0}>
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code className="w-4 h-4" />}
                    {isGenerating ? 'Generating...' : 'Generate API Routes'}
                </Button>
            </div>
        </div>
    );
}
