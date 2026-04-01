import type { CommandDefinition, CommandResult } from './types.js'
import { showConfirm } from '../ui/dialog.js'

export const clearCommand: CommandDefinition = {
  name: 'clear',
  description: 'Clear conversation history and start fresh',
  aliases: ['reset', 'new'],
  async run(args, context): Promise<string | CommandResult> {
    // Skip confirmation if --force flag or no messages
    if (args.includes('--force') || args.includes('-f') || context.messages.length === 0) {
      return { type: 'clear' }
    }

    const confirmed = await showConfirm(
      'Clear Conversation',
      `This will erase ${context.messages.length} messages. Continue?`,
    )
    if (!confirmed) return 'Clear cancelled.'
    return { type: 'clear' }
  },
}
