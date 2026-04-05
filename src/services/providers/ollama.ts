import { OpenAIProvider } from './openai.js'
import type { LLMProvider, StreamChunk, Message, ToolSchema } from './types.js'

interface OllamaConfig { baseUrl: string; model: string }

export class OllamaProvider implements LLMProvider {
  name = 'ollama'
  private inner: OpenAIProvider

  constructor(config: OllamaConfig) {
    this.inner = new OpenAIProvider({ apiKey: 'ollama', baseUrl: `${config.baseUrl}/v1`, model: config.model })
  }

  async *stream(systemPrompt: string, messages: Message[], tools: ToolSchema[], options?: { maxTokens?: number; model?: string }): AsyncIterable<StreamChunk> {
    yield* this.inner.stream(systemPrompt, messages, tools, options)
  }
}
