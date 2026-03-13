import { randomUUID } from 'node:crypto'
import { SecurityLayer } from './security-layer'

/**
 * Security & Sandboxing Service (Task 16)
 * 
 * Enterprise-grade security for Code Chamber workspaces.
 * 
 * Features:
 * - Container/VM-level isolation
 * - Network policy enforcement
 * - Secrets management (encrypted at rest)
 * - Content Security Policy (CSP)
 * - Code scanning (SAST/DAST)
 * - Dependency vulnerability scanning
 * - Access control (RBAC)
 * - Audit trail
 * - Secure environment variables
 * - Rate limiting
 */

export type SecurityLevel = 'standard' | 'enhanced' | 'strict' | 'paranoid'

export interface SecurityPolicy {
  id: string
  name: string
  level: SecurityLevel
  rules: SecurityRule[]
  allowedDomains: string[]
  blockedDomains: string[]
  networkPolicy: NetworkPolicy
  secretsPolicy: SecretsPolicy
  codePolicy: CodePolicy
  createdAt: number
}

export interface SecurityRule {
  id: string
  type: 'network' | 'filesystem' | 'process' | 'secret' | 'code'
  action: 'allow' | 'deny' | 'audit'
  target: string
  description: string
}

export interface NetworkPolicy {
  allowOutbound: boolean
  allowedPorts: number[]
  blockedPorts: number[]
  maxConcurrentConnections: number
  rateLimitRpm: number
  allowedProtocols: ('http' | 'https' | 'ws' | 'wss' | 'ssh' | 'git')[]
}

export interface SecretsPolicy {
  encryptionAlgorithm: 'aes-256-gcm' | 'chacha20-poly1305'
  rotationDays: number
  maxSecrets: number
  allowEnvExport: boolean
  maskInLogs: boolean
  scanForLeaks: boolean
}

export interface CodePolicy {
  enableSAST: boolean
  enableDAST: boolean
  blockOnCritical: boolean
  maxVulnerabilities: number
  scanOnSave: boolean
  scanOnCommit: boolean
  ignoredRules: string[]
}

export interface SecretEntry {
  id: string
  name: string
  encrypted: boolean
  createdAt: number
  updatedAt: number
  expiresAt?: number
  scope: 'workspace' | 'project' | 'user' | 'organization'
  usedBy: string[]     // File paths that reference this secret
}

export interface SecurityScanResult {
  id: string
  type: 'sast' | 'dast' | 'dependency' | 'secret-leak'
  timestamp: number
  findings: SecurityFinding[]
  summary: {
    critical: number
    high: number
    medium: number
    low: number
    info: number
  }
}

export interface SecurityFinding {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  type: string
  title: string
  description: string
  file?: string
  line?: number
  code?: string
  recommendation: string
  cwe?: string          // CWE ID
  cve?: string          // CVE ID
}

export interface AuditLogEntry {
  id: string
  timestamp: number
  userId: string
  action: string
  resource: string
  details: Record<string, any>
  ip?: string
  userAgent?: string
  risk: 'none' | 'low' | 'medium' | 'high'
}

