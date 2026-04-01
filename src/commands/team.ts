import type { CommandDefinition, CommandResult } from './types.js'
import { theme } from '../ui/theme.js'

export const teamCommand: CommandDefinition = {
  name: 'team',
  description: 'Show team status or save team as template',

  async run(args, _context): Promise<CommandResult> {
    const sub = args[0]

    if (sub === 'save') {
      const saveName = args[1]
      if (!saveName) {
        return { type: 'output' as const, text: theme.error('Usage: /team save <name>') }
      }

      // We can't access teamManager directly from a command,
      // so we return a special result type for the REPL to handle
      return { type: 'team_save' as const, saveName }
    }

    // Default: show team status
    return { type: 'team_status' }
  },
}
