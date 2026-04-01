import Anthropic from '@anthropic-ai/sdk'
import { ToolRegistry } from '../tools/registry.js'
import type { TokenCounter } from './tokenCounter.js'
import type { ContextManager } from './contextManager.js'
import type { ToolContext, ToolResult } from '../tools/types.js'
import type { Message, ContentBlock } from '../commands/types.js'
import { PermissionGate } from '../permissions/permissionGate.js'
import type { PermissionConfig } from '../permissions/types.js'
import { Spinner } from '../ui/spinner.js'
import { renderMarkdown } from '../ui/markdown.js'
import { formatToolUse, formatToolResult } from '../ui/toolResult.js'
import { theme } from '../ui/theme.js'

const SYSTEM_PROMPT = `You are an expert coding assistant. You help users with software engineering tasks including writing code, debugging, refactoring, and explaining concepts.

# Core Principles
- Read before writing. Always read a file before modifying it. Understand existing code before suggesting changes.
- Make minimal changes. Only modify what's needed to accomplish the task. Don't refactor surrounding code unless asked.
- Prefer editing existing files over creating new ones. This prevents file bloat and builds on existing work.
- Be concise. Lead with the answer or action, not reasoning. Skip filler words and preamble.

# Tool Usage
- Use Read to read files, not Bash with cat/head/tail.
- Use Edit for modifying files, not Bash with sed/awk. Edit performs exact string replacement — the old_string must match exactly.
- Use Write only for creating new files or complete rewrites. For existing files, prefer Edit.
- Use Glob to find files by name pattern, not Bash with find/ls.
- Use Grep to search file contents, not Bash with grep/rg.
- Use Bash only for running commands, installing packages, running tests, and git operations.
- When running shell commands, quote file paths with spaces.

# Code Quality
- Write safe, secure code. Avoid command injection, XSS, SQL injection.
- Don't add unnecessary error handling, comments, type annotations, or abstractions.
- Follow existing code conventions in the project.
- Three similar lines of code is better than a premature abstraction.

# Git Protocol
- Never amend commits unless explicitly asked. Create new commits.
- Never force push or use destructive git operations without explicit permission.
- Never skip hooks (--no-verify) unless asked.
- Stage specific files, not "git add -A" which can include secrets.

# When You're Stuck
- If a task is unclear, ask for clarification before proceeding.
- If an approach fails, diagnose why before switching tactics.
- Read error messages carefully — they usually tell you what's wrong.`

export interface QueryEngineConfig {
  apiKey: string
  model: string
  maxTokens?: number
  maxToolLoops?: number
  toolRegistry: ToolRegistry
  tokenCounter: TokenCounter
  contextManager: ContextManager
  permissionConfig?: PermissionConfig
  systemPrompt?: string
  memoryPrompt?: string
  skillsPrompt?: string
  claudeMdPrompt?: string
  gitContext?: string
  projectHint?: string
  onText?: (text: string) => void
  onToolUse?: (name: string, input: Record<string, unknown>) => void
  onToolResult?: (name: string, result: ToolResult) => void
  headless?: boolean
  maxSessionCost?: number
  planMode?: boolean
  provider?: 'anthropic' | 'openai'
  openaiApiKey?: string
  openaiBaseUrl?: string
  wire?: import('../wire/wire.js').Wire
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  headless = false,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const error = err as Error & { status?: number }
      const status = error.status || 0

      // Retry on rate limit (429) or overloaded (529)
      if ((status === 429 || status === 529) && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000) // exponential backoff, max 30s
        if (!headless) {
          console.log(theme.warning(`Rate limited (${status}). Retrying in ${delay / 1000}s... (${attempt + 1}/${maxRetries})`))
        }
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      throw err
    }
  }
  throw new Error('Max retries exceeded')
}

export class QueryEngine {
  private client: Anthropic
  private config: QueryEngineConfig
  private permissionGate: PermissionGate

  constructor(config: QueryEngineConfig) {
    this.config = config
    this.client = new Anthropic({ apiKey: config.apiKey })
    this.permissionGate = new PermissionGate(
      config.permissionConfig || { mode: 'default', rules: [], alwaysAllow: new Set() }
    )
  }

