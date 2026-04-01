import { describe, expect, test } from 'bun:test'
import { AGENT_TYPES, getAgentType } from '../../src/tools/agentTypes.js'

describe('Agent Types', () => {
  test('has explore type', () => {
    const explore = getAgentType('explore')
    expect(explore).toBeDefined()
    expect(explore!.name).toBe('explore')
    expect(explore!.readOnly).toBe(true)
  })

  test('has plan type', () => {
    const plan = getAgentType('plan')
    expect(plan).toBeDefined()
  })

  test('has general-purpose type', () => {
    const gp = getAgentType('general-purpose')
    expect(gp).toBeDefined()
  })

  test('returns undefined for unknown type', () => {
    expect(getAgentType('nonexistent')).toBeUndefined()
  })

  test('explore type only allows read-only tools', () => {
    const explore = getAgentType('explore')!
    expect(explore.allowedTools).toContain('Read')
    expect(explore.allowedTools).toContain('Glob')
    expect(explore.allowedTools).toContain('Grep')
    expect(explore.allowedTools).toContain('Bash')
    expect(explore.allowedTools).not.toContain('Write')
    expect(explore.allowedTools).not.toContain('Edit')
  })

  test('plan type disallows write tools', () => {
    const plan = getAgentType('plan')!
    expect(plan.allowedTools).not.toContain('Write')
    expect(plan.allowedTools).not.toContain('Edit')
  })
})
