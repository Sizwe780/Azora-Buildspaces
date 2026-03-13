"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Key, Users, CheckCircle2, Copy, Check, Loader2, ChevronUp } from "lucide-react";

function generateAuthCode(config: Record<string, boolean>): string {
    const providers: string[] = [];
    if (config.googleProvider) providers.push(`    GoogleProvider({\n      clientId: process.env.GOOGLE_CLIENT_ID!,\n      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,\n    })`);
    if (config.githubProvider) providers.push(`    GithubProvider({\n      clientId: process.env.GITHUB_ID!,\n      clientSecret: process.env.GITHUB_SECRET!,\n    })`);
    if (config.emailPassword) providers.push(`    CredentialsProvider({\n      name: 'Email',\n      credentials: {\n        email: { label: 'Email', type: 'email' },\n        password: { label: 'Password', type: 'password' },\n      },\n      async authorize(credentials) {\n        // TODO: Replace with actual user lookup + bcrypt compare\n        if (!credentials?.email || !credentials?.password) return null;\n        const user = await prisma.user.findUnique({ where: { email: credentials.email } });\n        if (!user) return null;\n        const valid = await bcrypt.compare(credentials.password, user.password);\n        return valid ? { id: user.id, email: user.email, name: user.name } : null;\n      },\n    })`);

    const imports = [
        `import NextAuth from 'next-auth';`,
        config.googleProvider ? `import GoogleProvider from 'next-auth/providers/google';` : '',
        config.githubProvider ? `import GithubProvider from 'next-auth/providers/github';` : '',
        config.emailPassword ? `import CredentialsProvider from 'next-auth/providers/credentials';` : '',
        config.emailPassword ? `import bcrypt from 'bcryptjs';\nimport { prisma } from '@/lib/prisma';` : '',
    ].filter(Boolean).join('\n');

    let code = `// Auto-generated Auth Configuration\n// Generated at ${new Date().toISOString()}\n\n${imports}\n\nexport const authOptions = {\n  providers: [\n${providers.join(',\n')}\n  ],\n  session: {\n    strategy: 'jwt' as const,\n  },\n  pages: {\n    signIn: '/auth/login',\n    signUp: '/auth/register',\n  },`;

    if (config.rbac) {
        code += `\n  callbacks: {\n    async jwt({ token, user }: any) {\n      if (user) {\n        token.role = user.role || 'user';\n      }\n      return token;\n    },\n    async session({ session, token }: any) {\n      if (session.user) {\n        session.user.role = token.role;\n      }\n      return session;\n    },\n  },`;
    }

    if (config.mfa) {
        code += `\n  // MFA: Implement TOTP verification in the signIn callback\n  events: {\n    async signIn({ user }: any) {\n      // TODO: Check if user has MFA enabled, redirect to /auth/mfa-verify\n      // const mfaEnabled = await prisma.user.findUnique({ where: { id: user.id }, select: { mfaEnabled: true } });\n    },\n  },`;
    }

    code += `\n};\n\nconst handler = NextAuth(authOptions);\nexport { handler as GET, handler as POST };\n`;

    if (config.rbac) {
        code += `\n// Middleware helper for RBAC\nexport function requireRole(allowedRoles: string[]) {\n  return async (req: Request) => {\n    const session = await getServerSession(authOptions);\n    if (!session?.user?.role || !allowedRoles.includes(session.user.role)) {\n      return new Response('Forbidden', { status: 403 });\n    }\n    return null; // Access granted\n  };\n}\n`;
    }

    const envVars = [
        'NEXTAUTH_URL=http://localhost:3000',
        'NEXTAUTH_SECRET=your-secret-here',
        config.googleProvider ? 'GOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=' : '',
        config.githubProvider ? 'GITHUB_ID=\nGITHUB_SECRET=' : '',
    ].filter(Boolean).join('\n');

    code += `\n// .env.local template:\n// ${envVars.split('\n').join('\n// ')}\n`;

    return code;
}

