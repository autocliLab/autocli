export interface LLMProvider {
  name: string
  createMessage(params: {
    model: string
    maxTokens: number
    system: string
    messages: unknown[]
    tools: unknown[]
  }): AsyncIterable<ProviderEvent>
}

export type ProviderEvent =
  | { type: 'text'; text: string }
  | { type: 'message_complete'; message: ProviderMessage }

export interface ProviderMessage {
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  >
  usage: { input_tokens: number; output_tokens: number }
}

export interface ProviderConfig {
  provider: string
  apiKey: string
  baseUrl?: string
  model: string
}
