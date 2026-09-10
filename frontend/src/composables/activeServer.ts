// Which Dinotty server the frontend is currently talking to.
//
// This module is deliberately dependency-free: `apiBase.ts` imports it and
// would otherwise create a cycle (apiBase must never be imported from here).
// Everything in it is synchronous on purpose — `apiUrl()` needs the relay
// prefix on 120 synchronous call sites, so the prefix can only depend on the
// server *id*, never on anything that needs awaiting.

/** The embedded server of the host we are already running on. */
export const LOCAL_SERVER_ID = '__local__'

/** Device-level: which server this device views, not a shared preference. */
const ACTIVE_SERVER_KEY = 'dinotty_device_active_server_v1'

let cachedId: string | null = null

const teardowns: Array<() => void | Promise<void>> = []

function readStoredId(): string {
  try {
    return localStorage.getItem(ACTIVE_SERVER_KEY) || LOCAL_SERVER_ID
  } catch {
    return LOCAL_SERVER_ID
  }
}

export function activeServerId(): string {
  if (cachedId === null) cachedId = readStoredId()
  return cachedId
}

export function setActiveServerId(id: string): void {
  const next = id || LOCAL_SERVER_ID
  cachedId = next
  try {
    localStorage.setItem(ACTIVE_SERVER_KEY, next)
  } catch {
    /* storage unavailable — keep the in-memory value */
  }
}

export function isLocalActive(): boolean {
  return activeServerId() === LOCAL_SERVER_ID
}

/**
 * Path prefix that routes a request through the hub's relay to the active
 * upstream server. Empty for the local server, which *is* the hub.
 */
export function relayPrefix(): string {
  return isLocalActive() ? '' : `/__srv/${activeServerId()}`
}

/**
 * Register a hook to run when switching away from the current server.
 *
 * Hooks stay registered across switches — they describe "how to tear this
 * subsystem down", not a one-shot action — so callers register once at setup.
 */
export function registerSwitchTeardown(fn: () => void | Promise<void>): void {
  teardowns.push(fn)
}

/**
 * Run every registered teardown, in registration order.
 *
 * A failing hook is logged and skipped rather than aborting the sequence:
 * a half-torn-down switch is worse than a partially failed one.
 */
export async function runSwitchTeardown(): Promise<void> {
  for (const fn of teardowns) {
    try {
      await fn()
    } catch (e) {
      console.warn('[activeServer] switch teardown failed:', e)
    }
  }
}

/**
 * A switch target as the hub's probe endpoint needs it.
 *
 * `url` is the target's origin; `token` is the candidate credential, present
 * only when one is known client-side. The hub owns the roster and runs the
 * probe, so the token it already stores for a saved entry is the hub's to
 * supply — see `registerServerTargetResolver`.
 */
export interface ServerSwitchTarget {
  url: string
  token?: string
}

let targetResolver: ((id: string) => ServerSwitchTarget | null) | null = null

/**
 * Register the roster lookup the pre-switch probe needs.
 *
 * Kept as a hook rather than an import so this module stays free of the
 * settings singleton (`useSettings` → `apiBase` → here is a cycle). Resolving
 * `null` means "not a server we know about", which aborts the switch.
 */
export function registerServerTargetResolver(fn: (id: string) => ServerSwitchTarget | null): void {
  targetResolver = fn
}

const reconnects: Array<() => void | Promise<void>> = []

/**
 * Register a hook to run *after* the active id has moved — the mirror image of
 * `registerSwitchTeardown`. This is where a subsystem comes back up against the
 * new server (reload settings, reconnect the sync WS, re-open Mission Control).
 * Hooks stay registered across switches, like the teardown ones.
 */
export function registerSwitchReconnect(fn: () => void | Promise<void>): void {
  reconnects.push(fn)
}

/** Run every registered reconnect hook, in registration order; a failing hook
 *  is logged and skipped, matching `runSwitchTeardown`. */
export async function runSwitchReconnect(): Promise<void> {
  for (const fn of reconnects) {
    try {
      await fn()
    } catch (e) {
      console.warn('[activeServer] post-switch hook failed:', e)
    }
  }
}

const PROBE_PATH = '/api/remote-servers/probe'

/**
 * Step 1 of a switch: can we reach the target at all?
 *
 * The probe is a *hub* operation — the hub owns the roster and the credentials,
 * and it is the only one that can reach the upstream without CORS or origin
 * games — so this deliberately does **not** go through `relayPrefix()`.
 *
 * `getHubBase()` rather than `getApiBase()`: same origin today, but the named
 * accessor is the contract for "the hub, not the active server", and it is what
 * keeps this correct if the two ever diverge.
 *
 * Every failure mode (unknown id, network error, non-2xx, `reachable: false`)
 * collapses to `false` so the caller aborts with the old server untouched.
 */
async function probeTarget(target: ServerSwitchTarget): Promise<boolean> {
  try {
    // Dynamic import: a static one would close the `apiBase` ⇄ `activeServer`
    // cycle at module-init time. Same reason `useMonitor` imports the plugin
    // monitor store lazily.
    const { authFetch, getHubBase } = await import('./apiBase')
    const base = await getHubBase()
    const res = await authFetch(`${base}${PROBE_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        target.token ? { url: target.url, token: target.token } : { url: target.url }
      ),
    })
    if (!res.ok) {
      console.warn(`[activeServer] probe of ${target.url} failed: HTTP ${res.status}`)
      return false
    }
    const data = (await res.json().catch(() => null)) as {
      reachable?: boolean
      error?: string
    } | null
    if (!data) {
      console.warn(`[activeServer] probe of ${target.url} returned no result`)
      return false
    }
    if (data.reachable === false) {
      console.warn(
        `[activeServer] probe of ${target.url} reported unreachable: ${data.error ?? ''}`
      )
      return false
    }
    return true
  } catch (e) {
    console.warn(`[activeServer] probe of ${target.url} failed:`, e)
    return false
  }
}

/**
 * Switch the active server, running the teardown/bring-up sequence.
 *
 * The order is the point (see "切换时的 teardown 顺序" in the design doc):
 *
 * 1. probe the target first — a failure leaves the old server exactly as it was
 * 2–6. `runSwitchTeardown()`: flush the old server's tabs, clear the session,
 *    close the sync WS, close every float window, reset the Mission Control
 *    mirror — in registration order, all of it still under the *old* id
 * 7. persist the device-level id
 * 8–9. `runSwitchReconnect()`: reload settings, reconnect the sync WS, and
 *    re-send `McOp::Set { open: true }` if Mission Control was open
 *
 * Steps 2–6 and 8–9 live behind hooks so this module can stay free of the
 * subsystems it orchestrates.
 */
export async function switchServer(id: string): Promise<void> {
  const next = id || LOCAL_SERVER_ID
  if (next === activeServerId()) return

  // 1. Probe before touching anything. The local server *is* the hub, so it
  // needs no reachability check (and must stay reachable even if the roster
  // is unreadable — it is the way back).
  if (next !== LOCAL_SERVER_ID) {
    const target = targetResolver?.(next) ?? null
    if (!target) {
      console.warn(`[activeServer] no roster entry for "${next}" — refusing to switch`)
      return
    }
    if (!(await probeTarget(target))) return
  }

  await runSwitchTeardown() // 2–6, still under the old id
  setActiveServerId(next) // 7
  await runSwitchReconnect() // 8–9
}
