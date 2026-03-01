/**
 * Environment Templates API
 * 
 * Provides pre-configured development environment templates.
 * Users can browse, select, and launch environments from templates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ENVIRONMENT_TEMPLATES, type EnvironmentTemplate } from '@/types/execution-environments'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'popularity'

    let templates: EnvironmentTemplate[] = [...ENVIRONMENT_TEMPLATES]

    // Filter by type
    if (type) {
      templates = templates.filter(t => t.type === type)
    }

    // Filter by tag
    if (tag) {
      templates = templates.filter(t => t.tags.includes(tag))
    }

    // Search by name or description
    if (search) {
      const lowerSearch = search.toLowerCase()
      templates = templates.filter(
        t => t.name.toLowerCase().includes(lowerSearch) || 
             t.description.toLowerCase().includes(lowerSearch) ||
             t.tags.some(tag => tag.includes(lowerSearch))
      )
    }

    // Sort
    switch (sortBy) {
      case 'popularity':
        templates.sort((a, b) => b.popularity - a.popularity)
        break
      case 'name':
        templates.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
        templates.reverse()
        break
    }

    // Get all unique tags
    const allTags = [...new Set(ENVIRONMENT_TEMPLATES.flatMap(t => t.tags))].sort()

    return NextResponse.json({
      templates,
      total: templates.length,
      availableTags: allTags,
    })
  } catch (error: any) {
    console.error('Environment templates error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
