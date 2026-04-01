import type { CommandDefinition, CommandResult } from './types.js'

export const tasksCommand: CommandDefinition = {
  name: 'tasks',
  description: 'List background tasks and their status',

  async run(_args, _context): Promise<CommandResult> {
    return { type: 'list_bg_tasks' }
  },
}
