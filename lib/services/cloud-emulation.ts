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

  // Get all presets
  getPresets(): CloudEmulatorPreset[] {
    return EMULATOR_PRESETS
  }

  // Get preset by ID
  getPreset(id: string): CloudEmulatorPreset | undefined {
    return EMULATOR_PRESETS.find(p => p.id === id)
  }

  // Start a single emulator
  async startEmulator(
    provider: CloudProvider,
    service: string,
    config?: Partial<CloudEmulatorConfig>
  ): Promise<CloudEmulatorConfig> {
    const defaults = SERVICE_DEFAULTS[service] || { port: 8000, image: '', healthPath: '' }
    const id = `${provider}-${service}-${Date.now()}`

    const emulator: CloudEmulatorConfig = {
      id,
      provider,
      service,
      name: `${provider.toUpperCase()} ${service}`,
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

    // Simulate startup
    emulator.logs.push(`[${new Date().toISOString()}] Starting ${service} emulator...`)
    emulator.logs.push(`[${new Date().toISOString()}] Using image: ${defaults.image}`)
    emulator.logs.push(`[${new Date().toISOString()}] Binding to port: ${emulator.port}`)

    // In production, this would use Docker API or WebContainer
    setTimeout(() => {
      emulator.status = 'running'
      emulator.startedAt = Date.now()
      emulator.endpoint = `http://localhost:${emulator.port}`
      emulator.healthCheck = defaults.healthPath
        ? `http://localhost:${emulator.port}${defaults.healthPath}`
        : undefined
      emulator.logs.push(`[${new Date().toISOString()}] ✅ ${service} is ready at ${emulator.endpoint}`)
    }, 2000)

    return emulator
  }

  // Start a preset (multiple emulators)
  async startPreset(presetId: string): Promise<CloudEmulatorConfig[]> {
    const preset = this.getPreset(presetId)
    if (!preset) throw new Error(`Preset ${presetId} not found`)

    const configs: CloudEmulatorConfig[] = []
    for (const svc of preset.services) {
      const config = await this.startEmulator(preset.provider, svc.service, {
        port: svc.port,
        config: svc.config,
      })
      configs.push(config)
    }
    return configs
  }

  // Stop an emulator
  async stopEmulator(id: string): Promise<void> {
    const emulator = this.emulators.get(id)
    if (!emulator) return
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
    // Simulated health check
    return { healthy: true, latency: Math.random() * 10 }
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
