import * as readline from 'readline'
import { readdirSync, existsSync, statSync } from 'fs'
import { dirname, basename, join } from 'path'
import { theme } from './theme.js'

export async function readInput(prompt = '> ', history?: string[]): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt,
    history: history ? [...history].reverse() : [],
    historySize: 500,
  })

  return new Promise((resolve) => {
    const lines: string[] = []

    rl.prompt()

    rl.on('line', (line) => {
      // Backslash at end = continue to next line
      if (line.endsWith('\\')) {
        lines.push(line.slice(0, -1))
        rl.setPrompt(theme.dim('... '))
        rl.prompt()
        return
      }

      lines.push(line)

      // If we were in continuation mode, empty line ends it
      // Otherwise, submit immediately
      if (lines.length > 1 && line === '') {
        lines.pop() // remove trailing empty
        rl.close()
        resolve(lines.join('\n'))
        return
      }

      // Single line or final line of continuation — submit
      rl.close()
      resolve(lines.join('\n'))
    })

    rl.on('close', () => {
      resolve(lines.join('\n'))
    })
  })
}

export async function readSingleLine(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export function completePath(partial: string, cwd: string): string[] {
  if (!partial) return []

  // Resolve the path
  const fullPartial = partial.startsWith('/') ? partial : join(cwd, partial)
  const dir = partial.endsWith('/') ? fullPartial : dirname(fullPartial)
  const prefix = partial.endsWith('/') ? '' : basename(fullPartial)

  if (!existsSync(dir)) return []

  try {
    const entries = readdirSync(dir)
    const matches = entries
      .filter(e => e.startsWith(prefix) && !e.startsWith('.'))
      .slice(0, 20)
      .map(e => {
        const full = join(dir, e)
        const isDir = statSync(full).isDirectory()
        // Return path relative to what user typed
        const dirPart = partial.endsWith('/') ? partial : partial.slice(0, partial.length - prefix.length)
        return dirPart + e + (isDir ? '/' : '')
      })
    return matches
  } catch {
    return []
  }
}

export function completeCommand(input: string, commands: string[]): string {
  if (!input.startsWith('/')) {
    // Try path completion for non-command input
    const matches = completePath(input, process.cwd())
    if (matches.length === 1) return matches[0]
    return input
  }

  const prefix = input.slice(1)
  const matches = commands.filter(c => c.startsWith(prefix))

  if (matches.length === 0) return input
  if (matches.length === 1) return '/' + matches[0]

  // Find longest common prefix among matches
  let common = matches[0]
  for (const m of matches.slice(1)) {
    let i = 0
    while (i < common.length && i < m.length && common[i] === m[i]) i++
    common = common.slice(0, i)
  }

  return '/' + common
}
