import { describe, expect, test } from 'bun:test'
import { agentTool } from '../../src/tools/agent.js'

describe('agentTool', () => {
  test('has correct metadata', () => {
    expect(agentTool.name).toBe('Agent')
    expect(agentTool.isReadOnly).toBe(true)
    expect(agentTool.description).toContain('sub-agent')
    expect(agentTool.description).toContain('general-purpose')
    expect(agentTool.description).toContain('explore')
    expect(agentTool.description).toContain('plan')
  })
})
