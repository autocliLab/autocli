// Jaccard similarity between two sets of tokens
export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a)
  const tokensB = tokenize(b)

  if (tokensA.size === 0 && tokensB.size === 0) return 0

  let intersection = 0
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++
  }

  const union = tokensA.size + tokensB.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2)
  )
}

// Recency score: 1 / (1 + days_since_update)
export function recencyScore(updatedAt: number): number {
  const daysSince = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24)
  return 1 / (1 + daysSince)
}

// Text deduplication score
export function isDuplicate(a: string, b: string, threshold = 0.8): boolean {
  return jaccardSimilarity(a, b) >= threshold
}

// Extract [[wiki-links]] from content
export function extractLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || []
  return matches.map(m => m.slice(2, -2).trim())
}

// Extract #tags from content
export function extractTags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_-]+)/g) || []
  return matches.map(m => m.slice(1))
}
