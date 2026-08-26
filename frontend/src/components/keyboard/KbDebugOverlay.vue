<template>
  <!-- TEMPORARY diagnostics for the iPhone builtin-keyboard positioning bug.
       Enabled via #kbdebug (or ?kbdebug) in the URL, or seven version-value taps;
       remove once the root cause is identified and fixed. pointer-events:none so it never steals taps. -->
  <div class="kb-debug-overlay" aria-hidden="true">
    <div v-for="(line, i) in lines" :key="i">{{ line }}</div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const lines = ref<string[]>([])

function activeElementDesc(): string {
  const el = document.activeElement
  if (!el || el === document.body) return 'body'
  const cls =
    el instanceof HTMLElement && el.classList.length
      ? '.' + Array.from(el.classList).slice(0, 3).join('.')
      : ''
  return el.tagName.toLowerCase() + cls
}

function elementLine(id: string): string {
  const el = document.getElementById(id)
  if (!el) return id + ': not rendered'
  const rect = el.getBoundingClientRect()
  const cs = getComputedStyle(el)
  return (
    id +
    ': disp=' +
    cs.display +
    ' bot=' +
    cs.bottom +
    ' padB=' +
    cs.paddingBottom +
    ' rect[t=' +
    Math.round(rect.top) +
    ' b=' +
    Math.round(rect.bottom) +
    ' h=' +
    Math.round(rect.height) +
    ']'
  )
}

function appRootLine(): string {
  const el = document.getElementById('app-root')
  if (!el) return 'app-root: not rendered'
  const cs = getComputedStyle(el)
  const rect = el.getBoundingClientRect()
  const cls = Array.from(el.classList)
    .filter((c) => c.startsWith('system-'))
    .join('.')
  return (
    'app-root: cls=' +
    (cls || '(none)') +
    ' pos=' +
    cs.position +
    ' bot=' +
    cs.bottom +
    ' h=' +
    cs.height +
    ' rect[t=' +
    Math.round(rect.top) +
    ' b=' +
    Math.round(rect.bottom) +
    ' h=' +
    Math.round(rect.height) +
    ']'
  )
}

function sample() {
  const vv = window.visualViewport
  const ds = document.documentElement.style
  const documentStyle = getComputedStyle(document.documentElement)
  const rect = document.getElementById('system-mobile-kb')?.getBoundingClientRect()
  const ua = navigator.userAgent
  const isIphone = /iPhone|iPod/i.test(ua)
  const isIpad = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchstart' in window)
  const out: string[] = [
    'client: ' +
      (isIphone ? 'iPhone' : isIpad ? 'iPad' : '?') +
      ' pwa=' +
      ((navigator as Navigator & { standalone?: boolean }).standalone === true ? 'nav' : '-') +
      (window.matchMedia('(display-mode: standalone)').matches ? '/sa' : '/-') +
      (window.matchMedia('(display-mode: fullscreen)').matches ? '/fs' : '/-') +
      ' dpr=' +
      window.devicePixelRatio,
    'win: ' +
      window.innerWidth +
      'x' +
      window.innerHeight +
      ' doc=' +
      document.documentElement.clientWidth +
      'x' +
      document.documentElement.clientHeight,
    'vv: h=' +
      (vv ? Math.round(vv.height) : 'n/a') +
      ' top=' +
      (vv ? Math.round(vv.offsetTop) : 'n/a') +
      ' pageTop=' +
      (vv ? Math.round(vv.pageTop) : 'n/a') +
      ' w=' +
      (vv ? Math.round(vv.width) : 'n/a') +
      ' scale=' +
      (vv ? vv.scale.toFixed(2) : 'n/a'),
    'kbTop(lv): ' + (vv ? Math.round(vv.offsetTop + vv.height) : 'n/a'),
    'vars: height=' +
      (ds.getPropertyValue('--sys-kb-height') || '(unset)') +
      ' pan=' +
      (ds.getPropertyValue('--vv-pan') || '(unset)') +
      ' mkb=' +
      (ds.getPropertyValue('--mkb-height') || '(unset)') +
      ' tbBot=' +
      (ds.getPropertyValue('--system-toolbar-bottom') || '(unset)') +
      ' overlap=' +
      (ds.getPropertyValue('--kb-overlap') || '(unset)') +
      ' capsule=' +
      (ds.getPropertyValue('--kb-capsule-reclaim') || '(unset)') +
      ' safeBot=' +
      (documentStyle.getPropertyValue('--safe-area-bottom') || '(unset)') +
      ' open=' +
      (ds.getPropertyValue('--kb-open') || '(unset)'),
    appRootLine(),
    elementLine('mobile-kb'),
    elementLine('system-mobile-kb'),
    'outerGap: ' + (rect ? Math.round(window.innerHeight - rect.bottom) : 'n/a'),
    'focus: ' + activeElementDesc(),
  ]
  lines.value = out
}

let timer = 0
function onVvChange() {
  sample()
}

onMounted(() => {
  sample()
  timer = window.setInterval(sample, 400)
  window.visualViewport?.addEventListener('resize', onVvChange)
  window.visualViewport?.addEventListener('scroll', onVvChange)
})

onBeforeUnmount(() => {
  window.clearInterval(timer)
  window.visualViewport?.removeEventListener('resize', onVvChange)
  window.visualViewport?.removeEventListener('scroll', onVvChange)
})
</script>

<style scoped>
.kb-debug-overlay {
  position: fixed;
  top: 4px;
  left: 4px;
  z-index: 10000;
  max-width: 92vw;
  padding: 5px 7px;
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: var(--bg-surface);
  color: var(--fg);
  font-family: monospace;
  font-size: 10px;
  line-height: 1.4;
  white-space: pre;
  pointer-events: none;
  opacity: 0.94;
}
</style>
