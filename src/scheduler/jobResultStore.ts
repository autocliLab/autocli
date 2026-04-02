import { mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { platform } from '../utils/platform.js'

export interface JobResult {
  id: string
  scheduleId: string
  team: string
  startedAt: number
  finishedAt: number
  status: 'success' | 'partial' | 'failed'
  agents: AgentResult[]
}

export interface AgentResult {
  name: string
  status: 'success' | 'failed'
  result?: string
  error?: string
}

const RESULTS_DIR = join(platform.configDir, 'job-results')
const MAX_RESULTS = 50

export class JobResultStore {
  constructor() {
    mkdirSync(RESULTS_DIR, { recursive: true })
  }

  save(result: JobResult): void {
    const file = join(RESULTS_DIR, `${result.id}.json`)
    writeFileSync(file, JSON.stringify(result, null, 2))
    this.prune()
  }

  list(limit = 20): JobResult[] {
    const files = readdirSync(RESULTS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, limit)

    return files.map(f => {
      const raw = readFileSync(join(RESULTS_DIR, f), 'utf-8')
      return JSON.parse(raw) as JobResult
    })
  }

  getBySchedule(scheduleId: string, limit = 10): JobResult[] {
    return this.list(MAX_RESULTS).filter(r => r.scheduleId === scheduleId).slice(0, limit)
  }

  get(id: string): JobResult | null {
    try {
      const raw = readFileSync(join(RESULTS_DIR, `${id}.json`), 'utf-8')
      return JSON.parse(raw) as JobResult
    } catch {
      return null
    }
  }

  private prune(): void {
    const files = readdirSync(RESULTS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
    if (files.length > MAX_RESULTS) {
      const toRemove = files.slice(0, files.length - MAX_RESULTS)
      for (const f of toRemove) {
        try { unlinkSync(join(RESULTS_DIR, f)) } catch {}
      }
    }
  }
}
