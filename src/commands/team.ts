import type { CommandDefinition } from './types.js'

export const teamCommand: CommandDefinition = {
  name: 'team',
  description: 'Show team status and worker progress',

  async run(_args, _context) {
    return '__TEAM_STATUS__'
  },
}
