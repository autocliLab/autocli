import { spawn } from 'child_process'

export interface BackgroundTask {
  id: string
  command: string
  status: 'running' | 'completed' | 'failed'
  output: string
  pid?: number
  startedAt: number
  exitCode?: number
}

export class BackgroundTaskManager {
  private tasks = new Map<string, BackgroundTask>()
  private maxTasks = 5

  create(command: string, cwd: string): BackgroundTask | { error: string } {
    if (this.tasks.size >= this.maxTasks) {
      return { error: `Max ${this.maxTasks} concurrent background tasks. Kill one first.` }
    }

    const id = `task-${Date.now()}`
    const task: BackgroundTask = {
      id, command, status: 'running', output: '', startedAt: Date.now(),
    }

    const proc = spawn('bash', ['-c', command], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    })

    task.pid = proc.pid
    proc.unref()

    proc.stdout?.on('data', (data: Buffer) => {
      task.output += data.toString()
      // Cap output at 1MB
      if (task.output.length > 1_000_000) {
        task.output = task.output.slice(-500_000)
      }
    })

    proc.stderr?.on('data', (data: Buffer) => {
      task.output += data.toString()
    })

    let settled = false

    proc.on('close', (code) => {
      if (settled) return; settled = true
      task.status = code === 0 ? 'completed' : 'failed'
      task.exitCode = code ?? 1
    })

    proc.on('error', (err) => {
      if (settled) return; settled = true
      task.status = 'failed'
      task.output += `\nProcess error: ${err.message}`
    })

    this.tasks.set(id, task)
    return task
  }

  list(): BackgroundTask[] {
    return Array.from(this.tasks.values())
  }

  get(id: string): BackgroundTask | undefined {
    return this.tasks.get(id)
  }

  kill(id: string): boolean {
    const task = this.tasks.get(id)
    if (!task || task.status !== 'running' || !task.pid) return false
    try {
      process.kill(-task.pid, 'SIGTERM')
    } catch {
      try { process.kill(task.pid, 'SIGTERM') } catch { /* already dead */ }
    }
    task.status = 'failed'
    return true
  }

  getOutput(id: string, offset = 0): string {
    const task = this.tasks.get(id)
    if (!task) return ''
    return task.output.slice(offset)
  }
}
