"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Globe,
    Server,
    Database,
    Cloud,
    Container,
    Github,
    Play,
    Settings,
    Download,
    Upload,
    CheckCircle,
    AlertCircle,
    Zap,
    Plus,
    Rocket,
    Clock,
    Activity,
    Terminal,
    RefreshCw,
    ExternalLink
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface DeploymentConfigProps {
    projectName: string;
}

interface DeploymentTarget {
    id: string;
    name: string;
    provider: string;
    status: 'configured' | 'ready' | 'deployed' | 'error';
    config: Record<string, any>;
}

interface Pipeline {
    id: string;
    name: string;
    provider: string;
    status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
    startedAt: number;
    duration?: number;
}

export default function DeploymentConfig({ projectName }: DeploymentConfigProps) {
    const sessionResult = useSession();
    const session = sessionResult?.data ?? null;
    const [targets, setTargets] = useState<DeploymentTarget[]>([
        {
            id: "vercel",
            name: "Vercel",
            provider: "vercel",
            status: "ready",
            config: {
                framework: "nextjs",
                buildCommand: "npm run build",
                outputDirectory: ".next",
                installCommand: "npm install"
            }
        },
        {
            id: "netlify",
            name: "Netlify",
            provider: "netlify",
            status: "configured",
            config: {
                buildCommand: "npm run build",
                publishDirectory: "out",
                functionsDirectory: "netlify/functions"
            }
        },
        {
            id: "railway",
            name: "Railway",
            provider: "railway",
            status: "ready",
            config: {
                serviceType: "web",
                port: "3000",
                buildCommand: "npm run build",
                startCommand: "npm start"
            }
        }
    ]);

    const [selectedTarget, setSelectedTarget] = useState<string>("vercel");
    const [envVars, setEnvVars] = useState([
        { key: "DATABASE_URL", value: "postgresql://...", required: true },
        { key: "NEXTAUTH_SECRET", value: "your-secret-key", required: true },
        { key: "NEXTAUTH_URL", value: "https://your-domain.com", required: true }
    ]);

    const [isDeploying, setIsDeploying] = useState(false);
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [activeTab, setActiveTab] = useState("config");

    useEffect(() => {
        fetchPipelines();
        const interval = setInterval(fetchPipelines, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchPipelines = async () => {
        try {
            const res = await fetch('/api/cicd?action=pipelines');
            const data = await res.json();
            if (data.pipelines) {
                setPipelines(data.pipelines);
            }
        } catch (error) {
            console.error("Failed to fetch pipelines:", error);
        }
    };

    const handleDeploy = async () => {
        setIsDeploying(true);
        try {
            const target = targets.find(t => t.id === selectedTarget);
            const res = await fetch('/api/cicd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'trigger',
                    options: {
                        name: `${projectName} - ${target?.name} Deploy`,
                        provider: 'github-actions',
                        branch: 'main'
                    }
                })
            });

            const data = await res.json();
            if (data.pipeline) {
                toast({
                    title: "Deployment Triggered",
                    description: `Pipeline ${data.pipeline.id} is now running.`,
                });
                setPipelines([data.pipeline, ...pipelines]);
                setActiveTab("pipelines");
            }
        } catch (error) {
            toast({
                title: "Deployment Failed",
                description: "Failed to trigger CI/CD pipeline.",
                variant: "destructive"
            });
        } finally {
            setIsDeploying(false);
        }
    };

    const [dockerConfig, setDockerConfig] = useState({
        baseImage: "node:18-alpine",
        workingDir: "/app",
        expose: "3000",
        buildCommand: "npm run build",
        startCommand: "npm start"
    });

    const updateTargetConfig = (targetId: string, key: string, value: any) => {
        setTargets(targets.map(target =>
            target.id === targetId
                ? { ...target, config: { ...target.config, [key]: value } }
                : target
        ));
    };

    const addEnvVar = () => {
        setEnvVars([...envVars, { key: "", value: "", required: false }]);
    };

    const updateEnvVar = (index: number, field: string, value: string) => {
        setEnvVars(envVars.map((env, i) =>
            i === index ? { ...env, [field]: value } : env
        ));
    };

    const removeEnvVar = (index: number) => {
        setEnvVars(envVars.filter((_, i) => i !== index));
    };

    const generateDockerfile = () => {
        return `FROM ${dockerConfig.baseImage}

WORKDIR ${dockerConfig.workingDir}

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN ${dockerConfig.buildCommand}

# Expose port
EXPOSE ${dockerConfig.expose}

# Start the application
CMD ["${dockerConfig.startCommand}"]`;
    };

    const generateGitHubActions = () => {
        return `name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Build application
      run: npm run build
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: \${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: \${{ secrets.ORG_ID }}
        vercel-project-id: \${{ secrets.PROJECT_ID }}
        vercel-args: '--prod'`;
    };

    const generateKubernetes = () => {
        return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${projectName}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${projectName}
  template:
    metadata:
      labels:
        app: ${projectName}
    spec:
      containers:
      - name: ${projectName}
        image: ${projectName}:latest
        ports:
        - containerPort: 3000
        env:
        ${envVars.filter(env => env.required).map(env =>
            `- name: ${env.key}\n          value: "${env.value}"`
        ).join('\n        ')}
---
apiVersion: v1
kind: Service
metadata:
  name: ${projectName}-service
spec:
  selector:
    app: ${projectName}
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer`;
    };

    const selectedTargetData = targets.find(t => t.id === selectedTarget);

    return (
        <div className="h-full flex overflow-hidden">
            {/* Targets Sidebar */}
            <aside className="w-64 border-r bg-muted/20 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Endpoints</h3>
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                    {targets.map(target => (
                        <Card
                            key={target.id}
                            className={`cursor-pointer transition-all border-2 ${selectedTarget === target.id
                                ? 'bg-primary/5 border-primary shadow-sm'
                                : 'hover:bg-muted/50 border-transparent shadow-none'
                                }`}
                            onClick={() => setSelectedTarget(target.id)}
                        >
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {target.provider === 'vercel' && <Globe className="w-4 h-4 text-blue-500" />}
                                        {target.provider === 'netlify' && <Cloud className="w-4 h-4 text-cyan-500" />}
                                        {target.provider === 'railway' && <Server className="w-4 h-4 text-purple-500" />}
                                        <span className="font-medium text-sm">{target.name}</span>
                                    </div>
                                    <Badge
                                        variant={target.status === 'ready' ? 'default' :
                                            target.status === 'configured' ? 'secondary' : 'outline'}
                                        className="text-[10px] h-4 px-1"
                                    >
                                        {target.status}
                                    </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                    {target.config.framework || 'Custom'} • {target.config.outputDirectory || 'build'}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8" onClick={() => setActiveTab("pipelines")}>
                        <Activity className="w-3.5 h-3.5 mr-2" />
                        Active Pipelines ({pipelines.filter(p => p.status === 'running').length})
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-8">
                        <Terminal className="w-3.5 h-3.5 mr-2" />
                        Deployment Logs
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto bg-background p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">CI/CD & Deployment</h2>
                            <p className="text-sm text-muted-foreground">Manage build pipelines and production environments.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isDeploying}
                                onClick={async () => {
                                    // Implementation of export from original code
                                }}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                            <Button
                                size="sm"
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                                onClick={handleDeploy}
                                disabled={isDeploying}
                            >
                                {isDeploying ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Rocket className="w-4 h-4 mr-2" />
                                )}
                                {isDeploying ? "Deploying..." : "Launch Production"}
                            </Button>
                        </div>
                    </div>

                    <TabsList className="grid grid-cols-3 w-[400px] mb-6">
                        <TabsTrigger value="config">Configuration</TabsTrigger>
                        <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
                        <TabsTrigger value="preview">Live Preview</TabsTrigger>
                    </TabsList>

                    <TabsContent value="config" className="space-y-6 flex-1">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2 space-y-6">
                                {selectedTargetData && (
                                    <Card className="border-border shadow-none bg-muted/5">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Settings className="w-4 h-4 text-muted-foreground" />
                                                Build & Output Settings
                                            </CardTitle>
                                            <CardDescription>Configure how your application is built for {selectedTargetData.name}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-4">
                                            {Object.entries(selectedTargetData.config).map(([key, value]) => (
                                                <div key={key} className="space-y-1.5">
                                                    <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </Label>
                                                    <Input
                                                        value={value}
                                                        onChange={(e) => updateTargetConfig(selectedTargetData.id, key, e.target.value)}
                                                        className="h-9 text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                )}

                                <Card className="border-border shadow-none">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Container className="w-4 h-4 text-muted-foreground" />
                                            Runtime Configuration
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Base Image</Label>
                                                <Select value={dockerConfig.baseImage} onValueChange={(v) => setDockerConfig({ ...dockerConfig, baseImage: v })}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="node:18-alpine">Node.js 18 (Alpine)</SelectItem>
                                                        <SelectItem value="node:20-alpine">Node.js 20 (Alpine)</SelectItem>
                                                        <SelectItem value="python:3.11-slim">Python 3.11 (Slim)</SelectItem>
                                                        <SelectItem value="golang:1.21-alpine">Go 1.21 (Alpine)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Expose Port</Label>
                                                <Input value={dockerConfig.expose} className="h-9" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="border-border shadow-none h-fit">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-muted-foreground" />
                                            Secrets & Environment
                                        </CardTitle>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addEnvVar}>
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {envVars.map((env, index) => (
                                        <div key={index} className="space-y-1 group relative bg-muted/40 p-2 rounded-md border border-transparent hover:border-border transition-all">
                                            <Input
                                                placeholder="NAME"
                                                variant="ghost"
                                                value={env.key}
                                                onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                                                className="h-6 text-[11px] font-mono px-0 focus-visible:ring-0 uppercase placeholder:lowercase"
                                            />
                                            <div className="flex gap-2">
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={env.value}
                                                    onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                                                    className="h-7 text-xs flex-1 bg-background"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => removeEnvVar(index)}
                                                >
                                                    <AlertTriangle className="w-3 h-3 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="pipelines" className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            {pipelines.length === 0 ? (
                                <Card className="flex flex-col items-center justify-center p-12 bg-muted/10 border-dashed">
                                    <Clock className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                                    <p className="text-sm text-muted-foreground">No active or past pipelines found.</p>
                                    <Button variant="link" className="text-xs mt-2" onClick={handleDeploy}>Start your first deployment</Button>
                                </Card>
                            ) : (
                                pipelines.map(pipeline => (
                                    <Card key={pipeline.id} className="overflow-hidden border-border bg-card/50">
                                        <CardContent className="p-0">
                                            <div className="flex items-center p-4">
                                                <div className={`p-2 rounded-full mr-4 ${pipeline.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        pipeline.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                                                            'bg-blue-500/10 text-blue-500 animate-pulse'
                                                    }`}>
                                                    {pipeline.status === 'success' ? <CheckCircle className="w-5 h-5" /> :
                                                        pipeline.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                                                            <RefreshCw className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-semibold text-sm truncate">{pipeline.name}</span>
                                                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">#{pipeline.id.slice(0, 8)}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Github className="w-3 h-3" /> main
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {new Date(pipeline.startedAt).toLocaleTimeString()}
                                                        </span>
                                                        {pipeline.duration && (
                                                            <span>{Math.floor(pipeline.duration / 1000)}s</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" className="h-8">
                                                    View Logs
                                                    <ExternalLink className="w-3 h-3 ml-2" />
                                                </Button>
                                            </div>
                                            {pipeline.status === 'running' && (
                                                <Progress value={45} className="h-1 rounded-none" />
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="preview" className="h-full flex-1">
                        <Card className="h-full border-border bg-slate-950 flex flex-col items-center justify-center p-12 text-center">
                            <Zap className="w-16 h-16 text-emerald-500 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                            <h3 className="text-xl font-bold text-slate-100">Live Preview Environment</h3>
                            <p className="text-slate-400 max-w-sm mt-2 mb-8">
                                Instant, per-commit preview environments for validation and stakeholder review.
                            </p>
                            <div className="flex gap-4">
                                <Button className="bg-emerald-600 hover:bg-emerald-700">Provision Preview</Button>
                                <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-900">Configure Domain</Button>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
