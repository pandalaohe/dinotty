# Design — Supervise-All-Tabs Shortcut (`superviseTabs`)

Date: 2026-07-15
Scope: dinotty fork (`custom` lineage), frontend (`frontend/src`, Vue 3 + TS)
Status: approved design (brainstorm Phase 3), no active cycle — manual flow
Rev2 (2026-07-17): rework amendments in §13 (post dual-dig + dual-suggest) supersede
conflicting details in §4/§5/§6/§7/§8/§9/§10. Draft branch `wip/supervise-tabs`
(c5e85c0c) is reference-only — NOT mergeable into `custom` (2dig snapshot 2026-07-17:
44/56 divergence, 6 merge-tree conflict files incl `App.vue`; counts drift as `custom`
advances — the reference-only conclusion is unaffected).
Rev3 (2026-07-17): §13.4/§13.7 concurrency model revised + SUPERSEDED chain completed
after dual cross-audit round 1 (claude 75 REVISE / codex 31 RETHINK; verified findings
absorbed — reports: `.collab/audit-reports/20260717_*supervise-tabs-design_{claude,codex}.md`).
Rev4 (2026-07-17): absorbs cross-audit round 2 (claude 75 / codex 58, both REVISE) —
reservation identity tokens + zombie-nav rule, `supervise(activate)` API, watcher-vs-settle
authority, echo scope caveats, sentence-level sweep of §4/§7/§8/§9/§10.3 (`-r2` reports).

## 1. Overview / Problem

Add a single rebindable global keyboard shortcut that lets the user "supervise" every
tab by mashing one key. Each press:

- **Reminder-first**: if any tab (across all workspaces) has an outstanding
  reminder/notification, jump to the reminder-bearing tab with the *oldest* pending
  reminder. Switching auto-clears that tab's reminder (reuses existing `activateTab`).
- **Sweep otherwise**: with no outstanding reminders, round-robin to the next
  not-yet-visited tab in a stable order (workspace order, then tab order within);
  once every tab has been visited, reset and start a new round.

Net effect: one key = always pulled to what needs attention first, then an even sweep
over all tabs, looping forever. No button, no menu — one shortcut, changeable in
Settings › Keyboard.

## 2. Goals / Non-Goals

**Goals**
- One rebindable shortcut driving the reminder-first + round-robin behavior.
- Reuse the existing tab-switch path (`activateTab`) so workspace-switch, reminder
  clearing, focus, and backend activation all stay identical.
- Deterministic, unit-testable selection core.

**Non-Goals (this iteration)**
- No reverse ("previous") key — forward-only (R1.1). May be added later.
- No visible UI control / command-palette entry.
- No cross-session persistence of sweep progress (in-memory only).
- No OS-level (system-wide-while-unfocused) global hotkey — app-level while dinotty is
  focused, same as every other app shortcut.

## 3. Requirements Trace (R-list)

| R | Requirement | Type |
|---|-------------|------|
| R1 | A single bindable keyboard shortcut triggers the supervise behavior | original / required |
| R1.1 | Forward-only, one key (reverse deferred) | derived |
| R2 | When reminders exist, switch to a reminder-bearing tab first | original / required |
| R2.1 | Among multiple reminders, oldest reminder wins | derived |
| R2.2 | Reminders always preempt the sweep | derived |
| R3 | Switching to a reminder tab clears that tab's reminder | original / required (reuses existing `activateTab`) |
| R4 | With no reminders, round-robin all tabs across all workspaces, no repeat per round, then loop | original / required |
| R4.1 | Every press moves to a different tab (current excluded; rev3 exception: all remaining candidates pending-reserved → press is a no-op, §13.4) | derived |
| R4.2 | Population covers terminal + plugin tabs | derived |
| R4.3 | Visited state is in-memory, resets on restart, self-heals across add/remove/manual-switch | derived |
| R5 | No button; shortcut only; rebindable | original / required |

## 4. Architecture

Three-layer split keeps the selection policy pure and the Vue glue thin.
*(Rev3: the diagram's "visited Set" = `confirmedVisited` + `pending` reservations per
§13.4; composable is component-owned via `effectScope` per §13.2, not a module singleton.)*

