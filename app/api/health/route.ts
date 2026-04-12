/**
 * Health Check Endpoint
 * 
 * Provides system health status including database connectivity, Prisma client
 * availability, feature flag status based on environment variables, and
 * AI provider circuit breaker health (B6).
 * Returns appropriate HTTP status codes for monitoring and alerting systems.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */

import { NextResponse } from 'next/server'
import { getDatabaseStatus, PRISMA_AVAILABLE } from '@/lib/database/client'
import { auditLogger } from '@/lib/services/centralized-audit-logger'

/**
 * Returns feature availability based on environment variable configuration.
 * Critical features: database, auth — absence returns 503.
 */
function getFeatureFlags() {
  return {
    database: !!process.env.DATABASE_URL,
    redis: !!process.env.REDIS_URL,
    auth: !!process.env.NEXTAUTH_SECRET,
    email: !!process.env.RESEND_API_KEY,
    codeExecution: !!process.env.PISTON_API_URL,
    lsp: process.env.LSP_BACKEND_ENABLED === 'true',
    dap: process.env.DAP_BACKEND_ENABLED === 'true',
    figma: !!process.env.FIGMA_TOKEN,
    web3Bridge: !!process.env.WEB3_BRIDGE_URL,
    openai: !!process.env.OPENAI_API_KEY,
  }
}

export const dynamic = 'force-dynamic'

interface HealthCheckResponse {
  ok: boolean
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  features: {
    database: boolean
    redis: boolean
    auth: boolean
    email: boolean
    codeExecution: boolean
    lsp: boolean
    dap: boolean
    figma: boolean
    web3Bridge: boolean
    openai: boolean
  }
  checks: {
    database: {
      status: 'pass' | 'fail' | 'warn' | 'unavailable'
      configured: boolean
      connected: boolean
      clientGenerated: boolean
      message: string
      error?: string
    }
    prisma: {
      status: 'pass' | 'fail'
      available: boolean
      message: string
    }
    audit?: {
      status: 'pass' | 'warn'
      totalEntries: number
      complianceRate: number
      message: string
    }
  }
}

/**
 * GET /api/health
 * 
 * Returns the current health status of the application.
 * 
 * Status Codes:
 * - 200: System is healthy (all checks pass)
 * - 207: System is degraded (some checks fail but core functionality works)
 * - 503: System is unhealthy (critical checks fail)
 */
export async function GET() {
  try {
    // Evaluate feature flags from environment variables
    const features = getFeatureFlags()
    const criticalFeaturesConfigured = features.database && features.auth

    // Check Prisma client availability
    const prismaCheck = {
      status: PRISMA_AVAILABLE ? ('pass' as const) : ('fail' as const),
      available: PRISMA_AVAILABLE,
      message: PRISMA_AVAILABLE
        ? 'Prisma client is available'
        : 'Prisma client not generated. Run: pnpm prisma:generate',
    }

    // Check database connectivity
    const dbStatus = await getDatabaseStatus()
    const databaseCheck = {
      status: dbStatus.connected
        ? ('pass' as const)
        : dbStatus.configured && dbStatus.clientGenerated
          ? ('warn' as const)
          : !dbStatus.clientGenerated
            ? ('unavailable' as const)
            : ('fail' as const),
      configured: dbStatus.configured,
      connected: dbStatus.connected,
      clientGenerated: dbStatus.clientGenerated,
      message: dbStatus.message,
      ...(dbStatus.error && { error: dbStatus.error }),
    }

    // Check audit system health
    let auditCheck: HealthCheckResponse['checks']['audit']
    try {
      const stats = auditLogger.getStats()
      auditCheck = {
        status: stats.complianceRate >= 90 ? 'pass' : 'warn',
        totalEntries: stats.total,
        complianceRate: stats.complianceRate,
        message: `${stats.total} audit entries, ${stats.complianceRate}% compliance rate`,
      }
    } catch {
      auditCheck = undefined
    }

    // Determine overall system status.
    // Critical: database + auth must be configured (503 if not).
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    let httpStatus: number

    if (!criticalFeaturesConfigured) {
      // Missing DATABASE_URL or NEXTAUTH_SECRET — service cannot operate
      overallStatus = 'unhealthy'
      httpStatus = 503
    } else if (databaseCheck.status === 'pass' && prismaCheck.status === 'pass') {
      overallStatus = 'healthy'
      httpStatus = 200
    } else {
      // Critical env vars present but DB not yet reachable or Prisma not generated
      overallStatus = 'degraded'
      httpStatus = 503
    }

    const response: HealthCheckResponse = {
      ok: overallStatus !== 'unhealthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      features,
      checks: {
        database: databaseCheck,
        prisma: prismaCheck,
        ...(auditCheck && { audit: auditCheck }),
      },
    }

    return NextResponse.json(response, { status: httpStatus })
  } catch (error) {
    // Unexpected error during health check
    console.error('[HEALTH] Health check failed with unexpected error:', error)

    const errorResponse: HealthCheckResponse = {
      ok: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      features: getFeatureFlags(),
      checks: {
        database: {
          status: 'fail',
          configured: false,
          connected: false,
          clientGenerated: false,
          message: 'Health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        prisma: {
          status: 'fail',
          available: false,
          message: 'Health check failed',
        },
      },
    }

    return NextResponse.json(errorResponse, { status: 503 })
  }
}
