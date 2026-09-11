import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const mocks = vi.hoisted(() => ({
  switchServer: vi.fn(),
  authFetch: vi.fn(),
  activeId: '__local__',
}))

// The switcher must never reach into the real transport: `switchServer` runs
// the full teardown sequence (B4), and `authFetch` would need a live hub.
vi.mock('../composables/activeServer', () => ({
  LOCAL_SERVER_ID: '__local__',
  activeServerId: () => mocks.activeId,
  setActiveServerId: vi.fn(),
  isLocalActive: () => mocks.activeId === '__local__',
  relayPrefix: () => (mocks.activeId === '__local__' ? '' : `/__srv/${mocks.activeId}`),
  switchServer: mocks.switchServer,
}))

vi.mock('../composables/apiBase', () => ({
  authFetch: mocks.authFetch,
  hubApiUrl: (p: string) => p,
}))

import ServerSwitcher from '../components/overview/ServerSwitcher.vue'
import { closeServerManager, managerOpen } from '../composables/useRemoteServerAdmin'

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body }
}

/** Pre-B2: every roster handler answers 501 and the UI must still work. */
function notImplemented() {
  mocks.authFetch.mockResolvedValue(jsonResponse('not implemented yet', 501))
}

function roster(servers: unknown[]) {
  mocks.authFetch.mockResolvedValue(jsonResponse(servers))
}

function mountSwitcher() {
  return mount(ServerSwitcher)
}

/** Open the popover and let the roster request settle. */
async function openPop(wrapper: ReturnType<typeof mountSwitcher>) {
  await wrapper.vm.openPop()
  await flushPromises()
}

const BAR = '.mc-srv-bar'
const POP = '.mc-srv-pop'
const ITEM = '.mc-srv-item'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeId = '__local__'
  notImplemented()
  closeServerManager()
  // `clearAllMocks` leaves implementations in place, so a per-test
  // `mockResolvedValue` would otherwise leak into the next one. Re-arm the
  // happy path every time; the tests that care override it.
  mocks.switchServer.mockResolvedValue({ ok: true, id: 'a' })
})

