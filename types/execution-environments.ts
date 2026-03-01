/**
 * Execution Environment Types
 * 
 * Multi-modal execution environment type definitions for Azora BuildSpaces.
 * Supports: DevContainers, Docker, Kubernetes, WebContainers, VMs, Firecracker.
 */

export type EnvironmentType = 'devcontainer' | 'docker' | 'kubernetes' | 'webcontainer' | 'vm' | 'firecracker'
export type EnvironmentStatus = 'creating' | 'pulling' | 'starting' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error' | 'hibernated'

export interface ExecutionEnvironment {
  id: string
  type: EnvironmentType
  status: EnvironmentStatus
  config: EnvironmentConfig
  userId: string
  projectId?: string
  createdAt: number
  startedAt?: number
  lastActiveAt?: number
  expiresAt?: number
  url?: string
  ports: PortForward[]
  resources: ResourceAllocation
  snapshot?: EnvironmentSnapshot
  prebuild?: PrebuildReference
  metrics?: EnvironmentMetrics
  error?: string
}

export interface EnvironmentConfig {
  name: string
  image?: string
  dockerfile?: string
  dockerCompose?: string
  devcontainerJson?: string
  kubernetesManifest?: string
  vmImage?: string
  workspaceDir: string
  environment: Record<string, string>
  secrets: string[]  // secret names, not values
  features: string[]  // dev container features
  extensions: string[]  // editor extensions
  postCreateCommand?: string
  postStartCommand?: string
  postAttachCommand?: string
  forwardPorts?: number[]
  customizations?: Record<string, any>
}

export interface PortForward {
  port: number
  label?: string
  protocol: 'tcp' | 'udp'
  visibility: 'private' | 'organization' | 'public'
  url?: string  // generated URL for accessing the port
  isHttps: boolean
  customDomain?: string
}

export interface ResourceAllocation {
  cpu: number        // cores
  memory: number     // MB
  storage: number    // GB
  gpu?: string       // GPU type, e.g., 'nvidia-t4'
  gpuCount?: number
  tier: 'free' | 'basic' | 'standard' | 'performance' | 'enterprise'
}

export interface EnvironmentSnapshot {
  id: string
  name: string
  description?: string
  sizeBytes: number
  createdAt: number
  expiresAt?: number
  tags: string[]
}

export interface PrebuildReference {
  id: string
  commitSha: string
  branch: string
  status: 'pending' | 'building' | 'ready' | 'failed' | 'expired'
  builtAt?: number
  cacheSizeBytes?: number
}

export interface EnvironmentMetrics {
  cpuPercent: number
  memoryUsedMB: number
  memoryTotalMB: number
  diskUsedGB: number
  diskTotalGB: number
  networkInBytes: number
  networkOutBytes: number
  uptimeSeconds: number
  processCount: number
  timestamp: number
}

export interface EnvironmentTemplate {
  id: string
  name: string
  description: string
  type: EnvironmentType
  icon: string
  config: Partial<EnvironmentConfig>
  resources: ResourceAllocation
  tags: string[]
  popularity: number
  author: string
  verified: boolean
}

