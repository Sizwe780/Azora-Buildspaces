import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const WORKSPACE_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/

function resolveWorkspaceRoot(workspaceId: string): string | null {
    if (!WORKSPACE_ID_PATTERN.test(workspaceId)) {
        return null
    }

    const workspacesBase = path.resolve(process.cwd(), 'workspaces')
    const workspaceRoot = path.resolve(workspacesBase, workspaceId)
    if (!workspaceRoot.startsWith(workspacesBase + path.sep) && workspaceRoot !== workspacesBase) {
        return null
    }

    return workspaceRoot
}

async function resolveGitCwd(targetAbsolutePath: string): Promise<string> {
    try {
        const stats = await fs.stat(targetAbsolutePath)
        return stats.isDirectory() ? targetAbsolutePath : path.dirname(targetAbsolutePath)
    } catch {
        return targetAbsolutePath
    }
}

function sanitizeGitFileArgs(files: unknown): string[] {
    if (!Array.isArray(files) || files.length === 0) {
        return ['.']
    }

    const safe: string[] = []
    for (const item of files) {
        if (typeof item !== 'string') continue
        const trimmed = item.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('-')) continue
        if (trimmed.includes('\0')) continue
        safe.push(trimmed)
    }

    return safe.length > 0 ? safe : ['.']
}

/**
 * Validate and scope path to user's workspace
 * Prevents path traversal attacks and ensures workspace isolation
 */
function validateWorkspacePath(targetPath: string, workspaceId: string): { valid: boolean; absolutePath?: string; error?: string } {
    try {
        const workspaceRoot = resolveWorkspaceRoot(workspaceId)
        if (!workspaceRoot) {
            return { valid: false, error: 'Invalid workspaceId' }
        }

        // Normalize the path to prevent traversal attacks
        const normalizedPath = path.normalize(targetPath);

        // Check for path traversal attempts
        if (normalizedPath.includes('..')) {
            return { valid: false, error: 'Path traversal detected' };
        }

        // Resolve the absolute path
        const absolutePath = path.resolve(workspaceRoot, normalizedPath);

        // Ensure the resolved path is within the workspace
        if (absolutePath !== workspaceRoot && !absolutePath.startsWith(workspaceRoot + path.sep)) {
            return { valid: false, error: 'Access denied: Path outside workspace' };
        }

        return { valid: true, absolutePath };
    } catch (error) {
        return { valid: false, error: 'Invalid path' };
    }
}

