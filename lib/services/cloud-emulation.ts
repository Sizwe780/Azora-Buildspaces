/**
 * Cloud Emulation Service (Task 11)
 * 
 * Local cloud service emulation for Code Chamber.
 * Inspired by LocalStack, Firebase Emulator Suite, and MinIO.
 * 
 * Supports:
 * - AWS service emulation (S3, DynamoDB, Lambda, SQS, SNS, API Gateway)
 * - GCP service emulation (Cloud Storage, Firestore, Pub/Sub, Cloud Functions)
 * - Azure service emulation (Blob Storage, Cosmos DB, Functions, Service Bus)
 * - Firebase emulation (Auth, Firestore, RTDB, Storage, Functions)
 * - Docker-based local services (Redis, PostgreSQL, MongoDB, Elasticsearch)
 * - Custom service mocking
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'firebase' | 'generic'

export type AWSService =
  | 's3' | 'dynamodb' | 'lambda' | 'sqs' | 'sns'
  | 'api-gateway' | 'cognito' | 'ses' | 'step-functions' | 'kinesis'
  | 'secretsmanager' | 'ssm' | 'cloudwatch' | 'iam' | 'sts'

export type GCPService =
  | 'cloud-storage' | 'firestore' | 'pubsub' | 'cloud-functions'
  | 'bigquery' | 'cloud-run' | 'cloud-tasks' | 'cloud-scheduler'

export type AzureService =
  | 'blob-storage' | 'cosmos-db' | 'functions' | 'service-bus'
  | 'event-grid' | 'key-vault' | 'cognitive-services'

export type FirebaseService =
  | 'auth' | 'firestore' | 'rtdb' | 'storage' | 'functions'
  | 'hosting' | 'messaging'

export type GenericService =
  | 'redis' | 'postgresql' | 'mongodb' | 'elasticsearch'
  | 'rabbitmq' | 'kafka' | 'minio' | 'vault' | 'consul' | 'etcd'

export interface CloudEmulatorConfig {
  id: string
  provider: CloudProvider
  service: string
  name: string
  port: number
  status: 'stopped' | 'starting' | 'running' | 'error'
  config: Record<string, any>
  container?: string            // Docker container ID
  endpoint?: string             // Local endpoint URL
  healthCheck?: string          // Health check URL
  startedAt?: number
  logs: string[]
  resources: {
    cpuLimit: string
    memoryLimit: string
    storageLimit: string
  }
}

export interface CloudEmulatorPreset {
  id: string
  name: string
  description: string
  provider: CloudProvider
  services: {
    service: string
    port: number
    config: Record<string, any>
  }[]
  icon: string
}

export interface CloudServiceCapability {
  provider: CloudProvider
  service: string
  label: string
  supported: boolean
  reason?: string
  defaultPort?: number
}

export interface CloudEmulationCapabilities {
  providers: Record<CloudProvider, CloudServiceCapability[]>
}

export interface CloudEmulatorStartResult {
  provider: CloudProvider
  service: string
  success: boolean
  emulator?: CloudEmulatorConfig
  error?: string
}

// Pre-configured presets
const EMULATOR_PRESETS: CloudEmulatorPreset[] = [
  {
    id: 'aws-serverless',
    name: 'AWS Serverless Stack',
    description: 'Lambda + API Gateway + DynamoDB + S3 + SQS',
    provider: 'aws',
    icon: '☁️',
    services: [
      { service: 'lambda', port: 4566, config: { runtime: 'nodejs20.x' } },
      { service: 'api-gateway', port: 4567, config: {} },
      { service: 'dynamodb', port: 4568, config: {} },
      { service: 's3', port: 4569, config: { buckets: ['default'] } },
      { service: 'sqs', port: 4570, config: {} },
    ],
  },
  {
    id: 'firebase-full',
    name: 'Firebase Full Suite',
    description: 'Auth + Firestore + RTDB + Storage + Functions',
    provider: 'firebase',
    icon: '🔥',
    services: [
      { service: 'auth', port: 9099, config: {} },
      { service: 'firestore', port: 8080, config: {} },
      { service: 'rtdb', port: 9000, config: {} },
      { service: 'storage', port: 9199, config: {} },
      { service: 'functions', port: 5001, config: { runtime: 'nodejs20' } },
    ],
  },
  {
    id: 'data-stack',
    name: 'Data Engineering Stack',
    description: 'PostgreSQL + Redis + Elasticsearch + Kafka',
    provider: 'generic',
    icon: '📊',
    services: [
      { service: 'postgresql', port: 5432, config: { database: 'devdb', user: 'dev', password: 'dev' } },
      { service: 'redis', port: 6379, config: {} },
      { service: 'elasticsearch', port: 9200, config: {} },
      { service: 'kafka', port: 9092, config: {} },
    ],
  },
  {
    id: 'microservices',
    name: 'Microservices Infrastructure',
    description: 'Redis + RabbitMQ + Consul + Vault + MinIO',
    provider: 'generic',
    icon: '🏗️',
    services: [
      { service: 'redis', port: 6379, config: {} },
      { service: 'rabbitmq', port: 5672, config: { managementPort: 15672 } },
      { service: 'consul', port: 8500, config: {} },
      { service: 'vault', port: 8200, config: {} },
      { service: 'minio', port: 9000, config: { consolePort: 9001 } },
    ],
  },
]

const PROVIDER_SERVICE_CATALOG: Record<CloudProvider, Array<{ service: string; label: string }>> = {
  aws: [
    { service: 's3', label: 'S3' },
    { service: 'dynamodb', label: 'DynamoDB' },
    { service: 'lambda', label: 'Lambda' },
    { service: 'sqs', label: 'SQS' },
    { service: 'sns', label: 'SNS' },
    { service: 'api-gateway', label: 'API Gateway' },
    { service: 'cognito', label: 'Cognito' },
    { service: 'ses', label: 'SES' },
    { service: 'step-functions', label: 'Step Functions' },
    { service: 'kinesis', label: 'Kinesis' },
    { service: 'secretsmanager', label: 'Secrets Manager' },
    { service: 'ssm', label: 'SSM Parameter Store' },
    { service: 'cloudwatch', label: 'CloudWatch' },
    { service: 'iam', label: 'IAM' },
    { service: 'sts', label: 'STS' },
  ],
  gcp: [
    { service: 'cloud-storage', label: 'Cloud Storage' },
    { service: 'firestore', label: 'Firestore' },
    { service: 'pubsub', label: 'Pub/Sub' },
    { service: 'cloud-functions', label: 'Cloud Functions' },
    { service: 'bigquery', label: 'BigQuery' },
    { service: 'cloud-run', label: 'Cloud Run' },
    { service: 'cloud-tasks', label: 'Cloud Tasks' },
    { service: 'cloud-scheduler', label: 'Cloud Scheduler' },
  ],
  azure: [
    { service: 'blob-storage', label: 'Blob Storage' },
    { service: 'cosmos-db', label: 'Cosmos DB' },
    { service: 'functions', label: 'Functions' },
    { service: 'service-bus', label: 'Service Bus' },
    { service: 'event-grid', label: 'Event Grid' },
    { service: 'key-vault', label: 'Key Vault' },
    { service: 'cognitive-services', label: 'Cognitive Services' },
  ],
  firebase: [
    { service: 'auth', label: 'Auth' },
    { service: 'firestore', label: 'Firestore' },
    { service: 'rtdb', label: 'Realtime DB' },
    { service: 'storage', label: 'Storage' },
    { service: 'functions', label: 'Functions' },
    { service: 'hosting', label: 'Hosting' },
    { service: 'messaging', label: 'Messaging' },
  ],
  generic: [
    { service: 'redis', label: 'Redis' },
    { service: 'postgresql', label: 'PostgreSQL' },
    { service: 'mongodb', label: 'MongoDB' },
    { service: 'elasticsearch', label: 'Elasticsearch' },
    { service: 'rabbitmq', label: 'RabbitMQ' },
    { service: 'kafka', label: 'Kafka' },
    { service: 'minio', label: 'MinIO' },
    { service: 'vault', label: 'Vault' },
    { service: 'consul', label: 'Consul' },
    { service: 'etcd', label: 'etcd' },
  ],
}

const SERVICE_ALIASES: Record<string, string> = {
  'pub-sub': 'pubsub',
  'servicebus': 'service-bus',
  'realtime-db': 'rtdb',
  'realtime-database': 'rtdb',
}

// Service port mappings
const SERVICE_DEFAULTS: Record<string, { port: number; image: string; healthPath: string }> = {
  // AWS
  's3': { port: 4569, image: 'localstack/localstack', healthPath: '/_localstack/health' },
  'dynamodb': { port: 4568, image: 'amazon/dynamodb-local', healthPath: '/' },
  'lambda': { port: 4566, image: 'localstack/localstack', healthPath: '/_localstack/health' },
  'sqs': { port: 4570, image: 'localstack/localstack', healthPath: '/_localstack/health' },
  // Firebase
  'auth': { port: 9099, image: 'firebase-emulators', healthPath: '/' },
  'firestore': { port: 8080, image: 'firebase-emulators', healthPath: '/' },
  'rtdb': { port: 9000, image: 'firebase-emulators', healthPath: '/' },
  // Generic
  'redis': { port: 6379, image: 'redis:7-alpine', healthPath: '' },
  'postgresql': { port: 5432, image: 'postgres:16-alpine', healthPath: '' },
  'mongodb': { port: 27017, image: 'mongo:7', healthPath: '' },
  'elasticsearch': { port: 9200, image: 'elasticsearch:8.13.4', healthPath: '/_cluster/health' },
  'rabbitmq': { port: 5672, image: 'rabbitmq:3-management', healthPath: '' },
  'kafka': { port: 9092, image: 'confluentinc/cp-kafka:7.6.0', healthPath: '' },
  'minio': { port: 9000, image: 'minio/minio', healthPath: '/minio/health/live' },
  'vault': { port: 8200, image: 'hashicorp/vault', healthPath: '/v1/sys/health' },
  'consul': { port: 8500, image: 'hashicorp/consul', healthPath: '/v1/status/leader' },
}

class CloudEmulationService {
  private emulators: Map<string, CloudEmulatorConfig> = new Map()

  private normalizeService(service: string): string {
    const normalized = service
      .trim()
      .toLowerCase()
      .replace(/[\/_\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    return SERVICE_ALIASES[normalized] || normalized
  }

  private getServiceCapability(provider: CloudProvider, service: string): CloudServiceCapability | undefined {
    const normalized = this.normalizeService(service)
    const providerCatalog = PROVIDER_SERVICE_CATALOG[provider] || []
    const catalogEntry = providerCatalog.find(entry => entry.service === normalized)
    if (!catalogEntry) return undefined

    const defaults = SERVICE_DEFAULTS[normalized]
    const supported = Boolean(defaults?.image)

    return {
      provider,
      service: normalized,
      label: catalogEntry.label,
      supported,
      reason: supported ? undefined : 'No runtime image configured for this service',
      defaultPort: defaults?.port,
    }
  }

  private async ensureDockerAvailable(): Promise<void> {
    try {
      await execFileAsync('docker', ['--version'])
    } catch {
      throw new Error('Docker runtime is required for cloud emulation but is not available in this environment')
    }
  }

  // Get all presets
  getPresets(): CloudEmulatorPreset[] {
    return EMULATOR_PRESETS
  }

  // Get preset by ID
  getPreset(id: string): CloudEmulatorPreset | undefined {
    return EMULATOR_PRESETS.find(p => p.id === id)
  }

  getCapabilities(): CloudEmulationCapabilities {
    const providers = {
      aws: [] as CloudServiceCapability[],
      gcp: [] as CloudServiceCapability[],
      azure: [] as CloudServiceCapability[],
      firebase: [] as CloudServiceCapability[],
      generic: [] as CloudServiceCapability[],
    }

    for (const [provider, services] of Object.entries(PROVIDER_SERVICE_CATALOG) as [CloudProvider, Array<{ service: string; label: string }>][]) {
      providers[provider] = services.map(({ service, label }) => {
        const defaults = SERVICE_DEFAULTS[service]
        const supported = Boolean(defaults?.image)

        return {
          provider,
          service,
          label,
          supported,
          reason: supported ? undefined : 'No runtime image configured for this service',
          defaultPort: defaults?.port,
        }
      })
    }

    return { providers }
  }

  // Start a single emulator
  async startEmulator(
    provider: CloudProvider,
    service: string,
    config?: Partial<CloudEmulatorConfig>
  ): Promise<CloudEmulatorConfig> {
    const normalizedService = this.normalizeService(service)
    const capability = this.getServiceCapability(provider, normalizedService)
    if (!capability) {
      throw new Error(`Service ${normalizedService} is not available for provider ${provider}`)
    }
    if (!capability.supported) {
      throw new Error(capability.reason || `Service ${normalizedService} is not supported in this environment`)
    }

    const defaults = SERVICE_DEFAULTS[normalizedService] || { port: 8000, image: '', healthPath: '' }
    const id = `${provider}-${normalizedService}-${Date.now()}`

    const emulator: CloudEmulatorConfig = {
      id,
      provider,
      service: normalizedService,
      name: `${provider.toUpperCase()} ${capability.label}`,
      port: config?.port || defaults.port,
      status: 'starting',
      config: config?.config || {},
      logs: [],
      resources: {
        cpuLimit: '0.5',
        memoryLimit: '512m',
        storageLimit: '1g',
      },
    }

    this.emulators.set(id, emulator)

    emulator.logs.push(`[${new Date().toISOString()}] Starting ${normalizedService} emulator...`)
    emulator.logs.push(`[${new Date().toISOString()}] Using image: ${defaults.image || 'unknown'}`)
    emulator.logs.push(`[${new Date().toISOString()}] Binding to port: ${emulator.port}`)

    if (!defaults.image) {
      emulator.status = 'error'
      emulator.logs.push(`[${new Date().toISOString()}] ❌ No runtime image configured for service: ${service}`)
      throw new Error(`No runtime image configured for service: ${service}`)
    }

    try {
      await this.ensureDockerAvailable()

      const containerName = `${provider}-${service}-${Date.now()}`.replace(/[^a-zA-Z0-9_.-]/g, '-')
      const containerPort = defaults.port
      const { stdout } = await execFileAsync('docker', [
        'run',
        '-d',
        '--rm',
        '--name',
        containerName,
        '-p',
        `${emulator.port}:${containerPort}`,
        defaults.image,
      ])

      emulator.container = stdout.trim()
      emulator.status = 'running'
      emulator.startedAt = Date.now()
      emulator.endpoint = `http://localhost:${emulator.port}`
      emulator.healthCheck = defaults.healthPath
        ? `http://localhost:${emulator.port}${defaults.healthPath}`
        : undefined
      emulator.logs.push(`[${new Date().toISOString()}] ✅ ${normalizedService} is ready at ${emulator.endpoint}`)
    } catch (error) {
      emulator.status = 'error'
      const message = error instanceof Error ? error.message : 'Failed to start emulator'
      emulator.logs.push(`[${new Date().toISOString()}] ❌ ${message}`)
      throw new Error(`Failed to start emulator ${normalizedService}: ${message}`)
    }

    return emulator
  }

  async startServices(
    provider: CloudProvider,
    services: string[],
    config?: Partial<CloudEmulatorConfig>
  ): Promise<CloudEmulatorStartResult[]> {
    const results: CloudEmulatorStartResult[] = []

    for (const service of services) {
      const normalizedService = this.normalizeService(service)
      const capability = this.getServiceCapability(provider, normalizedService)

      if (!capability) {
        results.push({
          provider,
          service: normalizedService || service,
          success: false,
          error: `Service ${service} is not available for provider ${provider}`,
        })
        continue
      }

      if (!capability.supported) {
        results.push({
          provider,
          service: capability.service,
          success: false,
          error: capability.reason || `Service ${capability.service} is not supported in this environment`,
        })
        continue
      }

      try {
        const emulator = await this.startEmulator(provider, capability.service, config)
        results.push({ provider, service: capability.service, success: true, emulator })
      } catch (error) {
        results.push({
          provider,
          service: capability.service,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start emulator',
        })
      }
    }

    return results
  }

  async startPresetWithResults(presetId: string): Promise<CloudEmulatorStartResult[]> {
    const preset = this.getPreset(presetId)
    if (!preset) throw new Error(`Preset ${presetId} not found`)

    const results: CloudEmulatorStartResult[] = []

    for (const svc of preset.services) {
      const serviceResults = await this.startServices(preset.provider, [svc.service], {
        port: svc.port,
        config: svc.config,
      })
      results.push(...serviceResults)
    }

    return results
  }

  // Start a preset (multiple emulators)
  async startPreset(presetId: string): Promise<CloudEmulatorConfig[]> {
    const results = await this.startPresetWithResults(presetId)
    return results.flatMap(result => (result.success && result.emulator ? [result.emulator] : []))
  }

  // Stop an emulator
  async stopEmulator(id: string): Promise<void> {
    const emulator = this.emulators.get(id)
    if (!emulator) return

    if (emulator.container) {
      try {
        await execFileAsync('docker', ['stop', emulator.container])
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to stop container'
        emulator.logs.push(`[${new Date().toISOString()}] ⚠️ ${message}`)
      }
    }

    emulator.status = 'stopped'
    emulator.logs.push(`[${new Date().toISOString()}] Stopped ${emulator.service}`)
  }

  // Stop all
  async stopAll(): Promise<void> {
    for (const id of this.emulators.keys()) {
      await this.stopEmulator(id)
    }
  }

  // Get running emulators
  getRunning(): CloudEmulatorConfig[] {
    return Array.from(this.emulators.values()).filter(e => e.status === 'running')
  }

  // Get all emulators
  getAll(): CloudEmulatorConfig[] {
    return Array.from(this.emulators.values())
  }

  // Get emulator by ID
  getEmulator(id: string): CloudEmulatorConfig | undefined {
    return this.emulators.get(id)
  }

  // Get logs
  getLogs(id: string): string[] {
    return this.emulators.get(id)?.logs || []
  }

  // Health check
  async checkHealth(id: string): Promise<{ healthy: boolean; latency: number }> {
    const emulator = this.emulators.get(id)
    if (!emulator || emulator.status !== 'running') {
      return { healthy: false, latency: 0 }
    }

    if (!emulator.healthCheck) {
      return { healthy: Boolean(emulator.endpoint), latency: 0 }
    }

    const started = Date.now()
    try {
      const response = await fetch(emulator.healthCheck, { method: 'GET' })
      return { healthy: response.ok, latency: Date.now() - started }
    } catch {
      return { healthy: false, latency: Date.now() - started }
    }
  }

  // Get environment variables for connecting to emulators
  getEnvironmentVariables(): Record<string, string> {
    const vars: Record<string, string> = {}
    for (const emulator of this.emulators.values()) {
      if (emulator.status !== 'running') continue
      const prefix = `${emulator.provider.toUpperCase()}_${emulator.service.replace(/-/g, '_').toUpperCase()}`
      vars[`${prefix}_ENDPOINT`] = emulator.endpoint || ''
      vars[`${prefix}_PORT`] = emulator.port.toString()
    }
    return vars
  }
}

export const cloudEmulation = new CloudEmulationService()
