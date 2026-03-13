/**
 * Environment Configuration Module
 * 
 * Provides type-safe environment variable access with Zod validation.
 * Validates all required environment variables at startup with clear error messages.
 * 
 * Requirements: 4.3, 5.2, 6.1, 6.2, 6.4
 */

import { z } from 'zod'

/**
 * Environment validation schema
 * Defines all environment variables with their types and validation rules
 */
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Application Configuration
  BUILDSPACES_PORT: z.string().default('3002'),
  BUILDSPACES_ENV: z.string().default('development'),
  PORT: z.string().default('3000'),
  BUILDSPACES_DEBUG: z.string().transform(val => val === 'true').default('false'),
  BUILDSPACES_LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PROJECT_ROOT: z.string().optional(),
  npm_package_version: z.string().optional(),

  // Authentication (Required)
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required for authentication'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL').default('http://localhost:3002'),
  NEXTAUTH_URL_INTERNAL: z.string().url().optional(),
  JWT_SECRET: z.string().optional(),
  GITHUB_ID: z.string().optional(),
  GITHUB_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DEV_AUTH_EMAIL: z.string().optional(),
  DEV_AUTH_PASSWORD: z.string().optional(),
  AUTH_FAILED_LOGIN_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('5'),
  AUTH_FAILED_LOGIN_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('900000'),
  AUTH_MULTI_IP_THRESHOLD: z.string().transform(val => parseInt(val, 10)).default('3'),
  AUTH_MULTI_IP_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('300000'),

  // Database (Required)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required. Set to your PostgreSQL connection string.'),
  DIRECT_URL: z.string().optional(),
  DATABASE_POOL_SIZE: z.string().transform(val => parseInt(val, 10)).default('20'),

  // Redis (Optional)
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  USE_REDIS: z.string().transform(val => val === 'true').default('false'),

  // LLM Providers (At least one required for AI features)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ORG_ID: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  LOCAL_LLM_MODEL: z.string().optional(),
  LOCAL_LLM_API_URL: z.string().url().optional(),

  // GitHub Integration (Optional)
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_APP_ID: z.string().optional(),
  GITHUB_APP_PRIVATE_KEY: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  SSH_KEY_PATH: z.string().optional(),

  // Figma Integration (Optional)
  FIGMA_TOKEN: z.string().optional(),

  // Stripe Payment (Optional)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Web3 / Blockchain (Optional)
  ETHEREUM_RPC_URL: z.string().url().optional(),
  SOLANA_RPC_URL: z.string().url().optional(),
  WEB3_DEPLOY_ADAPTER: z.string().optional(),
  WEB3_LOCAL_RPC_URL: z.string().url().optional(),
  WEB3_BRIDGE_URL: z.string().url().optional(),
  AZR_MINT_ENABLED: z.string().transform(val => val === 'true').default('false'),
  AZR_TOTAL_SUPPLY: z.string().transform(val => parseInt(val, 10)).optional(),
  AZR_CHAIN: z.string().optional(),
  AZR_CONTRACT_ADDRESS: z.string().optional(),

  // Feature Flags
  SANDBOX_ENABLED: z.string().transform(val => val === 'true').default('true'),
  USE_POSTGRES: z.string().transform(val => val === 'true').default('true'),
  ENABLE_WEBSOCKET_COLLABORATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_CONSTITUTIONAL_GATES: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AGENT_EXECUTION: z.string().transform(val => val === 'true').default('true'),

  // Terminal Service
  NEXT_PUBLIC_TERMINAL_ENABLED: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_TERMINAL_HOST: z.string().optional(),
  TERMINAL_BRIDGE_URL: z.string().url().optional(),

  // AI Agent Configuration
  NEXT_PUBLIC_AGENT_API_URL: z.string().default('/api/agents/invoke'),
  NEXT_PUBLIC_PREVIEW_URL: z.string().optional(),
  NEXT_PUBLIC_EXTERNAL_LLM_ENABLED: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_EXTERNAL_LLM_PROVIDER: z.enum(['openai', 'anthropic', 'local']).default('openai'),
  API_KEY: z.string().optional(),
  CODE_CHAMBER_PROVIDER: z.enum(['openai', 'citadelsm']).optional(),
  CITADELSM_ENDPOINT: z.string().url().optional(),
  NEXT_PUBLIC_NOTEBOOK_ENABLED: z.string().transform(val => val === 'true').default('false'),
  NOTEBOOK_EXECUTOR_URL: z.string().optional(),
  WORKSPACE_COMMANDS_ENABLED: z.string().transform(val => val === 'true').default('false'),
  DAP_BACKEND_ENABLED: z.string().transform(val => val === 'true').default('false'),
  DAP_BRIDGE_URL: z.string().url().optional(),
  NEXT_PUBLIC_DAP_BACKEND_ENABLED: z.string().transform(val => val === 'true').default('false'),
  LSP_BACKEND_ENABLED: z.string().transform(val => val === 'true').default('false'),
  GIT_BACKEND_ENABLED: z.string().transform(val => val === 'true').default('false'),
  PREBUILD_EXECUTOR_ENABLED: z.string().transform(val => val === 'true').default('false'),
  AUTH_PASSWORD_RESET_ENABLED: z.string().transform(val => val === 'true').default('false'),
  AUTH_EMAIL_VERIFICATION_ENABLED: z.string().transform(val => val === 'true').default('false'),
  AZORA_PILOT_AUTOMATIC_INGEST: z.string().transform(val => val === 'true').default('false'),
  TELEMETRY_ENDPOINT_URL: z.string().url().optional(),

  // Service Integrations
  AI_FAMILY_URL: z.string().url().optional(),
  AI_FAMILY_API_KEY: z.string().optional(),
  KNOWLEDGE_OCEAN_URL: z.string().url().optional(),
  KNOWLEDGE_OCEAN_API_KEY: z.string().optional(),
  ELARA_ORCHESTRATOR_URL: z.string().url().optional(),
  AZORA_ENCRYPTION_KEY: z.string().optional(),
  AZORA_AI_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),

  // Deployment Provider Credentials
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_ORG_ID: z.string().optional(),
  VERCEL_PROJECT_ID: z.string().optional(),
  NETLIFY_AUTH_TOKEN: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  FIREBASE_TOKEN: z.string().optional(),
  FLY_API_TOKEN: z.string().optional(),
  RAILWAY_TOKEN: z.string().optional(),
  RENDER_API_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  PISTON_API_URL: z.string().url().optional(),

  // Figma Feature Flag
  NEXT_PUBLIC_FIGMA_ENABLED: z.string().transform(val => val === 'true').default('false'),

  // PredAI Integration
  NEXT_PUBLIC_PREDAI_API_URL: z.string().url().default('http://localhost:3015'),

  // Room Feature Toggles
  ENABLE_CODE_CHAMBER: z.string().transform(val => val === 'true').default('true'),
  ENABLE_SPEC_CHAMBER: z.string().transform(val => val === 'true').default('true'),
  ENABLE_DESIGN_STUDIO: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AI_STUDIO: z.string().transform(val => val === 'true').default('true'),
  ENABLE_COMMAND_DESK: z.string().transform(val => val === 'true').default('true'),
  ENABLE_MAKER_LAB: z.string().transform(val => val === 'true').default('true'),
  ENABLE_COLLABORATION_POD: z.string().transform(val => val === 'true').default('true'),
  ENABLE_COLLECTIBLE_SHOWCASE: z.string().transform(val => val === 'true').default('true'),

  // Agent Configuration
  AGENT_TIMEOUT_MS: z.string().transform(val => parseInt(val, 10)).default('60000'),
  AGENT_MAX_RETRIES: z.string().transform(val => parseInt(val, 10)).default('3'),
  AGENT_COST_THRESHOLD_CENTS: z.string().transform(val => parseInt(val, 10)).default('500'),
  TRACK_AGENT_METRICS: z.string().transform(val => val === 'true').default('true'),

  // Monitoring & Observability
  PROMETHEUS_ENABLED: z.string().transform(val => val === 'true').default('false'),
  PROMETHEUS_PORT: z.string().default('9090'),
  METRICS_SCRAPE_INTERVAL: z.string().default('15s'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_SERVICE_NAME: z.string().default('buildspaces'),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: z.string().optional(),
  OTEL_ENABLED: z.string().transform(val => val === 'true').default('false'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

  // Development Settings
  NEXT_PUBLIC_DEBUG: z.string().transform(val => val === 'true').default('false'),
  NEXT_PUBLIC_MOCKING: z.string().transform(val => val === 'true').default('false'),
  TURBO_SKIP_PRUNE: z.string().transform(val => val === 'true').optional(),

  // API Gateway
  API_GATEWAY_URL: z.string().url().default('http://localhost:3000/api'),
  INTERNAL_API_URL: z.string().url().default('http://localhost:3000'),

  // Security & Compliance
  VAULT_ADDR: z.string().url().optional(),
  VAULT_TOKEN: z.string().optional(),
  CONSTITUTIONAL_PROFILE: z.enum(['STRICT', 'STANDARD', 'PERMISSIVE']).default('STANDARD'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(val => parseInt(val, 10)).default('1000'),
  CORS_ORIGIN: z.string().default('http://localhost:3002,http://localhost:3000'),

  // Collaboration
  NEXT_PUBLIC_WS_URL: z.string().optional(),
  NEXT_PUBLIC_COLLAB_WS_URL: z.string().optional(),
  NEXT_PUBLIC_COLLAB_SIGNALING_URL: z.string().optional(),
  COLLAB_WEBHOOK_URL: z.string().url().optional(),

  // Admin bootstrap
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
})

/**
 * Parsed and validated environment variables
 * This is the single source of truth for all environment configuration
 */
let env: z.infer<typeof envSchema>

/**
 * Validation errors encountered during environment parsing
 */
let validationErrors: z.ZodError | null = null

/**
 * Initialize and validate environment variables
 * Called automatically on module load
 */
function initializeEnv() {
  try {
    env = envSchema.parse(process.env)
    if (!env.JWT_SECRET) {
      env.JWT_SECRET = env.NEXTAUTH_SECRET
    }
    validationErrors = null
    
    // Log successful initialization in development
    if (env.NODE_ENV === 'development') {
      console.log('[ENV] ✓ Environment variables validated successfully')
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      validationErrors = error
      
      // Log detailed error messages
      console.error('[ENV] ✗ Environment validation failed:')
      console.error('[ENV]')
      
      error.errors.forEach((err) => {
        const path = err.path.join('.')
        console.error(`[ENV]   • ${path}: ${err.message}`)
      })
      
      console.error('[ENV]')
      console.error('[ENV] To fix these errors:')
      console.error('[ENV]   1. Copy .env.example to .env.local')
      console.error('[ENV]   2. Set the required environment variables')
      console.error('[ENV]   3. Restart the development server')
      console.error('[ENV]')
      
      // In production, throw the error to prevent startup
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Environment validation failed. Cannot start application.')
      }
      
      // In development, create a proxy that throws helpful errors
      env = createEnvProxy()
    } else {
      throw error
    }
  }
}

