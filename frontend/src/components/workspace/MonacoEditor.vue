<template>
  <div ref="containerRef" class="monaco-editor-wrap"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as monaco from 'monaco-editor'
import { onThemeChange } from '../../composables/useSettings'
import { registerLanguageCompletions } from './languageCompletions'

const props = withDefaults(
  defineProps<{
    modelValue: string
    language?: string
    readonly?: boolean
  }>(),
  { language: 'plaintext', readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: []
}>()

const containerRef = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let ignoreChange = false

function getTheme(): string {
  const root = document.documentElement
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  if (!bg) return 'vs-dark'
  const r = parseInt(bg.slice(1, 3), 16) || 0
  const g = parseInt(bg.slice(3, 5), 16) || 0
  const b = parseInt(bg.slice(5, 7), 16) || 0
  return (r + g + b) / 3 < 128 ? 'vs-dark' : 'vs'
}

onMounted(() => {
  if (!containerRef.value) return
  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language,
    theme: getTheme(),
    readOnly: props.readonly,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontSize: 13,
    lineNumbers: 'on',
    wordWrap: 'on',
    quickSuggestions: true,
    suggestOnTriggerCharacters: true,
    tabSize: 2,
    renderWhitespace: 'selection',
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  })

  editor.onDidChangeModelContent(() => {
    if (ignoreChange) return
    const val = editor!.getValue()
    emit('update:modelValue', val)
  })

  registerLanguageCompletions(props.language)

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    emit('save')
  })
})

const unsubTheme = onThemeChange(() => {
  if (editor) {
    monaco.editor.setTheme(getTheme())
  }
})

onBeforeUnmount(() => {
  unsubTheme()
  editor?.dispose()
  editor = null
})

watch(() => props.modelValue, (val) => {
  if (!editor) return
  if (editor.getValue() === val) return
  ignoreChange = true
  editor.setValue(val)
  ignoreChange = false
})

watch(() => props.language, (lang) => {
  if (!editor) return
  registerLanguageCompletions(lang)
  const model = editor.getModel()
  if (model) monaco.editor.setModelLanguage(model, lang)
})

watch(() => props.readonly, (ro) => {
  editor?.updateOptions({ readOnly: ro })
})
</script>

<style scoped>
.monaco-editor-wrap {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
</style>
