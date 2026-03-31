import { describe, expect, test } from 'bun:test'
import { formatDiff } from '../../src/ui/diff.js'

describe('formatDiff', () => {
  test('colors added lines green', () => {
    const diff = '+added line'
    const result = formatDiff(diff)
    expect(result).toContain('added line')
  })

  test('colors removed lines red', () => {
    const diff = '-removed line'
    const result = formatDiff(diff)
    expect(result).toContain('removed line')
  })

  test('handles multi-line diffs', () => {
    const diff = ' context\n-old\n+new\n context'
    const result = formatDiff(diff)
    expect(result).toContain('old')
    expect(result).toContain('new')
    expect(result).toContain('context')
  })
})
