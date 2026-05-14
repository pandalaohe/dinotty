<template>
  <div class="notification-panel" :class="{ visible: panelVisible }">
    <div class="panel-header">
      <span class="panel-title">{{ t('notification.title') }}</span>
      <button class="panel-pin" :class="{ active: panelPinned }" :title="t('notification.pin')" @click="togglePin">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"/><path d="M5 17h14"/><path d="M7 11l-2 6h14l-2-6"/></svg>
      </button>
    </div>
    <div class="panel-list">
      <NotificationCard
        v-for="n in notifications"
        :key="n.id"
        :type="n.type"
        :title="n.title"
        :body="n.body"
        :timestamp="n.timestamp"
        :pane-label="paneLabels[n.paneId]"
        @dismiss="dismissOne(n.id)"
        @goto="$emit('goto-pane', n.paneId)"
      />
      <div v-if="notifications.length === 0" class="panel-empty">{{ t('notification.empty') }}</div>
    </div>
    <button v-if="notifications.length > 0" class="panel-clear" @click="clearAll">{{ t('notification.clearAll') }}</button>
  </div>
</template>

<script setup lang="ts">
import { useNotification } from '../composables/useNotification'
import { useI18n } from '../composables/useI18n'
import NotificationCard from './NotificationCard.vue'

defineProps<{
  paneLabels: Record<string, string>
}>()

defineEmits<{ 'goto-pane': [paneId: string] }>()

const { notifications, panelVisible, panelPinned, dismissOne, clearAll, togglePin } = useNotification()
const { t } = useI18n()
</script>

<style scoped>
.notification-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  overflow: hidden;
  flex-shrink: 0;
  transform: translateX(100%);
  transition: transform 0.25s ease;
  border-left: 1px solid var(--border, #333);
  background: var(--bg-surface, #1e1e2e);
  display: flex;
  flex-direction: column;
  z-index: 10;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
}
.notification-panel.visible {
  transform: translateX(0);
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--divider, #333);
  flex-shrink: 0;
}
.panel-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--fg-muted, #888);
}
.panel-pin {
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.15s, transform 0.15s;
  color: var(--fg-muted, #888);
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 4px;
}
.panel-pin:hover { opacity: 0.7; }
.panel-pin.active { opacity: 1; transform: rotate(-45deg); color: var(--accent, #4d7fff); }
.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-empty {
  text-align: center;
  color: var(--fg-muted, #666);
  font-size: 12px;
  padding: 24px 0;
}
.panel-clear {
  margin: 8px 12px 12px;
  padding: 6px 0;
  background: none;
  border: 1px solid var(--border, #333);
  border-radius: 4px;
  color: var(--fg-muted, #888);
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
}
.panel-clear:hover {
  color: var(--fg, #ccc);
  border-color: var(--fg-muted, #666);
}
</style>
