import type { CommandDefinition } from './types.js'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { theme } from '../ui/theme.js'
import { formatFileContent } from '../ui/toolResult.js'

export const exportCommand: CommandDefinition = {
  name: 'export',
  description: 'Export conversation to markdown file',

  async run(args, context) {
    const filename = args[0] || `conversation-${new Date().toISOString().split('T')[0]}.md`
    const filepath = join(context.workingDir, filename)

    const lines: string[] = [
      `# Conversation Export`,
      `Date: ${new Date().toISOString()}`,
      `Session: ${context.sessionId || 'unsaved'}`,
      `Messages: ${context.messages.length}`,
      '',
      '---',
      '',
    ]

    for (const msg of context.messages) {
      if (typeof msg.content === 'string') {
        lines.push(`## ${msg.role === 'user' ? 'User' : 'Assistant'}`)
        lines.push('')
        lines.push(msg.content)
        lines.push('')
      } else {
        lines.push(`## ${msg.role === 'user' ? 'User' : 'Assistant'}`)
        lines.push('')
        for (const block of msg.content) {
          if (block.type === 'text') {
            lines.push(block.text)
          } else if (block.type === 'tool_use') {
            lines.push(`> Tool: **${block.name}**`)
            lines.push('> ```json')
            lines.push('> ' + JSON.stringify(block.input, null, 2).split('\n').join('\n> '))
            lines.push('> ```')
          } else if (block.type === 'tool_result') {
            // Use formatFileContent for numbered-line display of results
            const preview = block.content.slice(0, 1000)
            lines.push('> Result:')
            lines.push('> ```')
            lines.push('> ' + formatFileContent('result', preview).split('\n').join('\n> '))
            lines.push('> ```')
          }
          lines.push('')
        }
      }
    }

    writeFileSync(filepath, lines.join('\n'))
    return `${theme.success('Exported')} ${context.messages.length} messages to ${theme.bold(filename)}`
  },
}
