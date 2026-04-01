import { z } from 'zod'
import type { ToolDefinition } from './types.js'

export const webSearchTool: ToolDefinition = {
  name: 'WebSearch',
  description: 'Search the web using DuckDuckGo. Returns titles and URLs of matching results. Use WebFetch to read the content of a specific result.',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    count: z.number().optional().describe('Number of results to return (default 5, max 20)'),
  }),
  isReadOnly: true,

  async call(input, _context) {
    const { query, count: rawCount } = input as {
      query: string
      count?: number
    }

    const count = Math.min(Math.max(rawCount || 5, 1), 20)

    if (!query.trim()) {
      return { output: 'Error: Search query cannot be empty.', isError: true }
    }

    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'autocli/1.0' },
        signal: AbortSignal.timeout(30_000),
      })

      if (!res.ok) {
        return { output: `Web search failed: HTTP ${res.status}`, isError: true }
      }

      const html = await res.text()

      // Parse DuckDuckGo HTML results
      const results: Array<{ title: string; url: string; snippet: string }> = []
      const linkRegex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
      const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
      let match

      while ((match = linkRegex.exec(html)) && results.length < count) {
        const href = decodeURIComponent(match[1]).replace(/.*uddg=/, '').replace(/&.*/, '')
        const title = match[2].replace(/<[^>]+>/g, '').trim()
        results.push({ title, url: href, snippet: '' })
      }

      // Try to extract snippets
      let i = 0
      while ((match = snippetRegex.exec(html)) && i < results.length) {
        results[i].snippet = match[1].replace(/<[^>]+>/g, '').trim()
        i++
      }

      if (results.length === 0) {
        return { output: `No results found for "${query}".` }
      }

      const output = results.map((r, idx) => {
        const parts = [`${idx + 1}. ${r.title}`, `   ${r.url}`]
        if (r.snippet) parts.push(`   ${r.snippet}`)
        return parts.join('\n')
      }).join('\n\n')

      return { output: `Search results for "${query}":\n\n${output}` }
    } catch (err) {
      const message = (err as Error).message
      if (message.includes('timeout') || message.includes('abort')) {
        return { output: `Error: Search timed out after 30s for: ${query}`, isError: true }
      }
      return { output: `Web search failed: ${message}`, isError: true }
    }
  },
}
