<template>
  <div v-if="visible" class="web-preview" :class="direction">
    <div
      class="web-preview-divider"
      @mousedown.prevent="startDrag"
      @touchstart.prevent="startDragTouch"
    ></div>
    <div class="web-preview-panel">
      <div class="web-preview-toolbar">
        <button
          type="button"
          :title="t('preview.annotation.refresh')"
          :aria-label="t('preview.annotation.refresh')"
          @click="refresh"
        >
          <RotateCw :size="14" />
        </button>
        <form class="web-preview-address" @submit.prevent="navigateFromInput">
          <input
            ref="addressInput"
            v-model="addressValue"
            type="text"
            enterkeyhint="go"
            inputmode="url"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            :placeholder="t('preview.annotation.addressPlaceholder')"
          />
          <button
            type="submit"
            class="go-btn"
            :title="t('preview.annotation.go')"
            :aria-label="t('preview.annotation.go')"
          >
            <ArrowRight :size="14" />
          </button>
        </form>
        <div v-if="previewState === 'frozen'" class="annotation-tools">
          <button
            v-for="entry in toolEntries"
            :key="entry.tool"
            type="button"
            :class="{ active: selectedTool === entry.tool }"
            :title="t(entry.labelKey)"
            :aria-label="t(entry.labelKey)"
            @click="selectTool(entry.tool)"
          >
            <component :is="entry.icon" :size="14" />
          </button>
          <span class="toolbar-separator"></span>
          <button
            v-for="paletteEntry in palette"
            :key="paletteEntry.color"
            type="button"
            class="color-button"
            :class="{ active: selectedColor === paletteEntry.color }"
            :style="{ '--annotation-color': paletteEntry.color }"
            :title="t(paletteEntry.labelKey)"
            :aria-label="t(paletteEntry.labelKey)"
            @click="selectColor(paletteEntry.color)"
          ></button>
          <button
            type="button"
            :disabled="commands.length === 0"
            :title="t('preview.annotation.undo')"
            :aria-label="t('preview.annotation.undo')"
            @click="undo"
          >
            <Undo2 :size="14" />
          </button>
          <button
            type="button"
            :disabled="commands.length === 0"
            :title="t('preview.annotation.clear')"
            :aria-label="t('preview.annotation.clear')"
            @click="clearAnnotations"
          >
            <Trash2 :size="14" />
          </button>
          <button
            type="button"
            :title="t('preview.annotation.download')"
            :aria-label="t('preview.annotation.download')"
            @click="downloadComposite"
          >
            <Download :size="14" />
          </button>
          <button
            type="button"
            :title="t('preview.annotation.copy')"
            :aria-label="t('preview.annotation.copy')"
            @click="copyComposite"
          >
            <Clipboard :size="14" />
          </button>
        </div>
        <button
          type="button"
          :disabled="previewState === 'capturing' || (previewState === 'live' && !canFreeze)"
          :title="freezeTitle"
          :aria-label="freezeTitle"
          @click="toggleFreeze"
        >
          <LoaderCircle v-if="previewState === 'capturing'" :size="14" class="spin" />
          <Play v-else-if="previewState === 'frozen'" :size="14" />
          <Snowflake v-else :size="14" />
        </button>
        <button
          type="button"
          :title="t('preview.annotation.close')"
          :aria-label="t('preview.annotation.close')"
          @click="close"
        >
          <X :size="14" />
        </button>
      </div>
      <div
        ref="contentRef"
        class="web-preview-content"
        :class="{ frozen: previewState === 'frozen' }"
      >
        <iframe
          ref="iframeRef"
          :src="resolvedSrc"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          @load="onIframeLoad"
        ></iframe>
        <canvas
          v-show="previewState === 'frozen'"
          ref="bitmapCanvasRef"
          class="frozen-bitmap"
        ></canvas>
        <WebAnnotationLayer
          ref="annotationRef"
          :visible="previewState === 'frozen'"
          :enabled="previewState === 'frozen'"
          :width="contentSize.width"
          :height="contentSize.height"
          @commands-changed="commands = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import {
  ArrowRight,
  Clipboard,
  Download,
  LoaderCircle,
  MoveUpRight,
  Pencil,
  Play,
  RectangleHorizontal,
  RotateCw,
  Snowflake,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-vue-next'
import WebAnnotationLayer from './WebAnnotationLayer.vue'
import { getApiBase } from '../../composables/apiBase'
import { useI18n } from '../../composables/useI18n'
import { urlToPreviewSrc } from '../../utils/previewRouting'
import {
  captureViewport,
  compositePng,
  copyPngWithFallback,
  downloadPng,
  type DrawCommand,
  type DrawTool,
} from '../../utils/previewImage'

const PIXEL_CAP = 8_294_400
const CAPTURE_TIMEOUT_MS = 15_000