// Pre-defined environment templates
export const ENVIRONMENT_TEMPLATES: EnvironmentTemplate[] = [
  {
    id: 'node-ts',
    name: 'Node.js + TypeScript',
    description: 'Full-stack TypeScript with Node.js 22, npm, and common dev tools',
    type: 'devcontainer',
    icon: '🟨',
    config: {
      name: 'Node.js TypeScript',
      image: 'mcr.microsoft.com/devcontainers/typescript-node:22',
      features: ['ghcr.io/devcontainers/features/common-utils:2'],
      extensions: ['dbaeumer.vscode-eslint', 'esbenp.prettier-vscode'],
    },
    resources: { cpu: 2, memory: 4096, storage: 32, tier: 'standard' },
    tags: ['node', 'typescript', 'javascript', 'web'],
    popularity: 98,
    author: 'azora',
    verified: true,
  },
  {
    id: 'python-ml',
    name: 'Python ML/Data Science',
    description: 'Python 3.12 with Jupyter, TensorFlow, PyTorch, and data science stack',
    type: 'devcontainer',
    icon: '🐍',
    config: {
      name: 'Python ML',
      image: 'mcr.microsoft.com/devcontainers/python:3.12',
      features: ['ghcr.io/devcontainers/features/python:1'],
      extensions: ['ms-python.python', 'ms-toolsai.jupyter'],
      postCreateCommand: 'pip install numpy pandas scikit-learn matplotlib torch tensorflow jupyter',
    },
    resources: { cpu: 4, memory: 8192, storage: 64, gpu: 'nvidia-t4', gpuCount: 1, tier: 'performance' },
    tags: ['python', 'machine-learning', 'data-science', 'jupyter'],
    popularity: 92,
    author: 'azora',
    verified: true,
  },
  {
    id: 'rust-systems',
    name: 'Rust Systems Programming',
    description: 'Rust with cargo, rust-analyzer, and systems development tools',
    type: 'devcontainer',
    icon: '🦀',
    config: {
      name: 'Rust',
      image: 'mcr.microsoft.com/devcontainers/rust:1',
      extensions: ['rust-lang.rust-analyzer'],
      postCreateCommand: 'rustup component add clippy rustfmt',
    },
    resources: { cpu: 2, memory: 4096, storage: 32, tier: 'standard' },
    tags: ['rust', 'systems', 'low-level'],
    popularity: 85,
    author: 'azora',
    verified: true,
  },
  {
    id: 'go-cloud',
    name: 'Go Cloud Native',
    description: 'Go with Docker, Kubernetes, and cloud-native tools',
    type: 'devcontainer',
    icon: '🐹',
    config: {
      name: 'Go Cloud',
      image: 'mcr.microsoft.com/devcontainers/go:1.22',
      features: ['ghcr.io/devcontainers/features/docker-in-docker:2', 'ghcr.io/devcontainers/features/kubectl-helm-minikube:1'],
      extensions: ['golang.go'],
    },
    resources: { cpu: 2, memory: 4096, storage: 32, tier: 'standard' },
    tags: ['go', 'kubernetes', 'docker', 'cloud'],
    popularity: 80,
    author: 'azora',
    verified: true,
  },
  {
    id: 'java-spring',
    name: 'Java Spring Boot',
    description: 'Java 21 with Spring Boot, Maven/Gradle, and enterprise tools',
    type: 'devcontainer',
    icon: '☕',
    config: {
      name: 'Java Spring',
      image: 'mcr.microsoft.com/devcontainers/java:21',
      features: ['ghcr.io/devcontainers/features/java:1'],
      extensions: ['vscjava.vscode-java-pack', 'vmware.vscode-spring-boot'],
    },
    resources: { cpu: 2, memory: 4096, storage: 32, tier: 'standard' },
    tags: ['java', 'spring', 'enterprise'],
    popularity: 78,
    author: 'azora',
    verified: true,
  },
  {
    id: 'web3-solidity',
    name: 'Web3 / Solidity',
    description: 'Ethereum development with Solidity, Hardhat, and testing tools',
    type: 'devcontainer',
    icon: '💎',
    config: {
      name: 'Web3 Dev',
      image: 'mcr.microsoft.com/devcontainers/typescript-node:22',
      extensions: ['JuanBlanco.solidity', 'NomicFoundation.hardhat-solidity'],
      postCreateCommand: 'npm install -g hardhat @openzeppelin/contracts ethers',
    },
    resources: { cpu: 2, memory: 4096, storage: 32, tier: 'standard' },
    tags: ['web3', 'solidity', 'ethereum', 'blockchain'],
    popularity: 70,
    author: 'azora',
    verified: true,
  },
  {
    id: 'flutter-mobile',
    name: 'Flutter Mobile',
    description: 'Flutter with Dart SDK, Android tools, and iOS simulator support',
    type: 'devcontainer',
    icon: '🎯',
    config: {
      name: 'Flutter',
      image: 'ghcr.io/aspect-build/flutter-dev:3',
      extensions: ['dart-code.dart-code', 'dart-code.flutter'],
    },
    resources: { cpu: 4, memory: 8192, storage: 64, tier: 'performance' },
    tags: ['flutter', 'dart', 'mobile', 'ios', 'android'],
    popularity: 75,
    author: 'azora',
    verified: true,
  },
  {
    id: 'full-stack',
    name: 'Full Stack (Next.js + Postgres)',
    description: 'Next.js, PostgreSQL, Redis, and full-stack development tools',
    type: 'docker',
    icon: '🚀',
    config: {
      name: 'Full Stack',
      dockerCompose: 'docker-compose.yml',
      extensions: ['dbaeumer.vscode-eslint', 'esbenp.prettier-vscode', 'prisma.prisma'],
      forwardPorts: [3000, 5432, 6379],
    },
    resources: { cpu: 4, memory: 8192, storage: 64, tier: 'performance' },
    tags: ['nextjs', 'postgres', 'redis', 'fullstack'],
    popularity: 90,
    author: 'azora',
    verified: true,
  },
]
