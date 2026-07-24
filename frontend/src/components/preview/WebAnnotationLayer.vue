<template>
  <div
    v-show="visible"
    ref="layerRef"
    class="web-annotation-layer"
    :class="{ enabled }"
    :style="layerStyle"
  >
    <canvas
      ref="canvasRef"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    ></canvas>
    <input
      v-if="textInput"
      ref="textInputRef"
      v-model="textValue"
      class="annotation-text-input"
      :style="textInputStyle"
      :placeholder="t('preview.annotation.textPlaceholder')"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
      @keydown.enter="onTextEnter"
      @keydown.escape="onTextEscape"
      @blur="onTextBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../composables/useI18n'
import {
  renderDrawCommands,
  type CaptureBasis,
  type DrawCommand,
  type DrawTool,
} from '../../utils/previewImage'

const props = defineProps<{
  visible: boolean
  enabled: boolean
  pageWidth: number
  pageHeight: number
  basis: CaptureBasis
}>()

const emit = defineEmits<{
  commandsChanged: [commands: DrawCommand[]]
}>()

const { t } = useI18n()
const layerRef = ref<HTMLElement>()
const canvasRef = ref<HTMLCanvasElement>()
const textInputRef = ref<HTMLInputElement>()
const commands = ref<DrawCommand[]>([])
const activeCommand = ref<DrawCommand>()
const tool = ref<DrawTool>('pen')
const color = ref('#ff3b30')
const textInput = ref<{ x: number; y: number }>()
const textValue = ref('')
let composing = false
let resizeObserver: ResizeObserver | undefined

const layerStyle = computed(() => ({
  width: `${Math.max(1, props.pageWidth)}px`,
  height: `${Math.max(1, props.pageHeight)}px`,
}))

const textInputStyle = computed(() => ({
  left: `${textInput.value?.x ?? 0}px`,
  top: `${textInput.value?.y ?? 0}px`,
  color: color.value,
}))

function canvasSize() {
  return {
    width: Math.max(1, props.pageWidth),
    height: Math.max(1, props.pageHeight),
  }
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  const { width, height } = canvasSize()
  const dpr = Math.max(1, window.devicePixelRatio || 1)
  const rasterScale = Math.max(0.01, dpr * Math.min(1, props.basis.capturedScale))
  const pixelWidth = Math.max(1, Math.round(width * rasterScale))
  const pixelHeight = Math.max(1, Math.round(height * rasterScale))
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(rasterScale, 0, 0, rasterScale, 0, 0)
  ctx.clearRect(0, 0, width, height)
  renderDrawCommands(
    ctx,
    activeCommand.value ? [...commands.value, activeCommand.value] : commands.value,
    props.basis,
    width,
    height
  )
}

function pagePoint(event: PointerEvent): [number, number] {
  const rect = canvasRef.value!.getBoundingClientRect()
  return [
    Math.max(
      0,
      Math.min(
        props.pageWidth,
        ((event.clientX - rect.left) / Math.max(1, rect.width)) * props.pageWidth
      )
    ),
    Math.max(
      0,
      Math.min(
        props.pageHeight,
        ((event.clientY - rect.top) / Math.max(1, rect.height)) * props.pageHeight
      )
    ),
  ]
}

function onPointerDown(event: PointerEvent) {
  if (!props.enabled || event.button !== 0) return
  const [x, y] = pagePoint(event)
  if (tool.value === 'text') {
    textInput.value = { x, y }
    textValue.value = ''
    nextTick(() => textInputRef.value?.focus())
    return
  }

  canvasRef.value?.setPointerCapture?.(event.pointerId)
  activeCommand.value = {
    tool: tool.value,
    points: [x, y, x, y],
    color: color.value,
    width: 3,
  }
  render()
}

function onPointerMove(event: PointerEvent) {
  const command = activeCommand.value
  if (!command || !props.enabled) return
  updateCommandEndpoint(command, event)
  render()
}

function updateCommandEndpoint(command: DrawCommand, event: PointerEvent) {
  const [x, y] = pagePoint(event)
  if (command.tool === 'pen') {
    const last = command.points.length - 2
    if (command.points[last] !== x || command.points[last + 1] !== y) command.points.push(x, y)
  } else {
    command.points.splice(2, 2, x, y)
  }
}

