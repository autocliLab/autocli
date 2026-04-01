import type { Team, Worker, WorkerStatus } from './types.js'

export class TeamManager {
  private teams = new Map<string, Team>()
  private nextId = 0

  createTeam(name: string, goal: string, tasks: Array<{ name: string; task: string; agentType?: string; model?: string }>): Team {
    const id = `team-${Date.now()}-${this.nextId++}`
    const workers: Worker[] = tasks.map((t, i) => ({
      id: `${id}-w${i}`,
      name: t.name,
      task: t.task,
      status: 'pending' as WorkerStatus,
      agentType: t.agentType || 'general-purpose',
      model: t.model,
      notified: false,
    }))

    const team: Team = { id, name, goal, workers, createdAt: Date.now(), status: 'active' }
    this.teams.set(id, team)
    return team
  }

  getTeam(id: string): Team | undefined {
    return this.teams.get(id)
  }

  getActiveTeam(): Team | undefined {
    for (const team of this.teams.values()) {
      if (team.status === 'active') return team
    }
    return undefined
  }

  listTeams(): Team[] {
    return Array.from(this.teams.values())
  }

  startWorker(teamId: string, workerId: string): void {
    const team = this.teams.get(teamId)
    const worker = team?.workers.find(w => w.id === workerId)
    if (worker) {
      worker.status = 'running'
      worker.startedAt = Date.now()
    }
  }

  completeWorker(teamId: string, workerId: string, result: string): void {
    const team = this.teams.get(teamId)
    const worker = team?.workers.find(w => w.id === workerId)
    if (worker) {
      worker.status = 'completed'
      worker.result = result
      worker.completedAt = Date.now()
    }
    this.checkTeamCompletion(teamId)
  }

  failWorker(teamId: string, workerId: string, error: string): void {
    const team = this.teams.get(teamId)
    const worker = team?.workers.find(w => w.id === workerId)
    if (worker) {
      worker.status = 'failed'
      worker.error = error
      worker.completedAt = Date.now()
    }
    this.checkTeamCompletion(teamId)
  }

  getWorker(workerId: string): { team: Team; worker: Worker } | undefined {
    for (const team of this.teams.values()) {
      const worker = team.workers.find(w => w.id === workerId)
      if (worker) return { team, worker }
    }
    return undefined
  }

  getPendingNotifications(): Array<{ team: Team; worker: Worker }> {
    const notifs: Array<{ team: Team; worker: Worker }> = []
    for (const team of this.teams.values()) {
      for (const w of team.workers) {
        if ((w.status === 'completed' || w.status === 'failed') && !w.notified) {
          w.notified = true
          notifs.push({ team, worker: w })
        }
      }
    }
    return notifs
  }

  private checkTeamCompletion(teamId: string): void {
    const team = this.teams.get(teamId)
    if (!team) return
    const allDone = team.workers.every(w => w.status === 'completed' || w.status === 'failed')
    if (allDone) {
      const anyFailed = team.workers.some(w => w.status === 'failed')
      team.status = anyFailed ? 'failed' : 'completed'
    }
  }
}
