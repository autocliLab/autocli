import { z } from 'zod'
import type { ToolDefinition } from './types.js'
import { BrainWriter } from '../brain/writer.js'
import { BrainReader } from '../brain/reader.js'
import { platform } from '../utils/platform.js'
import { join } from 'path'

const BRAIN_DIR = join(platform.configDir, 'brain')

export const brainNoteTool: ToolDefinition = {
  name: 'BrainNote',
  description: 'Save a note to the Second Brain knowledge graph. Use this to persist important knowledge, decisions, or references that should be available in future sessions.',
  inputSchema: z.object({
    title: z.string().describe('Note title'),
    content: z.string().describe('Note content. Use [[link-title]] to link to other notes. Use #tag for tags.'),
    category: z.enum(['projects', 'areas', 'resources', 'archives']).describe('PARA category: projects (active work), areas (ongoing responsibilities), resources (reference material), archives (completed/inactive)'),
  }),
  isReadOnly: false,

  async call(input, _context) {
    const { title, content, category } = input as { title: string; content: string; category: 'projects' | 'areas' | 'resources' | 'archives' }
    const writer = new BrainWriter(BRAIN_DIR)
    const note = writer.write(title, content, category)
    return { output: `Brain note saved: "${note.title}" [${note.category}] (${note.tags.length} tags, ${note.links.length} links)` }
  },
}

export const brainRecallTool: ToolDefinition = {
  name: 'BrainRecall',
  description: 'Search the Second Brain for relevant knowledge. Returns ranked notes based on relevance.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
  }),
  isReadOnly: true,

  async call(input, _context) {
    const { query } = input as { query: string }
    const reader = new BrainReader(BRAIN_DIR)
    const results = reader.recall(query, 5)

    if (results.length === 0) return { output: 'No relevant notes found in brain.' }

    const lines = results.map(r => {
      const meta = `[${r.note.category}] score:${r.score.toFixed(2)} (${r.matchReason})`
      return `## ${r.note.title} ${meta}\n${r.note.content}`
    })

    return { output: lines.join('\n\n---\n\n') }
  },
}