type PreviewState = 'live' | 'capturing' | 'frozen'
type AnnotationLayerApi = {
  undo: () => void
  clear: (retain?: boolean) => void
  setTool: (tool: DrawTool) => void
  setColor: (color: string) => void
}

const props = defineProps<{
  visible: boolean
  url: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const toast = useToast()
const iframeRef = ref<HTMLIFrameElement>()
const addressInput = ref<HTMLInputElement>()
const contentRef = ref<HTMLElement>()
const bitmapCanvasRef = ref<HTMLCanvasElement>()
const annotationRef = ref<AnnotationLayerApi>()
const addressValue = ref('')
const currentUrl = ref('')
const previewHttpBase = ref('')
const navCounter = ref(0)
const previewState = ref<PreviewState>('live')
const canFreeze = ref(false)
const commands = ref<DrawCommand[]>([])
const selectedTool = ref<DrawTool>('pen')
const selectedColor = ref('#ff3b30')
const contentSize = ref({ width: 0, height: 0 })
const isLandscape = ref(window.innerWidth > window.innerHeight)
const palette = [
  { color: '#ff3b30', labelKey: 'preview.annotation.colorRed' },
  { color: '#ffcc00', labelKey: 'preview.annotation.colorYellow' },
  { color: '#34c759', labelKey: 'preview.annotation.colorGreen' },
  { color: '#007aff', labelKey: 'preview.annotation.colorBlue' },
  { color: '#ffffff', labelKey: 'preview.annotation.colorWhite' },
  { color: '#111111', labelKey: 'preview.annotation.colorBlack' },
]
const toolEntries = [
  { tool: 'pen' as const, icon: Pencil, labelKey: 'preview.annotation.toolPen' },
  { tool: 'arrow' as const, icon: MoveUpRight, labelKey: 'preview.annotation.toolArrow' },
  { tool: 'rect' as const, icon: RectangleHorizontal, labelKey: 'preview.annotation.toolRect' },
  { tool: 'text' as const, icon: Type, labelKey: 'preview.annotation.toolText' },
]
let generation = 0
let frozenBase: HTMLCanvasElement | undefined
let contentResizeObserver: ResizeObserver | undefined
let mounted = false

const resolvedSrc = computed(() => {
  if (!currentUrl.value) return 'about:blank'
  const base = urlToPreviewSrc(currentUrl.value, previewHttpBase.value || undefined)
  const hashIndex = base.indexOf('#')
  const queryTarget = hashIndex >= 0 ? base.slice(0, hashIndex) : base
  const fragment = hashIndex >= 0 ? base.slice(hashIndex) : ''
  const sep = queryTarget.includes('?') ? '&' : '?'
  return `${queryTarget}${sep}_t=${navCounter.value}${fragment}`
})

const direction = computed(() => (isLandscape.value ? 'horizontal' : 'vertical'))

const freezeTitle = computed(() => {
  if (previewState.value === 'capturing') return t('preview.annotation.capturing')
  if (previewState.value === 'frozen') return t('preview.annotation.unfreeze')
  if (!canFreeze.value) return t('preview.annotation.unavailableCrossOrigin')
  return t('preview.annotation.freeze')
})

function updateContentSize() {
  const rect = contentRef.value?.getBoundingClientRect()
  if (rect) contentSize.value = { width: rect.width, height: rect.height }
}

function onResize() {
  isLandscape.value = window.innerWidth > window.innerHeight
  updateContentSize()
}

function releaseCanvas(canvas: HTMLCanvasElement | undefined) {
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
}

function releaseFrozenBitmap() {
  releaseCanvas(frozenBase)
  frozenBase = undefined
  releaseCanvas(bitmapCanvasRef.value)
}

function invalidateCapture(clearCommands = true) {
  generation++
  previewState.value = 'live'
  releaseFrozenBitmap()
  if (clearCommands) annotationRef.value?.clear()
  if (clearCommands) commands.value = []
}

function checkFreezeAvailability() {
  try {
    const doc = iframeRef.value?.contentDocument
    canFreeze.value = !!doc?.documentElement
  } catch {
    canFreeze.value = false
  }
}

function onIframeLoad() {
  invalidateCapture()
  checkFreezeAvailability()
}

watch(
  () => [props.url, props.visible],
  () => {
    invalidateCapture()
    canFreeze.value = false
    if (props.visible && props.url) {
      currentUrl.value = props.url
      addressValue.value = props.url
      navCounter.value++
    }
  },
  { immediate: true }
)

function navigateFromInput() {
  const val = addressValue.value.trim()
  if (!val) return

  if (val.startsWith('http://') || val.startsWith('https://')) {
    currentUrl.value = val
  } else if (val.match(/^:?(\d+)(\/.*)?$/)) {
    const m = val.match(/^:?(\d+)(\/.*)?$/)!
    currentUrl.value = `http://localhost:${m[1]}${m[2] || '/'}`
    addressValue.value = currentUrl.value
  } else if (val.startsWith('/')) {
    try {
      const prev = new URL(currentUrl.value)
      prev.pathname = val
      currentUrl.value = prev.toString()
      addressValue.value = currentUrl.value
    } catch {
      return
    }
  } else {
    currentUrl.value = `http://${val}`
    addressValue.value = currentUrl.value
  }
  invalidateCapture()
  canFreeze.value = false
  navCounter.value++
  addressInput.value?.blur()
}

function refresh() {
  invalidateCapture()
  canFreeze.value = false
  navCounter.value++
}

function close() {
  emit('close')
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function waitForFonts(doc: Document): Promise<void> {
  const fonts = doc.fonts
  if (!fonts) return
  let timer = 0
  try {
    await Promise.race([
      fonts.ready.then(() => undefined),
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, 1000)
      }),
    ])
  } finally {
    window.clearTimeout(timer)
  }
}

