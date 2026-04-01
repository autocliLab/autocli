import { describe, expect, test } from 'bun:test'
import { webFetchTool } from '../../src/tools/webFetch.js'

const ctx = { workingDir: '/tmp' }

describe('webFetchTool', () => {
  test('rejects invalid URLs', async () => {
    const result = await webFetchTool.call({ url: 'not-a-url' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('Invalid URL')
  })

  test('blocks localhost', async () => {
    const result = await webFetchTool.call({ url: 'http://localhost:8080/secret' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('blocks 127.0.0.1', async () => {
    const result = await webFetchTool.call({ url: 'http://127.0.0.1/admin' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('blocks private IPs (10.x)', async () => {
    const result = await webFetchTool.call({ url: 'http://10.0.0.1/internal' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('blocks private IPs (192.168.x)', async () => {
    const result = await webFetchTool.call({ url: 'http://192.168.1.1/' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('blocks private IPs (172.16-31.x)', async () => {
    const result = await webFetchTool.call({ url: 'http://172.16.0.1/' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('blocks file:// protocol', async () => {
    const result = await webFetchTool.call({ url: 'file:///etc/passwd' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('blocks .local domains', async () => {
    const result = await webFetchTool.call({ url: 'http://myapp.local/api' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('blocks 0.0.0.0', async () => {
    const result = await webFetchTool.call({ url: 'http://0.0.0.0/' }, ctx)
    expect(result.isError).toBe(true)
    expect(result.output).toContain('not allowed')
  })

  test('isReadOnly is true', () => {
    expect(webFetchTool.isReadOnly).toBe(true)
  })

  test('tool has correct name', () => {
    expect(webFetchTool.name).toBe('WebFetch')
  })
})
