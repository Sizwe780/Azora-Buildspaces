import { NextRequest, NextResponse } from "next/server"

/**
 * Code Chamber — Test Discovery API
 * GET /api/code-chamber/tests?file={filePath}
 * 
 * Parses test files to discover test cases for the testing panel.
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
        file: fileName
      })
    }
  }

  return tests
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get('file')

  if (!file) {
    return NextResponse.json({ tests: [], message: 'No file specified' })
  }

  // In a real implementation, we'd read the actual file from the filesystem
  // For now, return placeholder tests based on filename
  const baseName = file.split('/').pop()?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'module'
  const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)

  if (isTestFile) {
    // Simulate discovered tests for test files
    return NextResponse.json({
      tests: [
        { id: '1', name: 'should render correctly', suite: baseName },
        { id: '2', name: 'should handle user input', suite: baseName },
        { id: '3', name: 'should update state', suite: baseName },
        { id: '4', name: 'should call API on submit', suite: baseName },
        { id: '5', name: 'should handle errors gracefully', suite: baseName },
      ]
    })
  }

  // For non-test files, suggest potential tests
  return NextResponse.json({
    tests: [
      { id: '1', name: 'renders without crashing', suite: `${baseName}.test` },
      { id: '2', name: 'handles props correctly', suite: `${baseName}.test` },
      { id: '3', name: 'matches snapshot', suite: `${baseName}.test` },
      { id: '4', name: 'handles edge cases', suite: `${baseName}.test` },
      { id: '5', name: 'accessibility compliance', suite: `${baseName}.test` },
    ],
    generated: true
  })
}
