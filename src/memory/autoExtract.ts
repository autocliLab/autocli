import type { Message } from '../commands/types.js'
import type { MemoryManager } from './memoryManager.js'

const EXTRACT_PROMPT = `Review this conversation and extract any information worth remembering for future sessions.

Memory types:
- user: About the user (role, preferences, knowledge)
- feedback: Guidance on how to work (corrections, confirmations)
- project: Ongoing work context (goals, deadlines, decisions)
- reference: Pointers to external resources

Rules:
- Only extract what's NOT derivable from code/git
- Skip ephemeral task details
- Convert relative dates to absolute
- Don't duplicate existing memories

For each memory to save, output a JSON block:
\`\`\`json
{"name": "memory-name", "description": "one-line summary", "type": "user|feedback|project|reference", "content": "the memory content"}
\`\`\`

If nothing is worth saving, output: NO_MEMORIES`

export function buildExtractionPrompt(messages: Message[], existingIndex: string): string {
  const transcript = messages
    .filter(m => typeof m.content === 'string')
    .map(m => `${m.role}: ${m.content}`)
    .slice(-20)
    .join('\n\n')

  return [
    EXTRACT_PROMPT,
    '',
    existingIndex ? `Existing memories (don't duplicate):\n${existingIndex}` : '',
    '',
    `Conversation transcript:\n${transcript}`,
  ].filter(Boolean).join('\n')
}

export function parseExtractedMemories(output: string): Array<{
  name: string; description: string; type: string; content: string
}> {
  const memories: Array<{ name: string; description: string; type: string; content: string }> = []
  const jsonRegex = /```json\s*\n([\s\S]*?)```/g
  let match

  while ((match = jsonRegex.exec(output)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.name && parsed.type && parsed.content) {
        memories.push(parsed)
      }
    } catch { /* skip invalid JSON */ }
  }

  return memories
}

export async function runMemoryExtraction(
  messages: Message[],
  memoryManager: MemoryManager,
  runQuery: (prompt: string) => Promise<string>,
): Promise<number> {
  const existingIndex = memoryManager.getIndex()
  const prompt = buildExtractionPrompt(messages, existingIndex)
  const result = await runQuery(prompt)

  if (result.includes('NO_MEMORIES')) return 0

  const memories = parseExtractedMemories(result)
  for (const mem of memories) {
    memoryManager.save({
      name: mem.name,
      description: mem.description,
      type: mem.type as 'user' | 'feedback' | 'project' | 'reference',
      content: mem.content,
      filePath: '',
    })
  }

  return memories.length
}
