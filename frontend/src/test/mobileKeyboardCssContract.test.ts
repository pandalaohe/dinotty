import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/styles/mobile-keyboard.css'), 'utf8')

function ruleBody(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`, 's'))
  if (!match) throw new Error(`Missing CSS rule: ${selector}`)
  return match[1]
}

function declaration(body: string, property: string): string | undefined {
  return body.match(new RegExp(`(?:^|\\n)\\s*${property}\\s*:\\s*([^;]+);`, 'm'))?.[1]
    .trim()
    .replace(/\s+/g, ' ')
}

function resolveImeOpenBottom(customProperties: Record<string, string> = {}): number {
  const value = declaration(ruleBody('#system-mobile-kb.ime-open'), 'bottom')
  const expected =
    'max(0px, calc(var(--system-toolbar-bottom, 0px) - min(var(--kb-capsule-reclaim, 0px), var(--sys-kb-height, 0px))))'
  if (value !== expected) throw new Error(`Unexpected IME-open bottom declaration: ${value}`)

  const length = (name: string, fallback: string): number =>
    Number.parseFloat(customProperties[name] ?? fallback)

  const toolbarBottom = length('--system-toolbar-bottom', '0px')
  const capsuleReclaim = length('--kb-capsule-reclaim', '0px')
  const keyboardHeight = length('--sys-kb-height', '0px')
  return Math.max(0, toolbarBottom - Math.min(capsuleReclaim, keyboardHeight))
}

describe('mobile keyboard host CSS contract', () => {
  it('keeps #mobile-kb anchored to the bottom edge by default', () => {
    expect(declaration(ruleBody('#mobile-kb'), 'bottom')).toBe('0')
  })

  it('keeps #system-mobile-kb fixed above the toolbar with safe-area padding', () => {
    const body = ruleBody('#system-mobile-kb')

    expect({
      position: declaration(body, 'position'),
      bottom: declaration(body, 'bottom'),
      padding: declaration(body, 'padding'),
    }).toEqual({
      position: 'fixed',
      bottom: 'var(--system-toolbar-bottom, 0px)',
      padding:
        '5px max(5px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(5px, env(safe-area-inset-left))',
    })
  })

  it('does not reclaim beyond a zero measured keyboard occlusion', () => {
    const bottom = resolveImeOpenBottom({
      '--system-toolbar-bottom': '0px',
      '--kb-capsule-reclaim': '13px',
      '--sys-kb-height': '0px',
    })

    expect(bottom).toBeGreaterThanOrEqual(0)
    expect(bottom).toBe(0)
  })

  it('resolves an IME-open bottom through fallbacks when all properties are unset', () => {
    expect(resolveImeOpenBottom()).toBe(0)
  })
})
