import { spawn, type ChildProcess } from 'child_process'
import type { ProviderMessage } from './types.js'

export interface ClaudeLocalConfig {
  command?: string
  args?: string[]
  claudeModel?: string
  permissionMode?: string
}

interface StreamEvent {
  type: 'text' | 'done'
  content: string
}

/**
 * Call the local `claude` CLI as a subprocess.
 *
 * Claude CLI handles its own tools internally (file editing, bash, etc.),
 * so this provider yields only text back. Tool calls are managed by Claude CLI
 * via its own permission mode — not surfaced to autocli's tool loop.
 */
export async function callClaudeLocal(params: {
  system: string
  messages: Array<{ role: string; content: unknown }>
  config?: ClaudeLocalConfig
  onText?: (text: string) => void
  abortSignal?: AbortSignal
}): Promise<ProviderMessage> {
  const command = params.config?.command || 'claude'
  const extraArgs = params.config?.args || []

  // Build a conversational prompt from messages
  const parts: string[] = []
  for (const msg of params.messages) {
    const content = typeof msg.content === 'string'
      ? msg.content
      : (msg.content != null ? JSON.stringify(msg.content) : '')
    if (!content) continue

    if (msg.role === 'user') parts.push(`User: ${content}`)
    else if (msg.role === 'assistant') parts.push(`Assistant: ${content}`)
    else if (msg.role === 'tool') parts.push(`[Tool Result: ${content}]`)
  }

  const prompt = parts.join('\n\n')
  if (!prompt) {
    return { content: [{ type: 'text', text: '' }], usage: { input_tokens: 0, output_tokens: 0 } }
  }

  const args = [
    '--print',
    '--output-format', 'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
    ...extraArgs,
  ]

  if (params.config?.claudeModel) {
    args.push('--model', params.config.claudeModel)
  }

  if (params.system) {
    args.push('--system-prompt', params.system)
  }

  args.push(prompt)

  const collectedText = await spawnAndCollect(command, args, params.onText, params.abortSignal)

  // Estimate token usage from text length (local CLI doesn't report tokens)
  const inputTokens = Math.ceil(prompt.length / 4)
  const outputTokens = Math.ceil(collectedText.length / 4)

  return {
    content: [{ type: 'text', text: collectedText }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
  }
}

async function spawnAndCollect(
  command: string,
  args: string[],
  onText?: (text: string) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let proc: ChildProcess
    try {
      proc = spawn(command, args, {
        cwd: process.cwd(),
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (err) {
      reject(new Error(`Failed to spawn ${command}: ${(err as Error).message}`))
      return
    }

    if (abortSignal) {
      const onAbort = () => proc.kill('SIGTERM')
      abortSignal.addEventListener('abort', onAbort, { once: true })
      proc.on('exit', () => abortSignal.removeEventListener('abort', onAbort))
    }

    let buffer = ''
    let collectedText = ''

    proc.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // keep incomplete line

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const event = JSON.parse(trimmed)
          const text = parseEvent(event)
          if (text) {
            collectedText += text
            onText?.(text)
          }
        } catch {
          // Non-JSON line — treat as raw text
          collectedText += trimmed + '\n'
          onText?.(trimmed + '\n')
        }
      }
    })

    proc.stderr?.on('data', () => {
      // Ignore stderr (Claude CLI progress/status output)
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ${command}: ${err.message}`))
    })

    // Flush helper — drains any partial line left in the buffer
    const flushBuffer = () => {
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim())
          const text = parseEvent(event)
          if (text) {
            collectedText += text
            onText?.(text)
          }
        } catch {
          collectedText += buffer.trim()
          onText?.(buffer.trim())
        }
        buffer = ''
      }
    }

    // 'close' fires after all stdio streams have been closed, guaranteeing
    // that every stdout 'data' event has already been processed.  We use
    // stdout's own 'end' event so we never need a hardcoded setTimeout.
    proc.stdout?.on('end', () => {
      flushBuffer()
    })

    // 'close' fires after all stdio is closed — resolve here so we don't
    // resolve before the last stdout bytes arrive.
    proc.on('close', () => {
      flushBuffer()
      resolve(collectedText)
    })
  })
}

function parseEvent(event: Record<string, unknown>): string | null {
  // Claude CLI stream-json events:
  // {"type":"assistant","subtype":"text","text":"..."}
  // {"type":"assistant","message":{"type":"message","content":[{"type":"text","text":"..."}],...}}
  // {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
  // {"type":"result","subtype":"success","result":"..."}

  if (event.type === 'assistant') {
    // Direct text (subtype format)
    if (event.subtype === 'text' && typeof event.text === 'string') {
      return event.text
    }
    // Message with content array
    const message = event.message as Record<string, unknown> | undefined
    if (message?.content && Array.isArray(message.content)) {
      const texts = (message.content as Array<{ type: string; text?: string }>)
        .filter(c => c.type === 'text' && c.text)
        .map(c => c.text!)
      if (texts.length > 0) return texts.join('')
    }
    // Message with direct text
    if (message?.type === 'text' && typeof message.text === 'string') {
      return message.text
    }
  }

  if (event.type === 'content_block_delta') {
    const delta = event.delta as Record<string, unknown> | undefined
    if (delta?.type === 'text_delta' && typeof delta.text === 'string') {
      return delta.text
    }
  }

  // Skip 'result' events — they duplicate assistant text as a final summary
  return null
}