```
key press ─▶ App.vue keyActions.superviseTabs
                   │
                   ▼
        useSuperviseTabs().supervise(activate)      (composables/useSuperviseTabs.ts, rev4 API)
          - builds ordered TabCandidate[]  ◀── sessionStore.tabs
          - computes reminderAt per tab    ◀── useNotification (firstUnreadAtByPane, §13.2 M6)
          - workspace ordering             ◀── useWorkspaces (workspaces, matchWorkspace)
          - owns in-memory visited Set
                   │ delegates policy to
                   ▼
        pickSupervisedTab(input) : result            (utils/superviseTabs.ts — PURE)
                   │ returns targetTabId + nextVisitedTabIds
                   ▼
        App.vue passes activate = id => activateTab(id, { defer: true })   (§13.4)
```

### 4.1 File layout (2 new + 1 test + 3 wiring edits)

| File | Role |
|------|------|
| `frontend/src/utils/superviseTabs.ts` (new) | Pure selection function + types; zero Vue/store deps |
| `frontend/src/composables/useSuperviseTabs.ts` (new) | Visited/pending state (§13.4 rev3 — was "module-scoped singleton visited Set"); assembles input from stores; `watch(activePaneId)` records manual switches (inside `effectScope`, skips pending ids per §13.4); exposes `supervise(activate: (id: string) => Promise<boolean>): Promise<void>` — selection + reservation + settle in one op (rev4; was `selectNextTab(): string \| null`) |
| `frontend/src/test/superviseTabs.test.ts` (new) | Vitest unit tests for the pure function (≥16 cases) |
| `frontend/src/composables/useKeybindings.ts` (edit) | Add `superviseTabs` entry to `defs` (after `missionControl`) |
| `frontend/src/composables/useI18n.ts` (edit) | Add `keybinding.superviseTabs` to every locale |
| `frontend/src/App.vue` (edit) | Import composable, add `superviseTabs()` adapter, register in `keyActions` |

## 5. Pure Selection Core (`utils/superviseTabs.ts`)

```ts
export interface TabCandidate {
  id: string
  reminderAt: number | null   // null = no outstanding reminder; smaller = older
}
export interface PickSupervisedTabInput {
  tabs: readonly TabCandidate[]   // pre-ordered: workspace order, then tab order within
  currentTabId: string | null
  visitedTabIds: ReadonlySet<string>  // rev3: CONFIRMED visits only
  pendingTabIds: ReadonlySet<string>  // rev3: in-flight reservations — excluded from selection, never committed by the picker
}
export interface PickSupervisedTabResult {
  targetTabId: string | null
  nextVisitedTabIds: Set<string>  // rev3: reconciled CONFIRMED set (stale dropped, current added) — does NOT include targetTabId; reservation/promotion is composable-owned (§13.4)
  reason: 'reminder' | 'sweep' | null
}
export function pickSupervisedTab(input: PickSupervisedTabInput): PickSupervisedTabResult
```

**Algorithm** (total, deterministic, never mutates inputs):

1. Dedupe `tabs` by `id` (keep first occurrence) → ordered `list` + set of existing ids.
2. Reconcile visited: clone `visitedTabIds`, drop ids not in existing ids; if
   `currentTabId` is a non-null existing id, add it to visited.
3. **Reminder branch**: candidates = `list` items with `reminderAt !== null` AND
   `id !== currentTabId` AND not in `pendingTabIds` (rev3). If any → pick smallest
   `reminderAt` (ties broken by `list` order); return `reason: 'reminder'` (rev3: the
   picked id is NOT added to the returned visited set).
4. **Sweep branch**: circular order starting immediately *after* `currentTabId`'s index
   (index 0 if current absent). Pick first item with `id !== currentTabId`, not in
   visited, and not in `pendingTabIds` (rev3); return `reason: 'sweep'`.
5. **Round reset** (rev3 semantics per §13.4): the round wraps ONLY when exhausted by
   CONFIRMED visits — rebuild visited = `{currentTabId}` (if existing) and search again
   still excluding `pendingTabIds`. If every remaining candidate is pending-reserved →
   return `targetTabId: null` (caller treats the press as a no-op; liveness is bounded
   by reservation settle/watchdog).