/**
 * Creates a proxy that throws helpful errors when accessing invalid env vars
 * Used in development when validation fails
 */
function createEnvProxy(): any {
  // Get the schema shape to access defaults
  const schemaShape = envSchema.shape as Record<string, any>
  
  return new Proxy({} as any, {
    get: (_target, prop) => {
      const propName = String(prop)
      
      // Check if this property has a default value in the schema
      const fieldSchema = schemaShape[propName]
      if (fieldSchema) {
        try {
          // Try to get the default value
          const result = fieldSchema.safeParse(undefined)
          if (result.success) {
            return result.data
          }
        } catch {
          // No default available
        }
      }
      
      // Find the specific error for this property
      const error = validationErrors?.errors.find(err => 
        err.path.join('.') === propName
      )
      
      if (error) {
        throw new Error(
          `Environment variable ${propName} is invalid: ${error.message}\n` +
          'Please check your .env.local file and ensure all required variables are set correctly.'
        )
      }
      
      throw new Error(
        `Environment variable ${propName} is not configured.\n` +
        'Please check your .env.local file.'
      )
    },
  })
}

// Initialize environment on module load
initializeEnv()

/**
 * Type-safe environment configuration object
 * Use this throughout the application instead of process.env
 * 
 * @example
 * import { env } from '@/lib/config/env'
 * 
 * const dbUrl = env.DATABASE_URL
 * const isDebug = env.BUILDSPACES_DEBUG
 */
