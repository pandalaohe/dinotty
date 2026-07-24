import { describe, expect, it } from 'vitest'
import { computeOverlapPx, type KeyboardOverlapGate } from '../composables/useKeyboardOverlap'

const activeGate: KeyboardOverlapGate = {
  touchDevice: true,
  imeOccluding: true,
  kbVisible: true,
  textInputFocused: true,
  isSingleTerminalTab: true,
  hasVerticalPreview: false,
}

describe('computeOverlapPx', () => {
  it('returns the configured overlap when every gate branch passes', () => {
    expect(computeOverlapPx(80, activeGate)).toBe(80)
  })

  it('keeps the default setting disabled', () => {
    expect(computeOverlapPx(0, activeGate)).toBe(0)
  })

  it.each([
    ['touchDevice', false],
    ['imeOccluding', false],
    ['kbVisible', false],
    ['textInputFocused', false],
    ['isSingleTerminalTab', false],
    ['hasVerticalPreview', true],
  ] as const)('returns zero when %s is %s', (field, value) => {
    expect(computeOverlapPx(80, { ...activeGate, [field]: value })).toBe(0)
  })
})
