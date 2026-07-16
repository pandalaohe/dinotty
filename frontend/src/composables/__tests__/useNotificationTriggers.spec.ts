import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeWebSocket {
  static OPEN = 1
  static instances: FakeWebSocket[] = []

  readyState = FakeWebSocket.OPEN
  sent: string[] = []
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    FakeWebSocket.instances.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
  }
}

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, String(value)),
  }
}

vi.stubGlobal('WebSocket', FakeWebSocket)
vi.stubGlobal('localStorage', memoryStorage())
vi.stubGlobal('sessionStorage', memoryStorage())
vi.stubGlobal('location', { protocol: 'http:', host: 'localhost', reload: vi.fn() })

vi.mock('vue-toastification', () => ({
  TYPE: { INFO: 'info', SUCCESS: 'success', WARNING: 'warning', ERROR: 'error' },
}))
vi.mock('../useI18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('../useTransport', () => ({ isTauri: () => false }))
vi.mock('../apiBase', () => ({
  getApiBase: async () => '',
  wsUrlWithToken: (url: string) => url,
}))

import { settings } from '../useSettings'
import {
  __dispatchServerMessageForTest,
  __pendingRequestCountForTest,
  __resetForTest,
  evaluateActiveRead,
  markPaneReadIfUnread,
  setActiveReadContext,
  useNotification,
} from '../useNotification'

function pane(paneId: string, latestEventSeq: string, readThroughSeq = '0') {
  return {
    paneId,
    latestEventSeq,
    readThroughSeq,
    firstUnreadAt: 100,
    severity: latestEventSeq === readThroughSeq ? null : 'warning',
  }
}

function snapshot(revision: string, panes = [] as ReturnType<typeof pane>[]) {
  return { type: 'snapshot', epoch: 'epoch-a', revision, panes, notifs: [] }
}

function delta(revision: string, panes = [] as ReturnType<typeof pane>[]) {
  return { type: 'state_delta', epoch: 'epoch-a', revision, panes, notifs: [] }
}

function raised(overrides: Record<string, unknown> = {}) {
  return {
    type: 'notify',
    v: 1,
    pane_id: 'pane-a',
    title: null,
    body: 'done',
    notification_type: 'info',
    eventSeq: '1',
    occurredAt: 100,
    severity: 'info',
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  __resetForTest()
  FakeWebSocket.instances = []
  localStorage.clear()
  ;(settings as any).notification = {
    enabled: true,
    osc_notify: true,
    bell: { enabled: true },
    channels: { sound: false, vibration: false, panel: false },
    sounds: {},
  }
})

afterEach(() => {
  __resetForTest()
  vi.useRealTimers()
})

describe('active-read state triggers', () => {
  it.each([
    ['snapshot', () => snapshot('1', [pane('pane-a', '7')])],
    [
      'delta',
      () => {
        __dispatchServerMessageForTest(snapshot('1'))
        return delta('2', [pane('pane-a', '7')])
      },
    ],
  ])('marks an active foreground pane read from a %s without a raised envelope', (_, message) => {
    const notif = useNotification()
    setActiveReadContext({
      getActiveFocusedPaneId: () => 'pane-a',
      isAppForeground: () => true,
    })

    __dispatchServerMessageForTest(message())

    expect(notif.unreadByPane['pane-a']).toBeUndefined()
    expect(notif.unreadAttentionCount.value).toBe(0)
    expect(__pendingRequestCountForTest()).toBe(1)
    const sent = FakeWebSocket.instances[0].sent
    expect(JSON.parse(sent[sent.length - 1])).toMatchObject({
      reason: 'active_observed',
      panes: [{ paneId: 'pane-a', throughEventSeq: '7' }],
    })
  })

  it.each([
    ['backgrounded', 'pane-a', false, true],
    ['different focused pane', 'pane-b', true, true],
    ['unregistered context', 'pane-a', true, false],
  ])('does not active-read when %s', (_, focusedPaneId, foreground, registered) => {
    const notif = useNotification()
    if (registered) {
      setActiveReadContext({
        getActiveFocusedPaneId: () => focusedPaneId,
        isAppForeground: () => foreground,
      })
    }

    __dispatchServerMessageForTest(snapshot('1', [pane('pane-a', '4')]))

    expect(notif.unreadByPane['pane-a']).toBe('warning')
    expect(__pendingRequestCountForTest()).toBe(0)
  })

  it('does not emit a duplicate while the optimistic overlay masks the pane', () => {
    useNotification()
    setActiveReadContext({
      getActiveFocusedPaneId: () => 'pane-a',
      isAppForeground: () => true,
    })
    __dispatchServerMessageForTest(snapshot('1', [pane('pane-a', '5')]))
    __dispatchServerMessageForTest(delta('2', [pane('pane-a', '5')]))

    expect(__pendingRequestCountForTest()).toBe(1)
    expect(FakeWebSocket.instances[0].sent).toHaveLength(1)
  })

  it('does not active-read an interim delta discarded while awaiting a snapshot', () => {
    useNotification()
    setActiveReadContext({
      getActiveFocusedPaneId: () => 'pane-a',
      isAppForeground: () => true,
    })
    __dispatchServerMessageForTest(snapshot('1'))
    __dispatchServerMessageForTest({ type: 'resync_required' })

    __dispatchServerMessageForTest(delta('2', [pane('pane-a', '5')]))

    expect(__pendingRequestCountForTest()).toBe(0)
    expect(FakeWebSocket.instances[0].sent).toHaveLength(0)
  })

  it('active-reads a genuinely newer event above an existing overlay watermark', () => {
    useNotification()
    setActiveReadContext({
      getActiveFocusedPaneId: () => 'pane-a',
      isAppForeground: () => true,
    })
    __dispatchServerMessageForTest(snapshot('1', [pane('pane-a', '5')]))

    __dispatchServerMessageForTest(delta('2', [pane('pane-a', '6')]))

    expect(__pendingRequestCountForTest()).toBe(2)
    const sent = FakeWebSocket.instances[0].sent.map((payload) => JSON.parse(payload))
    expect(sent).toHaveLength(2)
    expect(sent[0]).toMatchObject({
      reason: 'active_observed',
      panes: [{ paneId: 'pane-a', throughEventSeq: '5' }],
    })
    expect(sent[1]).toMatchObject({
      reason: 'active_observed',
      panes: [{ paneId: 'pane-a', throughEventSeq: '6' }],
    })
  })

  it('does not re-emit active_observed when a proving read delta retires its overlay', () => {
    useNotification()
    setActiveReadContext({
      getActiveFocusedPaneId: () => 'pane-a',
      isAppForeground: () => true,
    })
    __dispatchServerMessageForTest(snapshot('1', [pane('pane-a', '5')]))

    __dispatchServerMessageForTest(delta('2', [pane('pane-a', '5', '5')]))

    expect(__pendingRequestCountForTest()).toBe(0)
    expect(FakeWebSocket.instances[0].sent).toHaveLength(1)
  })

  it('can re-evaluate authoritative unread state independently on foreground gain', () => {
    useNotification()
    let foreground = false
    setActiveReadContext({
      getActiveFocusedPaneId: () => 'pane-a',
      isAppForeground: () => foreground,
    })
    __dispatchServerMessageForTest(snapshot('1', [pane('pane-a', '8')]))
    expect(__pendingRequestCountForTest()).toBe(0)

    foreground = true
    evaluateActiveRead()

    expect(__pendingRequestCountForTest()).toBe(1)
    expect(JSON.parse(FakeWebSocket.instances[0].sent[0])).toMatchObject({
      reason: 'active_observed',
      panes: [{ paneId: 'pane-a', throughEventSeq: '8' }],
    })
  })

  it('makes explicit trigger calls a no-op unless the masked projection is visibly unread', () => {
    useNotification()
    __dispatchServerMessageForTest(snapshot('1', [pane('pane-a', '3', '3')]))
    markPaneReadIfUnread('pane-a', 'focus')
    expect(__pendingRequestCountForTest()).toBe(0)

    __dispatchServerMessageForTest(delta('2', [pane('pane-a', '4', '3')]))
    markPaneReadIfUnread('pane-a', 'terminal_input')
    markPaneReadIfUnread('pane-a', 'terminal_input')
    expect(__pendingRequestCountForTest()).toBe(1)
    expect(JSON.parse(FakeWebSocket.instances[0].sent[0])).toMatchObject({
      reason: 'terminal_input',
      panes: [{ paneId: 'pane-a', throughEventSeq: '4' }],
    })
  })
})

describe('raised envelope compatibility', () => {
  it('accepts pane-less plugin notify regardless of osc_notify and never creates an empty pane key', () => {
    const notif = useNotification()
    ;(settings as any).notification.osc_notify = false
    __dispatchServerMessageForTest(snapshot('1'))

    __dispatchServerMessageForTest(
      raised({ pane_id: '', notifId: 'notif-1', eventSeq: '9', body: 'plugin message' })
    )

    expect(notif.historyCount.value).toBe(1)
    expect(notif.notifications.value[0]).toMatchObject({
      paneId: undefined,
      notifId: 'notif-1',
      source: 'plugin',
      body: 'plugin message',
    })
    expect(Object.prototype.hasOwnProperty.call(notif.unreadByPane, '')).toBe(false)
  })

  it('keeps osc_notify gating for legacy notify envelopes without notifId', () => {
    const notif = useNotification()
    ;(settings as any).notification.osc_notify = false
    __dispatchServerMessageForTest(snapshot('1'))
    __dispatchServerMessageForTest(raised())
    expect(notif.historyCount.value).toBe(0)
  })
})
