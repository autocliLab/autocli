import type { TokenCounter } from '../engine/tokenCounter.js'

export interface ServerStatus {
  status: 'ok'
  uptime: number
  activeSessions: number
  totalTokens: { input: number; output: number }
  totalCost: string
}

export function getServerStatus(
  startTime: number,
  sessionCount: number,
  tokenCounter: TokenCounter,
): ServerStatus {
  return {
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    activeSessions: sessionCount,
    totalTokens: {
      input: tokenCounter.totalInput,
      output: tokenCounter.totalOutput,
    },
    totalCost: tokenCounter.formatCost(),
  }
}
