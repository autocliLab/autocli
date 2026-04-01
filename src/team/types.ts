export type WorkerStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Worker {
  id: string
  name: string
  task: string
  status: WorkerStatus
  result?: string
  error?: string
  startedAt?: number
  completedAt?: number
  agentType: string
  model?: string
  notified: boolean
}

export interface Team {
  id: string
  name: string
  goal: string
  workers: Worker[]
  createdAt: number
  status: 'active' | 'completed' | 'failed'
}
