import { z } from 'zod'
import type { ToolDefinition } from './types.js'
import { readSingleLine } from '../ui/input.js'
import { theme } from '../ui/theme.js'

export const askUserTool: ToolDefinition = {
  name: 'AskUser',
  description: 'Ask the user a clarifying question when you need more information to proceed. Use this when requirements are ambiguous or you need to confirm an approach before making changes.',
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
  }),
  isReadOnly: true,

  async call(input, _context) {
    const { question } = input as { question: string }

    console.log()
    console.log(theme.bold('Question: ') + question)
    console.log()

    const answer = await readSingleLine(theme.info('Your answer: '))
    return { output: `User answered: ${answer}` }
  },
}
