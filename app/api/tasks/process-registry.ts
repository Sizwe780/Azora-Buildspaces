import type { ChildProcess } from 'child_process'

export type TaskProcess = { process: ChildProcess; output: string[] }

const activeProcesses = new Map<string, TaskProcess>()

export function registerProcess(executionId: string, process: ChildProcess, output: string[]): void {
  activeProcesses.set(executionId, { process, output })
}

export function getProcess(executionId: string): TaskProcess | undefined {
  return activeProcesses.get(executionId)
}

export function removeProcess(executionId: string): void {
  activeProcesses.delete(executionId)
}

export function listProcesses(): [string, TaskProcess][] {
  return Array.from(activeProcesses.entries())
}