function captureWithTimeout(iframe: HTMLIFrameElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      settled = true
      reject(new Error('preview capture timed out'))
    }, CAPTURE_TIMEOUT_MS)

    void captureViewport(iframe, { pixelCap: PIXEL_CAP }).then(
      (canvas) => {
        if (settled) {
          releaseCanvas(canvas)
          return
        }
        settled = true
        window.clearTimeout(timer)
        resolve(canvas)
      },
      (error) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        reject(error)
      }
    )
  })
}

function drawFrozenBitmap() {
  const target = bitmapCanvasRef.value
  if (!target || !frozenBase) throw new Error('frozen bitmap canvas is unavailable')
  target.width = frozenBase.width
  target.height = frozenBase.height
  const ctx = target.getContext('2d')
  if (!ctx) throw new Error('2D canvas is unavailable')
  ctx.drawImage(frozenBase, 0, 0)
}

async function freeze() {
  if (previewState.value !== 'live' || !canFreeze.value) return
  const iframe = iframeRef.value
  let doc: Document | null = null
  try {
    doc = iframe?.contentDocument ?? null
  } catch {}
  if (!iframe || !doc) {
    canFreeze.value = false
    return
  }

  previewState.value = 'capturing'
  const captureGeneration = ++generation
  let captured: HTMLCanvasElement | undefined
  try {
    await waitForFonts(doc)
    await nextFrame()
    await nextFrame()
    if (captureGeneration !== generation) return
    captured = await captureWithTimeout(iframe)
    if (captureGeneration !== generation) {
      releaseCanvas(captured)
      return
    }

    frozenBase = captured
    captured = undefined
    previewState.value = 'frozen'
    await nextTick()
    if (captureGeneration !== generation) return
    drawFrozenBitmap()
    selectTool(selectedTool.value)
    selectColor(selectedColor.value)
  } catch {
    releaseCanvas(captured)
    if (captureGeneration !== generation) return
    releaseFrozenBitmap()
    previewState.value = 'live'
    toast.error(t('preview.annotation.captureFailed'))
  }
}

function unfreeze(retain = false) {
  generation++
  previewState.value = 'live'
  releaseFrozenBitmap()
  annotationRef.value?.clear(retain)
  if (!retain) commands.value = []
  checkFreezeAvailability()
}

function toggleFreeze() {
  if (previewState.value === 'frozen') unfreeze()
  else void freeze()
}

function selectTool(tool: DrawTool) {
  selectedTool.value = tool
  annotationRef.value?.setTool(tool)
}

function selectColor(color: string) {
  selectedColor.value = color
  annotationRef.value?.setColor(color)
}

function undo() {
  annotationRef.value?.undo()
}

function clearAnnotations() {
  annotationRef.value?.clear()
}

async function makeComposite(): Promise<Blob> {
  if (!frozenBase) throw new Error('frozen bitmap is unavailable')
  return compositePng(frozenBase, commands.value)
}

async function downloadComposite() {
  try {
    downloadPng(await makeComposite(), t('preview.annotation.filename'))
  } catch {
    toast.error(t('preview.annotation.exportFailed'))
  }
}

async function copyComposite() {
  try {
    const tier = await copyPngWithFallback(await makeComposite(), t)
    if (tier === 'download') toast.info(t('preview.annotation.copyDownloaded'))
    else toast.success(t('preview.annotation.copySucceeded'))
  } catch {
    toast.error(t('preview.annotation.copyFailed'))
  }
}

