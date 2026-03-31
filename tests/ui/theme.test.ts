import { describe, expect, test } from 'bun:test'
import { theme } from '../../src/ui/theme.js'

describe('theme', () => {
  test('has all required color functions', () => {
    expect(typeof theme.error).toBe('function')
    expect(typeof theme.success).toBe('function')
    expect(typeof theme.warning).toBe('function')
    expect(typeof theme.info).toBe('function')
    expect(typeof theme.dim).toBe('function')
    expect(typeof theme.bold).toBe('function')
    expect(typeof theme.tool).toBe('function')
    expect(typeof theme.command).toBe('function')
  })

  test('returns strings', () => {
    expect(typeof theme.error('test')).toBe('string')
    expect(typeof theme.success('test')).toBe('string')
  })
})
