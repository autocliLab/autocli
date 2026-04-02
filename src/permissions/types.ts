export type PermissionDecision = 'allow' | 'deny' | 'ask' | 'llm-confirm'

export interface PermissionRule {
  tool: string
  pattern?: string
  decision: PermissionDecision
}

export interface PermissionConfig {
  mode: 'default' | 'auto-approve' | 'deny-all' | 'llm-confirm'
  rules: PermissionRule[]
  alwaysAllow: Set<string>
}
