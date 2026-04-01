import type { CommandDefinition } from './types.js'
import { theme } from '../ui/theme.js'
import { renderProgressBar } from '../ui/progressBar.js'
import { getLastScrollBuffer } from '../ui/toolResult.js'

export const contextCommand: CommandDefinition = {
  name: 'context',
  description: 'Show context window usage',

  async run(_args, context) {
    // Estimate tokens from messages
    const totalChars = context.messages.reduce((sum, m) => {
      if (typeof m.content === 'string') return sum + m.content.length
      return sum + m.content.reduce((s, b) => {
        if ('text' in b) return s + b.text.length
        if ('content' in b) return s + String(b.content).length
        return s + 50
      }, 0)
    }, 0)

    const estimatedTokens = Math.ceil(totalChars / 4)
    const maxTokens = 200_000

    const bar = renderProgressBar(estimatedTokens / maxTokens)
    const scrollBuf = getLastScrollBuffer()

    return [
      theme.bold('Context Usage:'),
      '',
      `  ${bar}`,
      '',
      `  Messages:    ${context.messages.length}`,
      `  Est. tokens: ~${estimatedTokens.toLocaleString()} / ${maxTokens.toLocaleString()}`,
      `  Input cost:  ${context.totalTokens.input.toLocaleString()} tokens`,
      `  Output cost: ${context.totalTokens.output.toLocaleString()} tokens`,
      `  Total cost:  $${context.totalCost.toFixed(4)}`,
      scrollBuf ? `  Scroll buf:  ${scrollBuf.totalLines} lines${scrollBuf.getScrollIndicator()}` : '',
    ].filter(Boolean).join('\n')
  },
}
