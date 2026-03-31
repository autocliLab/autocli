import chalk from 'chalk'
import { theme } from './theme.js'
import { formatDiff } from './diff.js'

export function formatToolUse(name: string, input: Record<string, unknown>): string {
  const header = `${theme.tool('⚡')} ${theme.tool(name)}`
  const args = Object.entries(input)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => {
      const val = typeof v === 'string' && v.length > 100
        ? v.slice(0, 100) + '...'
        : String(v)
      return `  ${theme.dim(k + ':')} ${val}`
    })
  return [header, ...args].join('\n')
}

export function formatToolResult(name: string, output: string, isError?: boolean): string {
  const maxLines = 50
  const lines = output.split('\n')
  const truncated = lines.length > maxLines
  const display = truncated ? lines.slice(0, maxLines) : lines

  let formatted = display.join('\n')
  if (isError) formatted = theme.error(formatted)

  if (truncated) {
    formatted += `\n${theme.dim(`... (${lines.length - maxLines} more lines)`)}`
  }

  return formatted
}

export function formatFileContent(path: string, content: string, startLine = 1): string {
  const lines = content.split('\n')
  const gutterWidth = String(startLine + lines.length).length
  return lines.map((line, i) => {
    const num = String(startLine + i).padStart(gutterWidth)
    return `${chalk.dim(num)} ${line}`
  }).join('\n')
}
