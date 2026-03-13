/** @jest-environment node */

jest.mock('@/lib/services/cloud-emulation', () => ({
  cloudEmulation: {
    getPresets: jest.fn(),
    getCapabilities: jest.fn(),
    getAll: jest.fn(),
    getRunning: jest.fn(),
    getEmulator: jest.fn(),
    getLogs: jest.fn(),
    getEnvironmentVariables: jest.fn(),
    startServices: jest.fn(),
    stopEmulator: jest.fn(),
    getPreset: jest.fn(),
    startPresetWithResults: jest.fn(),
    stopAll: jest.fn(),
  },
}))

describe('Cloud Emulation API (/api/cloud-emulation)', () => {
  let GET: (req: any) => Promise<any>
  let POST: (req: any) => Promise<any>
  let cloudEmulation: any

  const makeGetRequest = (query: string) => ({
    url: `http://localhost/api/cloud-emulation?${query}`,
  }) as any

  const makePostRequest = (body: Record<string, unknown>) => ({
    json: () => Promise.resolve(body),
  }) as any

  const runningEmulator = {
    id: 'emu-1',
    provider: 'aws',
    service: 's3',
    name: 'AWS S3',
    port: 4569,
    status: 'running',
    config: {},
    logs: [],
    resources: {
      cpuLimit: '0.5',
      memoryLimit: '512m',
      storageLimit: '1g',
    },
  }

  const capabilities = {
    providers: {
      aws: [
        { provider: 'aws', service: 's3', label: 'S3', supported: true, defaultPort: 4569 },
        { provider: 'aws', service: 'sns', label: 'SNS', supported: false, reason: 'No runtime image configured for this service' },
      ],
      gcp: [],
      azure: [],
      firebase: [],
      generic: [],
    },
  }

  beforeEach(() => {
    jest.resetModules()
    const mod = require('@/app/api/cloud-emulation/route')
    GET = mod.GET
    POST = mod.POST
    cloudEmulation = require('@/lib/services/cloud-emulation').cloudEmulation

    jest.clearAllMocks()
    cloudEmulation.getCapabilities.mockReturnValue(capabilities)
    cloudEmulation.getPresets.mockReturnValue([])
    cloudEmulation.getAll.mockReturnValue([])
    cloudEmulation.getRunning.mockReturnValue([])
    cloudEmulation.getEnvironmentVariables.mockReturnValue({})
  })

  it('returns capabilities for GET action=capabilities', async () => {
    const res = await GET(makeGetRequest('action=capabilities'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.capabilities).toEqual(capabilities)
  })

  it('returns 207 with partial results for mixed start outcomes', async () => {
    cloudEmulation.startServices.mockResolvedValue([
      { provider: 'aws', service: 's3', success: true, emulator: runningEmulator },
      { provider: 'aws', service: 'sns', success: false, error: 'No runtime image configured for this service' },
    ])

    const res = await POST(makePostRequest({
      action: 'start',
      provider: 'aws',
      services: ['s3', 'sns'],
    }))
    const data = await res.json()

    expect(res.status).toBe(207)
    expect(data.status).toBe('partial')
    expect(data.started).toBe(1)
    expect(data.failed).toBe(1)
    expect(Array.isArray(data.results)).toBe(true)
  })

  it('returns 409 when all requested services are unsupported', async () => {
    cloudEmulation.startServices.mockResolvedValue([
      { provider: 'aws', service: 'sns', success: false, error: 'No runtime image configured for this service' },
    ])

    const res = await POST(makePostRequest({
      action: 'start',
      provider: 'aws',
      services: ['sns'],
    }))
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.status).toBe('failed')
    expect(data.capabilities).toEqual(capabilities)
  })

  it('returns 503 when all requested services fail due to runtime unavailability', async () => {
    cloudEmulation.startServices.mockResolvedValue([
      { provider: 'aws', service: 's3', success: false, error: 'Docker runtime is required for cloud emulation but is not available in this environment' },
    ])

    const res = await POST(makePostRequest({
      action: 'start',
      provider: 'aws',
      services: ['s3'],
    }))
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(data.status).toBe('failed')
  })

  it('returns 404 when preset does not exist', async () => {
    cloudEmulation.getPreset.mockReturnValue(undefined)

    const res = await POST(makePostRequest({
      action: 'start-preset',
      presetId: 'missing-preset',
    }))
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.error).toContain('not found')
  })
})