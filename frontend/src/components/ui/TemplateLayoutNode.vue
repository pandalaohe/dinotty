<template>
  <div
    v-if="isSplit(node)"
    class="tln-split"
    :style="splitStyle"
  >
    <div
      v-for="(child, i) in node.children"
      :key="childKey(child, i)"
      class="tln-child"
      :style="childStyle(node, i)"
    >
      <TemplateLayoutNode :node="child" />
    </div>
  </div>
  <div v-else class="tln-leaf">
    <div class="tln-leaf-row">
      <component :is="kindIcon(node)" :size="16" class="tln-icon" />
      <span v-if="node.title" class="tln-title" :title="node.title">{{ node.title }}</span>
      <span v-else class="tln-title tln-title-placeholder">{{ kindLabel(node) }}</span>
    </div>
    <div v-if="subtitle" class="tln-subtitle" :title="subtitle">{{ subtitle }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Terminal, Puzzle, Folder, Globe } from 'lucide-vue-next'
import { useI18n } from '../../composables/useI18n'
import { paneKind } from '../../types/pane'
import type { PaneLayout, LeafPane, SplitPane } from '../../types/pane'

interface TemplateLeaf extends LeafPane {
  cwd?: string
  startup_command?: string
}

const props = defineProps<{
  node: PaneLayout
}>()

const { t } = useI18n()

function isSplit(node: PaneLayout): node is SplitPane {
  return node.type === 'split'
}

const leafNode = computed(() => (isSplit(props.node) ? null : (props.node as TemplateLeaf)))

const subtitle = computed(() => {
  const leaf = leafNode.value
  if (!leaf) return ''
  if (leaf.startup_command) return leaf.startup_command
  if (leaf.path) return leaf.path
  if (leaf.url) return leaf.url
  if (leaf.pluginId) return leaf.pluginId
  if (leaf.cwd) return leaf.cwd
  return ''
})

const splitStyle = computed<{
  display: string
  gap: string
  minWidth: string
  minHeight: string
  flex: string
  flexDirection: 'column' | 'row'
}>(() => {
  if (!isSplit(props.node)) {
    return {
      display: 'flex',
      gap: '5px',
      minWidth: '0',
      minHeight: '0',
      flex: '1 1 auto',
      flexDirection: 'row',
    }
  }
  return {
    display: 'flex',
    gap: '5px',
    minWidth: '0',
    minHeight: '0',
    flex: '1 1 auto',
    flexDirection: props.node.direction === 'vertical' ? 'column' : 'row',
  }
})

function childKey(child: PaneLayout, index: number): string | number {
  if (child.type === 'leaf') return child.paneId
  return child.id || index
}

function childStyle(node: SplitPane, index: number): {
  flex: string
  minWidth: string
  minHeight: string
  display: string
  flexDirection: 'column' | 'row'
} {
  return {
    flex: `${node.ratios[index] ?? 1 / node.children.length} 1 0%`,
    minWidth: '0',
    minHeight: '0',
    display: 'flex',
    flexDirection: node.direction === 'vertical' ? 'column' : 'row',
  }
}

function kindLabel(leaf: LeafPane): string {
  const k = paneKind(leaf)
  if (k === 'terminal') return t('template.terminalPane')
  if (k === 'plugin') return t('template.pluginPane')
  if (k === 'files') return t('template.filesPane')
  if (k === 'web') return t('template.webPane')
  return k
}

function kindIcon(leaf: LeafPane) {
  const k = paneKind(leaf)
  if (k === 'plugin') return Puzzle
  if (k === 'files') return Folder
  if (k === 'web') return Globe
  return Terminal
}
</script>

<style scoped>
.tln-split {
  border-radius: var(--radius);
  overflow: hidden;
}
.tln-child {
  border-radius: var(--radius);
  overflow: hidden;
}
.tln-leaf {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  min-height: 64px;
  flex: 1 1 auto;
}
.tln-leaf-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.tln-icon {
  color: var(--fg-muted);
  flex-shrink: 0;
}
.tln-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--fg-bright);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.tln-title-placeholder {
  color: var(--fg-muted);
  font-weight: 400;
}
.tln-subtitle {
  font-size: 12px;
  color: var(--fg-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
</style>