export { env }

/**
 * Check if environment is properly configured
 * @returns true if all required variables are valid
 */
export function isEnvValid(): boolean {
  return validationErrors === null
}

/**
 * Get validation errors if any
 * @returns ZodError with details about invalid variables, or null if valid
 */
export function getEnvErrors(): z.ZodError | null {
  return validationErrors
}

/**
 * Get a formatted error message for display
 * @returns Human-readable error message or null if valid
 */
export function getEnvErrorMessage(): string | null {
  if (!validationErrors) return null
  
  const errors = validationErrors.errors.map(err => {
    const path = err.path.join('.')
    return `  • ${path}: ${err.message}`
  }).join('\n')
  
  return `Environment validation failed:\n${errors}\n\nPlease check your .env.local file.`
}

/**
 * Utility to check if a specific feature is enabled
 * Useful for conditional feature rendering
 */
export const features = {
  redis: () => env.USE_REDIS && Boolean(env.REDIS_URL),
  postgres: () => env.USE_POSTGRES && Boolean(env.DATABASE_URL),
  websocketCollaboration: () => env.ENABLE_WEBSOCKET_COLLABORATION,
  constitutionalGates: () => env.ENABLE_CONSTITUTIONAL_GATES,
  agentExecution: () => env.ENABLE_AGENT_EXECUTION,
  terminal: () => env.NEXT_PUBLIC_TERMINAL_ENABLED,
  notebook: () => env.NEXT_PUBLIC_NOTEBOOK_ENABLED,
  figma: () => env.NEXT_PUBLIC_FIGMA_ENABLED,
  stripe: () => Boolean(env.STRIPE_SECRET_KEY),
  github: () => Boolean(env.GITHUB_TOKEN),
  openai: () => Boolean(env.OPENAI_API_KEY),
  anthropic: () => Boolean(env.ANTHROPIC_API_KEY),
  localLLM: () => Boolean(env.LOCAL_LLM_API_URL),
  azrMinting: () => env.AZR_MINT_ENABLED,
  prometheus: () => env.PROMETHEUS_ENABLED,
  sentry: () => Boolean(env.SENTRY_DSN),
  otel: () => env.OTEL_ENABLED,
} as const

/**
 * Utility to check which rooms are enabled
 */
export const rooms = {
  codeChamber: () => env.ENABLE_CODE_CHAMBER,
  specChamber: () => env.ENABLE_SPEC_CHAMBER,
  designStudio: () => env.ENABLE_DESIGN_STUDIO,
  aiStudio: () => env.ENABLE_AI_STUDIO,
  commandDesk: () => env.ENABLE_COMMAND_DESK,
  makerLab: () => env.ENABLE_MAKER_LAB,
  collaborationPod: () => env.ENABLE_COLLABORATION_POD,
  collectibleShowcase: () => env.ENABLE_COLLECTIBLE_SHOWCASE,
} as const