6. If still nothing (0 tabs, or only the current tab exists) → `targetTabId: null`,
   `reason: null`.

**Visited marking — SUPERSEDED by §13.4 (rev3)**: the picker no longer commits the
picked target anywhere. The composable reserves it in `pending` at selection time and
promotes it to `confirmedVisited` only when activation resolves true. (Rev1's optimistic
pre-marking is retired; the rapid-press re-selection problem it solved is now handled by
the `pendingTabIds` exclusion.)

## 6. Reminder Detection & Ordering (`useSuperviseTabs.ts`) — SUPERSEDED by §13.3 (M6: use `firstUnreadAtByPane`)

- **Per-tab pane set**: terminal tab → `[tab.paneId, ...getAllLeaves(tab.layout).map(l => l.paneId)]`;
  plugin tab → `[tab.paneId]`.
- **`reminderAt(paneIds)`** *(steps SUPERSEDED by §13.2 M6)*: rev2 reads the oldest-unread
  timestamp directly — `min(firstUnreadAtByPane[pid])` over the tab's panes, `null` when
  none. The rev1 `unreadByPane` gate + `notifications` scan + `NEGATIVE_INFINITY`
  fallback are retired.
- A notification with **no `paneId`** is not attributable to any tab and never makes a
  tab reminder-bearing (confirmed via cross-dig Q3 — `NotificationItem.paneId` is optional).

**Stable candidate order**: sort `workspaces.value` by `.order` (stable). For each
workspace in order, emit its tabs in their `sessionStore.tabs` relative order (terminal
matched via `matchWorkspace(cwd ?? '', connectionId, workspaceId)`; plugin matched via
`workspaceId` lookup). Append unmatched tabs last, in `sessionStore.tabs` order. Each
candidate = `{ id: tab.paneId, reminderAt: reminderAt(paneIdsOf(tab)) }`.

## 7. Visited-State Lifecycle & Self-Healing — REVISED by §13.4 (rev3: confirmed+pending model; watcher-confirm is no longer the promotion path)

- ~~Module-scoped~~ (rev3: per-composable-instance, inside `effectScope`)
  `confirmedVisited` + `pending` Sets. Not persisted — reset on app restart.
- Before each selection the pure function reconciles: stale ids dropped, current counted.
- Watcher (rev4 semantics): `watch(activePaneId)` adds an id to `confirmedVisited` ONLY
  when the id is NOT in `pending` — it records genuinely manual navigation (click,
  notification jump); supervised picks are promoted exclusively by their settle path
  (§13.4), so an early backend echo cannot pre-confirm a pick that later resolves false.
- Tab additions need no reset: a new id is unvisited → eligible this round.
- Tab removals need no hook: stale ids are dropped on reconcile and by the watcher.

## 8. Edge Cases

| Case | Behavior |
|------|----------|
| 0 tabs | No-op (`targetTabId = null`) |
| 1 tab (even with a reminder) | No-op — no "other" tab exists |
| Only the current tab has a reminder | Current excluded from reminder candidates → falls through to sweep, still moves to another tab |
| Current tab id stale/null | Reminder branch still works; sweep starts at index 0 |
| Equal reminder timestamps | Stable `list` order wins |
| Multiple unread panes in one terminal tab | Use min timestamp across tab-level id + all leaves |
| Pane read (unread cleared) | Ignored — `firstUnreadAtByPane` is authoritative (rev3; was `unreadByPane`) |
| Target disappears between select and `activateTab` | `activateTab` resolves false on not-found → reservation drops via settle (rev3); target re-eligible after reconcile |
| All tabs CONFIRMED-visited | Reset to a new round with current already visited; never re-selects current |
| Remaining candidates all PENDING | Press is a no-op — no wrap, no reuse (§13.4 rev3) |

## 9. Testing — EXTENDED by §13.3/§13.8 (rev3 adds reservation/round-epoch/interleaving cases)

