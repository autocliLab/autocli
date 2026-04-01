import { z } from 'zod'
import type { ToolDefinition } from './types.js'

export const enterPlanModeTool: ToolDefinition = {
  name: 'EnterPlanMode',
  description: 'Switch to plan mode (read-only). Use this when you want to research and plan before making changes.',
  inputSchema: z.object({}),
  isReadOnly: true,

  async call(_input, _context) {
    // The actual toggle happens via the engine config mutation in the tool loop
    return { output: 'Plan mode activated. Write/Edit/Bash tools are now disabled. Use ExitPlanMode when ready to implement.' }
  },
}

export const exitPlanModeTool: ToolDefinition = {
  name: 'ExitPlanMode',
  description: 'Exit plan mode and return to full tool access.',
  inputSchema: z.object({}),
  isReadOnly: true,

  async call(_input, _context) {
    return { output: 'Plan mode deactivated. All tools are now available.' }
  },
}
