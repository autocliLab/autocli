import { formatToolUse } from '../ui/toolResult.js'

const CONFIRM_PROMPT = `You are a safety reviewer for an autonomous AI coding agent.
The agent is running a scheduled task and wants to execute a tool call.
Review the tool call and decide if it should be ALLOWED or DENIED.

Rules:
- ALLOW read operations (reading files, searching, listing)
- ALLOW writing/editing code files in the working directory
- ALLOW running safe shell commands (git, npm, tsc, bun, test runners, linters)
- ALLOW creating/deleting files within the project directory
- DENY commands that could damage the system (rm -rf /, shutdown, format, dd)
- DENY commands that access sensitive files outside the project (/etc/passwd, ~/.ssh/*, credentials)
- DENY commands that exfiltrate data (curl/wget to unknown URLs, sending emails)
- DENY commands that install global packages or modify system config
- DENY anything that looks like it's trying to escape the sandbox

Respond with ONLY one word: ALLOW or DENY
If unsure, respond DENY.`

export interface LlmConfirmConfig {
  provider: string
  apiKey: string
  model?: string
  claudeLocalConfig?: import('../providers/claudeLocal.js').ClaudeLocalConfig
  openaiApiKey?: string
  openaiBaseUrl?: string
}

export async function llmConfirmToolCall(
  toolName: string,
  input: Record<string, unknown>,
  config: LlmConfirmConfig,
): Promise<boolean> {
  const description = formatToolUse(toolName, input)
  const userMessage = `Tool: ${toolName}\nDetails:\n${description}`

  try {
    const answer = await callConfirmLlm(CONFIRM_PROMPT, userMessage, config)
    const normalized = answer.trim().toUpperCase()
    return normalized.startsWith('ALLOW')
  } catch (err) {
    // On error, deny for safety
    return false
  }
}

async function callConfirmLlm(
  system: string,
  userMessage: string,
  config: LlmConfirmConfig,
): Promise<string> {
  if (config.provider === 'claude-local') {
    const { callClaudeLocal } = await import('../providers/claudeLocal.js')
    const result = await callClaudeLocal({
      system,
      messages: [{ role: 'user', content: userMessage }],
      config: config.claudeLocalConfig,
    })
    const text = result.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('')
    return text
  }

  if (config.provider === 'openai') {
    const { callOpenAI, buildOpenAIConfig } = await import('../providers/openai.js')
    const oaiConfig = buildOpenAIConfig({
      provider: 'openai',
      apiKey: config.openaiApiKey || config.apiKey,
      baseUrl: config.openaiBaseUrl,
      model: config.model || 'gpt-4o-mini',
    })
    const result = await callOpenAI({
      apiKey: oaiConfig.apiKey,
      baseUrl: oaiConfig.baseUrl,
      model: oaiConfig.model,
      maxTokens: 10,
      system,
      messages: [{ role: 'user', content: userMessage }],
      tools: [],
    })
    return result.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('')
  }

  // Anthropic provider
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: config.apiKey })
  const response = await client.messages.create({
    model: config.model || 'claude-haiku-4-5-20251001',
    max_tokens: 10,
    system,
    messages: [{ role: 'user', content: userMessage }],
  })
  const textBlocks = response.content.filter(b => b.type === 'text') as Array<{ type: 'text'; text: string }>
  return textBlocks.map(b => b.text).join('')
}
