# NUX1 cross-dig findings (design inputs)

Dual-route (claude @Explore + codex) independent verification, 2026-07-16, branch `custom`. All 3 CONSENSUS / HIGH confidence. codex log: `/Volumes/Dev/ai/core/.collab/artifacts/agent-logs/2607/cross-dig-routeB-nux1-1784166561-1784166561.log`.

## Q1 — WS bidirectionality (for C: cross-end read-sync)
**CONSENSUS**: `/ws/notify` is **server→client broadcast ONLY** today — its socket read loop handles only `Message::Ping`/`Close` and silently discards `Message::Text` (`src/ws/mod.rs:877-885`). No `ClientMsg`/ack type in `src/notification.rs`. The frontend notify client installs `onmessage` only, never `ws.send()` (`useNotification.ts:315-343`).
**BUT** client→server is an established pattern elsewhere:
- Terminal `/ws` parses `ClientMsg::Input/Resize` (`src/ws/mod.rs:33-38`, parse at ~:612/:763/:1041).
- `/ws/sync` parses `SyncClientMsg::ActivateTab/CreateTab/CloseTab/ClosePane/UpdateLayout/SshAuthResponse` (`src/ws/mod.rs:40-69`, parse :285-428) and already broadcasts cross-surface.
→ **Design implication**: add a `MarkRead{pane_id}` variant to `/ws/sync`'s `SyncClientMsg` (natural home — it already carries cross-surface activateTab + layout sync), OR add a `NotifyClientMsg` read-loop to `/ws/notify` + read-state in `NotificationBroadcast`. Backend read-state can be in-memory authoritative + broadcast (notifications are not persisted today anyway).

## Q2 — focus/keystroke hooks (for A: mark-read on focus/typing)
**CONSENSUS**: both signals already reach App.vue end-to-end, no new plumbing:
- **Focus/click**: `SplitContainer.vue:15,186` `@mousedown="onLeafClick" → emit('focus', paneId)` → `App.vue:103 @focus → splitPane.focusPane(id)` (`useSplitPane.ts:147-165` sets `tab.activePaneId`, focuses xterm).
- **First keystroke**: xterm `onData` → `useTerminal.ts:710-739` `_handleXtermData → onInput?.(data)` → `TerminalPane.vue:975 emit('input')` → `SplitContainer.vue:77,108` relay → `App.vue:105 @input → splitPane.onTerminalInput(id,data)` (`useSplitPane.ts:327`).
→ **Design implication**: wire `clearForPaneIds` (local) + emit cross-end MarkRead into `focusPane` and/or `onTerminalInput`. Note focus is mousedown-derived, not a native focus event.

## Q3 — settings save granularity (for D: per-surface presentation settings)
**CONSENSUS (REFUTED partial-save)**: `PUT /api/settings` is **whole-object replacement**. Frontend `saveSettings()` takes no args, `JSON.stringify(settings)` ships the ENTIRE tree (`useSettings.ts:361-379`). Backend `put_settings` does `*state.1.write().await = new_settings;` full replace + `save_settings` writes whole struct (`src/settings/mod.rs:1101-1118`). All fields `#[serde(default)]` → a partial PUT fills omitted sections with **defaults, not existing values** → clobbers. No PATCH endpoint (`src/main.rs:769`).
→ **Design implication**: per-surface presentation settings must live in **localStorage** (precedent: `action_keyboard` at `useSettings.ts:334` `syncActionKeyboardStorage`), NOT a server partial update. Split `NotificationConfig` into: (a) synced/behavioral subset stays server `settings.json`; (b) presentation/local subset (sound on/off, popup behavior, DND level, ignore-current-tab, quiet-hours) moves to per-surface localStorage. Exact field split = design decision.

## Open design questions carried into brainstorm-design
1. C read-sync channel: extend `/ws/sync` (MarkRead variant) vs `/ws/notify` (new read-loop + NotificationBroadcast read-state). Recommend `/ws/sync` (least new infra, already cross-surface).
2. Backend read-state authority/persistence: in-memory authoritative + broadcast likely sufficient (notifications non-persisted).
3. D field split: which NotificationConfig fields are "presentation/local" vs "behavioral/synced".
4. E1 3-level switch vs D2 ignore-current-tab: same setting or two? (carried from scope-lock card).
5. E8 firstUnreadAtByPane: frontend-only per-surface, or backend-authoritative alongside read-state (needed for SVT1 oldest-first + cross-end ordering).
6. A: clear on focus AND first-keystroke, or focus only? (typing implies focus already via mousedown, but keyboard-only tab switch may focus without mousedown).
