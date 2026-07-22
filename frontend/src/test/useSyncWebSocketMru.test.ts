import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { PaneLayout, TerminalTab } from '../types/pane'
import type { SyncTabList } from '../types/protocol'

const mocks = vi.hoisted(() => ({
  apiActivateWorkspace: vi.fn(async () => {}),
  apiCreatePluginTab: vi.fn(async () => ({
    tab_id: 'plugin-tab',
    pane_id: 'plugin-pane',
    layout: null,
  })),
}))

let socket: MockWebSocket
class MockWebSocket {
  static OPEN = 1
  readyState = MockWebSocket.OPEN
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: ((event: { code: number; reason: string }) => void) | null = null
  onerror: (() => void) | null = null
  send = vi.fn()
  close = vi.fn()
  constructor(public url: string) {
    socket = this
  }
}
vi.stubGlobal('WebSocket', MockWebSocket)

vi.mock('../composables/apiBase', () => ({
  getApiBase: async () => 'http://localhost',
  wsUrlWithToken: (url: string) => url,
  hasAuthToken: () => false,
}))
vi.mock('../composables/useTransport', () => ({ isTauri: () => false }))
vi.mock('../composables/usePluginLoader', () => ({ handlePluginChanged: vi.fn() }))
vi.mock('../composables/useTabApi', () => ({ apiCreatePluginTab: mocks.apiCreatePluginTab }))
vi.mock('../composables/useWorkspaceApi', () => ({
  apiListWorkspaces: vi.fn(async () => []),
  apiCreateWorkspace: vi.fn(),
  apiUpdateWorkspace: vi.fn(),
  apiDeleteWorkspace: vi.fn(),
  apiActivateWorkspace: mocks.apiActivateWorkspace,
  apiDeactivateWorkspace: vi.fn(async () => {}),
  apiReorderWorkspaces: vi.fn(),
}))

import { useSyncWebSocket } from '../composables/useSyncWebSocket'
import { useWorkspaces } from '../composables/useWorkspaces'
import { useSessionStore } from '../stores/sessionStore'

const localStorageMock = (() => {
  const store = new Map<string, string>()
  return {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => store.set(key, value),
  }
})()
vi.stubGlobal('localStorage', localStorageMock)

function leaf(paneId: string): PaneLayout {
  return { type: 'leaf', paneId, title: paneId, ratio: 1, zoomed: false }
}

function layout(...ids: string[]): PaneLayout {
  return {
    type: 'split',
    id: 'root',
    direction: 'horizontal',
    children: ids.map(leaf),
    ratios: ids.map(() => 1 / ids.length),
  }
}

function makeTab(): TerminalTab {
  return {
    type: 'terminal',
    paneId: 'tab-1',
    layout: layout('a', 'b', 'c'),
    activePaneId: 'b',
    paneMru: ['b', 'a', 'c'],
    broadcastMode: false,
    broadcastActivity: 0,
    previewVisible: false,
    previewAddress: '',
    previewUrl: '',
    previewKind: 'web',
  }
}

async function setup(pluginOpts?: {
  loadedPlugins?: Map<string, any>
  initialPluginLoad?: () => Promise<void>
}) {
  setActivePinia(createPinia())
  const session = useSessionStore()
  const tab = makeTab()
  session.tabs = [tab]
  session.activePaneId = tab.paneId
  const focusActive = vi.fn()
  const newTab = vi.fn().mockResolvedValue(undefined)
  const subject = useSyncWebSocket({
    termRefs: {},
    persist: vi.fn(),
    focusActive,
    newTab,
    loadedPlugins: pluginOpts?.loadedPlugins ?? new Map(),
    initialPluginLoad: pluginOpts?.initialPluginLoad ?? (() => Promise.resolve()),
  })
  await subject.connectSyncWS()
  const emitLayout = (nextLayout: PaneLayout, serverActivePaneId: string) => {
    socket.onmessage?.({
      data: JSON.stringify({
        type: 'layout_updated',
        pane_id: tab.paneId,
        layout: nextLayout,
        active_pane_id: serverActivePaneId,
      }),
    })
  }
  const emitTabList = (tabs: SyncTabList['tabs'] = []) => {
    socket.onmessage?.({
      data: JSON.stringify({ type: 'tab_list', tabs, active_pane_id: null }),
    })
  }
  return { tab, session, subject, emitLayout, emitTabList, focusActive, newTab }
}

