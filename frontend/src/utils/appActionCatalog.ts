import type { Component } from 'vue'
import { defs } from '../composables/useKeybindings'

export interface AppActionDef {
  id: string
  labelKey: string
  icon: Component
}

export const APP_ACTIONS: readonly AppActionDef[] = defs
  .filter((def) => def.kind !== 'terminal' && def.readonly !== true)
  .map((def) => ({ id: def.id, labelKey: def.titleKey, icon: def.icon as Component }))

export const APP_ACTION_IDS: ReadonlySet<string> = new Set(APP_ACTIONS.map(({ id }) => id))
export const DISPATCH_ONLY_ACTIONS: ReadonlySet<string> = new Set(['pasteTerminal'])

export function isDispatchableAppAction(id: string): boolean {
  return APP_ACTION_IDS.has(id) || DISPATCH_ONLY_ACTIONS.has(id)
}

export function getAppAction(id: string): AppActionDef | undefined {
  return APP_ACTIONS.find((action) => action.id === id)
}
