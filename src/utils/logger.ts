export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 }

let currentLevel: LogLevel = (process.env.AUTOCLI_LOG_LEVEL as LogLevel) || 'warn'

export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel]
}

function formatEntry(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const ts = new Date().toISOString()
  const base = `[${ts}] ${level.toUpperCase()} ${message}`
  if (context && Object.keys(context).length > 0) {
    return `${base} ${JSON.stringify(context)}`
  }
  return base
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (shouldLog('debug')) console.error(formatEntry('debug', message, context))
  },
  info(message: string, context?: Record<string, unknown>): void {
    if (shouldLog('info')) console.error(formatEntry('info', message, context))
  },
  warn(message: string, context?: Record<string, unknown>): void {
    if (shouldLog('warn')) console.error(formatEntry('warn', message, context))
  },
  error(message: string, context?: Record<string, unknown>): void {
    if (shouldLog('error')) console.error(formatEntry('error', message, context))
  },
}
