import { NextRequest, NextResponse } from 'next/server'
import { deploymentExport } from '@/lib/services/deployment-export'

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  try {
    switch (action) {
      case 'presets': {
        const provider = req.nextUrl.searchParams.get('provider')
        const presets = provider
          ? deploymentExport.getPresetsByProvider(provider)
          : deploymentExport.getPresets()
        return NextResponse.json({ presets })
      }
      case 'providers': {
        return NextResponse.json({ providers: deploymentExport.getProviders() })
      }
      case 'deployments': {
        const deployments = await deploymentExport.getDeployments()
        return NextResponse.json({ deployments })
      }
      case 'deployment': {
        const id = req.nextUrl.searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const deployment = await deploymentExport.getDeployment(id)
        if (!deployment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
        return NextResponse.json({ deployment })
      }
      case 'build-steps': {
        const deploymentId = req.nextUrl.searchParams.get('deploymentId')
        if (!deploymentId) return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 })
        const steps = await deploymentExport.getBuildSteps(deploymentId)
        return NextResponse.json({ steps })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'deploy': {
        const { presetId, projectPath = '', envVars = {} } = body
        if (!presetId) return NextResponse.json({ error: 'Missing presetId' }, { status: 400 })
        const deployment = await deploymentExport.deploy(presetId, projectPath, envVars)
        return NextResponse.json({ deployment })
      }
      case 'stop': {
        const { deploymentId } = body
        if (!deploymentId) return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 })
        const success = await deploymentExport.stopDeployment(deploymentId)
        return NextResponse.json({ success })
      }
      case 'delete': {
        const { deploymentId } = body
        if (!deploymentId) return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 })
        const success = await deploymentExport.deleteDeployment(deploymentId)
        return NextResponse.json({ success })
      }
      case 'redeploy': {
        const { deploymentId } = body
        if (!deploymentId) return NextResponse.json({ error: 'Missing deploymentId' }, { status: 400 })
        const deployment = await deploymentExport.redeployDeployment(deploymentId)
        return NextResponse.json({ deployment })
      }
      case 'export': {
        const { format = 'zip', includeNodeModules = false, includeDotFiles = true, includeGitHistory = true, minify = false } = body
        const result = await deploymentExport.exportProject({
          format,
          includeNodeModules,
          includeDotFiles,
          includeGitHistory,
          minify,
        })
        return NextResponse.json({ export: result })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
