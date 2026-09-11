<template>
  <div v-if="barVisible" class="status-bar">
    <div v-if="serverChipVisible" class="status-bar-server-wrap">
      <button
        class="status-bar-server"
        :class="{ 'is-open': serverPickerOpen }"
        :title="t('server.switch')"
        :aria-expanded="serverPickerOpen"
        @click.stop="toggleServerPicker()"
      >
        <span class="server-dot" :class="{ 'is-offline': !syncConnected }" />
        <span class="server-name">{{ activeServerLabel }}</span>
        <ChevronDown v-if="!serverPickerOpen" :size="12" />
        <ChevronUp v-else :size="12" />
      </button>
      <div v-if="serverPickerOpen" class="server-picker" @click.stop>
        <!-- One wrapper per option: the failure notice belongs to the row but
             cannot live inside its <button>, which may hold no interactive
             content - the retry button is a sibling. -->
        <div v-for="option in serverOptions" :key="option.id" class="server-option-row">
          <button
            class="server-option"
            :class="{ 'is-active': option.id === activeServerIdRef }"
            :aria-busy="switchingId === option.id ? 'true' : undefined"
            @click="onPickServer(option)"
          >
            <span class="server-option-main">
              <span class="server-option-name">{{ option.name }}</span>
              <span class="server-option-url">{{ option.subtitle }}</span>
            </span>
            <span v-if="optionStatusText(option)" class="server-option-tag" :class="{ warn: optionWarns(option) }">
              {{ optionStatusText(option) }}
            </span>
            <span v-if="switchingId === option.id" class="server-option-spin" />
          </button>
          <p v-if="failures[option.id]" class="server-option-error">
            <span>{{ switchFailureFor(option.id) }}</span>
            <button class="server-option-retry" @click.stop="onPickServer(option)">
              {{ t('server.retry') }}
            </button>
          </p>
        </div>
        <button class="server-picker-manage" @click.stop="onManageServers">
          {{ t('server.manage') }}
        </button>
      </div>
    </div>
    <div v-if="leftItems.length" class="status-bar-left">
      <StatusBarItemRenderer v-for="item in leftItems" :key="item.id" :item="item" />
    </div>
    <div
      ref="rightEl"
      class="status-bar-right"
      :class="{ 'has-overflow-left': overflowLeft, 'has-overflow-right': overflowRight }"
      @wheel="onWheel"
      @scroll="updateOverflow"
    >
      <StatusBarItemRenderer v-for="item in allRightItems" :key="item.id" :item="item" />
    </div>
    <span v-if="warning.message.value" class="pane-warning">{{ warning.message.value }}</span>

    <MonitorPopover
      v-if="activePopover?.kind === 'system'"
      :visible="true"
      :metric="activePopover.metric"
      :data="data"
      :anchor-rect="anchorRect"
      :cpu-history="cpuHistory"
      :mem-history="memHistory"
      :net-rx-history="netRxHistory"
      :net-tx-history="netTxHistory"
      :gpu-util-history="gpuUtilHistory"
      :gpu-mem-history="gpuMemHistory"
      @close="activePopover = null"
    />
    <PluginSeriesPopover
      v-else-if="activePopover?.kind === 'plugin' && activeSeries"
      :visible="true"
      :series="activeSeries"
      :anchor-rect="anchorRect"
      @close="activePopover = null"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  defineAsyncComponent,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue'
import { monitorData } from '../../composables/useMonitor'
import {
  cpuHistory,
  memHistory,
  netRxHistory,
  netTxHistory,
  gpuUtilHistory,
  gpuMemHistory,
} from '../../composables/useMonitor'
import { ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useSettings } from '../../composables/useSettings'
import { usePaneWarning } from '../../composables/usePaneWarning'
import { useI18n } from '../../composables/useI18n'
import { LOCAL_SERVER_ID, switchServer, type SwitchFailure } from '../../composables/activeServer'
import {
  omitKey,
  openServerManager,
  switchFailureText,
} from '../../composables/useRemoteServerAdmin'
import {
  activeServerIdRef,
  closeServerPicker,
  serverPickerOpen,
  toggleServerPicker,
} from '../../composables/useAppCore'
import { refreshRemoteServers, useRemoteServers } from '../../composables/useRemoteServers'
import { useUiStore } from '../../stores/uiStore'
import { useStatusBarItemsStore } from '../../stores/statusBarItems'
import { usePluginMonitorStore } from '../../stores/pluginMonitor'
import {
  createSystemStatusBarItems,
  type MetricKey,
} from '../../composables/useSystemStatusBarItems'
import { pluginSeriesToStatusBarItem } from '../../composables/usePluginStatusBarAdapter'
import StatusBarItemRenderer from './StatusBarItemRenderer.vue'

