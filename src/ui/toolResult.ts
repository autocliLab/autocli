import chalk from 'chalk'
import { theme } from './theme.js'
import { formatDiff } from './diff.js'
import { ScrollBuffer } from './scrollBuffer.js'

const TOOL_ICONS: Record<string, string> = {
  Read: '📄', Write: '✏️', Edit: '🔧', Glob: '🔍', Grep: '🔎',
  Bash: '💻', Agent: '🤖', Skill: '⚡', Think: '💭', AskUser: '❓',
  TaskCreate: '📋', TaskUpdate: '📋', TaskList: '📋', TaskGet: '📋',
  EnterPlanMode: '📐', ExitPlanMode: '📐',
  WebFetch: '🌐', WebSearch: '🔎',
}

export function formatToolUse(name: string, input: Record<string, unknown>): string {
  const icon = TOOL_ICONS[name] || '⚡'
  const header = `${icon} ${theme.tool(name)}`
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

// Shared scroll buffer for reviewing long tool outputs via /scroll command
let lastScrollBuffer: ScrollBuffer | null = null
export function getLastScrollBuffer(): ScrollBuffer | null { return lastScrollBuffer }

export function formatToolResult(name: string, output: string, isError?: boolean): string {
  const maxLines = 50
  const lines = output.split('\n')
  const truncated = lines.length > maxLines
  const display = truncated ? lines.slice(0, maxLines) : lines

  // Store in scroll buffer if output is large, so user can scroll through it
  if (lines.length > maxLines) {
    lastScrollBuffer = new ScrollBuffer()
    lastScrollBuffer.append(output)
  }

  let formatted = display.join('\n')
  if (isError) formatted = theme.error(formatted)

  if (truncated) {
    formatted += `\n${theme.dim(`... (${lines.length - maxLines} more lines — ${lastScrollBuffer?.getScrollIndicator()})`)}`
  }

  return formatted
}

export function formatGroupedTools(tools: Array<{ name: string; input: Record<string, unknown>; output: string }>): string {
  if (tools.length <= 1) return ''

  const counts = new Map<string, number>()
  for (const t of tools) {
    counts.set(t.name, (counts.get(t.name) || 0) + 1)
  }

  const summary = Array.from(counts.entries())
    .map(([name, count]) => `${theme.tool(name)}×${count}`)
    .join(', ')

  return theme.dim(`  [${tools.length} tool calls: ${summary}]`)
}

export function formatFileContent(path: string, content: string, startLine = 1): string {
  const lines = content.split('\n')
  const gutterWidth = String(startLine + lines.length).length
  return lines.map((line, i) => {
    const num = String(startLine + i).padStart(gutterWidth)
    return `${chalk.dim(num)} ${line}`
  }).join('\n')
}