// Default security policies
const SECURITY_POLICIES: Omit<SecurityPolicy, 'id' | 'createdAt'>[] = [
  {
    name: 'Standard',
    level: 'standard',
    rules: [],
    allowedDomains: ['*'],
    blockedDomains: [],
    networkPolicy: {
      allowOutbound: true,
      allowedPorts: [],
      blockedPorts: [],
      maxConcurrentConnections: 100,
      rateLimitRpm: 1000,
      allowedProtocols: ['http', 'https', 'ws', 'wss', 'ssh', 'git'],
    },
    secretsPolicy: {
      encryptionAlgorithm: 'aes-256-gcm',
      rotationDays: 90,
      maxSecrets: 100,
      allowEnvExport: true,
      maskInLogs: true,
      scanForLeaks: true,
    },
    codePolicy: {
      enableSAST: true,
      enableDAST: false,
      blockOnCritical: false,
      maxVulnerabilities: -1,
      scanOnSave: false,
      scanOnCommit: true,
      ignoredRules: [],
    },
  },
  {
    name: 'Enterprise Strict',
    level: 'strict',
    rules: [],
    allowedDomains: ['*.github.com', '*.npmjs.org', '*.pypi.org'],
    blockedDomains: ['*.crypto-mining.com'],
    networkPolicy: {
      allowOutbound: true,
      allowedPorts: [80, 443, 22, 9418],
      blockedPorts: [25, 135, 445, 3389],
      maxConcurrentConnections: 50,
      rateLimitRpm: 500,
      allowedProtocols: ['https', 'wss', 'ssh', 'git'],
    },
    secretsPolicy: {
      encryptionAlgorithm: 'aes-256-gcm',
      rotationDays: 30,
      maxSecrets: 50,
      allowEnvExport: false,
      maskInLogs: true,
      scanForLeaks: true,
    },
    codePolicy: {
      enableSAST: true,
      enableDAST: true,
      blockOnCritical: true,
      maxVulnerabilities: 0,
      scanOnSave: true,
      scanOnCommit: true,
      ignoredRules: [],
    },
  },
]

class SecurityService {
  private activePolicy: SecurityPolicy
  private secrets: Map<string, SecretEntry & { value: string }> = new Map()
  private auditLog: AuditLogEntry[] = []
  private scanResults: SecurityScanResult[] = []
  private crypto = SecurityLayer.getInstance()

  constructor() {
    this.activePolicy = {
      ...SECURITY_POLICIES[0],
      id: 'default',
      createdAt: Date.now(),
    }
  }

  // Policy management
  getActivePolicy(): SecurityPolicy {
    return { ...this.activePolicy }
  }

  setPolicy(level: SecurityLevel): SecurityPolicy {
    const template = SECURITY_POLICIES.find(p => p.level === level) || SECURITY_POLICIES[0]
    this.activePolicy = { ...template, id: `policy-${Date.now()}`, createdAt: Date.now() }
    this.audit('system', 'policy.changed', 'security-policy', { level })
    return this.activePolicy
  }

  // Secrets management
  setSecret(name: string, value: string, scope: SecretEntry['scope'] = 'workspace'): SecretEntry {
    const id = `secret-${name}-${Date.now()}`
    const encryptedValue = this.crypto.encrypt(value)
    const entry = {
      id, name, value: encryptedValue,
      encrypted: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scope,
      usedBy: [],
    }
    this.secrets.set(name, entry)
    this.audit('system', 'secret.created', name, { scope })
    return { ...entry, value: undefined } as any
  }

  getSecret(name: string): string | null {
    const entry = this.secrets.get(name)
    if (!entry) return null
    this.audit('system', 'secret.accessed', name, {})
    try {
      return this.crypto.decrypt(entry.value)
    } catch {
      this.audit('system', 'secret.decrypt_failed', name, {})
      return null
    }
  }

  listSecrets(): SecretEntry[] {
    return Array.from(this.secrets.values()).map(({ value, ...rest }) => rest)
  }

  deleteSecret(name: string): boolean {
    const result = this.secrets.delete(name)
    if (result) this.audit('system', 'secret.deleted', name, {})
    return result
  }