function startDrag(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('.web-preview') as HTMLElement
  const parent = el?.parentElement
  if (!parent) return

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:col-resize;'
  document.body.appendChild(overlay)

  const onMove = (ev: MouseEvent) => {
    const rect = parent.getBoundingClientRect()
    const horiz = direction.value === 'horizontal'
    const total = horiz ? rect.width : rect.height
    const mousePos = horiz ? ev.clientX - rect.left : ev.clientY - rect.top
    const termPct = Math.max(15, Math.min(85, (mousePos / total) * 100))
    const termChild = parent.querySelector(':scope > .terminal-pane-container') as HTMLElement
    const previewChild = parent.querySelector(':scope > .web-preview') as HTMLElement
    if (termChild) termChild.style.flex = `0 0 ${termPct}%`
    if (previewChild) previewChild.style.flex = `0 0 ${100 - termPct}%`
  }
  const onUp = () => {
    overlay.remove()
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.dispatchEvent(new Event('resize'))
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

function startDragTouch(e: TouchEvent) {
  const el = (e.target as HTMLElement).closest('.web-preview') as HTMLElement
  const parent = el?.parentElement
  if (!parent) return

  const onMove = (ev: TouchEvent) => {
    const rect = parent.getBoundingClientRect()
    const touch = ev.touches[0]
    const horiz = direction.value === 'horizontal'
    const total = horiz ? rect.width : rect.height
    const touchPos = horiz ? touch.clientX - rect.left : touch.clientY - rect.top
    const termPct = Math.max(15, Math.min(85, (touchPos / total) * 100))
    const termChild = parent.querySelector(':scope > .terminal-pane-container') as HTMLElement
    const previewChild = parent.querySelector(':scope > .web-preview') as HTMLElement
    if (termChild) termChild.style.flex = `0 0 ${termPct}%`
    if (previewChild) previewChild.style.flex = `0 0 ${100 - termPct}%`
  }
  const onEnd = () => {
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
    window.dispatchEvent(new Event('resize'))
  }
  window.addEventListener('touchmove', onMove)
  window.addEventListener('touchend', onEnd)
}

onMounted(async () => {
  mounted = true
  window.addEventListener('resize', onResize)
  contentResizeObserver = new ResizeObserver(updateContentSize)
  if (contentRef.value) contentResizeObserver.observe(contentRef.value)
  updateContentSize()
  const base = await getApiBase()
  if (mounted) previewHttpBase.value = base
})

onBeforeUnmount(() => {
  mounted = false
  generation++
  releaseFrozenBitmap()
  contentResizeObserver?.disconnect()
  window.removeEventListener('resize', onResize)
})
</script>

<style scoped>
.web-preview {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.web-preview.horizontal {
  flex-direction: row;
  height: 100%;
}

.web-preview.vertical {
  flex-direction: column;
  width: 100%;
}

.web-preview-divider {
  flex-shrink: 0;
  background: var(--border);
  transition: background 0.15s;
  z-index: 2;
}

.web-preview.horizontal .web-preview-divider {
  width: 6px;
  cursor: col-resize;
}

.web-preview.vertical .web-preview-divider {
  height: 6px;
  cursor: row-resize;
}

.web-preview-divider:hover {
  background: var(--accent, #89b4fa);
}

.web-preview-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.web-preview-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--tab-bg);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.web-preview-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--fg-muted, #888);
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 3px;
  cursor: pointer;
}

.web-preview-toolbar button:hover:not(:disabled),
.web-preview-toolbar button.active {
  color: var(--fg);
  background: var(--tab-hover-bg, #333);
}

.web-preview-toolbar button:disabled {
  opacity: 0.35;
  cursor: default;
}

.web-preview-address {
  flex: 1;
  min-width: 80px;
  display: flex;
  align-items: center;
  background: var(--bg, #1a1a1a);
  border: 1px solid var(--border);
  border-radius: 3px;
}

.web-preview-address:focus-within {
  border-color: var(--accent, #89b4fa);
}

.web-preview-address input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 2px 8px;
  outline: none;
}

.go-btn {
  flex-shrink: 0;
}

.annotation-tools {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.toolbar-separator {
  width: 1px;
  height: 16px;
  margin: 0 2px;
  background: var(--border);
}

.web-preview-toolbar .color-button {
  width: 15px;
  height: 15px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  background: var(--annotation-color);
  box-shadow: 0 0 0 1px rgb(127 127 127 / 60%);
}

.web-preview-toolbar .color-button.active {
  border-color: var(--fg);
  background: var(--annotation-color);
}

.web-preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #fff;
  min-height: 0;
}

.web-preview-content iframe,
.frozen-bitmap {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: none;
  background: #fff;
}

.web-preview-content.frozen iframe {
  pointer-events: none;
}

.frozen-bitmap {
  z-index: 2;
}

.spin {
  animation: preview-spin 0.8s linear infinite;
}

@keyframes preview-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
