import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { readFile } from 'fs/promises'
import path from 'path'

/**
 * Code Chamber — Test Discovery API
 * GET /api/code-chamber/tests?file={filePath}
 *
 * Reads the actual file from the workspace filesystem and parses test blocks.
 */

interface DiscoveredTest {
  id: string
  name: string
  suite: string
  file: string
}

function parseTestFile(content: string, fileName: string): DiscoveredTest[] {
  const tests: DiscoveredTest[] = []
  const lines = content.split('\n')

  let currentSuite = fileName.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '')
  let testIndex = 0

  for (const line of lines) {
    // Match describe blocks
    const describeMatch = line.match(/describe\s*\(\s*['"`](.+?)['"`]/)
    if (describeMatch) {
      currentSuite = describeMatch[1]
    }

    // Match it/test blocks
    const testMatch = line.match(/(?:it|test)\s*\(\s*['"`](.+?)['"`]/)
    if (testMatch) {
      testIndex++
      tests.push({
        id: `test-${testIndex}`,
        name: testMatch[1],
        suite: currentSuite,
        file: fileName,
      })
    }
  }

  return tests
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  const file = request.nextUrl.searchParams.get('file')
  if (!file) {
    return NextResponse.json({ tests: [] })
  }

  const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd()
  const filePath = path.resolve(workspaceRoot, file)

  // Security: ensure file is within workspace (path traversal protection)
  if (!filePath.startsWith(workspaceRoot + path.sep) && filePath !== workspaceRoot) {
    return NextResponse.json({ error: 'Path traversal denied' }, { status: 403 })
  }

  try {
    const content = await readFile(filePath, 'utf-8')
    const tests = parseTestFile(content, path.basename(file))
    return NextResponse.json({ tests })
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
    if (error.code === 'EACCES') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
