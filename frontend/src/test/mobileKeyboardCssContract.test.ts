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
})
