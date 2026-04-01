import type { BrainNote } from './types.js'
import { BrainReader } from './reader.js'
import { BrainWriter } from './writer.js'
import { isDuplicate } from './utils.js'

export class BrainDistiller {
  private reader: BrainReader
  private writer: BrainWriter

  constructor(reader: BrainReader, writer: BrainWriter) {
    this.reader = reader
    this.writer = writer
  }

  // Find and remove duplicate notes
  deduplicate(): { removed: number; kept: number } {
    const allNotes = this.reader.getAllNotes()
    const toRemove: BrainNote[] = []

    for (let i = 0; i < allNotes.length; i++) {
      if (toRemove.includes(allNotes[i])) continue
      for (let j = i + 1; j < allNotes.length; j++) {
        if (toRemove.includes(allNotes[j])) continue
        if (isDuplicate(allNotes[i].content, allNotes[j].content)) {
          // Keep the more recent one
          const older = allNotes[i].updatedAt < allNotes[j].updatedAt ? allNotes[i] : allNotes[j]
          toRemove.push(older)
        }
      }
    }

    for (const note of toRemove) {
      this.writer.delete(note.category, note.id)
    }

    return { removed: toRemove.length, kept: allNotes.length - toRemove.length }
  }

  // Archive old project notes
  archiveOldProjects(maxAgeDays = 30): number {
    const notes = this.reader.searchByCategory('projects')
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
    let archived = 0

    for (const note of notes) {
      if (note.updatedAt < cutoff) {
        this.writer.archive(note.id)
        archived++
      }
    }

    return archived
  }

  // Generate a distilled summary of all knowledge
  generateSummary(): string {
    const stats = this.reader.getStats()
    const allNotes = this.reader.getAllNotes()
      .sort((a, b) => b.updatedAt - a.updatedAt)

    const sections: string[] = [
      `# Brain Summary (${stats.total} notes, ${stats.totalTags} tags, ${stats.totalLinks} links)`,
      '',
    ]

    for (const cat of ['projects', 'areas', 'resources', 'archives'] as const) {
      const catNotes = allNotes.filter(n => n.category === cat)
      if (catNotes.length === 0) continue
      sections.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catNotes.length})`)
      for (const n of catNotes.slice(0, 10)) {
        const tags = n.tags.length > 0 ? ` [${n.tags.join(', ')}]` : ''
        sections.push(`- **${n.title}**${tags}: ${n.content.slice(0, 100)}...`)
      }
      sections.push('')
    }

    return sections.join('\n')
  }
}
