import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { debugService, type DebugAdapterType, type DebugConfiguration, type Variable } from '@/lib/services/debug-adapter'

function isDapBackendEnabled(): boolean {
  return process.env.DAP_BACKEND_ENABLED === 'true'
}

function buildDebugReadiness() {
  return {
    dapBackendEnabled: process.env.DAP_BACKEND_ENABLED === 'true',
    clientDebugEnabled: process.env.NEXT_PUBLIC_DAP_BACKEND_ENABLED === 'true',
    endpoint: '/api/workbench/debug',
  }
}

function isDebugBackendUnavailableError(message: string): boolean {
  return /DAP broker request failed|DAP broker error|Debug adapter backend is not configured|fetch failed|ECONNREFUSED/i.test(message)
}

function inferAdapterType(filePath?: string): DebugAdapterType {
  const lower = (filePath || '').toLowerCase()
  if (lower.endsWith('.py')) return 'python'
  if (lower.endsWith('.go')) return 'go'
  if (lower.endsWith('.rs')) return 'rust'
  if (lower.endsWith('.java')) return 'java'
  if (lower.endsWith('.cs')) return 'dotnet'
  if (lower.endsWith('.c') || lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.h') || lower.endsWith('.hpp')) return 'cpp'
  if (lower.endsWith('.rb')) return 'ruby'
  if (lower.endsWith('.php')) return 'php'
  return 'node'
}

function mapVariable(variable: Variable): { name: string; value: string; type: string; evaluateName?: string } {
  return {
    name: variable.name,
    value: variable.value,
    type: variable.type || 'unknown',
    evaluateName: variable.evaluateName,
  }
}

async function buildInspection(sessionId: string) {
  const session = debugService.getSession(sessionId)
  if (!session) {
    throw new Error('Debug session not found')
  }

  const callStack = await session.getCallStack(session.state.activeThreadId)

  const variables = { local: [] as ReturnType<typeof mapVariable>[], closure: [] as ReturnType<typeof mapVariable>[], global: [] as ReturnType<typeof mapVariable>[] }
  if (callStack.length > 0) {
    const scopes = await session.getScopes(callStack[0].id)
    for (const scope of scopes) {
      const entries = await session.getVariables(scope.variablesReference)
      const mapped = entries.map(mapVariable)
      const scopeName = scope.name.toLowerCase()
      if (scopeName.includes('local')) variables.local = mapped
      else if (scopeName.includes('closure')) variables.closure = mapped
      else variables.global = mapped
    }
  }

  return {
    session: {
      id: session.id,
      name: session.getConfig().name,
      type: session.getConfig().type,
      status: session.state.status,
      threadId: session.state.activeThreadId,
    },
    callStack: callStack.map((frame) => ({
      id: frame.id,
      name: frame.name,
      source: frame.source.path,
      line: frame.line,
      column: frame.column,
    })),
    variables,
    breakpoints: session.state.breakpoints.map((bp) => ({
      id: bp.id,
      file: bp.source.path,
      line: bp.line,
      enabled: bp.enabled,
      condition: bp.condition,
      verified: bp.verified,
      hitCount: bp.hitCondition,
    })),
    watchExpressions: session.state.watchExpressions.map((watch) => ({
      id: watch.id,
      expression: watch.expression,
      value: watch.result,
      type: watch.type,
      error: watch.error,
    })),
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const action = (searchParams.get('action') || 'status').toLowerCase()

  try {
    if (action === 'status') {
      const active = debugService.getActiveSessions().map((item) => ({
        id: item.id,
        name: item.getConfig().name,
        type: item.getConfig().type,
        status: item.state.status,
        threadId: item.state.activeThreadId,
      }))
      return NextResponse.json({ sessions: active, readiness: buildDebugReadiness() })
    }

    if (action === 'inspect') {
      const sessionId = searchParams.get('sessionId') || ''
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
      }

      const fallback = debugService.getSession(sessionId)
      if (!fallback) {
        return NextResponse.json({ error: 'Debug session not found' }, { status: 404 })
      }

      if (!isDapBackendEnabled()) {
        return NextResponse.json({
          error: 'Debug adapter backend is not configured. Set DAP_BACKEND_ENABLED=true and connect a DAP broker.',
          readiness: buildDebugReadiness(),
          session: {
            id: fallback.id,
            name: fallback.getConfig().name,
            type: fallback.getConfig().type,
            status: fallback.state.status,
            threadId: fallback.state.activeThreadId,
          },
          callStack: [],
          variables: { local: [], closure: [], global: [] },
          breakpoints: fallback.state.breakpoints.map((bp) => ({
            id: bp.id,
            file: bp.source.path,
            line: bp.line,
            enabled: bp.enabled,
            condition: bp.condition,
            verified: bp.verified,
            hitCount: bp.hitCondition,
          })),
          watchExpressions: fallback.state.watchExpressions.map((watch) => ({
            id: watch.id,
            expression: watch.expression,
            value: watch.result,
            type: watch.type,
            error: watch.error,
          })),
        }, { status: 503 })
      }

      try {
        const inspection = await buildInspection(sessionId)
        return NextResponse.json(inspection)
      } catch (error) {
        return NextResponse.json({
          error: error instanceof Error ? error.message : 'Inspection unavailable',
          session: fallback ? {
            id: fallback.id,
            name: fallback.getConfig().name,
            type: fallback.getConfig().type,
            status: fallback.state.status,
            threadId: fallback.state.activeThreadId,
          } : null,
          callStack: [],
          variables: { local: [], closure: [], global: [] },
          breakpoints: fallback ? fallback.state.breakpoints.map((bp) => ({
            id: bp.id,
            file: bp.source.path,
            line: bp.line,
            enabled: bp.enabled,
            condition: bp.condition,
            verified: bp.verified,
            hitCount: bp.hitCondition,
          })) : [],
          watchExpressions: fallback ? fallback.state.watchExpressions.map((watch) => ({
            id: watch.id,
            expression: watch.expression,
            value: watch.result,
            type: watch.type,
            error: watch.error,
          })) : [],
        }, { status: 503 })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (isDebugBackendUnavailableError(message)) {
      return NextResponse.json({ error: message, readiness: buildDebugReadiness() }, { status: 503 })
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const action = String(body.action || '').toLowerCase()

    if (action === 'start') {
      if (!isDapBackendEnabled()) {
        return NextResponse.json({
          error: 'Debug adapter backend is not configured. Set DAP_BACKEND_ENABLED=true and connect a DAP broker.',
          readiness: buildDebugReadiness(),
        }, { status: 503 })
      }

      const activeFile = String(body.activeFile || '')
      const workspaceId = String(body.workspaceId || 'default')
      const type = inferAdapterType(activeFile)

      const config: DebugConfiguration = {
        type,
        name: activeFile || 'Debug Session',
        request: 'launch',
        program: activeFile || undefined,
        cwd: process.cwd(),
        stopOnEntry: false,
        console: 'integratedTerminal',
      }

      const created = await debugService.createSession(
        config,
        workspaceId,
        String(session.user.email || session.user.name || session.user.id || 'user')
      )
      await created.launch()

      return NextResponse.json({
        session: {
          id: created.id,
          name: created.getConfig().name,
          type: created.getConfig().type,
          status: created.state.status,
          threadId: created.state.activeThreadId,
        },
      })
    }

    if (action === 'stop') {
      const sessionId = String(body.sessionId || '')
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
      }

      await debugService.terminateSession(sessionId)
      return NextResponse.json({ ok: true })
    }

    if (action === 'control') {
      if (!isDapBackendEnabled()) {
        return NextResponse.json({
          error: 'Debug control requires DAP backend support.',
          readiness: buildDebugReadiness(),
        }, { status: 503 })
      }

      const sessionId = String(body.sessionId || '')
      const command = String(body.command || '').toLowerCase()
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
      }

      const active = debugService.getSession(sessionId)
      if (!active) {
        return NextResponse.json({ error: 'Debug session not found' }, { status: 404 })
      }

      if (command === 'continue') await active.continue(active.state.activeThreadId)
      else if (command === 'pause') await active.pause(active.state.activeThreadId)
      else if (command === 'stepover') await active.stepOver(active.state.activeThreadId)
      else if (command === 'stepinto') await active.stepInto(active.state.activeThreadId)
      else if (command === 'stepout') await active.stepOut(active.state.activeThreadId)
      else if (command === 'restart') await active.restart()
      else {
        return NextResponse.json({ error: 'Invalid control command' }, { status: 400 })
      }

      return NextResponse.json({
        session: {
          id: active.id,
          name: active.getConfig().name,
          type: active.getConfig().type,
          status: active.state.status,
          threadId: active.state.activeThreadId,
        },
      })
    }

    if (action === 'breakpoint') {
      if (!isDapBackendEnabled()) {
        return NextResponse.json({
          error: 'Breakpoint operations require DAP backend support.',
          readiness: buildDebugReadiness(),
        }, { status: 503 })
      }

      const sessionId = String(body.sessionId || '')
      const command = String(body.command || '').toLowerCase()
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
      }

      const active = debugService.getSession(sessionId)
      if (!active) {
        return NextResponse.json({ error: 'Debug session not found' }, { status: 404 })
      }

      if (command === 'toggle') {
        const breakpointId = String(body.breakpointId || '')
        if (!breakpointId) {
          return NextResponse.json({ error: 'breakpointId is required' }, { status: 400 })
        }
        await active.toggleBreakpoint(breakpointId)
      } else if (command === 'remove') {
        const breakpointId = String(body.breakpointId || '')
        if (!breakpointId) {
          return NextResponse.json({ error: 'breakpointId is required' }, { status: 400 })
        }
        await active.removeBreakpoint(breakpointId)
      } else if (command === 'set') {
        const file = String(body.file || '')
        const line = Number(body.line)
        const condition = body.condition ? String(body.condition) : undefined
        if (!file || !Number.isFinite(line) || line < 1) {
          return NextResponse.json({ error: 'file and valid line are required' }, { status: 400 })
        }
        await active.setBreakpoint({ name: file.split('/').pop() || file, path: file }, line, { condition })
      } else {
        return NextResponse.json({ error: 'Invalid breakpoint command' }, { status: 400 })
      }

      return NextResponse.json({ ok: true })
    }

    if (action === 'watch') {
      if (!isDapBackendEnabled()) {
        return NextResponse.json({
          error: 'Watch expression operations require DAP backend support.',
          readiness: buildDebugReadiness(),
        }, { status: 503 })
      }

      const sessionId = String(body.sessionId || '')
      const command = String(body.command || '').toLowerCase()
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
      }

      const active = debugService.getSession(sessionId)
      if (!active) {
        return NextResponse.json({ error: 'Debug session not found' }, { status: 404 })
      }

      if (command === 'add') {
        const expression = String(body.expression || '').trim()
        if (!expression) {
          return NextResponse.json({ error: 'expression is required' }, { status: 400 })
        }
        const watch = await active.addWatchExpression(expression)
        return NextResponse.json({ ok: true, watchId: watch.id })
      }

      if (command === 'remove') {
        const watchId = String(body.watchId || '')
        if (!watchId) {
          return NextResponse.json({ error: 'watchId is required' }, { status: 400 })
        }
        await active.removeWatchExpression(watchId)
        return NextResponse.json({ ok: true })
      }

      if (command === 'evaluate') {
        const watchId = String(body.watchId || '')
        if (!watchId) {
          return NextResponse.json({ error: 'watchId is required' }, { status: 400 })
        }
        const updated = await active.evaluateWatchExpression(watchId)
        return NextResponse.json({
          ok: true,
          watch: {
            id: updated.id,
            expression: updated.expression,
            value: updated.result,
            type: updated.type,
            error: updated.error,
          },
        })
      }

      return NextResponse.json({ error: 'Invalid watch command' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
