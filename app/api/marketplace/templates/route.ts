import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'

/**
 * Marketplace — Templates API
 * GET  /api/marketplace/templates  — list/search templates
 * POST /api/marketplace/templates  — create a template (auth required)
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const templates = await prisma.marketplaceTemplate.findMany({
      where: {
        status: 'published',
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { tags: { has: search } },
              ],
            }
          : {}),
      },
      include: { publisher: { select: { name: true, email: true } } },
      orderBy: { downloads: 'desc' },
    })

    return NextResponse.json({ templates, total: templates.length })
  } catch (error) {
    console.error('Error loading templates:', error)
    return NextResponse.json(
      { error: 'Failed to load templates', success: false },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, category, tags, files, price = 0 } = body

    if (!name || !description || !category) {
      return NextResponse.json(
        { error: 'Name, description, and category are required' },
        { status: 400 }
      )
    }

    const userId = (session.user as any).id as string

    const template = await prisma.marketplaceTemplate.create({
      data: {
        publisherId: userId,
        name,
        description,
        category,
        tags: tags || [],
        files: files || {},
        price: parseFloat(price) || 0,
        status: 'published',
      },
    })

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
