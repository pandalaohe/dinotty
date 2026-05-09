import { ref } from 'vue'
import { wsUrlWithToken } from './apiBase'
import { isTauri, tauriInvoke } from './useTransport'

export interface CpuData {
  usage: number
  cores: number[]
  core_count: { physical: number; logical: number }
  load_avg: [number, number, number]
}

export interface MemoryData {
  used: number
  available: number
  total: number
  usage: number
  swap_used: number
  swap_total: number
}

export interface DiskData {
  mount: string
  fs_type: string
  used: number
  available: number
  total: number
  usage: number
}

export interface NetworkData {
  name: string
  ip: string
  rx_rate: number
  tx_rate: number
  rx_total: number
  tx_total: number
}

export interface MonitorData {
  cpu: CpuData
  memory: MemoryData
  disk: DiskData[]
  network: NetworkData[]
}

export type MonitorMessage =
  | MonitorData
  | { type: 'history'; data: MonitorData[] }

export const monitorData = ref<MonitorData | null>(null)
export const monitorConnected = ref(false)

type MonitorListener = (data: MonitorData) => void
type HistoryListener = (data: MonitorData[]) => void

const listeners: MonitorListener[] = []
const historyListeners: HistoryListener[] = []

export function onMonitorData(fn: MonitorListener) {
  listeners.push(fn)
  return () => {
    const i = listeners.indexOf(fn)
    if (i >= 0) listeners.splice(i, 1)
  }
}

export function onMonitorHistory(fn: HistoryListener) {
  historyListeners.push(fn)
  return () => {
    const i = historyListeners.indexOf(fn)
    if (i >= 0) historyListeners.splice(i, 1)
  }
}

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let attempts = 0
let started = false

async function connect() {
  if (ws && ws.readyState <= WebSocket.OPEN) return

  let url: string
  if (isTauri()) {
    const origin = String(await tauriInvoke('embedded_http_origin')).replace(/\/$/, '')
    url = `${origin.replace(/^http/, 'ws')}/ws/monitor`
  } else {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    url = `${proto}//${location.host}/ws/monitor`
  }

  ws = new WebSocket(wsUrlWithToken(url))

  ws.onopen = () => {
    monitorConnected.value = true
    attempts = 0
  }

  ws.onmessage = (e) => {
    try {
      const msg: MonitorMessage = JSON.parse(e.data)
      if ('type' in msg && msg.type === 'history') {
        for (const fn of historyListeners) fn(msg.data)
        if (msg.data.length > 0) {
          monitorData.value = msg.data[msg.data.length - 1]
        }
      } else {
        const d = msg as MonitorData
        monitorData.value = d
        for (const fn of listeners) fn(d)
      }
    } catch {}
  }

  ws.onclose = () => {
    monitorConnected.value = false
    ws = null
    if (started) scheduleReconnect()
  }

  ws.onerror = () => {}
}

function scheduleReconnect() {
  if (reconnectTimer) return
  const delay = Math.min(1000 * Math.pow(2, attempts), 30000)
  attempts++
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (started) connect()
  }, delay)
}

export function startMonitor() {
  if (started) return
  started = true
  connect()
}

export function stopMonitor() {
  started = false
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (ws) { ws.close(1000); ws = null }
  monitorConnected.value = false
}
