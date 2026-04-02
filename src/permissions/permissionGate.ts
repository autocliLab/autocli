import type { PermissionConfig } from './types.js'
import { evaluatePermission } from './rules.js'
import { promptPermission } from '../ui/permissionPrompt.js'
import { formatToolUse } from '../ui/toolResult.js'
import type { Wire } from '../wire/wire.js'
import type { LlmConfirmConfig } from './llmConfirm.js'

export class PermissionGate {
  private config: PermissionConfig
  wire: Wire | null = null
  private llmConfirmConfig: LlmConfirmConfig | null = null

  constructor(config: PermissionConfig) {
    this.config = config
  }

  setLlmConfirmConfig(config: LlmConfirmConfig): void {
    this.llmConfirmConfig = config
  }

  async check(
    toolName: string,
    input: Record<string, unknown>,
    isReadOnly: boolean,
  ): Promise<boolean> {
    const decision = evaluatePermission(toolName, input, isReadOnly, this.config)

    if (decision === 'allow') return true
    if (decision === 'deny') return false

    if (decision === 'llm-confirm') {
      if (!this.llmConfirmConfig) {
        // No LLM config available — fall back to deny for safety
        return false
      }
      const { llmConfirmToolCall } = await import('./llmConfirm.js')
      const allowed = await llmConfirmToolCall(toolName, input, this.llmConfirmConfig)

      // Emit wire event for observability
      this.wire?.emit('llm_confirm', { tool: toolName, input, allowed })

      return allowed
    }

    // 'ask' — prompt the user
    const reqId = `approval-${Date.now()}`
    this.wire?.emit('approval_req', { id: reqId, tool: toolName, input })

    const description = formatToolUse(toolName, input)
    const answer = await promptPermission(toolName, description)

    // Emit approval response wire event
    this.wire?.emit('approval_res', { id: reqId, tool: toolName, answer })

    if (answer === 'always') {
      this.config.alwaysAllow.add(toolName)
      return true
    }

    return answer === 'yes'
  }

  addAlwaysAllow(toolName: string): void {
    this.config.alwaysAllow.add(toolName)
  }

  setMode(mode: PermissionConfig['mode']): void {
    this.config.mode = mode
  }
}
