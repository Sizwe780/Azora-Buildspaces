import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

/**
 * Marketplace — Publish Template API
 * POST /api/marketplace/publish
 * 
 * Publishes a new template to the marketplace.
 */

interface PublishRequest {
  name: string
  description: string
  category: string
  tags: string[]
  price: string
  readme?: string
  screenshots?: string[]
  repoUrl?: string
}

// In-memory store for published templates (replace with DB in production)
const publishedTemplates = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: PublishRequest = await request.json()
    const { name, description, category, tags, price, readme, screenshots, repoUrl } = body

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }
    if (name.length < 3 || name.length > 50) {
      return NextResponse.json({ error: 'Name must be 3-50 characters' }, { status: 400 })
    }
    if (description.length < 10 || description.length > 500) {
      return NextResponse.json({ error: 'Description must be 10-500 characters' }, { status: 400 })
    }

    // Generate template ID
    const id = `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

    const template = {
      id,
      name: name.trim(),
      description: description.trim(),
      category: category || 'templates',
      tags: Array.isArray(tags) ? tags.filter(t => t.trim()) : [],
      price: price || 'Free',
      readme: readme || '',
      screenshots: screenshots || [],
      repoUrl: repoUrl || null,
      author: session.user.name || session.user.email || 'Anonymous',
      authorId: (session.user as any).id || 'unknown',
      version: '1.0.0',
      downloads: 0,
      rating: 0,
      reviews: [],
      verified: false,
      featured: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      icon: getCategoryIcon(category),
      color: getCategoryColor(category)
    }

    // Store template
    publishedTemplates.set(id, template)

    return NextResponse.json({
      success: true,
      template,
      message: `Template "${name}" published successfully!`
    })
  } catch (error: any) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish template' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Return list of user's published templates
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const userId = (session.user as any).id || 'unknown'
  const userTemplates = Array.from(publishedTemplates.values())
    .filter(t => t.authorId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ templates: userTemplates })
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    templates: 'Layout',
    agents: 'Bot',
    components: 'Box',
    themes: 'Palette',
    integrations: 'Plug',
  }
  return icons[category] || 'Code2'
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    templates: 'text-blue-400',
    agents: 'text-purple-400',
    components: 'text-emerald-400',
    themes: 'text-pink-400',
    integrations: 'text-amber-400',
  }
  return colors[category] || 'text-zinc-400'
}
