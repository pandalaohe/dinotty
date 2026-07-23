#!/usr/bin/env node
// Repro: a second terminal WebSocket attaches, then disconnects, and the
// first client's input channel stops reaching the PTY.
//
// Run:
//   node scripts/repro-input-channel-replay.mjs 8998
//   PORT=8998 node scripts/repro-input-channel-replay.mjs
//
// Optional:
//   DINOTTY_TOKEN  Bearer token for REST requests (loopback normally bypasses auth)
//
// Requires a Node version with the standard WebSocket global.
//
// PASS: client A can still send input after client B disconnects.
// FAIL: A_AFTER_DISCONNECT is absent from A's output stream for 5 seconds.

const startedAt = performance.now()
const portArg = process.env.PORT ?? process.argv[2] ?? '8998'
const port = Number(portArg)
const token = process.env.DINOTTY_TOKEN

const HTTP_URL = `http://127.0.0.1:${port}`
const WS_URL = `ws://127.0.0.1:${port}`
const ATTACH_TIMEOUT_MS = 15000
const MARKER_TIMEOUT_MS = 5000

const step = (name) => console.log(`\n[step] ${name}`)
const elapsed = (since) => Math.round(performance.now() - since)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class TerminalClient {
  constructor(label, paneId) {
    this.label = label
    this.output = ''
    this.messages = []
    this.waiters = new Set()
    this.ws = new WebSocket(`${WS_URL}/ws?paneId=${encodeURIComponent(paneId)}`)

    this.opened = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${label} WebSocket open timed out`)), ATTACH_TIMEOUT_MS)
      this.ws.addEventListener('open', () => {
        clearTimeout(timer)
        resolve()
      }, { once: true })
      this.ws.addEventListener('error', () => {
        clearTimeout(timer)
        reject(new Error(`${label} WebSocket error before open`))
      }, { once: true })
      this.ws.addEventListener('close', event => {
        clearTimeout(timer)
        reject(new Error(`${label} WebSocket closed before open (code=${event.code})`))
      }, { once: true })
    })

    this.ws.addEventListener('message', event => {
      if (typeof event.data !== 'string') return

      let message
      try {
        message = JSON.parse(event.data)
      } catch {
        return
      }

      this.messages.push(message)
      if (message.type === 'output' && typeof message.data === 'string') {
        this.output += message.data
      }
      this.#checkWaiters()
    })

    this.ws.addEventListener('close', event => {
      this.#rejectWaiters(new Error(`${label} WebSocket closed unexpectedly (code=${event.code})`))
    })

    this.ws.addEventListener('error', () => {
      this.#rejectWaiters(new Error(`${label} WebSocket error`))
    })
  }

  async attach() {
    await this.opened
    await this.waitFor(
      () => this.messages.some(message => message.type === 'reconnected'),
      ATTACH_TIMEOUT_MS,
      `${this.label} did not receive reconnected`,
    )

    this.send({ type: 'snapshot_request', cols: 80, rows: 24 })
    await this.waitFor(
      () => this.messages.some(message => message.type === 'replay_end'),
      ATTACH_TIMEOUT_MS,
      `${this.label} snapshot replay did not finish`,
    )
  }

  send(message) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`${this.label} WebSocket is not open`)
    }
    this.ws.send(JSON.stringify(message))
  }

  sendInput(data) {
    this.send({ type: 'input', data })
  }

  waitForOutput(marker, timeoutMs) {
    const offset = this.output.length
    return this.waitFor(
      () => this.output.slice(offset).includes(marker),
      timeoutMs,
      `${marker} not observed on ${this.label} within ${timeoutMs}ms`,
    )
  }

  waitFor(predicate, timeoutMs, timeoutMessage) {
    if (predicate()) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject, timer: null }
      waiter.timer = setTimeout(() => {
        this.waiters.delete(waiter)
        reject(new Error(timeoutMessage))
      }, timeoutMs)
      this.waiters.add(waiter)
    })
  }

  async close() {
    if (this.ws.readyState === WebSocket.CLOSED) return null

    const closed = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.label} WebSocket close timed out`)), 3000)
      this.ws.addEventListener('close', event => {
        clearTimeout(timer)
        resolve(event)
      }, { once: true })
    })

    if (this.ws.readyState === WebSocket.OPEN) this.ws.close(1000)
    return closed
  }

  #checkWaiters() {
    for (const waiter of [...this.waiters]) {
      if (!waiter.predicate()) continue
      clearTimeout(waiter.timer)
      this.waiters.delete(waiter)
      waiter.resolve()
    }
  }

  #rejectWaiters(error) {
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer)
      waiter.reject(error)
    }
    this.waiters.clear()
  }
}