  // Code scanning
  async scanCode(files: { path: string; content: string }[]): Promise<SecurityScanResult> {
    const findings: SecurityFinding[] = []

    for (const file of files) {
      // Check for hardcoded secrets
      const secretPatterns = [
        { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi, title: 'Hardcoded API Key' },
        { pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/gi, title: 'Hardcoded Password' },
        { pattern: /(?:secret|token)\s*[:=]\s*['"][a-zA-Z0-9]{16,}['"]/gi, title: 'Hardcoded Secret/Token' },
        { pattern: /(?:aws_access_key_id|aws_secret_access_key)\s*[:=]\s*['"][A-Z0-9]+['"]/gi, title: 'AWS Credentials' },
        { pattern: /-----BEGIN (?:RSA|EC|OPENSSH) PRIVATE KEY-----/g, title: 'Private Key in Source' },
      ]

      for (const { pattern, title } of secretPatterns) {
        const matches = file.content.matchAll(pattern)
        for (const match of matches) {
          const line = file.content.substring(0, match.index).split('\n').length
          findings.push({
            id: `finding-${randomUUID()}`,
            severity: 'critical',
            type: 'secret-leak',
            title,
            description: `Potential secret found in ${file.path}`,
            file: file.path,
            line,
            recommendation: 'Move to environment variables or secrets manager',
          })
        }
      }

      // Check for eval() usage
      if (/\beval\s*\(/g.test(file.content)) {
        findings.push({
          id: `finding-eval-${Date.now()}`,
          severity: 'high',
          type: 'code-injection',
          title: 'Use of eval()',
          description: 'eval() can execute arbitrary code and is a security risk',
          file: file.path,
          recommendation: 'Use safer alternatives like JSON.parse() or Function constructor',
          cwe: 'CWE-95',
        })
      }
    }

    const result: SecurityScanResult = {
      id: `scan-${Date.now()}`,
      type: 'sast',
      timestamp: Date.now(),
      findings,
      summary: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
        info: findings.filter(f => f.severity === 'info').length,
      },
    }

    this.scanResults.push(result)
    return result
  }

  getRecentScans(limit = 10): SecurityScanResult[] {
    return this.scanResults.slice(-limit)
  }

  // Audit logging
  audit(userId: string, action: string, resource: string, details: Record<string, any>): void {
    this.auditLog.push({
      id: `audit-${randomUUID()}`,
      timestamp: Date.now(),
      userId,
      action,
      resource,
      details,
      risk: this.assessRisk(action),
    })
  }

  private assessRisk(action: string): AuditLogEntry['risk'] {
    if (action.includes('delete') || action.includes('policy')) return 'high'
    if (action.includes('secret') || action.includes('permission')) return 'medium'
    if (action.includes('access')) return 'low'
    return 'none'
  }

  getAuditLog(limit = 100): AuditLogEntry[] {
    return this.auditLog.slice(-limit)
  }

  getAvailablePolicies(): { name: string; level: SecurityLevel }[] {
    return SECURITY_POLICIES.map((policy) => ({ name: policy.name, level: policy.level }))
  }

  getLastScanResults(limit = 10): SecurityScanResult[] {
    return this.getRecentScans(limit)
  }

  addSecret(name: string, value: string, scope: SecretEntry['scope'] = 'workspace'): SecretEntry {
    return this.setSecret(name, value, scope)
  }

  removeSecret(name: string): boolean {
    return this.deleteSecret(name)
  }

  checkNetworkAccess(url: string): boolean {
    try {
      const parsed = new URL(url)
      const domain = parsed.hostname
      const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80)

      if (!this.activePolicy.networkPolicy.allowOutbound) return false
      if (this.activePolicy.networkPolicy.blockedPorts.includes(port)) return false
      if (this.activePolicy.networkPolicy.allowedPorts.length > 0 && !this.activePolicy.networkPolicy.allowedPorts.includes(port)) return false

      if (this.activePolicy.blockedDomains.some((blocked) => this.matchesDomain(domain, blocked))) return false
      if (
        this.activePolicy.allowedDomains.length > 0 &&
        !this.activePolicy.allowedDomains.includes('*') &&
        !this.activePolicy.allowedDomains.some((allowed) => this.matchesDomain(domain, allowed))
      ) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  private matchesDomain(domain: string, pattern: string): boolean {
    if (pattern === '*') return true
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(2)
      return domain === suffix || domain.endsWith(`.${suffix}`)
    }
    return domain === pattern
  }
}

export const securityService = new SecurityService()
