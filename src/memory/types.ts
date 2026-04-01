export type MemoryType = 'user' | 'feedback' | 'project' | 'reference'

export interface MemoryEntry {
  name: string
  description: string
  type: MemoryType
  content: string
  filePath: string
}
