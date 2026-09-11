import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// These checks assert CSS rule text only; they do not verify rendered geometry.
const css = readFileSync(resolve(process.cwd(), 'src/styles/mission-control.css'), 'utf8')
const mobileStart = css.indexOf('@media (max-width: 600px)')
const mobileEnd = css.indexOf('/* ── "Add tab" card', mobileStart)
const mobileCss = css.slice(mobileStart, mobileEnd)

describe('mission control mobile layout', () => {
  it('turns the workspace list into a horizontally scrollable chip row', () => {
    expect(mobileCss).toMatch(/\.mc-ws-list-scroll\s*{[^}]*flex-direction:\s*row;/s)
    expect(mobileCss).toMatch(/\.mc-ws-list-scroll\s*{[^}]*overflow-x:\s*auto;/s)
    expect(mobileCss).toMatch(/\.mc-ws-list-scroll\s*{[^}]*touch-action:\s*pan-x;/s)
  })

  it('renders workspaces as non-shrinking pill chips', () => {
    expect(mobileCss).toMatch(/\.mc-ws-list-item\s*{[^}]*flex-shrink:\s*0;/s)
    expect(mobileCss).toMatch(/\.mc-ws-list-item\s*{[^}]*border-radius:\s*999px;/s)
  })

  it('hides the drag handle in the chip row', () => {
    expect(mobileCss).toMatch(/\.mc-ws-drag-handle\s*{[^}]*display:\s*none;/s)
  })

  it('caps chip label width so long names cannot fill the row', () => {
    expect(mobileCss).toMatch(/\.mc-ws-name\s*{[^}]*max-width:/s)
  })

  it('reserves the close-button area outside the chip scroll region', () => {
    expect(mobileCss).toMatch(/\.mc-ws-list\s*{[^}]*padding-right:\s*56px;/s)
    expect(mobileCss).not.toMatch(/padding-right:\s*60px/)
    expect(mobileCss).not.toMatch(/max-height:\s*40%/)
  })

  it('keeps add-workspace as a pill chip with a 40px target', () => {
    expect(mobileCss).toMatch(/\.mc-ws-add-btn\s*{[^}]*height:\s*40px;/s)
    expect(mobileCss).toMatch(/\.mc-ws-add-btn\s*{[^}]*border-radius:\s*999px;/s)
    expect(mobileCss).toMatch(/\.mc-ws-add-label\s*{[^}]*display:\s*none;/s)
  })

  it('provides a 44px close-button touch target inside the mobile override', () => {
    expect(mobileCss).toMatch(/\.mc-close-btn\s*{[^}]*width:\s*44px;[^}]*height:\s*44px;/s)
  })

  it('gives the server bar its own row above the chip row', () => {
    expect(mobileCss).toMatch(/\.mc-srv-bar\s*{[^}]*position:\s*static;/s)
    expect(mobileCss).toMatch(/\.mc-srv-bar\s*{[^}]*height:\s*36px;/s)
    // Same reservation the chip row makes: right: 8px + 44px + 4px.
    expect(mobileCss).toMatch(/\.mc-srv-bar\s*{[^}]*padding-right:\s*56px;/s)
  })

  it('un-indents the bar row and keeps the chip row reachable on mobile', () => {
    // Both halves must be scoped by the adjacent sibling selector. `.mc-ws-list`
    // is also used inside the file-preview float window, which renders no
    // server bar - an unscoped override here would hit the float window too,
    // and the bare `.mc-ws-list` rule must keep `padding-right: 56px` (asserted
    // above) because the float window relies on it.
    expect(mobileCss).toMatch(/\.mc-srv-bar\s*\+\s*\.mc-ws-list\s*{[^}]*padding-top:\s*0;/s)
    expect(mobileCss).toMatch(
      /\.mc-srv-bar\s*\+\s*\.mc-ws-list\s+\.mc-ws-list-scroll\s*{[^}]*padding-top:\s*4px;/s
    )
    expect(mobileCss).not.toMatch(/^\s*\.mc-ws-list\s*{[^}]*padding-top:/sm)
  })

  it('turns the server popover into a bottom sheet with touch-sized rows', () => {
    expect(mobileCss).toMatch(/\.mc-srv-pop\s*{[^}]*bottom:\s*0;/s)
    expect(mobileCss).toMatch(/\.mc-srv-pop\s*{[^}]*border-radius:\s*14px 14px 0 0;/s)
    // A row is two lines (name + origin) on mobile too, so it outgrows the 44px
    // it used to be - and still has to clear a finger.
    expect(mobileCss).toMatch(/\.mc-srv-item\s*{[^}]*min-height:\s*52px;/s)
    expect(mobileCss).toMatch(/\.mc-srv-action\s*{[^}]*height:\s*44px;/s)
  })

  it('lets the sheet span the screen instead of the desktop popover width', () => {
    // The desktop popover is a fixed 300px hanging off a 200px column; the
    // sheet overrides it or it would be a 300px sliver at the screen edge.
    expect(mobileCss).toMatch(/\.mc-srv-pop\s*{[^}]*width:\s*auto;/s)
  })

  it('gives the inline retry button a finger-sized target', () => {
    expect(mobileCss).toMatch(/\.mc-srv-retry\s*{[^}]*min-height:\s*32px;/s)
  })
})
