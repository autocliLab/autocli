import type { CommandDefinition, CommandResult } from './types.js'

const MODEL_ALIASES: Record<string, string> = {
  'sonnet': 'claude-sonnet-4-20250514',
  'opus': 'claude-opus-4-20250514',
  'haiku': 'claude-haiku-3-5-20241022',
}

export const modelCommand: CommandDefinition = {
  name: 'model',
  description: 'Switch model (sonnet, opus, haiku, or full model ID)',

  async run(args, _context): Promise<string | CommandResult> {
    if (args.length === 0) return 'Usage: /model <name>  (sonnet, opus, haiku)'
    const name = args[0]
    const resolved = MODEL_ALIASES[name] || name
    return { type: 'model_switch', model: resolved }
  },
}