export default function AuthTemplateGenerator({ projectName }: { projectName: string }) {
    const [config, setConfig] = useState({
        nextAuth: true,
        googleProvider: true,
        githubProvider: true,
        emailPassword: true,
        rbac: false,
        mfa: false
    });
    const [generatedCode, setGeneratedCode] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showCode, setShowCode] = useState(false);

    const handleGenerate = useCallback(async () => {
        setIsGenerating(true);
        try {
            // Try AI-powered generation
            const res = await fetch('/api/code-chamber/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Generate a NextAuth.js configuration file for Next.js App Router with these options:\n- NextAuth: ${config.nextAuth}\n- Google OAuth: ${config.googleProvider}\n- GitHub OAuth: ${config.githubProvider}\n- Email/Password: ${config.emailPassword}\n- RBAC: ${config.rbac}\n- MFA: ${config.mfa}\n\nInclude TypeScript types, env variable template, and TODO comments.`,
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
        } catch { /* fallback */ }
        // Fallback: local template
        const code = generateAuthCode(config);
        setGeneratedCode(code);
        setShowCode(true);
        setIsGenerating(false);
    }, [config]);

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto">
            <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <h3 className="text-lg font-semibold">Authentication Setup</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className={config.nextAuth ? "border-emerald-500/50 bg-emerald-500/5" : ""}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                NextAuth.js
                            </CardTitle>
                            <Switch 
                                checked={config.nextAuth} 
                                onCheckedChange={(v) => setConfig({...config, nextAuth: v})} 
                            />
                        </div>
                        <CardDescription>Standard authentication for Next.js</CardDescription>
                    </CardHeader>
                </Card>

                <Card className={config.rbac ? "border-emerald-500/50 bg-emerald-500/5" : ""}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                RBAC
                            </CardTitle>
                            <Switch 
                                checked={config.rbac} 
                                onCheckedChange={(v) => setConfig({...config, rbac: v})} 
                            />
                        </div>
                        <CardDescription>Role-Based Access Control</CardDescription>
                    </CardHeader>
                </Card>

                <Card className={config.mfa ? "border-emerald-500/50 bg-emerald-500/5" : ""}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                MFA
                            </CardTitle>
                            <Switch 
                                checked={config.mfa} 
                                onCheckedChange={(v) => setConfig({...config, mfa: v})} 
                            />
                        </div>
                        <CardDescription>Multi-Factor Authentication (TOTP)</CardDescription>
                    </CardHeader>
                </Card>
            </div>

            <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground">Providers</h4>
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">G</div>
                            <div>
                                <div className="text-sm font-medium">Google</div>
                                <div className="text-xs text-muted-foreground">OAuth 2.0</div>
                            </div>
                        </div>
                        <Switch 
                            checked={config.googleProvider} 
                            onCheckedChange={(v) => setConfig({...config, googleProvider: v})} 
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                <Key className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-sm font-medium">GitHub</div>
                                <div className="text-xs text-muted-foreground">OAuth 2.0</div>
                            </div>
                        </div>
                        <Switch 
                            checked={config.githubProvider} 
                            onCheckedChange={(v) => setConfig({...config, githubProvider: v})} 
                        />
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">@</div>
                            <div>
                                <div className="text-sm font-medium">Email / Password</div>
                                <div className="text-xs text-muted-foreground">Credentials</div>
                            </div>
                        </div>
                        <Switch 
                            checked={config.emailPassword} 
                            onCheckedChange={(v) => setConfig({...config, emailPassword: v})} 
                        />
                    </div>
                </div>
            </div>

            {showCode && generatedCode && (
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="py-2 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm">Generated Auth Config</CardTitle>
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
                <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isGenerating ? 'Generating...' : 'Configure Auth Module'}
                </Button>
            </div>
        </div>
    );
}
