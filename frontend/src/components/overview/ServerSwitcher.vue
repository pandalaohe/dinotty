<template>
  <div class="mc-srv-bar-wrap" @keydown.stop="onKeydown">
    <button
      class="mc-srv-bar"
      :aria-haspopup="true"
      :aria-expanded="open"
      :title="t('server.switch')"
      @click="toggle()"
    >
      <span class="mc-srv-dot" :class="dotClass(current, currentMissing)" />
      <span class="mc-srv-name" :class="{ stale: currentMissing }">{{ currentLabel }}</span>
      <ChevronDown class="mc-srv-chevron" :size="14" />
    </button>

    <div v-if="open" class="mc-srv-pop" @keydown.stop="onKeydown">
      <div class="mc-srv-pop-scroll">
        <button
          v-for="(s, i) in servers"
          :key="s.id"
          class="mc-srv-item"
          :class="{ selected: s.id === currentId, active: i === cursor }"
          @mouseenter="cursor = i"
          @click="onPick(s)"
        >
          <span class="mc-srv-dot" :class="dotClass(s)" />
          <span class="mc-srv-item-name">{{ label(s) }}</span>
          <span v-if="s.hasToken" class="mc-srv-lock" :title="t('server.tokenConfigured')">
            <KeyRound :size="11" />
          </span>
          <Check v-if="s.id === currentId" class="mc-srv-check" :size="14" />
        </button>

        <p v-if="status === 'loading'" class="mc-srv-hint">{{ t('server.loading') }}</p>
        <p v-else-if="status === 'unavailable'" class="mc-srv-hint">
          {{ t('server.listUnavailable') }}
        </p>
      </div>

      <div class="mc-srv-actions">
        <button class="mc-srv-action" @click="onManage">
          <Settings :size="13" />
          <span>{{ t('server.manage') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown, KeyRound, Settings } from 'lucide-vue-next'
import { useI18n } from '../../composables/useI18n'
import { switchServer } from '../../composables/activeServer'
import { useRemoteServers, type ServerEntry } from '../../composables/useRemoteServers'

const emit = defineEmits<{
  close: []
  /** B2's roster editor is not in this phase; the host opens settings. */
  manage: []
}>()

const { t } = useI18n()
const { servers, current, currentId, currentMissing, status, refreshRemoteServers } =
  useRemoteServers()

const open = ref(false)
const switching = ref(false)
const cursor = ref(0)
// A click on the bar must not be immediately undone by the document-level
// outside-click listener that this same click would otherwise trigger.
let openedAt = 0

const currentLabel = computed(() =>
  currentMissing.value ? t('server.unknown') : label(current.value)
)

function label(s: ServerEntry): string {
  if (s.local) return t('server.local')
  return s.name || s.url || s.id
}

function dotClass(s: ServerEntry, missing = false): string {
  if (missing) return 'off'
  if (s.id === currentId.value) return 'on'
  if (s.local) return 'on'
  return s.hasToken ? 'idle' : 'warn'
}

async function openPop() {
  if (open.value) return
  open.value = true
  openedAt = Date.now()
  // Re-seed the cursor on the active entry so Up/Down starts from where the
  // user is, not from wherever the mouse last hovered.
  cursor.value = Math.max(
    0,
    servers.value.findIndex((s) => s.id === currentId.value)
  )
  // Refresh on open so a roster change made on another device shows up, and a
  // pre-B2 501 gets retried rather than being cached for the session.
  void refreshRemoteServers()
}

function close() {
  open.value = false
}

function toggle() {
  if (open.value) close()
  else void openPop()
}

async function onPick(s: ServerEntry) {
  if (s.id === currentId.value) {
    close()
    return
  }
  if (switching.value) return
  switching.value = true
  try {
    await switchServer(s.id)
    close()
    // The workspace grid and the tab grid both belong to the server we just
    // left, so MC closes and reopens on the new one (the backend broadcast
    // drives the reopen).
    emit('close')
  } catch (e) {
    // switchServer aborts before touching any state when the probe fails, so
    // the old server is still fully usable - just keep the popover open.
    console.error('[ServerSwitcher] switch failed:', e)
  } finally {
    switching.value = false
  }
}

function onManage() {
  close()
  emit('manage')
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      cursor.value = (cursor.value + 1) % servers.value.length
      return
    case 'ArrowUp':
      e.preventDefault()
      cursor.value = (cursor.value - 1 + servers.value.length) % servers.value.length
      return
    case 'Enter':
    case ' ':
      e.preventDefault()
      {
        const s = servers.value[cursor.value]
        if (s) void onPick(s)
      }
      return
    case 'Escape':
      // Only the popover closes - this must not bubble up and become MC's
      // Cancel op, which would close the whole overlay server-side.
      e.preventDefault()
      close()
      return
    case 's':
      // The bar gets `s` from WorkspaceOverview's container handler; while the
      // popover is open it must not toggle again (or reach a text input).
      e.preventDefault()
      close()
      return
  }
}

function onDocPointerDown(e: PointerEvent) {
  if (!open.value) return
  if (Date.now() - openedAt < 50) return
  const el = e.target as HTMLElement | null
  if (el?.closest?.('.mc-srv-bar-wrap')) return
  close()
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown, true))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown, true))

defineExpose({ open, openPop, close })
</script>
