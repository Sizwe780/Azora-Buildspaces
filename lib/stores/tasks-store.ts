import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Problem matcher patterns for parsing task output.
 * Maps VS Code $-prefixed names to regex patterns.
 */
const PROBLEM_MATCHERS: Record<string, { pattern: RegExp; groups: { file: number; line: number; column?: number; severity?: number; message: number } }> = {
  '$tsc': {
    pattern: /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/,
    groups: { file: 1, line: 2, column: 3, severity: 4, message: 5 }
  },
  '$tsc-watch': {
    pattern: /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/,
    groups: { file: 1, line: 2, column: 3, severity: 4, message: 5 }
  },
  '$eslint-compact': {
    pattern: /^(.+):\s+line\s+(\d+),\s+col\s+(\d+),\s+(Error|Warning)\s+-\s+(.+)$/,
    groups: { file: 1, line: 2, column: 3, severity: 4, message: 5 }
  },
  '$eslint-stylish': {
    pattern: /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)(?:\s+\S+)?$/,
    groups: { file: 0, line: 1, column: 2, severity: 3, message: 4 }
  },
  '$gcc': {
    pattern: /^(.+):(\d+):(\d+):\s+(error|warning|note):\s+(.+)$/,
    groups: { file: 1, line: 2, column: 3, severity: 4, message: 5 }
  },
  '$node': {
    pattern: /^(.+):(\d+)\n\s+(.+)$/,
    groups: { file: 1, line: 2, message: 3 }
  },
  '$generic': {
    pattern: /^(.+?):(\d+)(?::(\d+))?:\s*(?:(error|warning|info|Error|Warning|Info))?\s*:?\s*(.+)$/,
    groups: { file: 1, line: 2, column: 3, severity: 4, message: 5 }
  },
}

function parseTaskOutput(output: string, matchers: string[]): Array<{ file: string; line: number; column: number; severity: 'error' | 'warning' | 'info'; message: string; source: string }> {
  const problems: Array<{ file: string; line: number; column: number; severity: 'error' | 'warning' | 'info'; message: string; source: string }> = []
  const lines = output.split('\n')

  // Always include $generic as fallback
  const matcherNames = matchers.length > 0 ? matchers : ['$generic']

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    for (const matcherName of matcherNames) {
      const matcher = PROBLEM_MATCHERS[matcherName] || PROBLEM_MATCHERS['$generic']
      if (!matcher) continue

      const match = trimmed.match(matcher.pattern)
      if (match) {
        const file = matcher.groups.file > 0 ? match[matcher.groups.file] : ''
        const lineNum = parseInt(match[matcher.groups.line], 10)
        const column = matcher.groups.column ? parseInt(match[matcher.groups.column] || '1', 10) : 1
        const severityRaw = matcher.groups.severity ? (match[matcher.groups.severity] || 'error').toLowerCase() : 'error'
        const severity = severityRaw === 'warning' ? 'warning' : severityRaw === 'info' || severityRaw === 'note' ? 'info' : 'error'
        const message = match[matcher.groups.message] || trimmed

        if (file && !isNaN(lineNum)) {
          problems.push({ file, line: lineNum, column, severity, message, source: `Task (${matcherName})` })
        }
        break // Only first matching pattern wins
      }
    }
  }

  return problems
}

export interface Task {
  label: string
  type: 'shell' | 'process'
  command: string
  args?: string[]
  options?: {
    cwd?: string
    env?: Record<string, string>
  }
  group?: 'build' | 'test' | 'clean' | string
  presentation?: {
    echo?: boolean
    reveal?: 'always' | 'silent' | 'never'
    focus?: boolean
    panel?: 'shared' | 'dedicated' | 'new'
    showReuseMessage?: boolean
    clear?: boolean
  }
  problemMatcher?: string[]
  dependsOn?: string[]
  dependsOrder?: 'parallel' | 'sequence'
  runOptions?: {
    reevaluateOnRerun?: boolean
    runOn?: 'default' | 'folderOpen'
  }
}

export interface TaskExecution {
  id: string
  task: Task
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime?: number
  endTime?: number
  output?: string
  exitCode?: number
}

interface TasksState {
  tasks: Record<string, Task>
  executions: TaskExecution[]
  activeExecution: string | null

  // Actions
  loadTasks: (workspaceId: string) => Promise<void>
  saveTasks: (workspaceId: string) => Promise<void>
  addTask: (task: Task) => void
  updateTask: (label: string, task: Partial<Task>) => void
  removeTask: (label: string) => void
  runTask: (label: string) => Promise<void>
  stopTask: (executionId: string) => void
  getTask: (label: string) => Task | undefined
  getTasksByGroup: (group?: string) => Task[]
}