  buildSystemPrompt(workingDir: string): string {
    return [
      SYSTEM_PROMPT,
      `Working directory: ${workingDir}`,
      `Platform: ${process.platform}`,
      `Shell: ${process.env.SHELL || '/bin/bash'}`,
      `Date: ${new Date().toISOString().split('T')[0]}`,
      this.config.systemPrompt || '',
      this.config.memoryPrompt || '',
      this.config.skillsPrompt || '',
      this.config.claudeMdPrompt || '',
      this.config.gitContext || '',
      this.config.projectHint || '',
    ].filter(Boolean).join('\n\n')
  }

  async run(
    messages: Message[],
    workingDir: string,
    abortSignal?: AbortSignal,
  ): Promise<{ response: Message; messages: Message[] }> {
    const fitted = this.config.contextManager.fitToContext(messages)
    const systemPrompt = this.buildSystemPrompt(workingDir)
    const tools = this.config.toolRegistry.toApiSchemas()
    const sharedState: Record<string, unknown> = {}
    const toolContext: ToolContext = { workingDir, sharedState }

    const spinner = new Spinner('Thinking...')
    const maxLoops = this.config.maxToolLoops || 40
    let loopCount = 0

    let currentMessages = [...fitted]
    let continueLoop = true

    while (continueLoop) {
      continueLoop = false
      loopCount++

      // Check for cancellation
      if (abortSignal?.aborted) break

      if (loopCount > maxLoops) {
        if (!this.config.headless) {
          console.log(theme.warning(`Tool loop limit reached (${maxLoops}). Stopping.`))
        }
        break
      }

      // Convert internal messages to Anthropic API format
      const apiMessages: Anthropic.MessageParam[] = currentMessages.map(m => {
        if (typeof m.content === 'string') {
          return { role: m.role as 'user' | 'assistant', content: m.content }
        }
        // Map ContentBlock[] to Anthropic-compatible blocks
        const blocks = m.content.map(block => {
          if (block.type === 'tool_result') {
            return {
              type: 'tool_result' as const,
              tool_use_id: block.tool_use_id,
              content: block.content,
              is_error: block.is_error,
            }
          }
          if (block.type === 'tool_use') {
            return {
              type: 'tool_use' as const,
              id: block.id,
              name: block.name,
              input: block.input,
            }
          }
          return { type: 'text' as const, text: block.text }
        })
        return { role: m.role as 'user' | 'assistant', content: blocks }
      })

      if (!this.config.headless) spinner.start()

      let spinnerStopped = false
      const stopSpinnerOnce = () => {
        if (!spinnerStopped && !this.config.headless) {
          spinner.stop()
          spinnerStopped = true
        }
      }

      let response: Anthropic.Message

      if (this.config.provider === 'openai') {
        const { callOpenAI } = await import('../providers/openai.js')
        stopSpinnerOnce()
        const oaiResult = await withRetry(async () => {
          return await callOpenAI({
            apiKey: this.config.openaiApiKey || this.config.apiKey,
            baseUrl: this.config.openaiBaseUrl,
            model: this.config.model,
            maxTokens: this.config.maxTokens || 8192,
            system: systemPrompt,
            messages: apiMessages as Array<{ role: string; content: unknown }>,
            tools: tools as Array<{ name: string; description: string; input_schema: Record<string, unknown> }>,
          })
        }, 3, !!this.config.headless)

        // Emit text for OpenAI response
        for (const block of oaiResult.content) {
          if (block.type === 'text') {
            if (!this.config.headless) process.stdout.write(block.text)
            this.config.onText?.(block.text)
          }
        }

        // Wrap into Anthropic.Message shape for uniform downstream handling
        response = {
          id: `oai-${Date.now()}`,
          type: 'message',
          role: 'assistant',
          model: this.config.model,
          stop_reason: oaiResult.content.some(b => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
          stop_sequence: null,
          content: oaiResult.content.map(b => {
            if (b.type === 'tool_use') {
              return { type: 'tool_use' as const, id: b.id, name: b.name, input: b.input }
            }
            return { type: 'text' as const, text: b.text }
          }),
          usage: { input_tokens: oaiResult.usage.input_tokens, output_tokens: oaiResult.usage.output_tokens, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
        } as unknown as Anthropic.Message
      } else {
        response = await withRetry(async () => {
          const s = this.client.messages.stream({
            model: this.config.model,
            max_tokens: this.config.maxTokens || 8192,
            system: systemPrompt,
            messages: apiMessages,
            tools: tools as Anthropic.Tool[],
          })

          s.on('text', (text) => {
            stopSpinnerOnce()
            if (!this.config.headless) {
              process.stdout.write(text)
            }
            this.config.onText?.(text)
            this.config.wire?.emit('text', { text })
          })

          return await s.finalMessage()
        }, 3, !!this.config.headless)
        stopSpinnerOnce() // In case no text was emitted (pure tool_use response)
      }

      if (!this.config.headless) {
        process.stdout.write('\n')
      }

      // Track tokens
      this.config.tokenCounter.add({
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      })

      // Check cost limit
      if (this.config.maxSessionCost && this.config.tokenCounter.totalCost >= this.config.maxSessionCost) {
        if (!this.config.headless) {
          console.log(theme.error(`Session cost limit reached ($${this.config.maxSessionCost}). Use /cost to check usage.`))
        }
        break
      }

      // Process response blocks
      const assistantBlocks: ContentBlock[] = []
      const toolResults: ContentBlock[] = []

      for (const block of response.content) {
        if (block.type === 'thinking') {
          const thinkingText = (block as { thinking: string }).thinking || ''
          if (!this.config.headless && thinkingText) {
            console.log(theme.dim('💭 Thinking...'))
            console.log(theme.dim('  ' + thinkingText.slice(0, 200) + (thinkingText.length > 200 ? '...' : '')))
          }
          assistantBlocks.push({ type: 'text', text: `[Thinking: ${thinkingText.slice(0, 500)}]` })
        }

        if (block.type === 'text') {
          assistantBlocks.push({ type: 'text', text: block.text })
          // Text already streamed above — don't re-render
        }

        if (block.type === 'tool_use') {
          const toolName = block.name
          const toolInput = block.input as Record<string, unknown>
          assistantBlocks.push({ type: 'tool_use', id: block.id, name: toolName, input: toolInput })

          if (!this.config.headless) {
            console.log(formatToolUse(toolName, toolInput))
          }
          this.config.onToolUse?.(toolName, toolInput)
          this.config.wire?.emit('tool_call', { name: toolName, input: toolInput })

          // Execute tool
          const tool = this.config.toolRegistry.get(toolName)
          if (!tool) {
            const errResult = { output: `Unknown tool: ${toolName}`, isError: true }
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: errResult.output, is_error: true })
            continue
          }

          // Plan mode enforcement
          if (this.config.planMode && !tool.isReadOnly) {
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Tool blocked: plan mode is active (read-only). Use ExitPlanMode to return to full access.', is_error: true })
            if (!this.config.headless) console.log(theme.warning('Blocked (plan mode).'))
            continue
          }

          // Permission check
          const allowed = await this.permissionGate.check(toolName, toolInput, tool.isReadOnly)
          if (!allowed) {
            const denyResult = { output: 'Tool call denied by user.', isError: true }
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: denyResult.output, is_error: true })
            if (!this.config.headless) console.log(theme.warning('Denied.'))
            continue
          }

          if (!this.config.headless) spinner.start()
          let result: ToolResult
          try {
            result = await tool.call(toolInput, toolContext)
          } catch (err) {
            result = { output: `Tool crashed: ${(err as Error).message}`, isError: true }
          }
          if (!this.config.headless) {
            spinner.stop()
            console.log(formatToolResult(toolName, result.output, result.isError))
          }
          this.config.onToolResult?.(toolName, result)
          this.config.wire?.emit('tool_result', { name: toolName, output: result.output, isError: result.isError })

          // Handle plan mode toggles
          if (toolName === 'EnterPlanMode') this.config.planMode = true
          if (toolName === 'ExitPlanMode') this.config.planMode = false

          // Cap tool result at 100KB
          const MAX_RESULT_BYTES = 100_000
          if (result.output.length > MAX_RESULT_BYTES) {
            result = {
              output: result.output.slice(0, MAX_RESULT_BYTES) + `\n\n[Output truncated: ${result.output.length} chars exceeds ${MAX_RESULT_BYTES} limit]`,
              isError: result.isError,
            }
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result.output,
            is_error: result.isError,
          })
        }
      }

      // Add assistant response to messages
      currentMessages.push({ role: 'assistant', content: assistantBlocks })

      // If there were tool calls, add results and continue the loop
      if (toolResults.length > 0) {
        currentMessages.push({ role: 'user', content: toolResults })
        continueLoop = true
      }
    }

    // Find the last assistant message (may not be the final message if loop hit limit)
    let lastAssistant: Message = { role: 'assistant', content: [{ type: 'text', text: '' }] }
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === 'assistant') {
        lastAssistant = currentMessages[i]
        break
      }
    }
    return { response: lastAssistant, messages: currentMessages }
  }
}

