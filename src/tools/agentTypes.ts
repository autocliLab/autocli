export interface AgentType {
  name: string
  description: string
  systemPrompt: string
  allowedTools: string[]
  readOnly: boolean
  model?: string
}

export const AGENT_TYPES: AgentType[] = [
  {
    name: 'general-purpose',
    description: 'General-purpose agent for research, code search, and multi-step tasks.',
    systemPrompt: 'You are a sub-agent handling a specific task. Complete the task and report back concisely.',
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch'],
    readOnly: false,
  },
  {
    name: 'explore',
    description: 'Fast agent for exploring codebases. Read-only — cannot modify files.',
    systemPrompt: 'You are a read-only exploration agent. Search and read files to answer questions. You CANNOT modify any files.',
    allowedTools: ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch'],
    readOnly: true,
  },
  {
    name: 'plan',
    description: 'Planning agent for designing implementation strategies. Read-only.',
    systemPrompt: 'You are a planning agent. Analyze the codebase and create implementation plans. You CANNOT modify files.',
    allowedTools: ['Read', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch'],
    readOnly: true,
  },
  {
    name: 'worker',
    description: 'Team worker agent. Executes a specific subtask assigned by the team lead.',
    systemPrompt: 'You are a team worker agent. Focus on your assigned task. Be thorough, report results clearly, and stay within scope.',
    allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch', 'WebSearch'],
    readOnly: false,
  },
]

export function getAgentType(name: string): AgentType | undefined {
  return AGENT_TYPES.find(t => t.name === name)
}
