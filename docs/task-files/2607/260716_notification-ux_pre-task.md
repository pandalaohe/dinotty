# NUX1 — Notification model & UX overhaul (pre-task)

## Origin
HANDOFF Rolling Taskboard token **NUX1** (P1, Round 1). Scope locked with user in planning session 2026-07-15 [d94ebd37] (requirement divergence only, NO code). Card `#ct-NUX1`. This is the first of a 2-round notification effort; **SVT1** (superviseTabs shortcut, P2) is Round 2 and depends on E8 landing here.

## Intents
Each intent = one verifiable outcome. Letter tags (A/B/C/D/E1/E2/E5/E8) carried from the scope-lock card.

- **A — mark-read on focus of current tab**: the currently focused tab's notification is marked read immediately when the user gains focus on it (mouse click into the terminal OR starts typing). Acceptance: focusing/typing in a tab with an unread bell clears that tab's unread without switching tabs.
- **B — keep tab-switch clear (regression guard)**: existing `activateTab -> clearForPaneIds` (App.vue:792) and `closeTab -> clearForPaneIds` (App.vue:882) behavior preserved. Acceptance: switching to / closing a tab still clears its unread as today.
- **C — cross-end read-sync (backend-authoritative)**: read/handled on one surface (web or desktop) clears the reminder on the other surfaces. Acceptance: mark-read on surface 1 → surface 2's unread indicator for that pane clears within one broadcast round-trip. Requires NEW backend read-state (today `src/notification.rs` is fire-and-broadcast only, no read tracking; `unreadByPane` is per-surface frontend memory).
- **D — per-surface (non-synced) presentation settings**: notification PRESENTATION config becomes per-surface/local, NOT server-shared. Acceptance: changing sound/popup/DND on one surface does not change it on the other; today all `NotificationConfig` persists in server `settings.json` (shared) → move presentation subset to per-surface localStorage.
- **D2 — ignore-current-tab popup (new option, default ON)**: option controlling whether the currently-focused tab pops/beeps at all; default = IGNORE current tab (no popup for the tab you are already watching). Acceptance: with default, a bell on the focused tab produces no popup/sound; on an unfocused tab it does.
- **E1 — 3-level presentation switch**: level 1 normal / level 2 dot+sound only (no popup) / level 3 fully silent (dot only, no sound no popup). Acceptance: each level produces the documented presentation. OPEN QUESTION (design step): is E1 the SAME setting as D2 ignore-current-tab, or two independent settings? To resolve in design.
- **E2 — coalesce rapid same-pane bells**: collapse a burst of same-pane bells into one reminder. Acceptance: N bells on one pane within a window produce one notification entry / one sound, not N.
- **E5 — quiet-hours (cross-midnight)**: a quiet-hours window (e.g. 23:00–08:00, spanning midnight) during which presentation is suppressed per level. Acceptance: within window → suppressed; cross-midnight ranges evaluated correctly.
- **E8 — authoritative firstUnreadAtByPane**: per-pane first-unread instant, set on first unread, cleared only on read. Acceptance: `firstUnreadAtByPane[pane]` survives the notifications[] 100-cap eviction (today true first-unread time is lost when old items evict). Foundation for C (cross-end ordering) and SVT1's oldest-first pick.

## Context

