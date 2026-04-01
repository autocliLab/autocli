import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { logger, setLogLevel } from '../../src/utils/logger.js'

describe('logger', () => {
  let captured: string[] = []
  const origError = console.error

  beforeEach(() => {
    captured = []
    console.error = (...args: unknown[]) => { captured.push(args.join(' ')) }
  })
  afterEach(() => {
    console.error = origError
    setLogLevel('warn')
  })

  test('logs error at warn level', () => {
    setLogLevel('warn')
    logger.error('test error', { key: 'val' })
    expect(captured.length).toBe(1)
    expect(captured[0]).toContain('ERROR')
    expect(captured[0]).toContain('test error')
    expect(captured[0]).toContain('"key":"val"')
  })

  test('suppresses debug at warn level', () => {
    setLogLevel('warn')
    logger.debug('should not appear')
    expect(captured.length).toBe(0)
  })

  test('shows debug at debug level', () => {
    setLogLevel('debug')
    logger.debug('debug msg')
    expect(captured.length).toBe(1)
    expect(captured[0]).toContain('DEBUG')
  })

  test('includes ISO timestamp', () => {
    setLogLevel('info')
    logger.info('timestamped')
    expect(captured[0]).toMatch(/\[\d{4}-\d{2}-\d{2}T/)
  })
})