**Pure-function unit tests** (`test/superviseTabs.test.ts`, no Vue mount), ≥16 cases:
empty → null; single current tab → null; two tabs always pick non-current; oldest
reminder wins; current-tab reminder excluded; current-only reminder falls to sweep; equal
timestamps use input order; sweep starts after current & wraps; sweep skips visited;
exhausted sweep resets & doesn't pick current; stale visited ids dropped; newly-added tab
unvisited/eligible; removed current id → sweep from index 0; duplicate ids handled
deterministically. Rev3/rev4 replacements (retired: optimistic-target-in-visited,
`NEGATIVE_INFINITY`): picked target NOT present in `nextVisitedTabIds`; `pendingTabIds`
excluded from both branches; all-pending → null (no reset); mixed exhaustion — current A,
confirmed {A,B}, pending {C} → null, NOT a reset that re-picks B.

**Composable-level test** (optional, small): tab→pane aggregation + workspace ordering.
Navigation policy is fully covered by the pure tests.

**Manual E2E** (both surfaces): tabs across ≥2 workspaces — no reminders: each press
visits a new tab, one round no repeat, then loops; with a bell/notify: next press jumps
there and clears the dot; reminders preempt mid-sweep.

## 10. Keybinding Wiring (3 edits)

1. `useKeybindings.ts` — add to `defs` after `missionControl`:
   ```ts
   { id: 'superviseTabs', defaultBinding: { key: '`', shift: true }, icon: '🔔', titleKey: 'keybinding.superviseTabs' }
   ```
   **SUPERSEDED by §13.5**: `shift: true` renders Ctrl+Shift+\` on Win/Linux and collides
   with the Tauri global Quake shortcut — rev2 default is `{ key: '\`', shift: false }`
   = mac Cmd+\`, Windows Alt+\` (via `windowsAltAsCmd`). Not `readonly` → rebindable in
   Settings › Keyboard. Backtick is unused by all 22 existing bindings; the matcher
   already maps `Backquote → '\`'`.
2. `useI18n.ts` — add `keybinding.superviseTabs` to every locale (en `'Supervise Tabs'`,
   zh `'巡查标签页'`).
3. `App.vue`:
   ```ts
   import { useSuperviseTabs } from './composables/useSuperviseTabs'
   const { supervise } = useSuperviseTabs()   // rev4 API (§13.4)
   // in keyActions, after missionControl:
   superviseTabs: () => void supervise((id) => activateTab(id, { defer: true })),
   ```
   The composable's `supervise()` does selection + reservation + settle-binding
   internally (promote/drop + watchdog, §13.4) — the adapter passes only the activate
   callback; no reservation logic lives in App.vue.

## 11. Verified Code Grounding (cross-dig, 2026-07-15)

All design premises were dual-verified (Route A @Explore + Route B codex), CONSENSUS.
*(Line anchors below are the 2026-07-15 snapshot; `App.vue` has since drifted under the
NUX1 merge — re-resolve by symbol name at implement time, not by line.)*

- **Q1 (属实)** `App.vue:788-792` — `activateTab` collects the tab's pane ids and calls
  `notif.clearForPaneIds(...)` → switching auto-clears reminders (R3 free).
- **Q2 (属实)** `sessionStore.ts:10` — `tabs` is a flat `ref<Tab[]>` of all tabs across
  all workspaces; `App.vue:778-784` auto-switches workspace via `activateWorkspace` when
  the target belongs to a different one.
- **Q3 (属实 + nuance)** `useNotification.ts` — `unreadByPane` per-pane (line 94),
  `NotificationItem.timestamp: number` (line 88), `aggregateSeverity(paneIds)` (line 118).
  Nuance: `NotificationItem.paneId` is optional → pane-less global reminders don't belong
  to any tab and don't participate (correct/expected).
- **Q4 (属实)** No existing next/cycle-tab command; only `switchTab` (digit-direct,
  readonly) and `focusNext/PrevPane` (pane-level). New command = 3 edits
  (`defs` + `keyActions` + i18n).

## 12. Risks / Open Questions

- **macOS window-cycle association**: `Cmd+\`` / `Cmd+~` is the OS "cycle app windows"
  shortcut. dinotty native is effectively single-window, so the OS has nothing to cycle
  and the keydown reaches the app; web surface is unaffected. Rebindable if it ever
  conflicts. (Low risk.)