const MonitorPopover = defineAsyncComponent(() => import('./MonitorPopover.vue'))
const PluginSeriesPopover = defineAsyncComponent(() => import('./PluginSeriesPopover.vue'))

const data = monitorData
const { settings } = useSettings()
const { t } = useI18n()
const ui = useUiStore()
const warning = usePaneWarning()
const store = useStatusBarItemsStore()
const pluginMonitor = usePluginMonitorStore()

const monitorSettings = computed(
  () =>
    settings.monitor ?? {
      enabled: true,
      cpu: true,
      memory: true,
      disk: false,
      network: true,
    }
)

// ── Active server indicator ─────────────────────────────────────────
//
// The escape hatch: Mission Control is the usual way to switch servers, but it
// can be closed — or, when the active server is unreachable, sitting on its
// "not connected" screen. This chip is always available while a remote server
// is active, and it is what the "Switch Server…" action opens.

const syncConnected = computed(() => ui.syncConnected)

// The roster comes from `useRemoteServers`, the same source the Mission Control
// switcher reads: the hub's `GET /api/remote-servers`. Reading it out of the
// active server's settings payload instead would show two different lists as
// soon as a remote server is active, because `settings` is relayed.
const { servers: remoteServers } = useRemoteServers()

interface ServerOption {
  id: string
  name: string
  subtitle: string
  /** Absent for the local entry, which has no credential of its own. */
  hasToken?: boolean
  local: boolean
}

/** Local first: it is the always-reachable way back. */
const serverOptions = computed<ServerOption[]>(() => [
  {
    id: LOCAL_SERVER_ID,
    name: t('server.local'),
    subtitle: location.host,
    local: true,
  },
  ...remoteServers.value
    .filter((srv) => !srv.local)
    .map((srv) => ({
      id: srv.id,
      name: srv.name || srv.url,
      subtitle: srv.url,
      hasToken: srv.hasToken,
      local: false,
    })),
])

/** Same words as the Mission Control switcher, so a state reads the same
 *  wherever it is met. */
function optionStatusText(option: ServerOption): string {
  if (option.local) return ''
  if (option.id === activeServerIdRef.value) return t('server.statusCurrent')
  return option.hasToken ? '' : t('server.statusNoToken')
}

function optionWarns(option: ServerOption): boolean {
  return !option.local && option.hasToken === false
}

const activeServerLabel = computed(
  () =>
    serverOptions.value.find((o) => o.id === activeServerIdRef.value)?.name ??
    activeServerIdRef.value
)

/** Shown whenever we are not on the local server, so a switch is always
 *  reversible from here — plus while the picker is open on its own. */
const serverChipVisible = computed(
  () => activeServerIdRef.value !== LOCAL_SERVER_ID || serverPickerOpen.value
)

const barVisible = computed(
  () => monitorSettings.value.enabled || !!warning.message.value || serverChipVisible.value
)

/** The row being switched to, if any - one at a time, like the MC switcher. */
const switchingId = ref<string | null>(null)
/** Last switch failure per row, so the reason stays put until it is retried. */
const failures = ref<Record<string, { failure: SwitchFailure; url: string }>>({})

async function onPickServer(option: ServerOption) {
  if (option.id === activeServerIdRef.value) {
    closeServerPicker()
    return
  }
  if (switchingId.value) return

  failures.value = omitKey(failures.value, option.id)
  switchingId.value = option.id
  try {
    const result = await switchServer(option.id)
    if (!result.ok) {
      // The picker stays open: the reason belongs where the click happened, and
      // a toast that disappears is no help for "why did that not work".
      failures.value = {
        ...failures.value,
        [option.id]: { failure: result.failure, url: option.subtitle },
      }
      return
    }
    closeServerPicker()
  } finally {
    switchingId.value = null
  }
}

