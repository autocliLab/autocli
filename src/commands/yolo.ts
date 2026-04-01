import type { CommandDefinition, CommandResult } from './types.js'

export const yoloCommand: CommandDefinition = {
  name: 'yolo',
  description: 'Toggle YOLO mode (auto-approve all tool calls)',

  async run(_args, _context): Promise<CommandResult> {
    return { type: 'yolo_toggle' }
  },
}
