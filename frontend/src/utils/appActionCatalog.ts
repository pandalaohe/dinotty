import type { Component } from 'vue'
import { ClipboardPaste } from 'lucide-vue-next'
import { defs } from '../composables/useKeybindings'

export interface AppActionDef {
  id: string
  labelKey: string
  icon: Component
}

export const APP_ACTIONS: readonly AppActionDef[] = [
  ...defs
    .filter((def) => def.kind !== 'terminal' && def.readonly !== true)
    .map((def) => ({ id: def.id, labelKey: def.titleKey, icon: def.icon as Component })),
  { id: 'pasteTerminal', labelKey: 'mobileKb.pasteTerminal', icon: ClipboardPaste },
]

export const APP_ACTION_IDS: ReadonlySet<string> = new Set(APP_ACTIONS.map(({ id }) => id))

export function isDispatchableAppAction(id: string): boolean {
  return APP_ACTION_IDS.has(id)
}

export function getAppAction(id: string): AppActionDef | undefined {
  return APP_ACTIONS.find((action) => action.id === id)
}
