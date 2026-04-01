import { z } from 'zod'
import type { ToolDefinition } from './types.js'
import { AGENT_TYPES } from './agentTypes.js'

export const agentTool: ToolDefinition = {
  name: 'Agent',
  description: 'Launch a sub-agent to handle a complex task. Available types: ' +
    AGENT_TYPES.map(t => `${t.name} (${t.description})`).join('; '),
  inputSchema: z.object({
    prompt: z.string().describe('The task for the sub-agent to perform'),
    description: z.string().describe('Short description of the task'),
    subagent_type: z.string().optional().describe('Agent type: general-purpose, explore, plan'),
    model: z.string().optional().describe('Model override: sonnet, opus, haiku'),
    run_in_background: z.boolean().optional().describe('Run in background, get notified on completion'),
  }),
  isReadOnly: true,

  async call(input, context) {
    const { prompt, description, subagent_type, model, run_in_background } = input as {
      prompt: string; description: string; subagent_type?: string;
      model?: string; run_in_background?: boolean
    }

    try {
      const { runSubAgent } = await import('../engine/queryEngine.js')
      const result = await runSubAgent(prompt, description, context, {
        subagentType: subagent_type,
        model,
        runInBackground: run_in_background,
      })
      return { output: result }
    } catch (err) {
      return { output: `Agent error: ${(err as Error).message}`, isError: true }
    }
  },
}
