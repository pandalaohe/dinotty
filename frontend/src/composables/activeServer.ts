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
 * Switch the active server.
 *
 * TODO(B4): implement the 9-step teardown sequence — persist the old server's
 * tabs, clear session state, close the sync WS (without reconnect), close all
 * float windows, reset the Mission Control mirror, persist the device-level id,
 * reload settings, reconnect the sync WS and re-send `McOp::Set { open: true }`.
 * See "切换时的 teardown 顺序" in the design doc. Note that step 1 must probe
 * the target first and abort on failure, leaving the old state intact.
 */
export async function switchServer(_id: string): Promise<void> {
  // TODO(B4): see the doc comment above.
  throw new Error('switchServer() is not implemented yet — pending B4')
}
