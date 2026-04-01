import { appendFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import type { WireEventType } from './types.js'

type WireListener = (event: WireEvent) => void

export interface WireEvent {
  type: WireEventType
  data: unknown
  timestamp: number
}

export class Wire {
  private listeners = new Map<WireEventType | '*', WireListener[]>()
  private logPath: string | null = null

  enableFileLog(path: string): void {
    mkdirSync(dirname(path), { recursive: true })
    this.logPath = path
  }

  on(type: WireEventType | '*', listener: WireListener): void {
    const list = this.listeners.get(type) || []
    list.push(listener)
    this.listeners.set(type, list)
  }

  off(type: WireEventType | '*', listener: WireListener): void {
    const list = this.listeners.get(type) || []
    this.listeners.set(type, list.filter(l => l !== listener))
  }

  emit(type: WireEventType, data: unknown): void {
    const event: WireEvent = { type, data, timestamp: Date.now() }

    // Notify specific listeners
    for (const listener of this.listeners.get(type) || []) {
      listener(event)
    }
    // Notify wildcard listeners
    for (const listener of this.listeners.get('*') || []) {
      listener(event)
    }

    // Append to log file
    if (this.logPath) {
      try {
        appendFileSync(this.logPath, JSON.stringify(event) + '\n')
      } catch { /* ignore write errors */ }
    }
  }
}