describe('ServerSwitcher', () => {
  it('shows the local device in the bar and reads the roster from the hub', async () => {
    const wrapper = mountSwitcher()
    expect(wrapper.find(BAR).text()).toContain('This device')

    await openPop(wrapper)

    // The roster always goes to the hub, never through the relay prefix.
    expect(mocks.authFetch).toHaveBeenCalledWith('/api/remote-servers')
  })

  it('degrades to the local entry when the roster endpoint is not implemented', async () => {
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    const items = wrapper.findAll(ITEM)
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('This device')
    expect(wrapper.find(POP).text()).toContain('Server list unavailable on this host.')
  })

  it('lists remote servers alongside the local entry', async () => {
    roster([
      { id: 'a', name: 'Lab board', url: 'http://192.168.1.5:58901', has_token: true },
      { id: 'b', name: 'Attic', url: 'http://192.168.1.9:58901', has_token: false },
    ])
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    const names = wrapper.findAll(ITEM).map((n) => n.text())
    expect(names).toHaveLength(3)
    expect(names[0]).toContain('This device')
    expect(names[1]).toContain('Lab board')
    expect(names[2]).toContain('Attic')
    // Reachable-but-tokenless must not read as "set up correctly".
    expect(wrapper.findAll('.mc-srv-dot.warn')).toHaveLength(1)
  })

  // Two boards on the same LAN are easy to name alike; the origin is what
  // tells them apart, and a coloured dot cannot say "no token" on its own.
  it('shows each origin under its name and spells out the tokenless state', async () => {
    roster([
      { id: 'a', name: 'Lab board', url: 'http://192.168.1.5:58901', has_token: true },
      { id: 'b', name: 'Attic', url: 'http://192.168.1.9:58901', has_token: false },
    ])
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    const rows = wrapper.findAll(ITEM)
    expect(rows[0].find('.mc-srv-sub').exists()).toBe(true)
    expect(rows[1].find('.mc-srv-sub').text()).toBe('http://192.168.1.5:58901')
    expect(rows[2].find('.mc-srv-sub').text()).toBe('http://192.168.1.9:58901')

    // A server with a token says nothing extra; the tokenless one has to.
    expect(rows[1].find('.mc-srv-status').exists()).toBe(false)
    expect(rows[2].find('.mc-srv-status').text()).toBe('No token')
    expect(rows[2].find('.mc-srv-status.warn').exists()).toBe(true)
  })

  it('marks the active server in words, not only with a dot', async () => {
    roster([{ id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true }])
    mocks.activeId = 'a'
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    expect(wrapper.findAll(ITEM)[1].find('.mc-srv-status').text()).toBe('Current')
  })

  it('keeps a reachable server selectable without a token', async () => {
    roster([{ id: 'b', name: 'Attic', url: 'http://h:1', has_token: false }])
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    await wrapper.findAll(ITEM)[1].trigger('click')
    expect(mocks.switchServer).toHaveBeenCalledWith('b')
  })

  it('drives the list with Up/Down and switches on Enter', async () => {
    roster([
      { id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true },
      { id: 'b', name: 'Attic', url: 'http://h:2', has_token: true },
    ])
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    // The cursor opens on the active server (local), so one Down lands on 'a'.
    const pop = wrapper.find(POP)
    await pop.trigger('keydown', { key: 'ArrowDown' })
    await pop.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(mocks.switchServer).toHaveBeenCalledWith('a')
    // MC closes: the grid and the tabs belong to the server we just left.
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('wraps the keyboard cursor around the list', async () => {
    roster([{ id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true }])
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    const pop = wrapper.find(POP)
    // Up from the first row wraps to the last (index 1).
    await pop.trigger('keydown', { key: 'ArrowUp' })
    await pop.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(mocks.switchServer).toHaveBeenCalledWith('a')
  })

  it('closes on Escape without switching and swallows the event', async () => {
    const wrapper = mountSwitcher()
    await openPop(wrapper)
    expect(wrapper.find(POP).exists()).toBe(true)

    await wrapper.find(BAR).trigger('keydown', { key: 'Escape' })

    expect(wrapper.find(POP).exists()).toBe(false)
    expect(mocks.switchServer).not.toHaveBeenCalled()
    // Esc must not reach WorkspaceOverview's container handler, where it would
    // become a Cancel op and close MC server-side.
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('stays on the old server when the switch aborts', async () => {
    roster([{ id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true }])
    // switchServer probes first and reports the failure without touching state.
    mocks.switchServer.mockResolvedValue({
      ok: false,
      id: 'a',
      failure: { kind: 'unreachable', detail: 'connection refused by http://h:1' },
    })
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    await wrapper.findAll(ITEM)[1].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.find(POP).exists()).toBe(true)
  })

  // An aborted switch used to be visible only in the console. The reason is the
  // whole point of the message, so it has to survive on screen.
  it('renders the failure under its own row and offers a retry', async () => {
    roster([{ id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true }])
    mocks.switchServer.mockResolvedValue({
      ok: false,
      id: 'a',
      failure: { kind: 'unreachable', detail: 'connection refused by http://h:1' },
    })
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    await wrapper.findAll(ITEM)[1].trigger('click')
    await flushPromises()

    const error = wrapper.find('.mc-srv-item-error')
    expect(error.exists()).toBe(true)
    expect(error.text()).toContain('Connection refused by http://h:1')

    // The retry runs the same switch again rather than merely clearing the note.
    await error.find('.mc-srv-retry').trigger('click')
    await flushPromises()
    expect(mocks.switchServer).toHaveBeenCalledTimes(2)
  })

  it('drops the failure notice once the switch succeeds', async () => {
    roster([{ id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true }])
    mocks.switchServer.mockResolvedValueOnce({
      ok: false,
      id: 'a',
      failure: { kind: 'unreachable', detail: 'connection refused by http://h:1' },
    })
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    await wrapper.findAll(ITEM)[1].trigger('click')
    await flushPromises()
    expect(wrapper.find('.mc-srv-item-error').exists()).toBe(true)

    await wrapper.find('.mc-srv-retry').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // A switch is two 4s-budgeted probe requests, so it can look inert for eight
  // seconds - long enough for the user to click again.
  it('spins on the row being switched to, and only that row', async () => {
    roster([
      { id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true },
      { id: 'b', name: 'Attic', url: 'http://h:2', has_token: true },
    ])
    let release: (result: unknown) => void = () => {}
    mocks.switchServer.mockImplementation(
      () => new Promise((resolve) => (release = resolve))
    )
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    void wrapper.findAll(ITEM)[1].trigger('click')
    await nextTick()

    const rows = wrapper.findAll(ITEM)
    expect(rows[1].find('.mc-srv-spin').exists()).toBe(true)
    expect(rows[1].attributes('aria-busy')).toBe('true')
    expect(rows[2].find('.mc-srv-spin').exists()).toBe(false)
    // The current-server tick yields to the spinner rather than doubling up.
    expect(rows[0].find('.mc-srv-spin').exists()).toBe(false)

    release({ ok: true, id: 'a' })
    await flushPromises()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // The old route closed MC and opened the settings panel, which has no server
  // section at all - a dead end that cost the user their Mission Control.
  it('opens the manager over MC instead of leaving it', async () => {
    const wrapper = mountSwitcher()
    await openPop(wrapper)

    await wrapper.find('.mc-srv-actions .mc-srv-action').trigger('click')

    expect(wrapper.find(POP).exists()).toBe(false)
    expect(managerOpen.value).toBe(true)
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.emitted('manage')).toBeUndefined()
  })
})
