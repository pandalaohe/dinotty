import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

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

const BAR = '.mc-srv-bar'
const POP = '.mc-srv-pop'
const ITEM = '.mc-srv-item'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.activeId = '__local__'
  notImplemented()
})

describe('ServerSwitcher', () => {
  it('shows the local device in the bar and reads the roster from the hub', async () => {
    const wrapper = mountSwitcher()
    expect(wrapper.find(BAR).text()).toContain('This device')

    await wrapper.vm.openPop()
    await flushPromises()

    // The roster always goes to the hub, never through the relay prefix.
    expect(mocks.authFetch).toHaveBeenCalledWith('/api/remote-servers')
  })

  it('degrades to the local entry when the roster endpoint is not implemented', async () => {
    const wrapper = mountSwitcher()
    await wrapper.vm.openPop()
    await flushPromises()

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
    await wrapper.vm.openPop()
    await flushPromises()

    const names = wrapper.findAll(ITEM).map((n) => n.text())
    expect(names).toHaveLength(3)
    expect(names[0]).toContain('This device')
    expect(names[1]).toContain('Lab board')
    expect(names[2]).toContain('Attic')
    // Reachable-but-tokenless must not read as "set up correctly".
    expect(wrapper.findAll('.mc-srv-dot.warn')).toHaveLength(1)
  })

  it('keeps a reachable server selectable without a token', async () => {
    roster([{ id: 'b', name: 'Attic', url: 'http://h:1', has_token: false }])
    const wrapper = mountSwitcher()
    await wrapper.vm.openPop()
    await flushPromises()

    await wrapper.findAll(ITEM)[1].trigger('click')
    expect(mocks.switchServer).toHaveBeenCalledWith('b')
  })

  it('drives the list with Up/Down and switches on Enter', async () => {
    roster([
      { id: 'a', name: 'Lab board', url: 'http://h:1', has_token: true },
      { id: 'b', name: 'Attic', url: 'http://h:2', has_token: true },
    ])
    mocks.switchServer.mockResolvedValue(undefined)
    const wrapper = mountSwitcher()
    await wrapper.vm.openPop()
    await flushPromises()

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
    mocks.switchServer.mockResolvedValue(undefined)
    const wrapper = mountSwitcher()
    await wrapper.vm.openPop()
    await flushPromises()

    const pop = wrapper.find(POP)
    // Up from the first row wraps to the last (index 1).
    await pop.trigger('keydown', { key: 'ArrowUp' })
    await pop.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(mocks.switchServer).toHaveBeenCalledWith('a')
  })

  it('closes on Escape without switching and swallows the event', async () => {
    const wrapper = mountSwitcher()
    await wrapper.vm.openPop()
    await flushPromises()
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
    // switchServer probes first and throws without touching state on failure.
    mocks.switchServer.mockRejectedValue(new Error('unreachable'))
    const wrapper = mountSwitcher()
    await wrapper.vm.openPop()
    await flushPromises()

    await wrapper.findAll(ITEM)[1].trigger('click')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(wrapper.find(POP).exists()).toBe(true)
  })

  it('routes Manage… to the host after closing the popover', async () => {
    const wrapper = mountSwitcher()
    await wrapper.vm.openPop()
    await flushPromises()

    await wrapper.find('.mc-srv-action').trigger('click')

    expect(wrapper.find(POP).exists()).toBe(false)
    expect(wrapper.emitted('manage')).toHaveLength(1)
  })
})
