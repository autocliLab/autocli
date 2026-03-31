import { describe, expect, test } from 'bun:test'
import { TokenCounter } from '../../src/engine/tokenCounter.js'

describe('TokenCounter', () => {
  test('starts at zero', () => {
    const counter = new TokenCounter()
    expect(counter.totalInput).toBe(0)
    expect(counter.totalOutput).toBe(0)
    expect(counter.totalCost).toBe(0)
  })

  test('accumulates usage', () => {
    const counter = new TokenCounter()
    counter.add({ input: 100, output: 50 })
    counter.add({ input: 200, output: 100 })
    expect(counter.totalInput).toBe(300)
    expect(counter.totalOutput).toBe(150)
  })

  test('calculates cost based on model', () => {
    const counter = new TokenCounter('claude-sonnet-4-20250514')
    counter.add({ input: 1000, output: 500 })
    expect(counter.totalCost).toBeGreaterThan(0)
  })

  test('formats cost as string', () => {
    const counter = new TokenCounter()
    counter.add({ input: 1000, output: 500 })
    const formatted = counter.formatCost()
    expect(formatted).toMatch(/\$\d+\.\d+/)
  })
})
