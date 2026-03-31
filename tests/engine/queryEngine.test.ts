import { describe, expect, test } from 'bun:test'
import { QueryEngine } from '../../src/engine/queryEngine.js'
import { ToolRegistry } from '../../src/tools/registry.js'
import { TokenCounter } from '../../src/engine/tokenCounter.js'
import { ContextManager } from '../../src/engine/contextManager.js'

describe('QueryEngine', () => {
  test('can be instantiated', () => {
    const engine = new QueryEngine({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-20250514',
      toolRegistry: new ToolRegistry(),
      tokenCounter: new TokenCounter(),
      contextManager: new ContextManager(),
    })
    expect(engine).toBeDefined()
  })

  test('builds system prompt', () => {
    const registry = new ToolRegistry()
    const engine = new QueryEngine({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-20250514',
      toolRegistry: registry,
      tokenCounter: new TokenCounter(),
      contextManager: new ContextManager(),
    })
    const prompt = engine.buildSystemPrompt('/tmp')
    expect(prompt).toContain('/tmp')
  })
})