async function api(path, init = {}) {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body != null) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${HTTP_URL}${path}`, { ...init, headers })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${init.method ?? 'GET'} ${path} failed: ${response.status} ${body}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function closeTabByPaneId(tabId, paneId) {
  const body = await api('/api/tabs')
  const matchingTabIds = (body.tabs ?? [])
    .filter(tab => tab.pane_id === paneId || JSON.stringify(tab.layout ?? tab).includes(paneId))
    .map(tab => tab.tab_id ?? tab.id)
    .filter(Boolean)

  const ids = new Set(matchingTabIds.length > 0 ? matchingTabIds : [tabId])
  for (const id of ids) {
    await api(`/api/tabs/${encodeURIComponent(id)}`, { method: 'DELETE' })
  }
}

async function main() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`invalid port: ${portArg}`)
  }
  if (typeof WebSocket === 'undefined') {
    throw new Error('this Node version does not provide the standard WebSocket API')
  }

  console.log(`target: ${HTTP_URL}`)

  let tabId = null
  let paneId = null
  let clientA = null
  let clientB = null
  let passed = false
  let reason = ''
  let verdictElapsed = null

  try {
    step('create a fresh local shell session')
    const created = await api('/api/tabs', {
      method: 'POST',
      body: JSON.stringify({ cwd: null }),
    })
    tabId = created.tab_id
    paneId = created.pane_id
    if (!tabId || !paneId) throw new Error('create tab response omitted tab_id or pane_id')
    console.log(`  tabId=${tabId} paneId=${paneId}`)

    step('attach client A')
    clientA = new TerminalClient('A', paneId)
    await clientA.attach()

    step('attach client B to the same session')
    clientB = new TerminalClient('B', paneId)
    await clientB.attach()

    step('sanity: B input must appear on A output')
    const sanityStartedAt = performance.now()
    const sanityOutput = clientA.waitForOutput('B_ALIVE', MARKER_TIMEOUT_MS)
    clientB.sendInput('echo B_ALIVE\n')
    await sanityOutput
    console.log(`  B_ALIVE observed after ${elapsed(sanityStartedAt)}ms`)

    step('disconnect client B like the web client')
    const closeEvent = await clientB.close()
    console.log(`  B disconnected (close code=${closeEvent?.code ?? 'already closed'})`)
    clientB = null
    // Let the server finish its connection cleanup before probing A.
    await delay(100)

    step('A sends after B disconnects, without another attach')
    const probeStartedAt = performance.now()
    const probeOutput = clientA.waitForOutput('A_AFTER_DISCONNECT', MARKER_TIMEOUT_MS)
    clientA.sendInput('echo A_AFTER_DISCONNECT\n')
    try {
      await probeOutput
      passed = true
      verdictElapsed = elapsed(probeStartedAt)
      reason = 'A_AFTER_DISCONNECT observed'
    } catch (error) {
      verdictElapsed = elapsed(probeStartedAt)
      reason = `input dead: ${error.message}`
    }
  } catch (error) {
    reason = error.message
  } finally {
    await clientB?.close().catch(() => {})
    await clientA?.close().catch(() => {})
    if (tabId && paneId) {
      await delay(100)
      await closeTabByPaneId(tabId, paneId).catch(error => {
        console.error(`cleanup warning: ${error.message}`)
      })
    }
  }

  const timing = verdictElapsed ?? elapsed(startedAt)
  console.log(`${passed ? 'PASS' : 'FAIL'} elapsed=${timing}ms (${reason})`)
  process.exitCode = passed ? 0 : 1
}

main().catch(error => {
  console.log(`FAIL elapsed=${elapsed(startedAt)}ms (${error.message})`)
  process.exitCode = 1
})
