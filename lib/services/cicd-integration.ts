/**
 * CI/CD Integration Service (Task 12)
 * 
 * Build pipeline management, deployment automation, and 
 * CI/CD configuration for Code Chamber.
 * 
 * Supports:
 * - GitHub Actions
 * - GitLab CI
 * - CircleCI
 * - Jenkins
 * - Custom pipelines
 * - Pipeline visualization and monitoring
 * - Deployment previews (Vercel, Netlify, Cloudflare Pages)
 * - Artifact management
 * - Environment management
 */

import { randomUUID } from 'crypto'

export type CIProvider =
  | 'github-actions'
  | 'gitlab-ci'
  | 'circle-ci'
  | 'jenkins'
  | 'azure-devops'
  | 'bitbucket-pipelines'
  | 'custom'

export type DeployProvider =
  | 'vercel'
  | 'netlify'
  | 'cloudflare-pages'
  | 'aws-amplify'
  | 'firebase-hosting'
  | 'fly-io'
  | 'railway'
  | 'render'
  | 'docker'
  | 'kubernetes'

export interface Pipeline {
  id: string
  name: string
  provider: CIProvider
  status: PipelineStatus
  branch: string
  commit: string
  commitMessage: string
  author: string
  trigger: 'push' | 'pull_request' | 'manual' | 'schedule' | 'webhook'
  startedAt: number
  finishedAt?: number
  duration?: number
  stages: PipelineStage[]
  artifacts: PipelineArtifact[]
  environment?: string
}

export type PipelineStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'skipped'

export interface PipelineStage {
  id: string
  name: string
  status: PipelineStatus
  jobs: PipelineJob[]
  startedAt?: number
  finishedAt?: number
}

export interface PipelineJob {
  id: string
  name: string
  status: PipelineStatus
  steps: PipelineStep[]
  runner?: string
  logs: string[]
  startedAt?: number
  finishedAt?: number
}

export interface PipelineStep {
  id: string
  name: string
  status: PipelineStatus
  command?: string
  duration?: number
  output?: string
}

export interface PipelineArtifact {
  id: string
  name: string
  size: number          // bytes
  type: 'build' | 'test-report' | 'coverage' | 'docker-image' | 'binary' | 'other'
  url?: string
  expiresAt?: number
}

export interface DeploymentPreview {
  id: string
  provider: DeployProvider
  url: string
  branch: string
  commit: string
  status: 'building' | 'ready' | 'failed' | 'expired'
  createdAt: number
  expiresAt?: number
}

export interface CICDEnvironment {
  id: string
  name: string
  type: 'development' | 'staging' | 'production' | 'preview'
  url?: string
  variables: Record<string, string>
  secrets: string[]      // Names only, not values
  lastDeployedAt?: number
  lastDeployedCommit?: string
  protectionRules?: {
    requiredReviewers: number
    branchPattern: string
    autoMerge: boolean
  }
}

// CI config templates
export interface CIConfigTemplate {
  id: string
  name: string
  provider: CIProvider
  language: string
  framework?: string
  description: string
  config: string         // YAML/JSON config content
}

const CI_TEMPLATES: CIConfigTemplate[] = [
  {
    id: 'gh-nextjs',
    name: 'Next.js CI/CD',
    provider: 'github-actions',
    language: 'typescript',
    framework: 'nextjs',
    description: 'Build, test, and deploy Next.js app',
    config: `name: Next.js CI/CD
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod`,
  },
  {
    id: 'gh-python',
    name: 'Python CI/CD',
    provider: 'github-actions',
    language: 'python',
    description: 'Lint, test, and publish Python package',
    config: `name: Python CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: \${{ matrix.python-version }} }
      - run: pip install -e ".[dev]"
      - run: pytest --cov --cov-report=xml
      - uses: codecov/codecov-action@v4`,
  },
  {
    id: 'gh-docker',
    name: 'Docker Build & Push',
    provider: 'github-actions',
    language: 'dockerfile',
    description: 'Build, scan, and push Docker images',
    config: `name: Docker CI
on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/\${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max`,
  },
  {
    id: 'gh-rust',
    name: 'Rust CI',
    provider: 'github-actions',
    language: 'rust',
    description: 'Rust build, test, clippy, and fmt',
    config: `name: Rust CI
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with: { components: "clippy, rustfmt" }
      - uses: Swatinem/rust-cache@v2
      - run: cargo fmt -- --check
      - run: cargo clippy -- -D warnings
      - run: cargo test
      - run: cargo build --release`,
  },
]

