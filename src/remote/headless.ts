import { getApiKey, loadConfig } from '../utils/config.js'
import { ToolRegistry } from '../tools/registry.js'
import { TokenCounter } from '../engine/tokenCounter.js'
import { ContextManager } from '../engine/contextManager.js'
import { QueryEngine } from '../engine/queryEngine.js'
import { RemoteServer } from './server.js'
import { registerAllTools } from '../tools/registerAll.js'
import { setGlobalEngine } from '../repl.js'
import { theme } from '../ui/theme.js'
import { randomUUID } from 'crypto'

export async function startHeadless(port: number): Promise<void> {
  const config = loadConfig()
  const apiKey = getApiKey()

  const toolRegistry = new ToolRegistry()
  registerAllTools(toolRegistry)

  const tokenCounter = new TokenCounter(config.model)
  const contextManager = new ContextManager()

  const engineConfig = {
    apiKey,
    model: config.model,
    toolRegistry,
    tokenCounter,
    contextManager,
    headless: true,
    permissionConfig: {
      mode: 'auto-approve' as const,
      rules: [] as Array<{ tool: string; pattern?: string; decision: 'allow' | 'deny' | 'ask' }>,
      alwaysAllow: new Set<string>(),
    },
  }

  const engine = new QueryEngine(engineConfig)

  // Set global engine so sub-agents work in headless mode
  setGlobalEngine(engine)

  const secret = config.remoteSecret || randomUUID()
  const server = new RemoteServer(engine, engineConfig, tokenCounter, secret, config.remoteSecret)
  server.start(port)

  console.log(theme.bold('Mini Claude — Headless Mode'))
  console.log(theme.dim(`Port: ${port}`))
  console.log(theme.dim(`Secret: ${secret}`))
  console.log(theme.dim('Endpoints: /health, /status, /chat, /chat/stream, /sessions, /approvals'))
  console.log()
  console.log(theme.info('Waiting for connections...'))
}