- **Label display**: Settings shows `⌘⇧\`` (backtick) rather than `⌘~` — cosmetic; a
  `formatBinding` label map could show `~` if desired (deferred, out of scope).
- **Two deploy surfaces**: feature is pure frontend; both web-remote and Mac-native Tauri
  builds must be rebuilt and E2E-checked (per project runtime topology).

## 13. Rev2 Rework Amendments (2026-07-17)

Basis: dual-dig (live-anchor verification) + dual-suggest (design decisions), both
CONSENSUS. This section is binding where it conflicts with §5/§6/§10/§12.

### 13.1 Anchor drift corrections (from dual-dig)

- Tauri Quake global shortcut is registered at `src-tauri/src/main.rs:652-656`
  (`Modifiers::CONTROL | Modifiers::SHIFT + Code::Backquote`), not `:567` as the SVT1
  card recorded.
- No `workspaceForTab` symbol exists. Defect M8 reads as "unify tab→workspace resolution
  onto `resolveTabWorkspace` / `matchWorkspace`" — duplicate sites: `App.vue:388,420`,
  `resolveTabWorkspace` at `App.vue:812-816`, inline duplication inside `activateTab` at
  `App.vue:842-843`, plus `WorkspaceOverview.vue:175-195`.
- `firstUnreadAtByPane` is live on `custom` at `useNotification.ts:213` (reconciled via
  `attentionReconcile.ts:243`, exported from `useNotification()`).

### 13.2 Defect disposition (B1-B3, M4-M9)

