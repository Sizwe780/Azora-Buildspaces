'use client'

import React, { useState, useEffect } from 'react'
import { useTasks, Task, TaskExecution } from '@/lib/stores/tasks-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Play, Square, Plus, Settings, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react'

interface TaskRunnerProps {
  workspaceId: string
}

export function TaskRunner({ workspaceId }: TaskRunnerProps) {
  const {
    tasks,
    executions,
    activeExecution,
    loadTasks,
    saveTasks,
    addTask,
    updateTask,
    removeTask,
    runTask,
    stopTask,
    getTasksByGroup
  } = useTasks()

  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTask, setNewTask] = useState<Partial<Task>>({
    type: 'shell',
    group: 'build'
  })

  useEffect(() => {
    if (workspaceId) {
      loadTasks(workspaceId)
    }
  }, [workspaceId, loadTasks])

  const handleCreateTask = () => {
    if (newTask.label && newTask.command) {
      addTask(newTask as Task)
      setNewTask({ type: 'shell', group: 'build' })
      setIsCreateDialogOpen(false)
      if (workspaceId) {
        saveTasks(workspaceId)
      }
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setNewTask({ ...task })
    setIsCreateDialogOpen(true)
  }

  const handleUpdateTask = () => {
    if (editingTask && newTask.label) {
      updateTask(editingTask.label, newTask)
      setEditingTask(null)
      setNewTask({ type: 'shell', group: 'build' })
      setIsCreateDialogOpen(false)
      if (workspaceId) {
        saveTasks(workspaceId)
      }
    }
  }

  const handleDeleteTask = (label: string) => {
    removeTask(label)
    if (workspaceId) {
      saveTasks(workspaceId)
    }
  }

  const getStatusIcon = (status: TaskExecution['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: TaskExecution['status']) => {
    const variants = {
      pending: 'secondary',
      running: 'default',
      completed: 'default',
      failed: 'destructive'
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  const filteredTasks = selectedGroup === 'all'
    ? Object.values(tasks)
    : getTasksByGroup(selectedGroup)

  const recentExecutions = executions.slice(-5).reverse()

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Task Runner</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingTask(null)
                setNewTask({ type: 'shell', group: 'build' })
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="label">Label</Label>
                  <Input
                    id="label"
                    value={newTask.label || ''}
                    onChange={(e) => setNewTask({ ...newTask, label: e.target.value })}
                    placeholder="Task name"
                  />
                </div>
                <div>
                  <Label htmlFor="command">Command</Label>
                  <Input
                    id="command"
                    value={newTask.command || ''}
                    onChange={(e) => setNewTask({ ...newTask, command: e.target.value })}
                    placeholder="npm run build"
                  />
                </div>
                <div>
                  <Label htmlFor="args">Arguments (optional)</Label>
                  <Input
                    id="args"
                    value={newTask.args?.join(' ') || ''}
                    onChange={(e) => setNewTask({
                      ...newTask,
                      args: e.target.value.split(' ').filter(Boolean)
                    })}
                    placeholder="--verbose"
                  />
                </div>
                <div>
                  <Label htmlFor="group">Group</Label>
                  <Select
                    value={newTask.group || 'build'}
                    onValueChange={(value) => setNewTask({ ...newTask, group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="build">Build</SelectItem>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="clean">Clean</SelectItem>
                      <SelectItem value="watch">Watch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cwd">Working Directory (optional)</Label>
                  <Input
                    id="cwd"
                    value={newTask.options?.cwd || ''}
                    onChange={(e) => setNewTask({
                      ...newTask,
                      options: { ...newTask.options, cwd: e.target.value }
                    })}
                    placeholder="./"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={editingTask ? handleUpdateTask : handleCreateTask}>
                    {editingTask ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2">
          <Label>Filter:</Label>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="build">Build</SelectItem>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="clean">Clean</SelectItem>
              <SelectItem value="watch">Watch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Tasks List */}
          <div>
            <h3 className="text-sm font-medium mb-2">Tasks ({filteredTasks.length})</h3>
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div key={task.label} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{task.label}</span>
                      <Badge variant="outline">{task.group}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {task.command} {task.args?.join(' ')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditTask(task)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteTask(task.label)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => runTask(task.label)}
                      disabled={activeExecution !== null}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {filteredTasks.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No tasks found. Create your first task to get started.
                </div>
              )}
            </div>
          </div>

          {/* Recent Executions */}
          {recentExecutions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Recent Executions</h3>
              <div className="space-y-2">
                {recentExecutions.map((execution) => (
                  <div key={execution.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(execution.status)}
                        <span className="font-medium">{execution.task.label}</span>
                        {getStatusBadge(execution.status)}
                      </div>
                      {execution.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopTask(execution.id)}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {execution.output && (
                      <ScrollArea className="h-20">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {execution.output}
                        </pre>
                      </ScrollArea>
                    )}
                    {execution.startTime && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Started: {new Date(execution.startTime).toLocaleTimeString()}
                        {execution.endTime && ` • Duration: ${Math.round((execution.endTime - execution.startTime) / 1000)}s`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}