import { NextRequest, NextResponse } from 'next/server'
import { cicdService } from '@/lib/services/cicd-integration'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'pipelines'

  switch (action) {
    case 'pipelines':
      return NextResponse.json({ pipelines: cicdService.getRecentPipelines() })
    case 'providers':
      return NextResponse.json({ providers: cicdService.getSupportedProviders() })
    case 'templates':
      return NextResponse.json({ templates: cicdService.getTemplates() })
    case 'template': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      return NextResponse.json({ template: cicdService.getTemplate(id) })
    }
    case 'pipeline': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      return NextResponse.json({ pipeline: cicdService.getPipeline(id) })
    }
    case 'deployments':
      return NextResponse.json({ deployments: cicdService.getDeployments() })
    case 'environments':
      return NextResponse.json({ environments: cicdService.getEnvironments() })
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'create-pipeline': {
        const { name, provider, config } = body
        const pipeline = await cicdService.createPipeline(name, provider, config)
        return NextResponse.json({ pipeline })
      }
      case 'trigger': {
        const options = body.options || body
        const pipeline = await cicdService.triggerPipeline(options)
        return NextResponse.json({ pipeline })
      }
      case 'cancel': {
        const { pipelineId } = body
        await cicdService.cancelPipeline(pipelineId)
        return NextResponse.json({ success: true })
      }
      case 'deploy-preview': {
        const { provider, branch, commit } = body
        const preview = await cicdService.createDeploymentPreview({ provider, branch, commit })
        return NextResponse.json({ preview })
      }
      case 'create-environment': {
        const { name, type, url, variables, secrets } = body
        const env = cicdService.createEnvironment({ name, type, url, variables: variables || {}, secrets: secrets || [] })
        return NextResponse.json({ environment: env })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
