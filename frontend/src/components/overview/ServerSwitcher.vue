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
        <!-- One wrapper per row: the failure notice belongs to the row but
             cannot live inside its <button>, which may hold no interactive
             content of its own - the retry button would be nested. -->
        <div v-for="(s, i) in servers" :key="s.id" class="mc-srv-row">
          <button
            class="mc-srv-item"
            :class="{ selected: s.id === currentId, active: i === cursor, busy: isBusy(s.id) }"
            :aria-busy="isBusy(s.id) ? 'true' : undefined"
            @mouseenter="cursor = i"
            @click="onPick(s)"
          >
            <span class="mc-srv-dot" :class="dotClass(s)" />
            <span class="mc-srv-item-main">
              <span class="mc-srv-item-name">{{ label(s) }}</span>
              <!-- The origin: two LAN boards are easy to name alike, and this
                   is what tells them apart. -->
              <span class="mc-srv-sub">{{ subtitle(s) }}</span>
            </span>
            <!-- A dot alone cannot say "no token", which is the one state that
                 means anyone reaching this server is an admin. -->
            <span v-if="statusText(s)" class="mc-srv-status" :class="statusKind(s)">
              {{ statusText(s) }}
            </span>
            <span v-if="isBusy(s.id)" class="mc-srv-spin" />
            <KeyRound
              v-else-if="s.hasToken && !s.local"
              class="mc-srv-lock"
              :title="t('server.tokenConfigured')"
            />
            <Check v-if="s.id === currentId && !isBusy(s.id)" class="mc-srv-check" :size="14" />
          </button>

          <p v-if="failures[s.id]" class="mc-srv-item-error">
            <AlertCircle class="mc-srv-err-icon" :size="12" />
            <span>{{ failureText(failures[s.id]) }}</span>
            <button class="mc-srv-retry" @click.stop="onPick(s)">{{ t('server.retry') }}</button>
          </p>
        </div>

        <p v-if="status === 'loading'" class="mc-srv-hint">{{ t('server.loading') }}</p>
        <p v-else-if="status === 'unavailable'" class="mc-srv-hint">
          {{ t('server.listUnavailable') }}
          <button class="mc-srv-retry" @click.stop="refreshRemoteServers()">
            {{ t('server.retry') }}
          </button>
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
import { AlertCircle, Check, ChevronDown, KeyRound, Settings } from 'lucide-vue-next'
import { useI18n } from '../../composables/useI18n'
import { switchServer, type SwitchFailure } from '../../composables/activeServer'
import {
  omitKey,
  openServerManager,
  switchFailureText,
} from '../../composables/useRemoteServerAdmin'
import {
  serverVisualState,
  useRemoteServers,
  type ServerEntry,
} from '../../composables/useRemoteServers'

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const { servers, current, currentId, currentMissing, status, refreshRemoteServers } =
  useRemoteServers()

const open = ref(false)
const cursor = ref(0)
/** The row currently being switched to, if any. One at a time: the teardown
 *  sequence is global, so a second concurrent switch would race the first. */
const switchingId = ref<string | null>(null)
/** Per-row busy keys, so a spinner lands on the row that was clicked. */
const busyIds = ref<Set<string>>(new Set())
/** Last switch failure, per row, so the reason survives until it is retried. */
const failures = ref<Record<string, { failure: SwitchFailure; url: string }>>({})
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

/** The origin, which is what distinguishes two similarly named boards. */
function subtitle(s: ServerEntry): string {
  return s.local ? location.host : s.url
}

function dotClass(s: ServerEntry, missing = false): string {
  if (missing) return 'off'
  switch (serverVisualState(s, currentId.value)) {
    case 'local':
    case 'current':
      return 'on'
    case 'noToken':
      return 'warn'
    default:
      return 'idle'
  }
}

/** The state as words. Colour is a hint; this is what carries it. */
function statusText(s: ServerEntry): string {
  switch (serverVisualState(s, currentId.value)) {
    case 'current':
      return t('server.statusCurrent')
    case 'noToken':
      return t('server.statusNoToken')
    default:
      return ''
  }
}

function statusKind(s: ServerEntry): string {
  return serverVisualState(s, currentId.value) === 'noToken' ? 'warn' : 'current'
}

function failureText(record: { failure: SwitchFailure; url: string }): string {
  return switchFailureText(t, record.failure, record.url)
}

function isBusy(id: string): boolean {
  return busyIds.value.has(id)
}

function setBusy(id: string, busy: boolean) {
  // Replace rather than mutate: a `ref` holding a Set does not track `add` or
  // `delete` on the Set itself.
  const next = new Set(busyIds.value)
  if (busy) next.add(id)
  else next.delete(id)
  busyIds.value = next
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
  if (switchingId.value) return

  // A retry supersedes the previous reason for the same row.
  failures.value = omitKey(failures.value, s.id)
  switchingId.value = s.id
  setBusy(s.id, true)
  try {
    const result = await switchServer(s.id)
    if (!result.ok) {
      // switchServer aborts before touching any state, so the old server is
      // still fully usable - keep the popover open and say what went wrong.
      failures.value = { ...failures.value, [s.id]: { failure: result.failure, url: s.url } }
      return
    }
    close()
    // The workspace grid and the tab grid both belong to the server we just
    // left, so MC closes and reopens on the new one (the backend broadcast
    // drives the reopen).
    emit('close')
  } finally {
    setBusy(s.id, false)
    switchingId.value = null
  }
}

// Managing is a Mission Control concern now: the dialog opens over MC and MC
// stays up behind it, so this does not emit `close`. Adding is not a separate
// entry point - "Add server" is a button inside the dialog, and the whole
// roster is submitted as one replacement, so there is no create path to seed.
function onManage() {
  close()
  openServerManager()
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
