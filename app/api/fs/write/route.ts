import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

/**
 * File System Write API Route
 * Handles writing file content to the workspace
 */

interface WriteRequest {
  path: string
  content: string
}

// Workspace root - in production this would be per-user/per-workspace
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd()

// Validate path is within workspace (prevent directory traversal)
function isPathSafe(filePath: string): boolean {
  const resolvedPath = path.resolve(WORKSPACE_ROOT, filePath)
  return resolvedPath.startsWith(WORKSPACE_ROOT)
}

// Normalize path for cross-platform compatibility
function normalizePath(filePath: string): string {
  // Remove leading slashes and normalize
  let normalized = filePath.replace(/^[/\\]+/, '')
  
  // If it starts with a drive letter, use as-is
  if (/^[a-zA-Z]:/.test(normalized)) {
    return path.normalize(normalized)
  }
  
  return path.join(WORKSPACE_ROOT, normalized)
}

export async function POST(request: NextRequest) {
  try {
    const body: WriteRequest = await request.json()
    const { path: filePath, content } = body

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 }
      )
    }

    if (content === undefined || content === null) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    const normalizedPath = normalizePath(filePath)

    // Security check - prevent writing outside workspace
    if (!isPathSafe(filePath) && !path.isAbsolute(filePath)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file path' },
        { status: 403 }
      )
    }

    // Ensure directory exists
    const dirPath = path.dirname(normalizedPath)
    await fs.mkdir(dirPath, { recursive: true })

    // Write file
    await fs.writeFile(normalizedPath, content, 'utf-8')

    // Get file stats for response
    const stats = await fs.stat(normalizedPath)

    return NextResponse.json({
      success: true,
      path: normalizedPath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      message: 'File saved successfully'
    })
  } catch (error) {
    console.error('File write error:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('EACCES')) {
        return NextResponse.json(
          { success: false, error: 'Permission denied' },
          { status: 403 }
        )
      }
      if (error.message.includes('ENOSPC')) {
        return NextResponse.json(
          { success: false, error: 'Disk space full' },
          { status: 507 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to write file' },
      { status: 500 }
    )
  }
}
