<template>
  <div>
    <section class="settings-section">
      <h3>{{ t('settings.tab.workspaces') }}</h3>

      <div v-if="workspaces.length === 0" class="ws-empty-hint">
        {{ t('workspace.firstUse') }}
      </div>

      <div
        v-for="ws in workspaces"
        :key="ws.id"
        class="settings-row ws-row"
        :class="{ 'ws-drag-over': dragOverId === ws.id && dragId !== ws.id }"
        draggable="true"
        @dragstart="onDragStart($event, ws.id)"
        @dragover.prevent="onDragOver($event, ws.id)"
        @dragleave="onDragLeave(ws.id)"
        @drop.prevent="onDrop(ws.id)"
        @dragend="onDragEnd"
      >
        <div class="ws-row-main">
          <span
            class="ws-drag-handle"
            :title="t('workspace.delete')"
          ><GripVertical :size="14" /></span>
          <span
            class="ws-active-dot"
            :class="{ active: ws.id === activeWorkspaceId }"
            :title="ws.id === activeWorkspaceId ? t('workspace.deactivate') : t('workspace.activate')"
            @click="onToggleActive(ws.id)"
          >{{ ws.id === activeWorkspaceId ? '●' : '○' }}</span>
          <div class="ws-name-wrap">
            <input
              v-if="editingId === ws.id"
              ref="editInputRef"
              class="ws-name-input"
              :value="editValue"
              @input="editValue = ($event.target as HTMLInputElement).value"
              @blur="finishEdit(ws.id)"
              @keydown.enter="finishEdit(ws.id)"
              @keydown.escape="cancelEdit"
            />
            <span
              v-else
              class="ws-name"
              @dblclick="startEdit(ws)"
            >{{ ws.name }}</span>
            <span class="ws-path-display">{{ ws.path }}</span>
          </div>
          <button
            class="ws-delete-btn"
            :title="t('workspace.delete')"
            @click="onDelete(ws.id, ws.name)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </section>

    <section class="settings-section">
      <h3>{{ t('workspace.add') }}</h3>
      <div class="settings-row">
        <input
          v-model="newPath"
          class="ws-add-input"
          :placeholder="t('workspace.path')"
          @keydown.enter="onAdd"
        />
      </div>
      <div class="settings-row">
        <input
          v-model="newName"
          class="ws-add-input"
          :placeholder="t('workspace.name') + ' (' + t('workspace.path').toLowerCase() + ')'"
          @keydown.enter="onAdd"
        />
      </div>
      <div class="settings-row">
        <button class="ws-add-confirm" :disabled="!newPath.trim()" @click="onAdd">
          {{ t('workspace.add') }}
        </button>
      </div>
      <p v-if="addError" class="ws-error">{{ addError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Trash2, GripVertical } from 'lucide-vue-next'
import { useI18n } from '../../composables/useI18n'
import { useWorkspaces } from '../../composables/useWorkspaces'
import type { Workspace } from '../../types/workspace'

const { t } = useI18n()
const {
  workspaces,
  activeWorkspaceId,
  activateWorkspace,
  createWorkspace,
  deleteWorkspace,
  updateWorkspace,
  reorderWorkspaces,
} = useWorkspaces()

// Add form
const newPath = ref('')
const newName = ref('')
const addError = ref('')

async function onAdd() {
  const path = newPath.value.trim()
  if (!path) return
  addError.value = ''
  try {
    await createWorkspace(path, newName.value.trim() || undefined)
    newPath.value = ''
    newName.value = ''
  } catch (e: any) {
    addError.value = e?.message || 'Failed to create workspace'
  }
}

// Delete
async function onDelete(id: string, name: string) {
  if (!confirm(`${t('workspace.delete')} "${name}"?`)) return
  try {
    await deleteWorkspace(id)
  } catch (e) {
    console.error('Failed to delete workspace:', e)
  }
}

// Toggle active
async function onToggleActive(id: string) {
  try {
    if (activeWorkspaceId.value === id) {
      await activateWorkspace(null)
    } else {
      await activateWorkspace(id)
    }
  } catch (e) {
    console.error('Failed to toggle workspace:', e)
  }
}

// Inline rename
const editingId = ref<string | null>(null)
const editValue = ref('')
const editInputRef = ref<HTMLInputElement[] | null>(null)

function startEdit(ws: Workspace) {
  editingId.value = ws.id
  editValue.value = ws.name
  nextTick(() => {
    const input = editInputRef.value?.[0]
    if (input) {
      input.focus()
      input.select()
    }
  })
}

async function finishEdit(id: string) {
  if (editingId.value !== id) return
  const val = editValue.value.trim()
  editingId.value = null
  if (val) {
    try {
      await updateWorkspace(id, { name: val })
    } catch (e) {
      console.error('Failed to rename workspace:', e)
    }
  }
}

function cancelEdit() {
  editingId.value = null
}

// Drag-to-reorder
const dragId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

function onDragStart(e: DragEvent, id: string) {
  dragId.value = id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

function onDragOver(_e: DragEvent, id: string) {
  if (dragId.value && dragId.value !== id) {
    dragOverId.value = id
  }
}

function onDragLeave(id: string) {
  if (dragOverId.value === id) {
    dragOverId.value = null
  }
}

async function onDrop(targetId: string) {
  dragOverId.value = null
  const sourceId = dragId.value
  if (!sourceId || sourceId === targetId) return

  const ids = workspaces.value.map((w) => w.id)
  const fromIdx = ids.indexOf(sourceId)
  const toIdx = ids.indexOf(targetId)
  if (fromIdx < 0 || toIdx < 0) return

  ids.splice(fromIdx, 1)
  ids.splice(toIdx, 0, sourceId)

  try {
    await reorderWorkspaces(ids)
  } catch (e) {
    console.error('Failed to reorder workspaces:', e)
  }
}

function onDragEnd() {
  dragId.value = null
  dragOverId.value = null
}
</script>

<style scoped>
.ws-empty-hint {
  font-size: 13px;
  color: var(--text-muted, #888);
  padding: 8px 0;
}
.ws-row {
  align-items: flex-start;
}
.ws-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.ws-active-dot {
  flex-shrink: 0;
  cursor: pointer;
  font-size: 14px;
  width: 20px;
  text-align: center;
  color: var(--text-muted, #888);
  user-select: none;
}
.ws-active-dot.active {
  color: var(--accent);
}
.ws-name-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.ws-name {
  font-size: 13px;
  color: var(--fg-bright);
  cursor: default;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ws-name-input {
  background: var(--bg-input, #2a2a2a);
  border: 1px solid var(--accent, #8a8a8a);
  border-radius: 3px;
  color: inherit;
  font: inherit;
  font-size: 13px;
  padding: 2px 6px;
  outline: none;
  width: 100%;
  max-width: 200px;
}
.ws-path-display {
  font-size: 11px;
  color: var(--text-muted, #888);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ws-delete-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-muted, #888);
  opacity: 0.6;
  display: flex;
  align-items: center;
  transition: opacity 0.15s;
}
.ws-delete-btn:hover {
  opacity: 1;
  color: var(--color-red, #ef4444);
}
.ws-add-input {
  background: var(--bg-input, #2a2a2a);
  border: 1px solid var(--border, #444);
  border-radius: 4px;
  color: inherit;
  font: inherit;
  font-size: 13px;
  padding: 6px 10px;
  outline: none;
  width: 100%;
}
.ws-add-input:focus {
  border-color: var(--accent);
}
.ws-add-confirm {
  padding: 6px 16px;
  border: none;
  border-radius: 4px;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.ws-add-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ws-error {
  font-size: 12px;
  color: var(--color-red, #ef4444);
  margin: 4px 0 0;
}
.ws-drag-handle {
  flex-shrink: 0;
  cursor: grab;
  color: var(--text-muted, #888);
  opacity: 0.5;
  display: flex;
  align-items: center;
  padding: 2px;
}
.ws-drag-handle:hover {
  opacity: 1;
}
.ws-drag-over {
  border-top: 2px solid var(--accent);
}
</style>
