import { z } from 'zod'
import type { ToolDefinition } from './types.js'

export const agentTool: ToolDefinition = {
  name: 'Agent',
  description: 'Launch a sub-agent to handle a complex task autonomously.',
  inputSchema: z.object({
    prompt: z.string().describe('The task for the sub-agent to perform'),
    description: z.string().describe('Short description of the task'),
  }),
  isReadOnly: true,

  async call(input, context) {
    const { prompt, description } = input as { prompt: string; description: string }

    try {
      const { runSubAgent } = await import('../engine/queryEngine.js')
      const result = await runSubAgent(prompt, description, context)
      return { output: result }
    } catch (err) {
      return { output: `Agent error: ${(err as Error).message}`, isError: true }
    }
  },
}