// Background agent management
export interface BackgroundAgent {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed'
  result?: string
  error?: string
  notified: boolean
  startedAt: number
}

export class BackgroundAgentManager {
  private agents = new Map<string, BackgroundAgent>()

  register(id: string, description: string): void {
    this.agents.set(id, {
      id, description, status: 'running', notified: false, startedAt: Date.now(),
    })
  }

  get(id: string): BackgroundAgent | undefined {
    return this.agents.get(id)
  }

  complete(id: string, result: string): void {
    const agent = this.agents.get(id)
    if (agent) { agent.status = 'completed'; agent.result = result }
  }

  fail(id: string, error: string): void {
    const agent = this.agents.get(id)
    if (agent) { agent.status = 'failed'; agent.error = error }
  }

  getPendingNotifications(): BackgroundAgent[] {
    const pending: BackgroundAgent[] = []
    for (const agent of this.agents.values()) {
      if ((agent.status === 'completed' || agent.status === 'failed') && !agent.notified) {
        agent.notified = true
        pending.push(agent)
      }
    }
    return pending
  }
}

// Sub-agent types and function
import { getAgentType, type AgentType } from '../tools/agentTypes.js'

export interface SubAgentOptions {
  subagentType?: string
  model?: string
  runInBackground?: boolean
}

