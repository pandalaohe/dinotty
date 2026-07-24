import { computed, onBeforeUnmount, watch, type Ref } from 'vue'
import { isTouchDevice } from '../utils/terminalInput'

export interface KeyboardOverlapGate {
  touchDevice: boolean
  imeOccluding: boolean
  kbVisible: boolean
  textInputFocused: boolean
  isSingleTerminalTab: boolean
  hasVerticalPreview: boolean
}

export interface KeyboardOverlapInputs {
  settingPx: Ref<number>
  imeOccluding: Ref<boolean>
  kbVisible: Ref<boolean>
  textInputFocused: Ref<boolean>
  isSingleTerminalTab: Ref<boolean>
  hasVerticalPreview: Ref<boolean>
}

export function computeOverlapPx(settingPx: number, gate: KeyboardOverlapGate): number {
  const overlapActive =
    gate.touchDevice &&
    gate.imeOccluding &&
    gate.kbVisible &&
    gate.textInputFocused &&
    gate.isSingleTerminalTab &&
    !gate.hasVerticalPreview

  return overlapActive ? settingPx : 0
}

export function useKeyboardOverlap(inputs: KeyboardOverlapInputs) {
  const touchDevice = isTouchDevice()
  const overlapActive = computed(
    () =>
      touchDevice &&
      inputs.imeOccluding.value &&
      inputs.kbVisible.value &&
      inputs.textInputFocused.value &&
      inputs.isSingleTerminalTab.value &&
      !inputs.hasVerticalPreview.value
  )
  const overlapPx = computed(() =>
    computeOverlapPx(inputs.settingPx.value, {
      touchDevice,
      imeOccluding: inputs.imeOccluding.value,
      kbVisible: inputs.kbVisible.value,
      textInputFocused: inputs.textInputFocused.value,
      isSingleTerminalTab: inputs.isSingleTerminalTab.value,
      hasVerticalPreview: inputs.hasVerticalPreview.value,
    })
  )

  let lastWritten: number | undefined
  function writeOverlap(value: number) {
    if (value === lastWritten) return
    lastWritten = value
    document.documentElement.style.setProperty('--kb-overlap', `${value}px`)
  }

  const stop = watch(overlapPx, writeOverlap, { immediate: true, flush: 'sync' })

  onBeforeUnmount(() => {
    stop()
    writeOverlap(0)
  })

  return { overlapActive, overlapPx }
}