**Repo / base**: `/Volumes/Dev/ai/projects/dinotty_mods/fork/dinotty`, upstream_context: **yes** (literal `upstream` remote + repo-root LOCAL_MODS.md; fork of xichan96/dinotty, MIT).
- **Baseline decision**: build from current `custom` (upstream/dev @ `83f2ab77`, incl. 5 terminal fixes + notify-URL #155 already merged), NOT the card-named `feat/notification-ux` (which == stale pre-washboard snapshot `backup/washboard-pre-260715`, nothing NUX1-unique). Reset `feat/notification-ux` to `custom` and develop there (old state preserved in the backup tag).
- **notify-URL (#155) reconciliation lag**: LOCAL_MODS still marks #155 OPEN on the stale branch; code reality = MERGED into custom (`3e6c6ddc`, `notify_url_for`/`DINOTTY_URL` in `src/pty.rs`). Update OPEN→MERGED during this cycle's LOCAL_MODS pass. Disjoint from NUX1 files — no conflict.

**Current-state facts (Explore recon 2026-07-16, live-verified):**
- **E4 verified** — `frontend/src/composables/useNotification.ts:138-199` `handleEvent` fires on EVERY bell/notify event passing config gates (`:146` enabled, `:153` bell.enabled, `:156` osc_notify); **no idle/unfocused/not-watched guard**. It beeps even for the tab you are actively watching → D2/E1 are net-new behavior.
- **Public surface** `useNotification()` (`:345-385`): `notifications: NotificationItem[]` (cap 100, `:174`), `unreadByPane: Record<paneId,NotificationType>` (highest severity, `:94`), `unreadCount` (= total count, NOT per-pane), `panelVisible`, `dismissOne`, `clearAll`, `clearPaneUnread`, `clearForPaneIds`, `togglePanel`, `setGoToPaneHandler`; module fn `aggregateSeverity(paneIds[])` (`:118-132`). **No `firstUnreadAtByPane`** → E8 is net-new.
- **Read-clear sites**: only `App.vue:792` (activateTab) + `App.vue:882` (closeTab); plus explicit `NotificationPanel.vue` dismiss/clearAll buttons. No focus/click/keystroke mark-read anywhere → A is net-new.
- **Settings persistence**: all `NotificationConfig` server-side `settings.json` (frontend type `useSettings.ts:83-98`; backend `src/settings/mod.rs:209-260`), loaded/saved via `/api/settings`. Only `action_keyboard` uses localStorage (unrelated). → D requires splitting presentation subset out to per-surface localStorage.
- **Backend read-state**: NONE. `src/notification.rs` (`NotificationBroadcast`, `:20-147`) is a fire-and-broadcast pipe over `tokio::sync::broadcast`; `bell_debounce` is rate-limit only; WS `/ws/notify` (main.rs:742) relays events. Unread lives only in frontend memory per surface. → C + E8-authoritative + E2-coalesce may need backend or a shared-state layer.
- **Existing tests**: `useNotification.push.test.ts`, `useNotification.aggregate.test.ts`, `NotificationCard.plugin-notify.test.ts`, backend `src/settings/tests.rs:91` (defaults only). Extend for A/C/D/E*.

**Dropped this round** (not in scope): E3 severity/alarm tiering (positioning = low-noise "come continue here" signal, NOT an alarm), E6 workspace rollup badge, E7 panel TTL.

**Positioning**: notification = low-noise "there is something to continue here, come over" signal, not an alarm. Low-noise defaults (ignore current tab, coalesce, quiet-hours) are the point.

## Acceptance Criteria
- All intents A, B, C, D, D2, E1, E2, E5, E8 meet their per-intent acceptance above.
- Cross-end read-sync (C) demonstrated live across web (8998) + desktop (v0.17.x) surfaces.
- Presentation settings (D) provably per-surface (change on one, unchanged on other).
- No regression to existing tab-switch/close clear (B) or plugin-notify path.
- vitest green (extended suites) + vue-tsc 0 + cargo check/test/fmt green (if backend touched) + real-execution E2E on both surfaces.
- LOCAL_MODS.md updated (new fork mods + #155 OPEN→MERGED reconcile). Design doc cross-audited before implement (backend cross-end sync = high-risk).

## Updates
(Appended mid-cycle when scope changes)
- [260716] new-intent: **F — notification goto tab-bar highlight desync**. Clicking a notification to jump (goto-pane) activates the pane but the top tab bar does not highlight / point to / scroll to the corresponding tab. User-reported with screenshot. Anchor: `App.vue:806 setGoToPaneHandler((paneId) => activateTab(paneId))`; tab-bar active class keyed on `tab.paneId === activePaneId` (`App.vue:89`, `TabBar.vue:21`). Suspected: goto targets a pane in a different workspace/tab not currently rendered in the visible tab bar, or activateTab sets activePaneId without switching workspace / scrolling the bar. Root cause to be dug during design/implement (no premature cause claim). Acceptance: clicking any notification highlights and reveals its tab in the tab bar (switching workspace if needed).
- [260716] new-intent: **upstream-dev alignment mid-flight**. Upstream dev advanced 5 commits (terminal sync/resize perf: 83f2ab77..40213e90) touching src/session/mod.rs, src/ws/mod.rs, src/pty.rs, src-tauri/main.rs, frontend useTerminal/useTransport/protocol.ts — 4 backend files overlap NUX1 P3b edits. User-approved plan A: finish P4b commit first (clean boundary), then `git merge upstream/dev` into feat/notification-ux (merge, not rebase — reviewed commits stay intact), resolve the 4-file conflicts against design §15 anchors, full re-verify (backend 292 tests + workspace/src-tauri checks + frontend suites + vue-tsc + R-k premise re-check since useTerminal was refactored upstream), codex-review the conflict-resolution diff, then continue P5. Full `custom` upgrade (plugin-api commits + other mods vs terminal-sync) deferred to a separate update task.
