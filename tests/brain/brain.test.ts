import { describe, expect, test, beforeEach, afterAll } from 'bun:test'
import { BrainWriter } from '../../src/brain/writer.js'
import { BrainReader } from '../../src/brain/reader.js'
import { BrainDistiller } from '../../src/brain/distiller.js'
import { jaccardSimilarity, extractLinks, extractTags, recencyScore } from '../../src/brain/utils.js'
import { rmSync } from 'fs'

const TMP = '/tmp/autocli-test-brain'

beforeEach(() => rmSync(TMP, { recursive: true, force: true }))
afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('utils', () => {
  test('jaccardSimilarity', () => {
    expect(jaccardSimilarity('hello world', 'hello world')).toBe(1)
    expect(jaccardSimilarity('hello world', 'goodbye moon')).toBe(0)
    expect(jaccardSimilarity('the quick brown fox', 'the quick red fox')).toBeGreaterThan(0.5)
  })

  test('extractLinks', () => {
    expect(extractLinks('See [[my-note]] and [[other]]')).toEqual(['my-note', 'other'])
    expect(extractLinks('no links here')).toEqual([])
  })

  test('extractTags', () => {
    expect(extractTags('Hello #world #test')).toEqual(['world', 'test'])
  })

  test('recencyScore', () => {
    expect(recencyScore(Date.now())).toBeCloseTo(1, 1)
    expect(recencyScore(Date.now() - 7 * 24 * 60 * 60 * 1000)).toBeLessThan(0.2)
  })
})

describe('BrainWriter', () => {
  test('writes a note', () => {
    const writer = new BrainWriter(TMP)
    const note = writer.write('Test Note', 'Hello brain #test', 'projects')
    expect(note.id).toBe('test-note')
    expect(note.tags).toContain('test')
    expect(note.category).toBe('projects')
  })

  test('creates index with backlinks', () => {
    const writer = new BrainWriter(TMP)
    writer.write('Note A', 'See [[note-b]]', 'projects')
    writer.write('Note B', 'Content of B', 'areas')

    const index = writer.loadIndex()
    expect(index.backlinks['note-b']).toContain('note-a')
  })
})

describe('BrainReader', () => {
  test('recalls relevant notes', () => {
    const writer = new BrainWriter(TMP)
    writer.write('TypeScript Guide', 'How to use TypeScript with Bun', 'resources', { tags: ['typescript'] })
    writer.write('Python Guide', 'How to use Python with Flask', 'resources', { tags: ['python'] })

    const reader = new BrainReader(TMP)
    const results = reader.recall('typescript bun')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].note.title).toBe('TypeScript Guide')
  })

  test('gets stats', () => {
    const writer = new BrainWriter(TMP)
    writer.write('A', 'content', 'projects')
    writer.write('B', 'content', 'areas')

    const reader = new BrainReader(TMP)
    const stats = reader.getStats()
    expect(stats.total).toBe(2)
    expect(stats.byCategory.projects).toBe(1)
  })

  test('builds prompt section', () => {
    const writer = new BrainWriter(TMP)
    writer.write('Useful', 'Very relevant content about testing', 'resources')

    const reader = new BrainReader(TMP)
    const prompt = reader.buildPromptSection('testing')
    expect(prompt).toContain('Useful')
  })
})

describe('BrainDistiller', () => {
  test('removes duplicates', () => {
    const writer = new BrainWriter(TMP)
    writer.write('Note 1', 'The exact same content here', 'projects')
    writer.write('Note 2', 'The exact same content here', 'projects')

    const reader = new BrainReader(TMP)
    const distiller = new BrainDistiller(reader, writer)
    const result = distiller.deduplicate()
    expect(result.removed).toBe(1)
    expect(result.kept).toBe(1)
  })

  test('generates summary', () => {
    const writer = new BrainWriter(TMP)
    writer.write('Project X', 'Working on feature X', 'projects')
    writer.write('Style Guide', 'Code style reference', 'resources')

    const reader = new BrainReader(TMP)
    const distiller = new BrainDistiller(reader, writer)
    const summary = distiller.generateSummary()
    expect(summary).toContain('Project X')
    expect(summary).toContain('Style Guide')
  })
})
