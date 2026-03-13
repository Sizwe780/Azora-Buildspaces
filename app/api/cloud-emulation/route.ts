import { NextRequest, NextResponse } from 'next/server'
import { cloudEmulation, type CloudProvider, type CloudEmulatorStartResult } from '@/lib/services/cloud-emulation'

const CLOUD_PROVIDERS: CloudProvider[] = ['aws', 'gcp', 'azure', 'firebase', 'generic']

const normalizeProvider = (provider: unknown): CloudProvider | null => {
  if (typeof provider !== 'string') return null
  const normalized = provider.trim().toLowerCase()
  return CLOUD_PROVIDERS.includes(normalized as CloudProvider)
    ? (normalized as CloudProvider)
    : null
}

const summarizeStartResults = (results: CloudEmulatorStartResult[]) => {
  const emulators = results.flatMap(result => (result.success && result.emulator ? [result.emulator] : []))
  const failures = results
    .filter(result => !result.success)
    .map(result => ({
      provider: result.provider,
      service: result.service,
      error: result.error || 'Unknown error',
    }))

  const started = emulators.length
  const failed = failures.length

  return {
    status: failed === 0 ? 'started' : started === 0 ? 'failed' : 'partial',
    total: results.length,
    started,
    failed,
    emulators,
    failures,
    results,
  }
}

const getStartResponseStatus = (summary: ReturnType<typeof summarizeStartResults>) => {
  if (summary.status === 'started') return 200
  if (summary.status === 'partial') return 207

  const allUnsupported =
    summary.failures.length > 0 &&
    summary.failures.every(failure =>
      /No runtime image configured|not available for provider|not supported in this environment/i.test(failure.error)
    )
  if (allUnsupported) return 409

  const allUnavailable =
    summary.failures.length > 0 &&
    summary.failures.every(failure => /Docker runtime is required|docker/i.test(failure.error))
  if (allUnavailable) return 503

  return 500
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'presets'

  switch (action) {
    case 'presets':
      return NextResponse.json({ presets: cloudEmulation.getPresets() })
    case 'capabilities':
      return NextResponse.json({ capabilities: cloudEmulation.getCapabilities() })
    case 'emulators':
      return NextResponse.json({ emulators: cloudEmulation.getAll() })
    case 'running':
      return NextResponse.json({ emulators: cloudEmulation.getRunning() })
    case 'status': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      const emulator = cloudEmulation.getEmulator(id)
      return NextResponse.json({ emulator })
    }
    case 'logs': {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
      return NextResponse.json({ logs: cloudEmulation.getLogs(id) })
    }
    case 'env-vars':
      return NextResponse.json({ variables: cloudEmulation.getEnvironmentVariables() })
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'start': {
        const { provider, service, services, config } = body

        const normalizedProvider = normalizeProvider(provider)
        if (!normalizedProvider) {
          return NextResponse.json({ error: 'provider is required and must be valid' }, { status: 400 })
        }

        const requestedServices = Array.isArray(services)
          ? services
          : service
            ? [service]
            : []

        if (requestedServices.length === 0) {
          return NextResponse.json({ error: 'service is required' }, { status: 400 })
        }

        const results = await cloudEmulation.startServices(
          normalizedProvider,
          requestedServices.map(svc => String(svc)),
          config
        )
        const summary = summarizeStartResults(results)
        const statusCode = getStartResponseStatus(summary)

        return NextResponse.json({
          ...summary,
          ...(statusCode === 409 || statusCode === 503
            ? { capabilities: cloudEmulation.getCapabilities() }
            : {}),
        }, { status: statusCode })
      }
      case 'stop': {
        const { id } = body
        if (!id) {
          return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }
        await cloudEmulation.stopEmulator(id)
        return NextResponse.json({ success: true })
      }
      case 'start-preset': {
        const { presetId } = body
        if (!presetId) {
          return NextResponse.json({ error: 'presetId is required' }, { status: 400 })
        }

        const preset = cloudEmulation.getPreset(String(presetId))
        if (!preset) {
          return NextResponse.json({ error: `Preset ${presetId} not found` }, { status: 404 })
        }

        const results = await cloudEmulation.startPresetWithResults(String(presetId))
        const summary = summarizeStartResults(results)
        const statusCode = getStartResponseStatus(summary)

        return NextResponse.json({
          preset: {
            id: preset.id,
            name: preset.name,
            provider: preset.provider,
          },
          ...summary,
          ...(statusCode === 409 || statusCode === 503
            ? { capabilities: cloudEmulation.getCapabilities() }
            : {}),
        }, { status: statusCode })
      }
      case 'stop-all':
        await cloudEmulation.stopAll()
        return NextResponse.json({ success: true })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
