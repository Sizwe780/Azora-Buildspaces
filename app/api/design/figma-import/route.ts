import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const FIGMA_TOKEN = process.env.FIGMA_TOKEN || ''

function extractFileKey(url: string) {
  try {
    const m = url.match(/file\/([A-Za-z0-9]+)(?:\/|$)/)
    return m ? m[1] : null
  } catch (e) {
    return null
  }
}

export async function POST(req: Request) {
  // SECURITY: Require authentication
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (!FIGMA_TOKEN) {
    return NextResponse.json({ error: 'Figma integration not configured. Set FIGMA_TOKEN in server env.' }, { status: 501 })
  }

  try {
    const body = await req.json()
    const url = body.url || ''
    const fileKey = extractFileKey(url)

    if (!fileKey) {
      return NextResponse.json({ error: 'Invalid Figma file URL or key could not be extracted.' }, { status: 400 })
    }

    const resp = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { 'X-Figma-Token': FIGMA_TOKEN }
    })

    if (!resp.ok) {
      const txt = await resp.text()
      return NextResponse.json({ error: `Figma API error: ${txt}` }, { status: resp.status })
    }

    const data = await resp.json()

    // Extract meaningful structure from Figma document
    const children = data.document?.children || []
    const firstPage = children[0] || {}
    const pageChildren = firstPage.children || []

    // Extract top-level frames/components with dimensions
    const components = pageChildren.slice(0, 50).map((node: any) => ({
      id: node.id,
      name: node.name || 'Unnamed',
      type: node.type || 'FRAME',
      width: Math.round(node.absoluteBoundingBox?.width || node.size?.x || 0),
      height: Math.round(node.absoluteBoundingBox?.height || node.size?.y || 0),
    }))

    // Use first frame's dimensions as default, fallback to standard mobile
    const primaryFrame = pageChildren.find((n: any) => n.type === 'FRAME') || pageChildren[0]
    const width = Math.round(primaryFrame?.absoluteBoundingBox?.width || primaryFrame?.size?.x || 375)
    const height = Math.round(primaryFrame?.absoluteBoundingBox?.height || primaryFrame?.size?.y || 812)

    const frame = {
      id: fileKey,
      name: data.name || `figma-${fileKey}`,
      width,
      height,
      components,
      componentsCount: components.length,
      raw: data,
    }

    return NextResponse.json({ frame })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
