import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { platform } from '../utils/platform.js'
import type { Schedule } from './types.js'

const SCHEDULES_FILE = join(platform.configDir, 'schedules.json')

export class ScheduleStore {
  private schedules: Schedule[] = []

  constructor() {
    mkdirSync(platform.configDir, { recursive: true })
    this.load()
  }

  private load(): void {
    try {
      const raw = readFileSync(SCHEDULES_FILE, 'utf-8')
      this.schedules = JSON.parse(raw) as Schedule[]
    } catch {
      this.schedules = []
    }
  }

  private save(): void {
    writeFileSync(SCHEDULES_FILE, JSON.stringify(this.schedules, null, 2), 'utf-8')
  }

  add(team: string, intervalMs: number, workingDir?: string): Schedule {
    const now = Date.now()
    const schedule: Schedule = {
      id: `sched-${now}`,
      team,
      interval: intervalMs,
      lastRun: null,
      nextRun: now + intervalMs,
      enabled: true,
      ...(workingDir !== undefined ? { workingDir } : {}),
    }
    this.schedules.push(schedule)
    this.save()
    return schedule
  }

  remove(id: string): boolean {
    const before = this.schedules.length
    this.schedules = this.schedules.filter(s => s.id !== id)
    const removed = this.schedules.length < before
    if (removed) this.save()
    return removed
  }

  enable(id: string): boolean {
    const schedule = this.schedules.find(s => s.id === id)
    if (!schedule) return false
    schedule.enabled = true
    schedule.nextRun = Date.now() + schedule.interval
    this.save()
    return true
  }

  disable(id: string): boolean {
    const schedule = this.schedules.find(s => s.id === id)
    if (!schedule) return false
    schedule.enabled = false
    this.save()
    return true
  }

  markRun(id: string): boolean {
    const schedule = this.schedules.find(s => s.id === id)
    if (!schedule) return false
    const now = Date.now()
    schedule.lastRun = now
    schedule.nextRun = now + schedule.interval
    this.save()
    return true
  }

  getDue(): Schedule[] {
    const now = Date.now()
    return this.schedules.filter(s => s.enabled && s.nextRun <= now)
  }

  list(): Schedule[] {
    return [...this.schedules]
  }

  get(id: string): Schedule | undefined {
    return this.schedules.find(s => s.id === id)
  }
}

export function parseInterval(str: string): number | null {
  const regex = /(\d+)\s*(d|h|m|s)/gi
  const units: Record<string, number> = {
    d: 86400_000,
    h: 3_600_000,
    m: 60_000,
    s: 1_000,
  }
  let total = 0
  let matched = false
  let match: RegExpExecArray | null
  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1], 10)
    const unit = match[2].toLowerCase()
    total += value * units[unit]
    matched = true
  }
  return matched ? total : null
}

export function formatInterval(ms: number): string {
  const units: Array<[string, number]> = [
    ['d', 86400_000],
    ['h', 3_600_000],
    ['m', 60_000],
    ['s', 1_000],
  ]
  let remaining = ms
  let result = ''
  for (const [label, factor] of units) {
    const count = Math.floor(remaining / factor)
    if (count > 0) {
      result += `${count}${label}`
      remaining -= count * factor
    }
  }
  return result || '0s'
}