| ID | Defect | Disposition |
|----|--------|-------------|
| B1 | Default `{key:'\`',shift:true}` = Ctrl+Shift+\` on Win/Linux — collides with Quake global | Fixed by §13.5 new default `{key:'\`',shift:false}` |
| B2 | `KeyboardTab.vue:384-392` hardcoded group allowlists hide unlisted ids — binding invisible in Settings (violates R5) | Append `'superviseTabs'` to `navGroupIds`; metadata-driven grouping refactor deferred (LOW) |
| B3 | Rapid-press race: `void superviseTabs()` unawaited; `activateTab` lacks post-await recheck | Fixed by §13.4 concurrency model |
| M4 | Optimistic visited never rolls back on failed activation | Reservation tokens (§13.4): commit to visited only on success |
| M5 | No post-await revalidation that target still has unread | Revalidation happens at SELECTION time against live `firstUnreadAtByPane`; in-flight supersession is caught by the gen recheck. Rev3 decision: a reminder clearing DURING the await does NOT abort the jump — the tab was attention-bearing at press time, completing is harmless and avoids threading selection-reason into `activateTab` |
| M6 | Draft rescans `notifications` list for timestamps | `useSuperviseTabs.ts` rewritten around `firstUnreadAtByPane` (supersedes §6 `reminderAt` steps 3-5). Rev3 — intended behavior change: `firstUnreadAtByPane` applies NO overlay-mask filter (unlike `unreadByPane` via `attentionReconcile.ts:214-222`), so toast-dismissed-but-unread panes stay reminder-bearing. Deliberate: masking is a badge-display concern; supervise targets unhandled work |
| M7 | Plugin notify API lacks `paneId` | Deferred with evidence (§13.6) |
| M8 | tab→workspace resolution duplicated | Supervise uses canonical `resolveTabWorkspace`; wider unification of the §13.1 sites optional (LOW) |
| M9 | `keybindings.test.ts:82-85` hardcodes `toHaveLength(18)` + `APP_DEFAULTS` | Update to 19 + snapshot row + Backquote/modifier matcher cases |
| — | Module-scoped watcher lacks disposal scope | Rev3: `effectScope` is created and owned by the App.vue setup caller (stopped on unmount); visited/pending state lives per composable instance — no detached module singleton survives unmount/HMR/tests |

### 13.3 D1 — Re-implementation structure

- New branch `feat/supervise-tabs-r2` cut from current `custom`.
- Port near-verbatim: `utils/superviseTabs.ts` (pure picker) + `test/superviseTabs.test.ts`,
  with ONE interface extension: `PickSupervisedTabInput.pendingTabIds` + confirmed-only
  `nextVisitedTabIds` (§5 rev3); then extend tests for reservations/rollback/round epochs.
- Rewrite: `composables/useSuperviseTabs.ts` — reminder source is `firstUnreadAtByPane`
  (oldest-unread timestamp per pane, direct; no `unreadByPane`+`notifications` scan);
  reservation state; watcher wrapped in `effectScope`.
- Hand-write `App.vue` wiring (file drifted under NUX1 merge; do not copy from wip).
- `wip/supervise-tabs` stays reference-only; delete after r2 lands.

### 13.4 D2 — Concurrency model (rev3; supersedes §5 optimistic marking + §7 watcher-confirm)

Rev3 basis: cross-audit r1 verified two `activePaneId` writers OUTSIDE the rev2 model;
all writers are now accounted for.

**Writers & authority**
- Local `activateTab`/`revealPane` commits — ordered by shared `revealNavGen`
  latest-wins (single pane-level authority; no SVT-only queue, no coalescing).
- `tab_activated` sync echo (`useSyncWebSocket.ts:321-335`) commits with NO gen check.
  Rev3 positions the echo as the authoritative reconciler: the backend's last-processed
  activation converges the UI via its echo, so a stale local commit self-heals. No
  backend arbitration added; consistency = "converges via echo", not "instant at rest".
  Rev4 scope caveats (echo is not universal): the echo is skipped while the current tab
  is a plugin tab, does not reconcile `activeWorkspaceId`, and `workspace_activated`
  echoes (`useSyncWebSocket.ts:425`) write without a `wsNavGen` check. Guarantee is
  therefore SCOPED: `revealNavGen` latest-wins guarantees the final FRONTEND target of a
  rapid-press burst; the backend pointer may transiently hold an older value (reversed
  server processing) until the next echo or navigation — acceptable for supervise UX
  (the next press/echo re-syncs), asserted as such in QA (§13.8), not as instant parity.
- `activateWorkspace` commits `activeWorkspaceId` early under its own `wsNavGen`
  (`useWorkspaces.ts:51-61`). Two counters coexist: `wsNavGen` orders workspace-level
  switches, `revealNavGen` orders pane-level navigation. A superseded supervise hop may
  transiently switch workspace only — accepted bounded intermediate state; the winning
  navigation re-commits the workspace.

**`activateTab` hardening** — `activateTab(paneId, opts?: { defer?: boolean }): Promise<boolean>`
- Always: post-`apiActivatePane` gen recheck (parity with `revealPane` `App.vue:928`);
  superseded → resolve false.
- `defer: false` (default; all existing callers unchanged): keep the current synchronous
  optimistic UI commit — instant click feedback preserved; the recheck only decides the
  return value (no rollback: any newer navigation has already committed over it, and the
  echo reconciles backend order).
- `defer: true` (supervise/reveal paths): ALL UI commits (`activePaneId`,
  `clearForPaneIds`, `persist`, `focusActive`) deferred until after the final gen check.

**Reservation lifecycle (closed; rev4 identity + zombie rules)**
- Composable owns `confirmedVisited: Set` + `pending: Map<tabId, attemptToken>` (token =
  monotonic counter per reservation attempt); the picker receives id sets and commits
  neither (§5 rev3).
- Reserve on selection. Finalization binds to the activation promise's settle AND is
  token-conditional: promote/drop applies only if `pending.get(tabId)` still equals this
  attempt's token — a late settle from a released attempt cannot promote or delete a
  newer reservation of the same tab.
- A 10s watchdog (`Promise.race`) force-drops a hung reservation AND bumps `revealNavGen`
  (giving up on the hop = superseding it), so the abandoned `activateTab` cannot later
  pass its gen check and commit as a zombie navigation.
- Manual click / `revealPane` supersession needs no extra signal: it bumps `revealNavGen`,
  the in-flight activation fails its recheck → resolves false → drops via the same
  (token-checked) settle path.
- API: all of the above lives inside `supervise(activate)` (§4.1 rev4) — App.vue never
  touches reservation state.

**Rapid presses & all-pending (resolves the rev2 §13.7 contradiction)**
- Each press synchronously reserves a distinct target (selection excludes
  confirmed + pending + current).
- Round wraps ONLY on exhaustion by CONFIRMED visits; if the remaining candidates are
  all pending-reserved the press is a NO-OP (no wrap, no reuse) — liveness is bounded
  by settle/watchdog freeing targets.

### 13.5 D3 — Keybinding (supersedes §10.1 default)

- Default `{ key: '\`', shift: false }` → mac Cmd+\`, Windows Alt+\` (via
  `windowsAltAsCmd`, default on for Windows clients). Avoids Quake's Ctrl+Shift+\`.
- Windows notes (document in `docs/notifications*.md` or keyboard docs): Ctrl+\` also
  matches the same binding (binding model stores key+shift only); Alt+\` stops matching
  if `windowsAltAsCmd` is disabled. Settings adds a one-line i18n hint near the binding
  group explaining Alt/Ctrl virtual-cmd equivalence (resolved open question).
- `KeyboardTab.vue`: append `'superviseTabs'` to `navGroupIds`.
- `keybindings.test.ts`: 18→19, `APP_DEFAULTS` row, Backquote/modifier matcher cases.
- macOS Cmd+\` window-cycle risk stays LOW (§12, single-window app) — keep as explicit
  QA checklist item on the native build.
- Known limitation (rev3): with a terminal focused, a GENUINE Ctrl+\` is consumed by the
  terminal keydown path (`useTerminal.ts:468` suppression applies only under `virtualMeta`)
  — the Ctrl co-match is reachable only outside terminal focus; Alt+\` (with
  `windowsAltAsCmd`) is the supported Windows path. No extra interception this round; QA §13.8.

### 13.6 D4 — Plugin notify `paneId`: DEFERRED

Evidence: plugin tab ids are `plugin:*` strings while `POST /api/notify` validates
`paneId` as UUID and requires a live terminal session — attribution needs an end-to-end
plugin-attention identity design, not a parameter addition. Tracked as SVT1 follow-up —
a dedicated Rolling Taskboard token (distinct from SVT1) is assigned at session HANDOFF.
Consequence (consistent with §6): SVT1 sweeps plugin tabs, but pane-less plugin
notifications never make a tab reminder-bearing.

### 13.7 Resolved open questions (rev3-amended)

- Key-repeat beyond one full round: wrap into a new round when the round is exhausted by
  CONFIRMED visits (looping sweep semantics). Rev3: if remaining candidates are merely
  pending-reserved, the press is a no-op — NOT a wrap (see §13.4 all-pending rule; this
  replaces rev2's unconditional-wrap wording, which contradicted pending-exclusion).
- Windows Settings hint text: adopted (see §13.5).

### 13.8 QA additions (delta to §9; rev3 deterministic cases)

- Rapid-press E2E: mash ≥10 times with CANDIDATES < PRESSES (forces the all-pending
  transition) → observed no-ops, FRONTEND lands on the final selected target, no
  intermediate flicker on the deferred path; backend converges via `tab_activated` echo
  (eventual — a transiently older backend pointer from reversed processing is in-spec).
- Interleaving regression: manual tab clicks and toast `revealPane` jumps during a
  supervise cycle — gen arbitration wins, no stale commit; default-path clicks keep
  instant feedback (caller-behavior regression: overview activation, digit switch, and
  plain clicks behave identically to pre-change).
- Reservation-lifecycle unit/E2E: reversed API completion order (older resolves last,
  token check rejects it); never-resolving activation → watchdog drops within 10s +
  bumps gen (no zombie commit) and target re-eligible; timeout-then-late-settle → token
  mismatch, newer reservation of the same tab unaffected; tab removed mid-await → settle
  drops the reservation; early echo before settle → watcher skips pending id (no
  pre-confirm).
- macOS native build: verify Cmd+\` keydown reaches the webview. Windows: verify Alt+\`
  works under `windowsAltAsCmd` and genuine Ctrl+\` outside terminal focus (§13.5 known
  limitation).
- `keybindings.test.ts` (19) + extended `superviseTabs.test.ts` (pendingTabIds exclusion,
  confirmed-only round wrap, all-pending null) green; `vue-tsc` + vitest + both-surface
  builds per project topology.
