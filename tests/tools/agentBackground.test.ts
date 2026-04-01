import { describe, expect, test } from 'bun:test'
import { BackgroundAgentManager } from '../../src/engine/queryEngine.js'

describe('BackgroundAgentManager', () => {
  test('registers and retrieves an agent', () => {
    const mgr = new BackgroundAgentManager()
    mgr.register('agent-1', 'Test task')
    expect(mgr.get('agent-1')).toBeDefined()
    expect(mgr.get('agent-1')!.description).toBe('Test task')
    expect(mgr.get('agent-1')!.status).toBe('running')
  })

  test('completes an agent', () => {
    const mgr = new BackgroundAgentManager()
    mgr.register('agent-1', 'task')
    mgr.complete('agent-1', 'Done!')
    const agent = mgr.get('agent-1')!
    expect(agent.status).toBe('completed')
    expect(agent.status === 'completed' && agent.result).toBe('Done!')
  })

  test('lists pending notifications', () => {
    const mgr = new BackgroundAgentManager()
    mgr.register('a1', 'task1')
    mgr.complete('a1', 'result1')
    const pending = mgr.getPendingNotifications()
    expect(pending).toHaveLength(1)
    const first = pending[0]
    expect(first.status === 'completed' && first.result).toBe('result1')
    expect(mgr.getPendingNotifications()).toHaveLength(0)
  })

  test('fails an agent', () => {
    const mgr = new BackgroundAgentManager()
    mgr.register('a1', 'task')
    mgr.fail('a1', 'error occurred')
    expect(mgr.get('a1')!.status).toBe('failed')
  })
})
