import { z } from 'zod'
import type { ToolDefinition } from './types.js'

export const thinkTool: ToolDefinition = {
  name: 'Think',
  description: 'Use this tool to think through a problem step-by-step. Your thinking will not be shown to the user. Use it to plan your approach, reason about trade-offs, or work through complex logic before acting.',
  inputSchema: z.object({
    thought: z.string().describe('Your internal reasoning'),
  }),
  isReadOnly: true,

  async call(input, _context) {
    const { thought } = input as { thought: string }
    return { output: `Thought recorded (${thought.length} chars). Continue with your next action.` }
  },
}