describe('useSyncWebSocket pane MRU', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const workspaceState = useWorkspaces()
    workspaceState.workspaces.value = []
    workspaceState.activeWorkspaceId.value = null
    localStorageMock.clear()
  })

  it('does not restore a known-invalid cached plugin on a later tab_list from the same connection', async () => {
    localStorage.setItem(
      'dinotty_tabs',
      JSON.stringify({
        tabs: [{ type: 'plugin', paneId: 'plugin:legacy', title: 'Legacy', pluginId: 'legacy' }],
        activeIdx: 0,
      }),
    )
    const { tab, session, emitTabList } = await setup()
    const serverTabs = [
      { tab_id: tab.paneId, pane_id: 'a', active_pane_id: tab.activePaneId, layout: tab.layout },
    ]

    emitTabList(serverTabs)
    await vi.waitFor(() => {
      expect(session.tabs.some((candidate) => candidate.paneId === 'plugin:legacy')).toBe(false)
    })

    emitTabList(serverTabs)

    expect(session.tabs.some((candidate) => candidate.paneId === 'plugin:legacy')).toBe(false)
    expect(mocks.apiCreatePluginTab).not.toHaveBeenCalled()
  })

  it('does not restore a known-invalid cached plugin after reconnect', async () => {
    localStorage.setItem(
      'dinotty_tabs',
      JSON.stringify({
        tabs: [{ type: 'plugin', paneId: 'plugin:legacy', title: 'Legacy', pluginId: 'legacy' }],
        activeIdx: 0,
      }),
    )
    const { tab, session, subject, emitTabList } = await setup()
    const serverTabs = [
      { tab_id: tab.paneId, pane_id: 'a', active_pane_id: tab.activePaneId, layout: tab.layout },
    ]

    emitTabList(serverTabs)
    await vi.waitFor(() => {
      expect(session.tabs.some((candidate) => candidate.paneId === 'plugin:legacy')).toBe(false)
    })

    await subject.connectSyncWS()
    emitTabList(serverTabs)

    expect(session.tabs.some((candidate) => candidate.paneId === 'plugin:legacy')).toBe(false)
  })

  it('keeps an existing in-memory plugin tab when the server omits it', async () => {
    const { session, emitTabList, newTab } = await setup()
    session.tabs = [
      { type: 'plugin', paneId: 'plugin:memory', title: 'Memory', pluginId: 'memory' },
    ]

    emitTabList()

    expect(session.tabs).toEqual([
      { type: 'plugin', paneId: 'plugin:memory', title: 'Memory', pluginId: 'memory' },
    ])
    expect(newTab).not.toHaveBeenCalled()
  })

  it('does not use a legacy plugin record as saved terminal state', async () => {
    localStorage.setItem(
      'dinotty_tabs',
      JSON.stringify({
        tabs: [
          {
            type: 'plugin',
            paneId: 'server-pane',
            title: 'Legacy plugin',
            pluginId: 'legacy',
            previewVisible: true,
          },
        ],
        activeIdx: 0,
      }),
    )
    const { session, emitTabList } = await setup()

    emitTabList([{ tab_id: 'server-tab', pane_id: 'server-pane' }])

    const restored = session.tabs.find((tab) => tab.paneId === 'server-tab')
    expect(restored?.type).toBe('terminal')
    expect(restored?.type === 'terminal' && restored.previewVisible).toBe(false)
  })

  it('uses and focuses the MRU fallback when a focused pane exits', async () => {
    const { tab, emitLayout, focusActive } = await setup()
    emitLayout(layout('a', 'c'), 'c')
    await Promise.resolve()
    expect(tab.paneMru).toEqual(['a', 'c'])
    expect(tab.activePaneId).toBe('a')
    expect(focusActive).toHaveBeenCalledOnce()
  })

  it('preserves focus when a non-focused pane exits', async () => {
    const { tab, emitLayout } = await setup()
    emitLayout(layout('a', 'b'), 'b')
    expect(tab.paneMru).toEqual(['b', 'a'])
    expect(tab.activePaneId).toBe('b')
  })

  it('applies a pane focus change received from another client', async () => {
    const { tab, emitLayout, focusActive } = await setup()
    emitLayout(layout('a', 'b', 'c'), 'c')
    await Promise.resolve()
    expect(tab.paneMru).toEqual(['c', 'b', 'a'])
    expect(tab.activePaneId).toBe('c')
    expect(focusActive).toHaveBeenCalledOnce()
  })

  it('keeps the synchronized focus when another client closes a non-focused pane', async () => {
    const { tab, emitLayout } = await setup()
    emitLayout(layout('a', 'b', 'c'), 'c')
    emitLayout(layout('a', 'c'), 'c')
    expect(tab.paneMru).toEqual(['c', 'a'])
    expect(tab.activePaneId).toBe('c')
  })

  it('keeps MRU unique after a duplicate layout message', async () => {
    const { tab, emitLayout } = await setup()
    tab.paneMru = ['b', 'b', 'a', 'c']
    emitLayout(layout('a', 'b', 'c'), 'b')
    expect(tab.paneMru).toEqual(['b', 'a', 'c'])
  })

  it('moves to the successor workspace when sync closes its last active tab', async () => {
    setActivePinia(createPinia())
    const session = useSessionStore()
    const workspaceState = useWorkspaces()
    workspaceState.workspaces.value = [
      { id: 'workspace-a', name: 'Workspace A', path: '/workspace/a', order: 0 },
      { id: 'workspace-b', name: 'Workspace B', path: '/workspace/b', order: 1 },
    ]
    workspaceState.activeWorkspaceId.value = 'workspace-a'
    const workspaceTab = (paneId: string, cwd: string): TerminalTab => ({
      type: 'terminal',
      paneId,
      layout: leaf(`${paneId}-leaf`),
      activePaneId: `${paneId}-leaf`,
      paneMru: [`${paneId}-leaf`],
      broadcastMode: false,
      broadcastActivity: 0,
      previewVisible: false,
      previewAddress: '',
      previewUrl: '',
      previewKind: 'web',
      cwd,
    })
    session.tabs = [
      workspaceTab('workspace-a-only-tab', '/workspace/a'),
      workspaceTab('workspace-b-successor', '/workspace/b'),
    ]
    session.activePaneId = 'workspace-a-only-tab'
    const subject = useSyncWebSocket({
      termRefs: {},
      persist: vi.fn(),
      focusActive: vi.fn(),
      newTab: vi.fn(),
      loadedPlugins: new Map(),
      initialPluginLoad: () => Promise.resolve(),
    })
    await subject.connectSyncWS()

    socket.onmessage?.({
      data: JSON.stringify({ type: 'tab_closed', pane_id: 'workspace-a-only-tab' }),
    })
    await vi.waitFor(() => {
      expect(workspaceState.activeWorkspaceId.value).toBe('workspace-b')
    })

    expect(mocks.apiActivateWorkspace).toHaveBeenCalledWith('workspace-b')
    expect(session.activePaneId).toBe('workspace-b-successor')
  })
})