export const useTasks = create<TasksState>()(
  persist(
    (set, get) => ({
      tasks: {},
      executions: [],
      activeExecution: null,

      loadTasks: async (workspaceId: string) => {
        try {
          const response = await fetch(`/api/fs/content?path=.vscode/tasks.json&workspaceId=${encodeURIComponent(workspaceId)}`)
          if (response.ok) {
            const data = await response.json()
            if (data.content) {
              const parsed = JSON.parse(data.content)
              if (parsed.tasks && Array.isArray(parsed.tasks)) {
                const tasks: Record<string, Task> = {}
                parsed.tasks.forEach((task: Task) => {
                  tasks[task.label] = task
                })
                set({ tasks })
              }
            }
          }
        } catch (error) {
          console.error('Failed to load tasks.json:', error)
        }
      },

      saveTasks: async (workspaceId: string) => {
        const { tasks } = get()
        const tasksJson = {
          version: '2.0.0',
          tasks: Object.values(tasks)
        }

        try {
          await fetch('/api/fs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: 'write',
              path: '.vscode/tasks.json',
              content: JSON.stringify(tasksJson, null, 2),
              workspaceId
            })
          })
        } catch (error) {
          console.error('Failed to save tasks.json:', error)
        }
      },

      addTask: (task: Task) => {
        set(state => ({
          tasks: { ...state.tasks, [task.label]: task }
        }))
      },

      updateTask: (label: string, updates: Partial<Task>) => {
        set(state => {
          const existing = state.tasks[label]
          if (existing) {
            state.tasks[label] = { ...existing, ...updates }
          }
          return { tasks: { ...state.tasks } }
        })
      },

      removeTask: (label: string) => {
        set(state => {
          const newTasks = { ...state.tasks }
          delete newTasks[label]
          return { tasks: newTasks }
        })
      },

      runTask: async (label: string) => {
        const task = get().tasks[label]
        if (!task) return

        // Resolve dependsOn before running this task
        if (task.dependsOn && task.dependsOn.length > 0) {
          const order = task.dependsOrder || 'parallel'

          if (order === 'sequence') {
            // Run dependencies one at a time in order
            for (const depLabel of task.dependsOn) {
              const depTask = get().tasks[depLabel]
              if (!depTask) {
                console.warn(`Task dependency "${depLabel}" not found, skipping`)
                continue
              }
              await get().runTask(depLabel)
              // Check if dependency failed
              const depExec = get().executions.find(e =>
                e.task.label === depLabel && e.status === 'failed'
              )
              if (depExec) {
                console.error(`Dependency task "${depLabel}" failed, aborting "${label}"`)
                return
              }
            }
          } else {
            // Run all dependencies in parallel
            const depPromises = task.dependsOn.map(depLabel => {
              const depTask = get().tasks[depLabel]
              if (!depTask) {
                console.warn(`Task dependency "${depLabel}" not found, skipping`)
                return Promise.resolve()
              }
              return get().runTask(depLabel)
            })
            await Promise.all(depPromises)

            // Check if any dependency failed
            for (const depLabel of task.dependsOn) {
              const depExec = get().executions.find(e =>
                e.task.label === depLabel && e.status === 'failed'
              )
              if (depExec) {
                console.error(`Dependency task "${depLabel}" failed, aborting "${label}"`)
                return
              }
            }
          }
        }

        const executionId = `exec_${Date.now()}`
        const execution: TaskExecution = {
          id: executionId,
          task,
          status: 'pending',
          startTime: Date.now()
        }

        set(state => ({
          executions: [...state.executions, execution],
          activeExecution: executionId
        }))

        try {
          // Update status to running
          set(state => ({
            executions: state.executions.map(e =>
              e.id === executionId ? { ...e, status: 'running' } : e
            )
          }))

          // Execute the task
          const response = await fetch('/api/tasks/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task,
              executionId
            })
          })

          if (!response.ok) {
            throw new Error(`Task execution failed: ${response.status}`)
          }

          const result = await response.json()

          // Update execution with result
          set(state => ({
            executions: state.executions.map(e =>
              e.id === executionId ? {
                ...e,
                status: result.success ? 'completed' : 'failed',
                endTime: Date.now(),
                output: result.output,
                exitCode: result.exitCode
              } : e
            ),
            activeExecution: null
          }))

          // Problem matcher: parse output for diagnostics and dispatch to problems panel
          if (result.output && task.problemMatcher && task.problemMatcher.length > 0) {
            const problems = parseTaskOutput(result.output, task.problemMatcher)
            if (problems.length > 0 && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('problems:fromTask', {
                detail: { problems: problems.map(p => ({ ...p, code: '' })), clear: false }
              }))
            }
          }

        } catch (error) {
          console.error('Task execution error:', error)
          set(state => ({
            executions: state.executions.map(e =>
              e.id === executionId ? {
                ...e,
                status: 'failed',
                endTime: Date.now(),
                output: String(error)
              } : e
            ),
            activeExecution: null
          }))
        }
      },

      stopTask: (executionId: string) => {
        // Send stop signal to backend
        fetch('/api/tasks/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ executionId })
        }).catch(console.error)

        set(state => ({
          executions: state.executions.map(e =>
            e.id === executionId ? { ...e, status: 'failed' as const } : e
          ),
          activeExecution: null
        }))
      },

      getTask: (label: string) => get().tasks[label],

      getTasksByGroup: (group?: string) => {
        const { tasks } = get()
        const taskList = Object.values(tasks)
        if (!group) return taskList
        return taskList.filter(task => task.group === group)
      }
    }),
    {
      name: 'tasks-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        executions: state.executions.slice(-10) // Keep last 10 executions
      })
    }
  )
)