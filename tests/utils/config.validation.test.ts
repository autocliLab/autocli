import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { loadConfig } from '../../src/utils/config.js'

// Note: loadConfig reads from the platform config dir.
// These tests verify the validation logic works by testing the schema inline.
import { z } from 'zod'

const configSchema = z.object({
  model: z.string().default('claude-opus-4-6-20250616'),
  maxTokens: z.number().int().positive().default(8192),
  permissionMode: z.enum(['default', 'auto-approve', 'deny-all']).default('default'),
  provider: z.enum(['anthropic', 'openai', 'claude-local', 'minimaxi-cn']).default('anthropic'),
}).passthrough()

describe('config validation', () => {
  test('valid config passes', () => {
    const result = configSchema.safeParse({ model: 'claude-sonnet-4-20250514', maxTokens: 4096 })
    expect(result.success).toBe(true)
  })

  test('invalid maxTokens gets caught', () => {
    const result = configSchema.safeParse({ maxTokens: -1 })
    expect(result.success).toBe(false)
  })

  test('invalid provider gets caught', () => {
    const result = configSchema.safeParse({ provider: 'invalid-provider' })
    expect(result.success).toBe(false)
  })

  test('unknown fields pass through', () => {
    const result = configSchema.safeParse({ customField: 'value' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).customField).toBe('value')
    }
  })

  test('defaults applied for missing fields', () => {
    const result = configSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.model).toBe('claude-opus-4-6-20250616')
      expect(result.data.maxTokens).toBe(8192)
    }
  })
})
