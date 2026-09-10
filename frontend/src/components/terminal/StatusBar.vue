<template>
  <div v-if="barVisible" class="status-bar">
    <div v-if="serverChipVisible" class="status-bar-server-wrap">
      <button
        class="status-bar-server"
        :class="{ 'is-open': serverPickerOpen }"
        :title="t('serverSwitcher.title')"
        :aria-expanded="serverPickerOpen"
        @click.stop="toggleServerPicker()"
      >
        <span class="server-dot" :class="{ 'is-offline': !syncConnected }" />
        <span class="server-name">{{ activeServerLabel }}</span>
        <ChevronDown v-if="!serverPickerOpen" :size="12" />
        <ChevronUp v-else :size="12" />
      </button>
      <div v-if="serverPickerOpen" class="server-picker" @click.stop>
        <button
          v-for="option in serverOptions"
          :key="option.id"
          class="server-option"
          :class="{ 'is-active': option.id === activeServerIdRef }"
          @click="onPickServer(option.id)"
        >
          <span class="server-option-name">{{ option.name }}</span>
          <span class="server-option-url">{{ option.subtitle }}</span>
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
import { useToast } from 'vue-toastification'
import { LOCAL_SERVER_ID, switchServer } from '../../composables/activeServer'
import {
  activeServerIdRef,
  closeServerPicker,
  remoteServerEntries,
  serverPickerOpen,
  toggleServerPicker,
} from '../../composables/useAppCore'
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
const toast = useToast()
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

/** Local first: it is the always-reachable way back. */
const serverOptions = computed(() => [
  {
    id: LOCAL_SERVER_ID,
    name: t('serverSwitcher.local'),
    subtitle: location.host,
  },
  ...remoteServerEntries().map((srv) => ({
    id: srv.id,
    name: srv.name || srv.url,
    subtitle: srv.url,
  })),
])

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

async function onPickServer(id: string) {
  closeServerPicker()
  if (id === activeServerIdRef.value) return
  await switchServer(id)
  // `switchServer` aborts (leaving everything as it was) when the target fails
  // its reachability probe, so an unchanged id means the probe did not pass.
  if (activeServerIdRef.value !== id) toast.error(t('serverSwitcher.switchFailed'))
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
.server-option {
  display: flex;
  flex-direction: column;
  gap: 1px;
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
