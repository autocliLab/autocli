import { theme } from './theme.js'
import type { Message } from '../commands/types.js'

export interface SearchResult {
  messageIndex: number
  role: string
  preview: string
  matchPosition: number
}

export function searchTranscript(messages: Message[], query: string): SearchResult[] {
  const results: SearchResult[] = []
  const lowerQuery = query.toLowerCase()

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    let text = ''
    if (typeof msg.content === 'string') {
      text = msg.content
    } else {
      text = msg.content
        .filter(b => b.type === 'text')
        .map(b => (b as { text: string }).text)
        .join('\n')
    }

    const lowerText = text.toLowerCase()
    const pos = lowerText.indexOf(lowerQuery)
    if (pos === -1) continue

    // Extract context around match
    const start = Math.max(0, pos - 40)
    const end = Math.min(text.length, pos + query.length + 40)
    let preview = text.slice(start, end).replace(/\n/g, ' ')
    if (start > 0) preview = '...' + preview
    if (end < text.length) preview = preview + '...'

    results.push({
      messageIndex: i,
      role: msg.role,
      preview,
      matchPosition: pos,
    })
  }

  return results
}

export function displaySearchResults(results: SearchResult[], query: string): string {
  if (results.length === 0) return theme.dim(`No matches for "${query}"`)

  const lines = [
    theme.bold(`${results.length} match${results.length === 1 ? '' : 'es'} for "${query}":`),
    '',
  ]

  for (const r of results.slice(0, 15)) {
    const roleIcon = r.role === 'user' ? theme.info('You') : theme.success('Claude')
    // Highlight the match in the preview
    const highlighted = r.preview.replace(
      new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      match => theme.highlight(match)
    )
    lines.push(`  #${r.messageIndex} ${roleIcon}: ${highlighted}`)
  }

  if (results.length > 15) {
    lines.push(theme.dim(`  ... and ${results.length - 15} more`))
  }

  return lines.join('\n')
}
