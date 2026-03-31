import { describe, expect, test } from 'bun:test'
import { RemoteAuth } from '../../src/remote/auth.js'

describe('RemoteAuth', () => {
  test('generates and verifies JWT', () => {
    const auth = new RemoteAuth('test-secret')
    const token = auth.generateToken()
    expect(auth.verifyToken(token)).toBe(true)
  })

  test('rejects invalid token', () => {
    const auth = new RemoteAuth('test-secret')
    expect(auth.verifyToken('invalid.token.here')).toBe(false)
  })

  test('validates API key', () => {
    const auth = new RemoteAuth('test-secret', 'my-api-key')
    expect(auth.validateApiKey('my-api-key')).toBe(true)
    expect(auth.validateApiKey('wrong-key')).toBe(false)
  })

  test('authenticates request with bearer token', () => {
    const auth = new RemoteAuth('test-secret')
    const token = auth.generateToken()
    expect(auth.authenticateHeader(`Bearer ${token}`)).toBe(true)
  })

  test('authenticates request with API key', () => {
    const auth = new RemoteAuth('test-secret', 'my-key')
    expect(auth.authenticateHeader('ApiKey my-key')).toBe(true)
  })
})
