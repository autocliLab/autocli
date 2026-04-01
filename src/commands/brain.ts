import type { CommandDefinition } from './types.js'
import { theme } from '../ui/theme.js'
import { BrainReader } from '../brain/reader.js'
import { BrainWriter } from '../brain/writer.js'
import { BrainDistiller } from '../brain/distiller.js'
import { platform } from '../utils/platform.js'
import { join } from 'path'
import { renderMarkdown } from '../ui/markdown.js'

const BRAIN_DIR = join(platform.configDir, 'brain')

export const brainCommand: CommandDefinition = {
  name: 'brain',
  description: 'Manage Second Brain (show, search, stats, distill)',

  async run(args, _context) {
    const sub = args[0] || 'stats'
    const reader = new BrainReader(BRAIN_DIR)
    const writer = new BrainWriter(BRAIN_DIR)

    switch (sub) {
      case 'stats': {
        const stats = reader.getStats()
        return [
          theme.bold('Second Brain:'),
          `  Total notes:  ${stats.total}`,
          `  Projects:     ${stats.byCategory.projects || 0}`,
          `  Areas:        ${stats.byCategory.areas || 0}`,
          `  Resources:    ${stats.byCategory.resources || 0}`,
          `  Archives:     ${stats.byCategory.archives || 0}`,
          `  Tags:         ${stats.totalTags}`,
          `  Links:        ${stats.totalLinks}`,
          '',
          theme.dim(`Location: ${BRAIN_DIR}`),
        ].join('\n')
      }

      case 'search': {
        const query = args.slice(1).join(' ')
        if (!query) return 'Usage: /brain search <query>'
        const results = reader.recall(query, 10)
        if (results.length === 0) return 'No matching notes found.'
        return results.map(r =>
          `${theme.bold(r.note.title)} [${r.note.category}] (score: ${r.score.toFixed(2)})\n  ${theme.dim(r.note.content.slice(0, 150))}${r.note.content.length > 150 ? '...' : ''}`
        ).join('\n\n')
      }

      case 'show': {
        const distiller = new BrainDistiller(reader, writer)
        return renderMarkdown(distiller.generateSummary())
      }

      case 'distill': {
        const distiller = new BrainDistiller(reader, writer)
        const dedup = distiller.deduplicate()
        const archived = distiller.archiveOldProjects()
        return [
          theme.success('Brain distilled:'),
          `  Duplicates removed: ${dedup.removed}`,
          `  Notes kept: ${dedup.kept}`,
          `  Projects archived: ${archived}`,
        ].join('\n')
      }

      default:
        return 'Usage: /brain [stats|search <query>|show|distill]'
    }
  },
}