const MODEL_MAP: Record<string, string> = {
  'sonnet': 'claude-sonnet-4-20250514',
  'opus': 'claude-opus-4-20250514',
  'haiku': 'claude-haiku-3-5-20241022',
}

function buildSubEngine(
  parentEngine: QueryEngine,
  agentType: AgentType | undefined,
  parentRegistry: ToolRegistry,
  modelOverride?: string,
): QueryEngine {
  const subRegistry = new ToolRegistry()

  if (agentType?.allowedTools) {
    for (const tool of parentRegistry.list()) {
      if (agentType.allowedTools.includes(tool.name)) {
        subRegistry.register(tool)
      }
    }
  } else {
    for (const tool of parentRegistry.list()) {
      subRegistry.register(tool)
    }
  }

  const resolvedModel = modelOverride
    ? MODEL_MAP[modelOverride] || modelOverride
    : parentEngine['config'].model

  return new QueryEngine({
    ...parentEngine['config'],
    model: resolvedModel,
    toolRegistry: subRegistry,
    systemPrompt: agentType?.systemPrompt,
    headless: true,
  })
}

export async function runSubAgent(
  prompt: string,
  _description: string,
  context: ToolContext,
  options?: SubAgentOptions,
): Promise<string> {
  const { getGlobalEngine } = await import('../repl.js')
  const engine = getGlobalEngine()

  if (!engine) {
    return 'Error: query engine not initialized'
  }

  // Background execution
  if (options?.runInBackground) {
    const { getBackgroundManager } = await import('../repl.js')
    const bgMgr = getBackgroundManager()
    if (bgMgr) {
      const agentId = `bg-${Date.now()}`
      bgMgr.register(agentId, _description)

      // Fire and forget
      const parentRegistry = engine['config'].toolRegistry as ToolRegistry
      const agentType = options?.subagentType
        ? getAgentType(options.subagentType)
        : getAgentType('general-purpose')
      const subEngine = buildSubEngine(engine, agentType, parentRegistry, options?.model)
      ;(async () => {
        try {
          const msgs: Message[] = [{ role: 'user', content: prompt }]
          const { response } = await subEngine.run(msgs, context.workingDir)
          const text = typeof response.content === 'string'
            ? response.content
            : response.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text').map(b => b.text).join('\n')
          bgMgr.complete(agentId, text)
        } catch (err) {
          bgMgr.fail(agentId, (err as Error).message)
        }
      })()

      return `Agent launched in background (${agentId}). You will be notified when it completes.`
    }
  }

  const agentType = options?.subagentType
    ? getAgentType(options.subagentType)
    : getAgentType('general-purpose')

  const parentRegistry = engine['config'].toolRegistry as ToolRegistry
  const subEngine = buildSubEngine(engine, agentType, parentRegistry, options?.model)

  const messages: Message[] = [{ role: 'user', content: prompt }]
  const { response } = await subEngine.run(messages, context.workingDir)

  if (typeof response.content === 'string') return response.content

  return response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map(b => b.text)
    .join('\n')
}
