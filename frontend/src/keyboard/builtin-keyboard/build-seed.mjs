import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

// Assemble the seed artifact from the vite lib-build output:
//   scoped.css (this build's SFC hashes) -> styles.css
//   plugin.json (source manifest) -> seed/builtin-keyboard/plugin.json
const declarationAtRules = new Set([
  'font-face',
  'page',
  'property',
  'counter-style',
  'keyframes',
  'font-feature-values',
  'viewport',
])

function stripComments(css) {
  let output = ''
  let quote = null

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index]
    const next = css[index + 1]

    if (quote) {
      output += char
      if (char === '\\') {
        output += next ?? ''
        index += 1
      } else if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '\\') {
      output += char
      output += next ?? ''
      index += 1
      continue
    }

    if (char === '"' || char === "'") {
      quote = char
      output += char
    } else if (char === '/' && next === '*') {
      const end = css.indexOf('*/', index + 2)
      index = end === -1 ? css.length : end + 1
    } else {
      output += char
    }
  }

  return output
}

function findBoundary(css, start, end) {
  let quote = null
  let parentheses = 0
  let brackets = 0

  for (let index = start; index < end; index += 1) {
    const char = css[index]

    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = null
      continue
    }

    if (char === '\\') index += 1
    else if (char === '"' || char === "'") quote = char
    else if (char === '(') parentheses += 1
    else if (char === ')') parentheses -= 1
    else if (char === '[') brackets += 1
    else if (char === ']') brackets -= 1
    else if (parentheses === 0 && brackets === 0 && (char === '{' || char === ';')) return index
  }

  return end
}

function findBlockEnd(css, openBrace, end) {
  let depth = 1
  let quote = null

  for (let index = openBrace + 1; index < end; index += 1) {
    const char = css[index]

    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = null
      continue
    }

    if (char === '\\') index += 1
    else if (char === '"' || char === "'") quote = char
    else if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }

  return end
}

function splitSelectors(prelude) {
  const selectors = []
  let start = 0
  let quote = null
  let parentheses = 0
  let brackets = 0

  for (let index = 0; index < prelude.length; index += 1) {
    const char = prelude[index]

    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = null
      continue
    }

    if (char === '\\') index += 1
    else if (char === '"' || char === "'") quote = char
    else if (char === '(') parentheses += 1
    else if (char === ')') parentheses -= 1
    else if (char === '[') brackets += 1
    else if (char === ']') brackets -= 1
    else if (char === ',' && parentheses === 0 && brackets === 0) {
      selectors.push(prelude.slice(start, index).trim())
      start = index + 1
    }
  }

  selectors.push(prelude.slice(start).trim())
  return selectors.filter(Boolean)
}

function addGlobalSelectors(prelude, offenders) {
  for (const selector of splitSelectors(prelude)) {
    if (!/\[data-v-[\w-]+\]/i.test(selector)) offenders.add(selector)
  }
}

function checkScopePrelude(prelude, offenders) {
  let quote = null
  let depth = 0
  let groupStart = 0

  for (let index = 0; index < prelude.length; index += 1) {
    const char = prelude[index]

    if (quote) {
      if (char === '\\') index += 1
      else if (char === quote) quote = null
      continue
    }

    if (char === '\\') index += 1
    else if (char === '"' || char === "'") quote = char
    else if (char === '(') {
      if (depth === 0) groupStart = index + 1
      depth += 1
    } else if (char === ')') {
      depth -= 1
      if (depth === 0) addGlobalSelectors(prelude.slice(groupStart, index), offenders)
    }
  }
}

function collectGlobalSelectors(css, start, end, offenders) {
  let cursor = start

  while (cursor < end) {
    while (cursor < end && /[\s;]/.test(css[cursor])) cursor += 1
    if (cursor >= end || css[cursor] === '}') return

    const boundary = findBoundary(css, cursor, end)
    if (boundary >= end) return

    const prelude = css.slice(cursor, boundary).trim()
    if (css[boundary] === ';') {
      cursor = boundary + 1
      continue
    }

    const blockEnd = findBlockEnd(css, boundary, end)
    if (prelude.startsWith('@')) {
      const atRule = prelude.slice(1).match(/^[\w-]+/)?.[0]?.toLowerCase()
      const normalizedAtRule = atRule?.replace(/^-[\w]+-/, '')
      if (atRule === 'scope') checkScopePrelude(prelude, offenders)
      if (!normalizedAtRule || !declarationAtRules.has(normalizedAtRule)) {
        collectGlobalSelectors(css, boundary + 1, blockEnd, offenders)
      }
    } else {
      addGlobalSelectors(prelude, offenders)
    }

    cursor = blockEnd + 1
  }
}

// Authoring-time guard for this generated seed only. It checks @scope preludes
// and rules nested in block at-rules, while ignoring declaration bodies and
// keyframe steps.
// It is not a runtime contract and cannot detect the host dropping a rule;
// the host stylesheet contract tests cover that direction.
export function assertScopedSelectors(css) {
  const source = stripComments(css)
  const offenders = new Set()
  collectGlobalSelectors(source, 0, source.length, offenders)

  if (offenders.size > 0) {
    throw new Error(`Builtin keyboard seed contains global selectors: ${[...offenders].join(', ')}`)
  }
}

function buildSeed() {
  const here = fileURLToPath(new URL('.', import.meta.url))
  const outDir = fileURLToPath(new URL('../../../../seed/builtin-keyboard', import.meta.url))

  mkdirSync(outDir, { recursive: true })

  // Vite's emptyOutDir is unreliable when outDir is outside project root; clean
  // stale artifacts (old PWA files, previous scoped.css) while preserving this
  // build's output.
  for (const entry of readdirSync(outDir)) {
    if (entry === 'main.js' || entry === 'scoped.css') continue
    rmSync(`${outDir}/${entry}`, { recursive: true, force: true })
  }

  const scopedCss = readFileSync(`${outDir}/scoped.css`, 'utf8')
  const stylesPath = `${outDir}/styles.css`
  writeFileSync(stylesPath, scopedCss)
  assertScopedSelectors(readFileSync(stylesPath, 'utf8'))

  // scoped.css is an intermediate build product; the shipped styles file is styles.css.
  rmSync(`${outDir}/scoped.css`, { force: true })

  copyFileSync(`${here}/plugin.json`, `${outDir}/plugin.json`)

  console.log(`seed/builtin-keyboard: ${outDir}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildSeed()
}
