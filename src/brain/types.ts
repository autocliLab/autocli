export type PARACategory = 'projects' | 'areas' | 'resources' | 'archives'

export interface BrainNote {
  id: string
  title: string
  content: string
  category: PARACategory
  tags: string[]
  links: string[]        // IDs of linked notes
  createdAt: number
  updatedAt: number
  source?: string        // Where this note came from
}

export interface BrainIndex {
  notes: Record<string, { title: string; category: PARACategory; tags: string[]; links: string[]; updatedAt: number }>
  backlinks: Record<string, string[]>  // noteId -> IDs that link TO this note
  tags: Record<string, string[]>        // tag -> noteIds
}

export interface RankedNote {
  note: BrainNote
  score: number
  matchReason: string
}

// Scoring weights
export const SCORING_WEIGHTS = {
  textMatch: 0.5,    // Jaccard similarity
  recency: 0.3,      // 1 / (1 + days_since_update)
  linkDensity: 0.2,  // inbound_links / max_inbound_links
}

export const MAX_RECALL_NOTES = 5
export const MIN_RECALL_SCORE = 0.1
