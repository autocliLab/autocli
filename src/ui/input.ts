import * as readline from 'readline'
import { readdirSync, existsSync, statSync } from 'fs'
import { dirname, basename, join } from 'path'
import { theme } from './theme.js'
import { createVimState, handleVimKey, getModeIndicator, type VimMode } from './vim.js'

// Shared vim state so REPL can toggle it
let vimModeEnabled = false
let onVimModeChange: ((mode: VimMode) => void) | null = null

export function setVimMode(enabled: boolean, onChange?: (mode: VimMode) => void): void {
  vimModeEnabled = enabled
  onVimModeChange = onChange || null
}

export function isVimMode(): boolean {
  return vimModeEnabled
}

export async function readInput(prompt = '> ', history?: string[], commands?: string[]): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt,
    history: history ? [...history].reverse() : [],
    historySize: 500,
    completer: commands ? (line: string) => {
      if (line.startsWith('/')) {
        // Use completeCommand for slash-command completion
        const completed = completeCommand(line, commands)
        if (completed !== line) return [[completed], line]
        const prefix = line.slice(1)
        const matches = commands.filter(c => c.startsWith(prefix)).map(c => '/' + c)
        return [matches.length ? matches : [], line]
      }
      // Use completePath for file path completion
      const pathMatches = completePath(line, process.cwd())
      return [pathMatches, line]
    } : undefined,
  })

  return new Promise((resolve) => {
    const lines: string[] = []
    let resolved = false
    let vimKeypressHandler: ((_ch: string, key: { name: string; sequence: string }) => void) | null = null

    const finish = (result: string) => {
      if (resolved) return
      resolved = true
      // Clean up vim keypress listener if active
      if (vimKeypressHandler) {
        process.stdin.removeListener('keypress', vimKeypressHandler)
        vimKeypressHandler = null
      }
      rl.close()
      resolve(result)
    }

    // Vim mode: intercept keys in normal mode
    if (vimModeEnabled && process.stdin.isTTY) {
      // Enable keypress events on stdin (required for vim key interception)
      readline.emitKeypressEvents(process.stdin, rl)

      const vimState = createVimState()
      vimState.mode = 'normal'

      rl.prompt()
      process.stdout.write(theme.dim(`  ${getModeIndicator(vimState.mode)}`))
      process.stdout.write(`\r`)
      rl.prompt()

      rl.on('line', (line) => {
        if (vimState.mode === 'normal') {
          if (line.trim() || lines.length > 0) {
            lines.push(line)
            finish(lines.join('\n'))
            return
          }
          rl.prompt()
          return
        }

        // Insert mode: normal line handling
        if (line.endsWith('\\')) {
          lines.push(line.slice(0, -1))
          rl.setPrompt(theme.dim('... '))
          rl.prompt()
          return
        }
        lines.push(line)
        if (lines.length > 1 && line === '') {
          lines.pop()
          finish(lines.join('\n'))
          return
        }
        finish(lines.join('\n'))
      })

      // Use handleVimKey for full vim motion support (h/l/w/b/x/D/p/etc.)
      vimKeypressHandler = (_ch: string, key: { name: string; sequence: string }) => {
        if (!key) return
        const keyStr = key.name === 'escape' ? '\x1b' : (key.sequence || key.name)
        const { state: newState, action } = handleVimKey(vimState, keyStr)
        Object.assign(vimState, newState)

        if (action === 'mode_change') {
          onVimModeChange?.(vimState.mode)
          process.stdout.write(`\r\x1B[K`)
          process.stdout.write(theme.dim(`  ${getModeIndicator(vimState.mode)}\r`))
          rl.prompt(true)
        }
      }
      process.stdin.on('keypress', vimKeypressHandler)
    } else {
      // Standard (non-vim) mode
      rl.prompt()

      rl.on('line', (line) => {
        if (line.endsWith('\\')) {
          lines.push(line.slice(0, -1))
          rl.setPrompt(theme.dim('... '))
          rl.prompt()
          return
        }

        lines.push(line)

        if (lines.length > 1 && line === '') {
          lines.pop()
          finish(lines.join('\n'))
          return
        }

        finish(lines.join('\n'))
      })
    }

    rl.on('close', () => {
      finish(lines.join('\n'))
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
