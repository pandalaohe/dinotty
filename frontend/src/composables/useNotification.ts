import { ref, reactive, computed } from 'vue'
import { getApiBase, wsUrlWithToken } from './apiBase'
import { isTauri } from './useTransport'
import { settings } from './useSettings'
import { playSound, type NotificationType, type SoundConfig } from './useNotificationSound'

export interface NotificationItem {
  id: string
  type: NotificationType
  paneId: string
  title: string | null
  body: string
  timestamp: number
}

const notifications = ref<NotificationItem[]>([])
const panelVisible = ref(false)
const panelPinned = ref(false)
const unreadByPane = reactive<Record<string, NotificationType>>({})
const unreadCount = computed(() => Object.keys(unreadByPane).length)

let ws: WebSocket | null = null
let autoHideTimer = 0
let idCounter = 0
let initialized = false
let reconnectDelay = 3000

function genId(): string {
  return `notif-${++idCounter}-${Date.now()}`
}

function severityRank(t: NotificationType): number {
  const ranks: Record<NotificationType, number> = { info: 0, success: 1, warning: 2, error: 3, urgent: 4 }
  return ranks[t] ?? 0
}

function getNotifConfig() {
  return settings.notification
}

function handleEvent(event: { type: string; pane_id: string; title?: string | null; body?: string; notification_type?: string }) {
  const cfg = getNotifConfig()
  if (!cfg || !cfg.enabled) return

  let notifType: NotificationType = 'info'
  let title: string | null = null
  let body = ''

  if (event.type === 'bell') {
    if (!cfg.bell?.enabled) return
    body = 'Bell'
  } else if (event.type === 'notify') {
    if (!cfg.osc_notify) return
    title = event.title ?? null
    body = event.body ?? ''
    notifType = (event.notification_type as NotificationType) || 'info'
  } else {
    return
  }

  const item: NotificationItem = {
    id: genId(),
    type: notifType,
    paneId: event.pane_id,
    title,
    body,
    timestamp: Date.now(),
  }
  notifications.value.unshift(item)
  if (notifications.value.length > 100) {
    notifications.value.length = 100
  }

  // Track unread per pane (highest severity)
  const current = unreadByPane[event.pane_id]
  if (!current || severityRank(notifType) > severityRank(current)) {
    unreadByPane[event.pane_id] = notifType
  }

  // Sound
  if (cfg.channels?.sound) {
    const soundCfg: SoundConfig | undefined = cfg.sounds?.[notifType]
    if (soundCfg) playSound(soundCfg)
  }

  // Vibration
  if (cfg.channels?.vibration && navigator.vibrate) {
    navigator.vibrate(notifType === 'urgent' ? [100, 50, 100, 50, 100] : [100])
  }

  // Title flash
  if (cfg.channels?.title_flash && document.hidden) {
    flashTitle(body)
  }

  // Panel
  if (cfg.channels?.panel) {
    showPanel()
  }
}

let flashInterval = 0

function flashTitle(msg: string) {
  if (flashInterval) return
  const originalTitle = document.title
  let toggle = false
  flashInterval = window.setInterval(() => {
    document.title = toggle ? originalTitle : `🔔 ${msg}`
    toggle = !toggle
  }, 1000)
  const onFocus = () => {
    clearInterval(flashInterval)
    flashInterval = 0
    document.title = originalTitle
    window.removeEventListener('focus', onFocus)
  }
  window.addEventListener('focus', onFocus)
}

function showPanel() {
  panelVisible.value = true
  resetAutoHide()
}

function resetAutoHide() {
  clearTimeout(autoHideTimer)
  if (panelPinned.value) return
  const ms = getNotifConfig()?.panel?.auto_hide_ms ?? 4000
  if (ms > 0) {
    autoHideTimer = window.setTimeout(() => {
      if (!panelPinned.value) panelVisible.value = false
    }, ms)
  }
}

function connectWs() {
  if (ws) return
  const connect = async () => {
    let url: string
    if (isTauri()) {
      const origin = await getApiBase()
      url = `${origin.replace(/^http/, 'ws')}/ws/notify`
    } else {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
      url = `${proto}//${location.host}/ws/notify`
    }
    ws = new WebSocket(wsUrlWithToken(url))
    ws.onopen = () => {
      reconnectDelay = 3000
    }
    ws.onmessage = (e) => {
      try {
        handleEvent(JSON.parse(e.data))
      } catch {}
    }
    ws.onclose = () => {
      ws = null
      setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
    }
    ws.onerror = () => {}
  }
  connect()
}

export function useNotification() {
  if (!initialized) {
    initialized = true
    connectWs()
  }
  return {
    notifications,
    panelVisible,
    panelPinned,
    unreadByPane,
    unreadCount,
    dismissOne(id: string) {
      notifications.value = notifications.value.filter((n) => n.id !== id)
    },
    clearAll() {
      notifications.value = []
      for (const k of Object.keys(unreadByPane)) delete unreadByPane[k]
    },
    clearPaneUnread(paneId: string) {
      delete unreadByPane[paneId]
    },
    togglePanel() {
      panelVisible.value = !panelVisible.value
      if (panelVisible.value) resetAutoHide()
    },
    togglePin() {
      panelPinned.value = !panelPinned.value
      if (!panelPinned.value) resetAutoHide()
    },
  }
}