function switchFailureFor(id: string): string {
  const record = failures.value[id]
  return record ? switchFailureText(t, record.failure, record.url) : ''
}

function onManageServers() {
  closeServerPicker()
  openServerManager({ kind: 'list' })
}

function onServerPickerKeydown(e: KeyboardEvent) {
  // Deliberately does not stop propagation: this listener is on `window` in the
  // bubble phase, so swallowing the key here would silence every Escape handler
  // in the app for as long as the picker is open.
  if (e.key !== 'Escape' || !serverPickerOpen.value) return
  closeServerPicker()
}

const leftItems = computed(() => store.leftItems)
const rightItems = computed(() => store.rightItems)

type ActivePopover =
  | { kind: 'system'; metric: MetricKey }
  | { kind: 'plugin'; seriesId: string }
  | null

const activePopover = ref<ActivePopover>(null)
const anchorRect = ref<DOMRect | null>(null)

function toggleSystemPopover(key: MetricKey, event: MouseEvent) {
  if (activePopover.value?.kind === 'system' && activePopover.value.metric === key) {
    activePopover.value = null
    return
  }
  const el = event.currentTarget as HTMLElement
  anchorRect.value = el.getBoundingClientRect()
  activePopover.value = { kind: 'system', metric: key }
}

function togglePluginPopover(seriesId: string, event: MouseEvent) {
  if (activePopover.value?.kind === 'plugin' && activePopover.value.seriesId === seriesId) {
    activePopover.value = null
    return
  }
  const el = event.currentTarget as HTMLElement
  anchorRect.value = el.getBoundingClientRect()
  activePopover.value = { kind: 'plugin', seriesId }
}

const activeSeries = computed(() => {
  const pop = activePopover.value
  if (pop?.kind !== 'plugin') return null
  return pluginMonitor.series.find((s) => s.id === pop.seriesId) ?? null
})

// Plugin series with statusText get adapted into status bar items (right side).
const pluginStatusBarItems = computed(() =>
  pluginMonitor.series
    .filter((s) => s.statusText && pluginMonitor.isVisible(s, settings.monitor.plugin_series))
    .map((s) => pluginSeriesToStatusBarItem(s, (e) => togglePluginPopover(s.id, e)))
)

// Merge system items with plugin-adapted items; system items keep their priorities,
// plugin items use priority 200 (rendered after system metrics).
const allRightItems = computed(() => {
  const sys = [...rightItems.value]
  const plugins = [...pluginStatusBarItems.value]
  return [...sys, ...plugins].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
})

const rightEl = ref<HTMLElement | null>(null)
const overflowLeft = ref(false)
const overflowRight = ref(false)

