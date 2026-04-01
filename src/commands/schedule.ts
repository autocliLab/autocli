import type { CommandDefinition, CommandResult } from './types.js'
import { ScheduleStore, parseInterval, formatInterval } from '../scheduler/scheduleStore.js'
import { AgentStore } from '../agents/agentStore.js'
import { theme } from '../ui/theme.js'

export const scheduleCommand: CommandDefinition = {
  name: 'schedule',
  description: 'Manage scheduled team runs',

  async run(args, ctx): Promise<string | CommandResult> {
    const subcommand = args[0] ?? 'list'
    const store = new ScheduleStore()

    switch (subcommand) {
      case 'list': {
        const schedules = store.list()
        if (schedules.length === 0) {
          return theme.dim('No schedules configured. Use /schedule add <team> <interval> to create one.')
        }
        const now = Date.now()
        const lines: string[] = [theme.bold('Scheduled team runs:'), '']
        for (const s of schedules) {
          const icon = s.enabled ? theme.success('●') : theme.dim('○')
          const interval = formatInterval(s.interval)
          const lastRun = s.lastRun
            ? theme.dim(`last: ${new Date(s.lastRun).toLocaleString()}`)
            : theme.dim('never run')
          const nextRunMs = s.nextRun - now
          const nextRun = s.enabled
            ? nextRunMs > 0
              ? theme.info(`next: ${formatInterval(nextRunMs)}`)
              : theme.warning('next: overdue')
            : theme.dim('disabled')
          lines.push(`  ${icon} ${theme.bold(s.team)} ${theme.dim(`[${s.id}]`)} every ${interval}`)
          lines.push(`      ${lastRun}  ${nextRun}`)
        }
        return lines.join('\n')
      }

      case 'add': {
        const teamName = args[1]
        const intervalStr = args[2]
        if (!teamName) return theme.error('Usage: /schedule add <team> <interval>')
        if (!intervalStr) return theme.error('Usage: /schedule add <team> <interval>')

        const agentStore = new AgentStore()
        try {
          agentStore.loadTeam(teamName)
        } catch {
          return theme.error(`Team not found: ${teamName}`)
        }

        const intervalMs = parseInterval(intervalStr)
        if (intervalMs === null || intervalMs <= 0) {
          return theme.error(`Invalid interval: ${intervalStr}. Examples: 1h, 30m, 2h30m, 1d`)
        }

        const schedule = store.add(teamName, intervalMs, ctx.workingDir)
        return theme.success(
          `Schedule created: ${schedule.id} — ${teamName} every ${formatInterval(intervalMs)}`
        )
      }

      case 'remove': {
        const id = args[1]
        if (!id) return theme.error('Usage: /schedule remove <id>')
        const removed = store.remove(id)
        if (!removed) return theme.error(`Schedule not found: ${id}`)
        return theme.success(`Schedule removed: ${id}`)
      }

      case 'enable': {
        const id = args[1]
        if (!id) return theme.error('Usage: /schedule enable <id>')
        const ok = store.enable(id)
        if (!ok) return theme.error(`Schedule not found: ${id}`)
        return theme.success(`Schedule enabled: ${id}`)
      }

      case 'disable': {
        const id = args[1]
        if (!id) return theme.error('Usage: /schedule disable <id>')
        const ok = store.disable(id)
        if (!ok) return theme.error(`Schedule not found: ${id}`)
        return theme.success(`Schedule disabled: ${id}`)
      }

      case 'run': {
        const teamName = args[1]
        if (!teamName) return theme.error('Usage: /schedule run <team>')
        return { type: 'run_team', team: teamName, workingDir: ctx.workingDir }
      }

      default:
        return theme.error(
          `Unknown subcommand: ${subcommand}. Available: list, add, remove, enable, disable, run`
        )
    }
  },
}
