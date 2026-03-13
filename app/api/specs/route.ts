import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

// File-based persistence for specs (survives restarts, no DB required)
const SPECS_FILE = path.join(process.cwd(), '.data', 'specs.json')

async function ensureDataDir() {
  const dir = path.dirname(SPECS_FILE)
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch { /* exists */ }
}

async function readSpecs(): Promise<any[]> {
  try {
    const raw = await fs.readFile(SPECS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeSpecs(specs: any[]) {
  await ensureDataDir()
  await fs.writeFile(SPECS_FILE, JSON.stringify(specs, null, 2), 'utf-8')
}

export async function GET() {
  const specs = await readSpecs()
  return NextResponse.json({ specs })
}

export async function POST(req: Request) {
  try {
    const spec = await req.json()

    const newSpec = {
      id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...spec,
      lastModified: new Date().toISOString(),
      author: spec.author || 'Anonymous',
    }

    const specs = await readSpecs()
    specs.unshift(newSpec)
    await writeSpecs(specs)

    return NextResponse.json({ success: true, spec: newSpec })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save spec' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing spec id' }, { status: 400 })
    }

    const specs = await readSpecs()
    const filtered = specs.filter((s: any) => s.id !== id)

    if (filtered.length === specs.length) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 })
    }

    await writeSpecs(filtered)
    return NextResponse.json({ success: true, deleted: id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete spec' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing spec id' }, { status: 400 })
    }

    const specs = await readSpecs()
    const idx = specs.findIndex((s: any) => s.id === id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Spec not found' }, { status: 404 })
    }

    specs[idx] = { ...specs[idx], ...updates, lastModified: new Date().toISOString() }
    await writeSpecs(specs)

    return NextResponse.json({ success: true, spec: specs[idx] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update spec' }, { status: 500 })
  }
}