class CICDService {
  private pipelines: Map<string, Pipeline> = new Map()
  private deployments: Map<string, DeploymentPreview> = new Map()
  private environments: Map<string, CICDEnvironment> = new Map()

  private nextPipelineId(): string {
    return `pipeline-${randomUUID()}`
  }

  private requiredPreviewEnv(provider: DeployProvider): string[] {
    switch (provider) {
      case 'vercel':
        return ['VERCEL_TOKEN']
      case 'netlify':
        return ['NETLIFY_AUTH_TOKEN']
      case 'cloudflare-pages':
        return ['CLOUDFLARE_API_TOKEN']
      case 'aws-amplify':
        return ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
      case 'firebase-hosting':
        return ['FIREBASE_TOKEN']
      case 'fly-io':
        return ['FLY_API_TOKEN']
      case 'railway':
        return ['RAILWAY_TOKEN']
      case 'render':
        return ['RENDER_API_KEY']
      case 'docker':
      case 'kubernetes':
        return []
      default:
        return []
    }
  }

  // Templates
  getTemplates(provider?: CIProvider, language?: string): CIConfigTemplate[] {
    let templates = [...CI_TEMPLATES]
    if (provider) templates = templates.filter(t => t.provider === provider)
    if (language) templates = templates.filter(t => t.language === language)
    return templates
  }

  // list all supported CI/CD providers
  getSupportedProviders(): CIProvider[] {
    return [
      'github-actions',
      'gitlab-ci',
      'circle-ci',
      'jenkins',
      'azure-devops',
      'bitbucket-pipelines',
      'custom',
    ]
  }

  /**
   * convenience helper used by API route to create a bare pipeline from
   * name/provider/config.
   */
  async createPipeline(name: string, provider: CIProvider, config: any): Promise<Pipeline> {
    void config
    const id = this.nextPipelineId()
    const pipeline: Pipeline = {
      id,
      name,
      provider,
      status: 'pending', // use a valid PipelineStatus
      branch: 'main',
      commit: '',
      commitMessage: '',
      author: '',
      trigger: 'manual',
      startedAt: Date.now(),
      stages: [],
      artifacts: [],
    }
    this.pipelines.set(id, pipeline)
    return pipeline
  }