function releasePointer(event: PointerEvent) {
  if (canvasRef.value?.hasPointerCapture?.(event.pointerId)) {
    canvasRef.value.releasePointerCapture(event.pointerId)
  }
}

function onPointerUp(event: PointerEvent) {
  const command = activeCommand.value
  if (!command) return
  updateCommandEndpoint(command, event)
  releasePointer(event)
  activeCommand.value = undefined
  pushCommand(command)
}

function onPointerCancel(event: PointerEvent) {
  if (!activeCommand.value) return
  releasePointer(event)
  activeCommand.value = undefined
  render()
}

function pushCommand(command: DrawCommand) {
  commands.value.push(command)
  if (commands.value.length > 100) commands.value.splice(0, commands.value.length - 100)
  emitCommands()
  render()
}

function emitCommands() {
  emit(
    'commandsChanged',
    commands.value.map((command) => ({ ...command, points: [...command.points] }))
  )
}

function onCompositionStart() {
  composing = true
}

function onCompositionEnd() {
  nextTick(() => {
    composing = false
  })
}

function isComposing(event: KeyboardEvent): boolean {
  return composing || event.isComposing || event.keyCode === 229
}

function onTextEnter(event: KeyboardEvent) {
  if (isComposing(event)) return
  event.preventDefault()
  commitText()
}

function onTextEscape(event: KeyboardEvent) {
  if (isComposing(event)) return
  event.preventDefault()
  cancelText()
}

function onTextBlur() {
  if (composing) return
  commitText()
}

function commitText() {
  const position = textInput.value
  const value = textValue.value.trim()
  if (!position) return
  textInput.value = undefined
  textValue.value = ''
  if (value) {
    pushCommand({
      tool: 'text',
      points: [position.x, position.y],
      color: color.value,
      fontSize: 20,
      text: value,
    })
  }
}

function cancelText() {
  textInput.value = undefined
  textValue.value = ''
}

function setTool(value: DrawTool) {
  tool.value = value
  cancelText()
}

function setColor(value: string) {
  color.value = value
}

function undo() {
  if (!commands.value.length) return
  commands.value.pop()
  emitCommands()
  render()
}

function clear(retain = false) {
  activeCommand.value = undefined
  cancelText()
  if (retain) {
    render()
    return
  }
  commands.value = []
  emitCommands()
  render()
}

function getCommands(): DrawCommand[] {
  return commands.value.map((command) => ({ ...command, points: [...command.points] }))
}

function basisMatches(left: CaptureBasis, right: CaptureBasis): boolean {
  return (
    left.documentWidthCss === right.documentWidthCss &&
    left.documentHeightCss === right.documentHeightCss &&
    Math.abs(left.capturedScale - right.capturedScale) < 1e-9
  )
}

function setCommands(nextCommands: DrawCommand[], storedBasis: CaptureBasis): boolean {
  commands.value = nextCommands.map((command) => ({ ...command, points: [...command.points] }))
  activeCommand.value = undefined
  cancelText()
  render()
  return !basisMatches(storedBasis, props.basis)
}

watch(
  () => [
    props.pageWidth,
    props.pageHeight,
    props.basis.documentWidthCss,
    props.basis.documentHeightCss,
    props.basis.capturedScale,
    props.visible,
  ],
  render
)

onMounted(() => {
  resizeObserver = new ResizeObserver(render)
  if (layerRef.value) resizeObserver.observe(layerRef.value)
  window.addEventListener('resize', render)
  render()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', render)
})

defineExpose({ undo, clear, setTool, setColor, getCommands, setCommands })
</script>

<style scoped>
.web-annotation-layer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
}

.web-annotation-layer.enabled {
  pointer-events: auto;
  cursor: crosshair;
}

.web-annotation-layer canvas {
  display: block;
  touch-action: none;
}

.annotation-text-input {
  position: absolute;
  z-index: 4;
  min-width: 120px;
  max-width: 50%;
  padding: 2px 4px;
  border: 1px solid currentColor;
  background: rgb(255 255 255 / 90%);
  font: 20px sans-serif;
  outline: none;
  transform: translateY(-2px);
}
</style>
