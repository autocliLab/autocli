import type { CommandDefinition, CommandResult } from './types.js'
import { resolveModel } from '../utils/config.js'

export const modelCommand: CommandDefinition = {
  name: 'model',
  description: 'Switch model (sonnet, opus, haiku, local, or full model ID)',

  async run(args, _context): Promise<string | CommandResult> {
    if (args.length === 0) return 'Usage: /model <name>  (sonnet, opus, haiku, local)'
    const name = args[0]
    const resolved = resolveModel(name, name)
    return { type: 'model_switch', model: resolved }
  },
}
