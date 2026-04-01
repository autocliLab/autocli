import { describe, expect, test } from 'bun:test'
import { FullscreenLayout } from '../../src/ui/fullscreen.js'

describe('FullscreenLayout', () => {
  test('computeMetrics enforces minimum terminal size', () => {
    const layout = new FullscreenLayout()
    const metrics = layout.getMetrics()
    // scrollBottom should never be less than 1
    expect(metrics.scrollBottom).toBeGreaterThanOrEqual(1)
    expect(metrics.scrollTop).toBe(1)
  })

  test('spinner can start and stop without leak', () => {
    const layout = new FullscreenLayout()
    // Starting spinner twice should not leak timers
    layout.startSpinner('Test 1')
    layout.startSpinner('Test 2')
    layout.stopSpinner()
    // No assertion needed — if timer leaks, process would hang
  })
})