function updateOverflow() {
  const el = rightEl.value
  if (!el) return
  overflowLeft.value = el.scrollLeft > 1
  overflowRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

function onWheel(e: WheelEvent) {
  const el = rightEl.value
  if (!el) return
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (e.shiftKey || el.scrollWidth > el.clientWidth) {
    el.scrollLeft += e.deltaY
    e.preventDefault()
  }
}

onMounted(() => {
  store.register('system', createSystemStatusBarItems(monitorSettings, toggleSystemPopover))
  updateOverflow()
  window.addEventListener('resize', updateOverflow)
  // The picker is opened from elsewhere too (the "Switch Server…" action), so
  // its dismissal has to work whether or not it was opened from the chip. The
  // `click` handler runs after `@click.stop` on the chip and popover, which is
  // what keeps a click inside them from closing it.
  window.addEventListener('keydown', onServerPickerKeydown)
  window.addEventListener('click', closeServerPicker)
})

onBeforeUnmount(() => {
  store.unregister('system')
  window.removeEventListener('resize', updateOverflow)
  window.removeEventListener('keydown', onServerPickerKeydown)
  window.removeEventListener('click', closeServerPicker)
})

watch(
  () => allRightItems.value.length,
  () => nextTick(updateOverflow)
)

// The picker is opened from three places (the chip, the palette, the
// keybinding), so the roster is refreshed on the shared open bit rather than in
// the chip's click handler. Same call the Mission Control switcher makes on
// open, so both entries show the same list after a roster change.
watch(serverPickerOpen, (open) => {
  if (open) void refreshRemoteServers()
})
</script>

<style scoped>
.status-bar {
  height: 24px;
  box-sizing: border-box;
  background: var(--bg, #1a1a2e);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0 12px;
  position: relative;
  z-index: 2;
  gap: 16px;
}
.status-bar-server-wrap {
  position: relative;
  flex-shrink: 0;
}
.status-bar-server {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 18px;
  max-width: 180px;
  padding: 0 6px;
  font: inherit;
  font-size: 11px;
  color: var(--fg-muted);
  background: transparent;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
}
.status-bar-server:hover,
.status-bar-server.is-open {
  color: var(--text-color);
  background: var(--bg-hover);
}
.server-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.server-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
}
.server-dot.is-offline {
  background: var(--danger);
}
/* Opens upward: the bar is pinned to the bottom of the workbench. */
.server-picker {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  min-width: 180px;
  max-width: 320px;
  padding: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--dialog-shadow);
}
.server-option-row {
  display: flex;
  flex-direction: column;
}
.server-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  font: inherit;
  text-align: left;
  color: var(--text-color);
  background: transparent;
  border: none;
  border-radius: var(--radius);
  cursor: pointer;
}
.server-option:hover {
  background: var(--bg-hover);
}
.server-option.is-active {
  color: var(--accent);
}
.server-option-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
/* The state in words: a coloured dot is not readable on its own, and "no
   token" is the one that means anyone reaching this server is an admin. */
.server-option-tag {
  flex: none;
  padding: 0 5px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 9px;
  line-height: 1.6;
  color: var(--fg-muted);
}
.server-option-tag.warn {
  border-color: #d97706;
  color: #d97706;
}
/* The probe is two 4s-budgeted requests, so a switch can look inert for a
   while - long enough to be clicked again. */
.server-option-spin {
  flex: none;
  width: 10px;
  height: 10px;
  border: 2px solid var(--fg-muted);
  border-top-color: transparent;
  border-radius: 50%;
  animation: server-option-spin 0.6s linear infinite;
}
@keyframes server-option-spin {
  to {
    transform: rotate(360deg);
  }
}
.server-option-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0 8px 5px 8px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--danger);
}
.server-option-retry {
  flex: none;
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
  color: var(--text-color);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
}
.server-option-retry:hover {
  background: var(--bg-hover);
  color: var(--accent);
}
.server-picker-manage {
  margin-top: 4px;
  padding: 6px 8px;
  border: none;
  border-top: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
  color: var(--fg-muted);
  font: inherit;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.server-picker-manage:hover {
  color: var(--accent);
}
.server-option-name {
  font-size: 12px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.server-option-url {
  font-size: 10px;
  color: var(--fg-muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.status-bar-left {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
.status-bar-right {
  display: flex;
  gap: 8px;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 12px,
    #000 calc(100% - 12px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 12px,
    #000 calc(100% - 12px),
    transparent 100%
  );
  -webkit-overflow-scrolling: touch;
}
.status-bar-right::-webkit-scrollbar {
  display: none;
}
.status-bar-right.has-overflow-left:not(.has-overflow-right) {
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 12px, #000 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 12px, #000 100%);
}
.status-bar-right.has-overflow-right:not(.has-overflow-left) {
  -webkit-mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 12px), transparent 100%);
  mask-image: linear-gradient(to right, #000 0, #000 calc(100% - 12px), transparent 100%);
}
.status-bar-right:not(.has-overflow-left):not(.has-overflow-right) {
  -webkit-mask-image: none;
  mask-image: none;
}
.pane-warning {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--fg-muted);
  white-space: nowrap;
  max-width: 40%;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  animation: warning-fade 4s ease-in forwards;
  z-index: 3;
}
@keyframes warning-fade {
  0%,
  70% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
