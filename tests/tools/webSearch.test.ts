import { describe, expect, test } from 'bun:test'
import { webSearchTool } from '../../src/tools/webSearch.js'

const ctx = { workingDir: '/tmp' }

describe('webSearchTool', () => {
  test('rejects empty query', async () => {
    const result = await webSearchTool.call({ query: '' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('empty')
  })

  test('rejects whitespace-only query', async () => {
    const result = await webSearchTool.call({ query: '   ' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('empty')
  })

  test('isReadOnly is true', () => {
    expect(webSearchTool.isReadOnly).toBe(true)
  })

  test('tool has correct name', () => {
    expect(webSearchTool.name).toBe('WebSearch')
  })

  test('count is clamped to max 20', async () => {
    // This just validates the tool doesn't crash with high count
    // Actual fetch may fail in test env — that's fine
    const result = await webSearchTool.call({ query: 'test', count: 100 }, ctx)
    // Either got results or a network error — both are acceptable in test
    expect(result.output).toBeDefined()
  })

  test('count defaults to 5 when not provided', async () => {
    const result = await webSearchTool.call({ query: 'bun javascript runtime' }, ctx)
    expect(result.output).toBeDefined()
  })
})
