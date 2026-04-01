import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { platform } from './platform.js'

export interface AppConfig {
  apiKey?: string
  model: string
  maxTokens: number
  permissionMode: 'default' | 'auto-approve' | 'deny-all'
  hooks: Array<{ event: string; command: string; pattern?: string }>
  remotePort: number
  remoteSecret?: string
  maxSessionCost: number  // in dollars
  provider: 'anthropic' | 'openai' | 'claude-local'
  openaiApiKey?: string
  openaiBaseUrl?: string
  claudeLocalCommand?: string       // path to claude CLI (default: 'claude')
  claudeLocalArgs?: string[]        // extra args for claude CLI
  claudeLocalModel?: string         // model override for claude CLI (e.g. 'sonnet')
  licenseKey?: string
}

const DEFAULT_CONFIG: AppConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8192,
  permissionMode: 'default',
  hooks: [],
  remotePort: 3456,
  maxSessionCost: 5.00,
  provider: 'anthropic',
}

export function loadConfig(): AppConfig {
  const configPath = join(platform.configDir, 'config.json')
  if (!existsSync(configPath)) return { ...DEFAULT_CONFIG }
  const raw = readFileSync(configPath, 'utf-8')
  return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
}

export function saveConfig(config: AppConfig): void {
  mkdirSync(platform.configDir, { recursive: true })
  const configPath = join(platform.configDir, 'config.json')
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export const MODEL_MAP: Record<string, string> = {
  'sonnet': 'claude-sonnet-4-20250514',
  'opus': 'claude-opus-4-20250514',
  'haiku': 'claude-haiku-3-5-20241022',
  'local': 'claude-local',
}

export function resolveModel(name: string, fallback: string): string {
  return MODEL_MAP[name] || name || fallback
}

export function getApiKey(): string {
  const config = loadConfig()
  // claude-local provider doesn't need an API key
  if (config.provider === 'claude-local') return ''
  const key = process.env.ANTHROPIC_API_KEY || config.apiKey
  if (!key) {
    // If openai is configured, we might not need an Anthropic key
    if (config.provider === 'openai' && config.openaiApiKey) return ''
    console.error('Set ANTHROPIC_API_KEY env var or run: autocli --set-key <key>')
    process.exit(1)
  }
  return key
}
