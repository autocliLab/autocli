import type { CommandDefinition, CommandResult } from './types.js'

export const planCommand: CommandDefinition = {
  name: 'plan',
  description: 'Toggle plan mode (read-only — disables Write, Edit, Bash)',

  async run(_args, _context): Promise<CommandResult> {
    return { type: 'plan_toggle' }
  },
}
