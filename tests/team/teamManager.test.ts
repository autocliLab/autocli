import { describe, expect, test } from 'bun:test'
import { TeamManager } from '../../src/team/teamManager.js'

describe('TeamManager', () => {
  test('creates a team with workers', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('test-team', 'Build feature', [
      { name: 'researcher', task: 'Research the codebase' },
      { name: 'implementer', task: 'Write the code' },
    ])
    expect(team.workers).toHaveLength(2)
    expect(team.status).toBe('active')
    expect(team.workers[0].status).toBe('pending')
    expect(team.workers[0].notified).toBe(false)
  })

  test('starts and completes workers', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [{ name: 'w1', task: 'do stuff' }])
    mgr.startWorker(team.id, team.workers[0].id)
    expect(mgr.getTeam(team.id)!.workers[0].status).toBe('running')

    mgr.completeWorker(team.id, team.workers[0].id, 'Done!')
    expect(mgr.getTeam(team.id)!.workers[0].status).toBe('completed')
    expect(mgr.getTeam(team.id)!.status).toBe('completed')
  })

  test('fails workers', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [{ name: 'w1', task: 'fail' }])
    mgr.startWorker(team.id, team.workers[0].id)
    mgr.failWorker(team.id, team.workers[0].id, 'oops')
    expect(mgr.getTeam(team.id)!.workers[0].status).toBe('failed')
    expect(mgr.getTeam(team.id)!.status).toBe('failed')
  })

  test('marks team failed if any worker fails', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [
      { name: 'w1', task: 'succeed' },
      { name: 'w2', task: 'fail' },
    ])
    mgr.startWorker(team.id, team.workers[0].id)
    mgr.startWorker(team.id, team.workers[1].id)
    mgr.completeWorker(team.id, team.workers[0].id, 'ok')
    mgr.failWorker(team.id, team.workers[1].id, 'oops')
    expect(mgr.getTeam(team.id)!.status).toBe('failed')
  })

  test('marks team completed when all workers succeed', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [
      { name: 'w1', task: 'a' },
      { name: 'w2', task: 'b' },
    ])
    mgr.startWorker(team.id, team.workers[0].id)
    mgr.startWorker(team.id, team.workers[1].id)
    mgr.completeWorker(team.id, team.workers[0].id, 'ok1')
    mgr.completeWorker(team.id, team.workers[1].id, 'ok2')
    expect(mgr.getTeam(team.id)!.status).toBe('completed')
  })

  test('gets pending notifications once', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [{ name: 'w1', task: 'x' }])
    mgr.startWorker(team.id, team.workers[0].id)
    mgr.completeWorker(team.id, team.workers[0].id, 'result')

    const notifs1 = mgr.getPendingNotifications()
    expect(notifs1).toHaveLength(1)
    expect(notifs1[0].worker.result).toBe('result')

    // Second call returns empty
    expect(mgr.getPendingNotifications()).toHaveLength(0)
  })

  test('finds worker by ID', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [{ name: 'w1', task: 'x' }])
    const found = mgr.getWorker(team.workers[0].id)
    expect(found).toBeDefined()
    expect(found!.worker.name).toBe('w1')
  })

  test('returns undefined for unknown worker', () => {
    const mgr = new TeamManager()
    expect(mgr.getWorker('nonexistent')).toBeUndefined()
  })

  test('gets active team', () => {
    const mgr = new TeamManager()
    mgr.createTeam('team1', 'goal1', [{ name: 'w1', task: 'x' }])
    const active = mgr.getActiveTeam()
    expect(active).toBeDefined()
    expect(active!.name).toBe('team1')
  })

  test('returns undefined when no active team', () => {
    const mgr = new TeamManager()
    expect(mgr.getActiveTeam()).toBeUndefined()
  })

  test('lists all teams', () => {
    const mgr = new TeamManager()
    mgr.createTeam('t1', 'g1', [{ name: 'w1', task: 'x' }])
    mgr.createTeam('t2', 'g2', [{ name: 'w2', task: 'y' }])
    expect(mgr.listTeams()).toHaveLength(2)
  })

  test('workers get default agentType', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [{ name: 'w1', task: 'x' }])
    expect(team.workers[0].agentType).toBe('general-purpose')
  })

  test('workers can have custom agentType and model', () => {
    const mgr = new TeamManager()
    const team = mgr.createTeam('t', 'g', [
      { name: 'w1', task: 'x', agentType: 'worker', model: 'haiku' },
    ])
    expect(team.workers[0].agentType).toBe('worker')
    expect(team.workers[0].model).toBe('haiku')
  })
})
