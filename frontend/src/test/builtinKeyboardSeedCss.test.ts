import { describe, expect, it } from 'vitest'

// @ts-expect-error build-seed is an executable ESM script without a TypeScript declaration file.
import { assertScopedSelectors } from '../keyboard/builtin-keyboard/build-seed.mjs'

describe('builtin keyboard seed CSS scoping', () => {
  it('accepts scoped rules without treating at-rules or keyframe steps as selectors', () => {
    const css = `
      @font-face { font-family: Keyboard; src: url(keyboard.woff2); }
      @keyframes pulse { from { opacity: 0; } 100% { opacity: 1; } }
      @media (max-width: 600px) {
        .keyboard[data-v-a1b2c3] { display: grid; }
      }
      @supports (display: grid) {
        .key[data-v-a1b2c3]:is(.wide, .active) { display: grid; }
      }
      @layer builtin {
        .label[data-v-a1b2c3] { font-weight: 600; }
      }
    `

    expect(() => assertScopedSelectors(css)).not.toThrow()
  })

  it('rejects a global selector nested in an at-rule and names it', () => {
    const css = `
      .keyboard[data-v-a1b2c3] { display: grid; }
      @media (max-width: 600px) {
        #system-mobile-kb { position: relative; }
      }
    `

    expect(() => assertScopedSelectors(css)).toThrowError(/#system-mobile-kb/)
  })

  it.each([
    String.raw`.key\,wide[data-v-a1] { color: red; }`,
    String.raw`.key\{wide[data-v-a1] { color: red; }`,
    '@scope (.root[data-v-a1]) { .x[data-v-a1] { color: red } }',
    '@font-face { font-family: x; src: url(y); }',
    '@keyframes spin { from { opacity: 0 } }',
    '@-webkit-keyframes spin { from { opacity: 0 } }',
  ])('accepts valid scoped or declaration-only CSS: %s', (css) => {
    expect(() => assertScopedSelectors(css)).not.toThrow()
  })

  it.each([
    ['starting-style contents', '@starting-style { html { opacity: 0; } }', 'html'],
    ['scope prelude', '@scope (body) { .x[data-v-a1] { color: red } }', 'body'],
    ['unknown block at-rule contents', '@future-css { main { color: red } }', 'main'],
  ])('rejects a global selector in %s', (_description, css, selector) => {
    expect(() => assertScopedSelectors(css)).toThrowError(
      `Builtin keyboard seed contains global selectors: ${selector}`,
    )
  })
})