export async function GET(request: NextRequest) {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');
    const targetPath = searchParams.get('path');
    const workspaceId = String(searchParams.get('workspaceId') || session.user.id);

    if (!targetPath) {
        return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // SECURITY: Validate and scope path to user's workspace
    const validation = validateWorkspacePath(targetPath, workspaceId);
    if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    const absolutePath = validation.absolutePath!;

    try {
        if (operation === 'list') {
            const normalizedTargetPath = targetPath.replace(/\\/g, '/').replace(/^\/+/, '')
            const entries = await fs.readdir(absolutePath, { withFileTypes: true });
            const result = await Promise.all(entries.map(async (entry) => {
                const entryPath = path.join(absolutePath, entry.name);
                const stats = await fs.stat(entryPath);
                return {
                    name: entry.name,
                    path: path.posix.join(normalizedTargetPath, entry.name),
                    type: entry.isDirectory() ? 'directory' : 'file',
                    size: stats.size,
                    modified: stats.mtime,
                    isHidden: entry.name.startsWith('.')
                };
            }));
            return NextResponse.json(result);
        } else if (operation === 'read') {
            const content = await fs.readFile(absolutePath, 'utf-8');
            return NextResponse.json({ content });
        } else if (operation === 'gitStatus') {
            try {
                const gitCwd = await resolveGitCwd(absolutePath)
                const { stdout } = await execFileAsync('git', ['status', '--porcelain'], { cwd: gitCwd });
                const { stdout: branchOut } = await execFileAsync('git', ['branch', '--show-current'], { cwd: gitCwd });
                return NextResponse.json({ status: stdout, branch: branchOut.trim() });
            } catch (e: any) {
                return NextResponse.json({ error: 'Not a git repository or git not installed' }, { status: 500 });
            }
        } else if (operation === 'gitLog') {
            const limitParam = searchParams.get('limit') || '50'
            const parsedLimit = parseInt(limitParam, 10)
            const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50
            try {
                const gitCwd = await resolveGitCwd(absolutePath)
                const { stdout } = await execFileAsync(
                    'git',
                    ['log', '-n', String(limit), '--pretty=format:%H|%an|%ae|%ad|%s'],
                    { cwd: gitCwd }
                )
                const lines = stdout.split('\n').filter(Boolean)
                const commits = lines.map(line => {
                    const [hash, author, email, date, ...messageParts] = line.split('|')
                    return {
                        hash,
                        author,
                        email,
                        date,
                        message: messageParts.join('|')
                    }
                })
                return NextResponse.json({ commits })
            } catch (e: any) {
                return NextResponse.json({ error: 'Failed to fetch git log' }, { status: 500 })
            }
        }
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // SECURITY: Require authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const { operation, path: targetPath, content, oldPath, newPath, workspaceId: reqWorkspaceId, files, message, remote, branch, name, url, create } = await request.json();
        const workspaceId = String(reqWorkspaceId || session.user.id);

        if (!targetPath && !oldPath) {
            return NextResponse.json({ error: 'Path is required' }, { status: 400 });
        }

        // SECURITY: Validate and scope path to user's workspace
        let absolutePath: string | null = null;
        if (targetPath) {
            const validation = validateWorkspacePath(targetPath, workspaceId);
            if (!validation.valid) {
                return NextResponse.json({ error: validation.error }, { status: 403 });
            }
            absolutePath = validation.absolutePath!;
        }

        if (operation === 'write') {
            await fs.writeFile(absolutePath!, content, 'utf-8');
            return NextResponse.json({ success: true });
        } else if (operation === 'mkdir') {
            await fs.mkdir(absolutePath!, { recursive: true });
            return NextResponse.json({ success: true });
        } else if (operation === 'delete') {
            await fs.rm(absolutePath!, { recursive: true, force: true });
            return NextResponse.json({ success: true });
        } else if (operation === 'rename') {
            // SECURITY: Validate both old and new paths
            const oldValidation = validateWorkspacePath(oldPath, workspaceId);
            const newValidation = validateWorkspacePath(newPath, workspaceId);

            if (!oldValidation.valid) {
                return NextResponse.json({ error: `Old path: ${oldValidation.error}` }, { status: 403 });
            }
            if (!newValidation.valid) {
                return NextResponse.json({ error: `New path: ${newValidation.error}` }, { status: 403 });
            }

            await fs.rename(oldValidation.absolutePath!, newValidation.absolutePath!);
            return NextResponse.json({ success: true });
        } else if (operation === 'gitInit') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            await execFileAsync('git', ['init'], { cwd: gitCwd });
            return NextResponse.json({ success: true });
        } else if (operation === 'gitAdd') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            const fileList = sanitizeGitFileArgs(files)
            await execFileAsync('git', ['add', ...fileList], { cwd: gitCwd });
            return NextResponse.json({ success: true });
        } else if (operation === 'gitCommit') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            await execFileAsync('git', ['commit', '-m', String(message || 'Update')], { cwd: gitCwd });
            const { stdout: hashStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: gitCwd });
            return NextResponse.json({ success: true, hash: hashStdout.trim() });
        } else if (operation === 'gitPush') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            await execFileAsync('git', ['push', String(remote || 'origin'), String(branch || 'main')], { cwd: gitCwd });
            return NextResponse.json({ success: true });
        } else if (operation === 'gitPull') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            await execFileAsync('git', ['pull', String(remote || 'origin'), String(branch || 'main')], { cwd: gitCwd });
            return NextResponse.json({ success: true });
        } else if (operation === 'gitBranch') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            await execFileAsync('git', ['branch', String(name)], { cwd: gitCwd });
            return NextResponse.json({ success: true });
        } else if (operation === 'gitCheckout') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            if (create) {
                await execFileAsync('git', ['checkout', '-b', String(name)], { cwd: gitCwd });
            } else {
                await execFileAsync('git', ['checkout', String(name)], { cwd: gitCwd });
            }
            return NextResponse.json({ success: true });
        } else if (operation === 'gitRemoteAdd') {
            const gitCwd = await resolveGitCwd(absolutePath!)
            await execFileAsync('git', ['remote', 'add', String(name), String(url)], { cwd: gitCwd });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
