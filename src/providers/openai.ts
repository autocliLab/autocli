import type { ProviderMessage, ProviderConfig } from './types.js'

// Re-export ProviderMessage as OpenAIMessage for backwards compatibility
export type OpenAIMessage = ProviderMessage

// Build an OpenAI-compatible config from our generic provider config
export function buildOpenAIConfig(config: ProviderConfig): { apiKey: string; baseUrl: string; model: string } {
  return {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl || 'https://api.openai.com/v1',
    model: config.model,
  }
}

export async function callOpenAI(params: {
  apiKey: string
  baseUrl?: string
  model: string
  maxTokens: number
  system: string
  messages: Array<{ role: string; content: unknown }>
  tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>
  onText?: (text: string) => void
  stream?: boolean
}): Promise<ProviderMessage> {
  const baseUrl = params.baseUrl || 'https://api.openai.com/v1'

  const openaiMessages: unknown[] = [
    { role: 'system', content: params.system },
  ]

  for (const msg of params.messages) {
    if (typeof msg.content === 'string') {
      openaiMessages.push({ role: msg.role, content: msg.content })
    } else if (Array.isArray(msg.content)) {
      // Handle assistant with tool calls
      if (msg.role === 'assistant') {
        const textParts = (msg.content as Array<Record<string, unknown>>).filter(b => b.type === 'text')
        const toolParts = (msg.content as Array<Record<string, unknown>>).filter(b => b.type === 'tool_use')
        if (toolParts.length > 0) {
          const combinedText = textParts.map(t => (t as { text: string }).text).join('\n')
          openaiMessages.push({
            role: 'assistant',
            content: combinedText || null,
            tool_calls: toolParts.map(t => ({
              id: t.id,
              type: 'function',
              function: { name: t.name, arguments: JSON.stringify(t.input) },
            })),
          })
        } else if (textParts.length > 0) {
          openaiMessages.push({ role: 'assistant', content: textParts.map(t => (t as { text: string }).text).join('\n') })
        }
      } else {
        // Handle user messages with mixed content (text + tool_results)
        // OpenAI requires tool results as separate 'tool' role messages BEFORE any user text
        const blocks = msg.content as Array<Record<string, unknown>>
        for (const block of blocks) {
          if (block.type === 'tool_result') {
            openaiMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: String(block.content),
            })
          }
        }
        const textBlocks = blocks.filter(b => b.type === 'text')
        if (textBlocks.length > 0) {
          openaiMessages.push({
            role: 'user',
            content: textBlocks.map(t => (t as { text: string }).text).join('\n'),
          })
        }
      }
    }
  }

  const openaiTools = params.tools.map(t => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }))

  const body: Record<string, unknown> = {
    model: params.model,
    max_tokens: params.maxTokens,
    messages: openaiMessages,
    stream: params.stream ?? false,
  }
  if (openaiTools.length > 0) body.tools = openaiTools

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${text}`)
  }

  // Streaming mode: parse SSE chunks
  if (params.stream && res.body) {
    const content: ProviderMessage['content'] = []
    let fullText = ''
    const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>()
    let inputTokens = 0
    let outputTokens = 0

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const chunk = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string
                tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>
              }
            }>
            usage?: { prompt_tokens: number; completion_tokens: number }
          }

          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens
            outputTokens = chunk.usage.completion_tokens
          }

          const delta = chunk.choices?.[0]?.delta
          if (delta?.content) {
            fullText += delta.content
            params.onText?.(delta.content)
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCallBuffers.has(tc.index)) {
                toolCallBuffers.set(tc.index, { id: tc.id || '', name: tc.function?.name || '', args: '' })
              }
              const buf = toolCallBuffers.get(tc.index)!
              if (tc.id) buf.id = tc.id
              if (tc.function?.name) buf.name = tc.function.name
              if (tc.function?.arguments) buf.args += tc.function.arguments
            }
          }
        } catch { /* skip malformed SSE chunks */ }
      }
    }

    if (fullText) content.push({ type: 'text', text: fullText })
    for (const [, tc] of toolCallBuffers) {
      try {
        content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: JSON.parse(tc.args || '{}') })
      } catch {
        content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: {} })
      }
    }

    return { content, usage: { input_tokens: inputTokens, output_tokens: outputTokens } }
  }

  // Non-streaming mode
  const data = await res.json() as {
    choices: Array<{
      message: { content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }
    }>
    usage?: { prompt_tokens: number; completion_tokens: number }
  }

  const choice = data.choices?.[0]
  const content: ProviderMessage['content'] = []

  if (!choice) {
    return { content: [{ type: 'text', text: 'Error: Empty response from API (no choices returned).' }], usage: { input_tokens: 0, output_tokens: 0 } }
  }

  if (choice.message.content) {
    content.push({ type: 'text', text: choice.message.content })
  }
  if (choice.message.tool_calls) {
    for (const tc of choice.message.tool_calls) {
      try {
        content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments || '{}') })
      } catch {
        content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input: {} })
      }
    }
  }

  return {
    content,
    usage: { input_tokens: data.usage?.prompt_tokens || 0, output_tokens: data.usage?.completion_tokens || 0 },
  }
}
