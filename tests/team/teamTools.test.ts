import { describe, expect, test } from 'bun:test'
import { createTeamTools } from '../../src/team/teamTools.js'
import { TeamManager } from '../../src/team/teamManager.js'

describe('Team tools', () => {
  test('TeamCreate has correct metadata', () => {
    const mgr = new TeamManager()
    const tools = createTeamTools(mgr)
    expect(tools.teamCreate.name).toBe('TeamCreate')
    expect(tools.teamCreate.isReadOnly).toBe(false)
    expect(tools.teamStatus.name).toBe('TeamStatus')
    expect(tools.teamStatus.isReadOnly).toBe(true)
    expect(tools.sendMessage.name).toBe('SendMessage')
  })

  test('TeamStatus returns no team when empty', async () => {
    const mgr = new TeamManager()
    const tools = createTeamTools(mgr)
    const result = await tools.teamStatus.call({}, { workingDir: '/tmp' })
    expect(result.isError).toBe(true)
    expect(result.output).toContain('No active team')
  })

  test('TeamStatus returns team info after creation', async () => {
    const mgr = new TeamManager()
    const tools = createTeamTools(mgr)

    // Manually create a team (bypassing TeamCreate which needs runSubAgent)
    const team = mgr.createTeam('test', 'Test goal', [
      { name: 'w1', task: 'task1' },
      { name: 'w2', task: 'task2' },
    ])
    mgr.startWorker(team.id, team.workers[0].id)
    mgr.completeWorker(team.id, team.workers[0].id, 'Done')

    const result = await tools.teamStatus.call({}, { workingDir: '/tmp' })
    expect(result.isError).toBeUndefined()
    expect(result.output).toContain('test')
    expect(result.output).toContain('Test goal')
    expect(result.output).toContain('1/2 workers done')
  })

  test('TeamStatus works with explicit teamId', async () => {
    const mgr = new TeamManager()
    const tools = createTeamTools(mgr)

    const team = mgr.createTeam('myteam', 'goal', [{ name: 'w1', task: 'x' }])
    const result = await tools.teamStatus.call({ teamId: team.id }, { workingDir: '/tmp' })
    expect(result.output).toContain('myteam')
  })

  test('SendMessage returns error for unknown worker', async () => {
    const mgr = new TeamManager()
    const tools = createTeamTools(mgr)
    const result = await tools.sendMessage.call(
      { to: 'nonexistent', message: 'hello' },
      { workingDir: '/tmp' },
    )
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not found')
  })

  test('SendMessage returns error for non-running worker', async () => {
    const mgr = new TeamManager()
    const tools = createTeamTools(mgr)

    const team = mgr.createTeam('t', 'g', [{ name: 'w1', task: 'x' }])
    // Worker is still 'pending', not 'running'
    const result = await tools.sendMessage.call(
      { to: team.workers[0].id, message: 'hello' },
      { workingDir: '/tmp' },
    )
    expect(result.isError).toBe(true)
    expect(result.output).toContain('pending')
  })
})
