import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { fileReadTool } from '../../src/tools/fileRead.js'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

const TMP = '/tmp/autocli-test-read-binary'

beforeAll(() => {
  mkdirSync(TMP, { recursive: true })
  // Create a fake PNG (just needs the extension for detection)
  writeFileSync(join(TMP, 'test.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  // Create a fake PDF
  writeFileSync(join(TMP, 'test.pdf'), '%PDF-1.4 fake pdf content')
  // Create a binary file
  writeFileSync(join(TMP, 'test.zip'), Buffer.from([0x50, 0x4b, 0x03, 0x04]))
})

afterAll(() => rmSync(TMP, { recursive: true, force: true }))

describe('fileReadTool binary handling', () => {
  test('detects image files', async () => {
    const result = await fileReadTool.call(
      { file_path: join(TMP, 'test.png') },
      { workingDir: TMP }
    )
    expect(result.output).toContain('Image file')
    expect(result.output).toContain('base64')
  })

  test('detects PDF files', async () => {
    const result = await fileReadTool.call(
      { file_path: join(TMP, 'test.pdf') },
      { workingDir: TMP }
    )
    expect(result.output).toContain('PDF')
    expect(result.output).toContain('pdftotext')
  })

  test('detects binary files', async () => {
    const result = await fileReadTool.call(
      { file_path: join(TMP, 'test.zip') },
      { workingDir: TMP }
    )
    expect(result.output).toContain('Binary file')
  })
})
