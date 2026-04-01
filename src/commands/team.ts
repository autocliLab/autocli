import type { CommandDefinition, CommandResult } from './types.js'

export const teamCommand: CommandDefinition = {
  name: 'team',
  description: 'Show team status and worker progress',

  async run(_args, _context): Promise<CommandResult> {
    return { type: 'team_status' }
  },
}