  /**
   * simple runner that marks an existing pipeline as started/ running and
   * updates its branch. Used by API when triggering by id.
   */
  async runPipeline(pipelineId: string, branch: string): Promise<Pipeline> {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`)
    }

    pipeline.status = 'running'
    pipeline.branch = branch
    pipeline.startedAt = Date.now()

    this.pipelines.set(pipelineId, pipeline)
    return pipeline
  }

  getTemplate(id: string): CIConfigTemplate | undefined {
    return CI_TEMPLATES.find(t => t.id === id)
  }

  /**
   * Create a new pipeline based on a named template.  This is a thin
   * convenience wrapper around {@link createPipeline} that looks up the
   * template by id and then invokes the generic creation helper with the
   * template's provider and config blob.  The API route and UI rely on this
   * method so we keep it here rather than implementing the logic externally.
   */
  async createFromTemplate(templateId: string, name: string): Promise<Pipeline> {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`CI/CD template not found: ${templateId}`)
    }
    // template.config is a YAML/JSON string; the service consumer can parse
    // it if needed, but for now we just pass it along as-is since
    // createPipeline accepts `any` for the config parameter.
    return await this.createPipeline(name, template.provider, template.config)
  }

  // Pipeline operations
  async triggerPipeline(options: {
    name: string
    provider: CIProvider
    branch: string
    commit: string
    commitMessage: string
    author: string
    trigger: Pipeline['trigger']
    stages: { name: string; jobs: { name: string; steps: { name: string; command?: string }[] }[] }[]
  }): Promise<Pipeline> {
    const id = this.nextPipelineId()
    const pipeline: Pipeline = {
      id,
      name: options.name,
      provider: options.provider,
      status: 'running',
      branch: options.branch,
      commit: options.commit,
      commitMessage: options.commitMessage,
      author: options.author,
      trigger: options.trigger,
      startedAt: Date.now(),
      stages: options.stages.map((stage, si) => ({
        id: `${id}-stage-${si}`,
        name: stage.name,
        status: si === 0 ? 'running' : 'pending',
        jobs: stage.jobs.map((job, ji) => ({
          id: `${id}-stage-${si}-job-${ji}`,
          name: job.name,
          status: si === 0 && ji === 0 ? 'running' : 'pending',
          steps: job.steps.map((step, sti) => ({
            id: `${id}-stage-${si}-job-${ji}-step-${sti}`,
            name: step.name,
            status: 'pending' as PipelineStatus,
            command: step.command,
          })),
          logs: [],
        })),
      })),
      artifacts: [],
    }

    this.pipelines.set(id, pipeline)
    return pipeline
  }

  // Get pipeline status
  getPipeline(id: string): Pipeline | undefined {
    return this.pipelines.get(id)
  }

  // List recent pipelines
  getRecentPipelines(limit = 20): Pipeline[] {
    return Array.from(this.pipelines.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
  }

  // Cancel pipeline
  async cancelPipeline(id: string): Promise<void> {
    const pipeline = this.pipelines.get(id)
    if (!pipeline) return
    pipeline.status = 'cancelled'
    pipeline.finishedAt = Date.now()
    pipeline.duration = pipeline.finishedAt - pipeline.startedAt
  }

  // Deployment previews
  async createDeploymentPreview(options: {
    provider: DeployProvider
    branch: string
    commit: string
  }): Promise<DeploymentPreview> {
    const id = `deploy-${Date.now()}`
    const preview: DeploymentPreview = {
      id,
      provider: options.provider,
      url: `https://${options.branch.replace(/[^a-z0-9]/gi, '-')}-preview.azora.dev`,
      branch: options.branch,
      commit: options.commit,
      status: 'building',
      createdAt: Date.now(),
    }

    this.deployments.set(id, preview)

    const required = this.requiredPreviewEnv(options.provider)
    const missing = required.filter((key) => !process.env[key])
    preview.status = missing.length === 0 ? 'ready' : 'failed'

    return preview
  }

  getDeployments(): DeploymentPreview[] {
    return Array.from(this.deployments.values())
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  // Environment management
  createEnvironment(env: Omit<CICDEnvironment, 'id'>): CICDEnvironment {
    const id = `env-${env.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
    const environment: CICDEnvironment = { ...env, id }
    this.environments.set(id, environment)
    return environment
  }

  getEnvironments(): CICDEnvironment[] {
    return Array.from(this.environments.values())
  }

  getEnvironment(id: string): CICDEnvironment | undefined {
    return this.environments.get(id)
  }

  updateEnvironment(id: string, updates: Partial<CICDEnvironment>): CICDEnvironment | null {
    const env = this.environments.get(id)
    if (!env) return null
    const updated = { ...env, ...updates }
    this.environments.set(id, updated)
    return updated
  }

  // Generate pipeline config
  generateConfig(provider: CIProvider, language: string, framework?: string): string | null {
    const template = CI_TEMPLATES.find(t =>
      t.provider === provider &&
      t.language === language &&
      (!framework || t.framework === framework)
    )
    return template?.config || null
  }
}

export const cicdService = new CICDService()
