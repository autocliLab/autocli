import type { CommandDefinition } from './types.js'

export const compactCommand: CommandDefinition = {
  name: 'compact',
  description: 'Compact conversation context to free up token space',

  async run(_args, _context) {
    return { type: 'compact' }
  },
}
