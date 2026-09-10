import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ACTIVE_KEY = 'dinotty_device_active_server_v1'
const PROBE_PATH = '/api/remote-servers/probe'

/** Fresh module graph — `activeServer` memoises the id and the hook lists. */
async function load() {
  vi.resetModules()
  return import('../composables/activeServer')
}

/**
 * Stub the hub transport.
 *
 * `activeServer` imports `apiBase` lazily (a static import would close the
 * cycle), so the mock has to be registered before `switchServer()` *runs*
 * rather than before the module is loaded — hence `doMock`, which is not
 * hoisted.
 */
function mockHub(opts: { ok?: boolean; status?: number; body?: unknown; throws?: boolean } = {}) {
  const authFetch = vi.fn(async () => {
    if (opts.throws) throw new Error('network down')
    return {
      ok: opts.ok ?? true,
      status: opts.status ?? 200,
      json: async () => opts.body ?? { reachable: true },
    } as unknown as Response
  })
  vi.doMock('../composables/apiBase', () => ({ authFetch, getHubBase: async () => '' }))
  return authFetch
}

describe('switchServer', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('../composables/apiBase')
  })

  describe('step 1 — the probe gates everything', () => {
    it('leaves the old server untouched when the probe reports unreachable', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      mockHub({ body: { reachable: false, error: 'connection refused' } })
      active.registerServerTargetResolver(() => ({ url: 'http://192.168.1.9:8999' }))
      const teardown = vi.fn()
      const reconnect = vi.fn()
      active.registerSwitchTeardown(teardown)
      active.registerSwitchReconnect(reconnect)

      await active.switchServer('srv-new')

      expect(active.activeServerId()).toBe('srv-old')
      expect(localStorage.getItem(ACTIVE_KEY)).toBe('srv-old')
      expect(teardown).not.toHaveBeenCalled()
      expect(reconnect).not.toHaveBeenCalled()
    })

    it('aborts on a non-2xx probe response', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      mockHub({ ok: false, status: 502 })
      active.registerServerTargetResolver(() => ({ url: 'http://192.168.1.9:8999' }))
      const teardown = vi.fn()
      active.registerSwitchTeardown(teardown)

      await active.switchServer('srv-new')

      expect(active.activeServerId()).toBe('srv-old')
      expect(teardown).not.toHaveBeenCalled()
    })

    it('aborts when the probe request throws', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      mockHub({ throws: true })
      active.registerServerTargetResolver(() => ({ url: 'http://192.168.1.9:8999' }))
      const teardown = vi.fn()
      active.registerSwitchTeardown(teardown)

      await active.switchServer('srv-new')

      expect(active.activeServerId()).toBe('srv-old')
      expect(teardown).not.toHaveBeenCalled()
    })

    it('aborts on an id the roster does not know, without probing', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      const authFetch = mockHub({})
      active.registerServerTargetResolver(() => null)
      const teardown = vi.fn()
      active.registerSwitchTeardown(teardown)

      await active.switchServer('srv-ghost')

      expect(active.activeServerId()).toBe('srv-old')
      expect(authFetch).not.toHaveBeenCalled()
      expect(teardown).not.toHaveBeenCalled()
    })

    it('probes the hub endpoint, never a relayed path', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      const authFetch = mockHub({})
      active.registerServerTargetResolver(() => ({ url: 'http://192.168.1.9:8999', token: 't0k' }))

      await active.switchServer('srv-new')

      // `srv-old` is still active while the probe runs, so a relayed URL would
      // carry `/__srv/srv-old` — the roster lives on the hub, not upstream.
      const [url, init] = authFetch.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe(PROBE_PATH)
      expect(init.method).toBe('POST')
      expect(JSON.parse(String(init.body))).toEqual({
        url: 'http://192.168.1.9:8999',
        token: 't0k',
      })
    })

    it('omits the token key entirely when none is known', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      const authFetch = mockHub({})
      active.registerServerTargetResolver(() => ({ url: 'http://192.168.1.9:8999' }))

      await active.switchServer('srv-new')

      const [, init] = authFetch.mock.calls[0] as unknown as [string, RequestInit]
      expect(JSON.parse(String(init.body))).toEqual({ url: 'http://192.168.1.9:8999' })
    })

    it('skips the probe when switching back to the local server', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      const authFetch = mockHub({ body: { reachable: false } })

      await active.switchServer(active.LOCAL_SERVER_ID)

      // The local server *is* the hub: it must stay reachable as the way back
      // even when the roster is unreadable, so it is never probed.
      expect(authFetch).not.toHaveBeenCalled()
      expect(active.activeServerId()).toBe(active.LOCAL_SERVER_ID)
    })
  })

  describe('steps 2-9 — ordering', () => {
    it('runs teardowns under the old id and reconnects under the new one', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      mockHub({})
      active.registerServerTargetResolver(() => ({ url: 'http://192.168.1.9:8999' }))
      const seen: string[] = []
      active.registerSwitchTeardown(() => {
        seen.push(`teardown:${active.activeServerId()}`)
      })
      active.registerSwitchTeardown(async () => {
        seen.push(`teardown2:${active.activeServerId()}`)
      })
      active.registerSwitchReconnect(() => {
        seen.push(`reconnect:${active.activeServerId()}`)
      })

      await active.switchServer('srv-new')

      // Step 2 (persistNow) in particular only lands in the *old* server's
      // namespace if the id has not moved yet.
      expect(seen).toEqual(['teardown:srv-old', 'teardown2:srv-old', 'reconnect:srv-new'])
      expect(active.activeServerId()).toBe('srv-new')
      expect(localStorage.getItem(ACTIVE_KEY)).toBe('srv-new')
    })

    it('does not abort the switch when a teardown hook fails', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      mockHub({})
      active.registerServerTargetResolver(() => ({ url: 'http://192.168.1.9:8999' }))
      const after = vi.fn()
      active.registerSwitchTeardown(() => {
        throw new Error('boom')
      })
      active.registerSwitchTeardown(after)

      await active.switchServer('srv-new')

      expect(after).toHaveBeenCalled()
      expect(active.activeServerId()).toBe('srv-new')
    })

    it('is a no-op when the target is already active', async () => {
      localStorage.setItem(ACTIVE_KEY, 'srv-old')
      const active = await load()
      const authFetch = mockHub({})
      const teardown = vi.fn()
      active.registerSwitchTeardown(teardown)

      await active.switchServer('srv-old')

      expect(authFetch).not.toHaveBeenCalled()
      expect(teardown).not.toHaveBeenCalled()
    })
  })
})
