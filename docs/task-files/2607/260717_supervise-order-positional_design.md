# Supervise Tabs — Positional Ordering (design)

Task: manual-20260717-svt1 (follow-up to 260715_supervise-tabs_design.md rev4)
Status: design rev3 (rev2 premise was INVERTED — corrected against user spec; dual cross-audit absorbed) → implement
Scope: change ONLY the supervise (巡查标签页, Cmd+`) fallback (no-reminder) selection order to a pure
positional right-step, and drop the now-unused visited-set. The reminder-priority path and the
pending/token/watchdog concurrency model are KEPT.

## 0. rev2 → rev3 correction (why this doc inverted)

rev2 concluded "remove the reminder path, make the sweep stop only on unread tabs." That is the
OPPOSITE of the user's actual intent and was rejected at E2E-description review. The user's confirmed
model has TWO cases and KEEPS reminder-priority:

1. **Reminder present** → jump to the tab with the OLDEST reminder and dismiss it.
2. **No reminder** → jump one tab to the RIGHT of the current tab; at the end of a workspace continue
   into the next workspace's first tab; wrap around. Pure positional — NOT "visit each once per round."

rev2's dual cross-audit only checked the design's internal consistency + code live-verify; it could
not catch the requirements mismatch because the user's clarification answers were not supplied to the
auditors as ground truth. Lesson recorded for /reflect. The rev2 code change was reverted (never
committed to source; only the doc commit 3edae795 carried the wrong premise, superseded by this rev3).

## 1. Problem / Motivation

Supervise (Cmd+`) has two selection paths today:
- **reminder** — jump to the globally oldest unread (min `reminderAt`). This is what the user wants for
  case 1 and it already works (jump + focus-dismiss).
- **fallback sweep** — when no tab is unread, cycle positionally. TODAY this sweep also honors a
  `visitedTabIds` set (visit each tab once per round, skipping already-visited tabs, then round-wrap).

The user wants the fallback to be a PURE right-step: every press moves to the immediate next tab to the
right of the CURRENT active tab (wrapping across workspaces), regardless of whether that tab was visited
before. The "visit once per round" behavior (visited-set) is explicitly unwanted.

User example (tabs 1..6, confirmed 2026-07-17):
- shortcut steps 1→2→3 (current now 3); tab 1 raises a reminder.
- press → **1** (oldest reminder, dismissed); press → **2** (positional right of 1, no reminders left).
- user manually Cmd+1 (current now 1); press → **2** (positional right of 1).

Two invariants from this: (a) "current" is always the LIVE active tab (manual switches count);
(b) the fallback is a plain +1 step, no visited-skip.

## 2. Ground Truth (live-verified 2026-07-17, post-revert HEAD)

- `utils/superviseTabs.ts::pickSupervisedTab(input)`:
  - `input = { tabs, currentTabId, visitedTabIds, pendingTabIds }`,
    `result = { targetTabId, nextVisitedTabIds, reason: 'reminder'|'sweep'|null }`.
  - **reminder path** (lines 34-54): min-`reminderAt` tab, excludes current + pending. KEEP.
  - **sweep path** (lines 56-76): positional `(currentIndex + offset + 1) % n`, skips current /
    `visitedTabIds` / pending, over ALL tabs.
  - **round-wrap reset** (lines 78-92): when every non-current tab is visited and a non-pending tab
    exists, reset `visitedTabIds` to `{current}` and sweep once more.
- `TabCandidate = { id, reminderAt: number | null }`; `reminderAt` = tab's oldest unread timestamp via
  `firstUnreadAtByPane`, else null.
- `useSuperviseTabs.ts`:
  - `orderedCandidates()` (44-73): workspace.order → session tab order (cross-workspace left→right flat
    list; a plugin with a `workspaceId` groups into it, an ungrouped plugin is appended last). UNCHANGED.
  - `confirmedVisited: Set<string>` (18): the visited-set. Maintained by a `watch(activePaneId)` (75-87),
    passed to the picker as `visitedTabIds` (93), rebuilt from `result.nextVisitedTabIds` (97-98), and
    promoted in `settle` (109). This is the ONLY consumer of the visited-set — it is removed by this change.
  - `pending: Map<tabId, token>` + `settle` + 10s watchdog + `pendingRaceResolvers` + `onScopeDispose`
    (19-32, 101-155): the concurrency model. UNCHANGED except `settle` no longer promotes to
    confirmedVisited.
  - `currentTabId = session.activePaneId` (92): already the live active tab, so invariant (a) holds with
    no change.
- **Dismiss mechanism** (case 1's "点掉"): the supervise `activate` callback is
  `(id) => activateTab(id, { defer: true })` (App.vue). Its defer branch runs
  `clearResolvedTabNotifications(live)` (App.vue:889) SYNCHRONOUSLY and UNCONDITIONALLY (no foreground
  gate) → `notif.clearForPaneIds(paneIds, 'tab_activate')` → `markPanesRead(...)`, which updates the
  attention store `firstUnreadAtByPane` is derived from. This is the PRIMARY dismiss path for supervise.
  The focus path (`useSplitPane.ts focusPane` → `markPaneReadIfUnread(paneId, 'focus')`, foreground-gated,
  + `evaluateActiveRead()`) is a secondary/redundant trigger. Either way the cleared reminder drops from
  `firstUnreadAtByPane` → the next press advances to the next-oldest reminder. No new dismiss code needed.
- Consumers of `pickSupervisedTab`: production `supervise()` (reads `targetTabId`; also
  `nextVisitedTabIds` today) + the pure-fn suite `frontend/src/test/superviseTabs.test.ts`. `reason` is
  asserted only in tests (the one other repo `.reason` match, `LoginPage.vue`, is unrelated).
- `frontend/src/test/useSuperviseTabs.test.ts` (9-case concurrency suite): `setup()` empties
  `firstUnreadAtByPane` → no reminders → all its assertions exercise the FALLBACK path. Its expected
  activation orders (`['b','c']`, etc.) are produced by pending-skip alone (see §6 R2). 8 of 9 stay
  green after the visited-set removal; ONE case (`does not confirm an early active-tab echo before
  activation settles`) HAS a visited-set dependency — its third assertion changes from `['b','b','c']`
  to `['b','b','b']` (see §8 B). No production-code change implied — only that one test expectation.

## 3. Decision

Keep case 1 (reminder-priority). Replace case 2 with a pure positional right-step and delete the
visited-set entirely.

- **Case 1 (unchanged):** any tab has unread → target = min-`reminderAt` tab (excluding current +
  pending). Dismiss is handled downstream by focus.
- **Case 2 (new):** no tab has unread → scan from `currentIndex + 1` rightward with wraparound, return
  the FIRST tab that is not current and not pending. No visited-set, no round-wrap reset. Single-tab or
  all-others-pending → null (no-op).
- **Remove the visited-set:** drop `visitedTabIds` from the picker input, `nextVisitedTabIds` from the
  result, and `confirmedVisited` (+ its `watch`) from the composable. `settle` only deletes `pending`.
- **Keep** `orderedCandidates()` ordering, the reminder path, and the entire pending/token/watchdog
  concurrency model.

Net: a press either jumps to the oldest reminder (case 1) or steps one tab right / into the next
workspace (case 2), based on the live active tab, with in-flight (pending) targets skipped for
rapid-press safety.

### 3.1 Interface change

`PickSupervisedTabInput` loses `visitedTabIds`; `PickSupervisedTabResult` loses `nextVisitedTabIds`;
`reason` union stays `'reminder' | 'sweep' | null`. `TabCandidate` unchanged.

## 4. Delta Spec

### 4.1 `utils/superviseTabs.ts`

- `PickSupervisedTabInput`: remove `visitedTabIds`.
- `PickSupervisedTabResult`: remove `nextVisitedTabIds`.
- Remove the dedup-derived `nextVisitedTabIds` seed (current lines 29-32) — no longer returned. Keep the
  dedup loop (existingTabIds/tabs) since positional indexing needs the deduped list.
- Keep the reminder path (34-54) verbatim, minus the `nextVisitedTabIds` field in its return.
- Replace the sweep + round-wrap (56-92) with a single positional step:
  ```
  const currentIndex = tabs.findIndex((tab) => tab.id === input.currentTabId)
  for (let offset = 0; offset < tabs.length; offset++) {
    const index = currentIndex === -1 ? offset : (currentIndex + offset + 1) % tabs.length
    const tab = tabs[index]
    if (tab.id === input.currentTabId || input.pendingTabIds.has(tab.id)) continue
    return { targetTabId: tab.id, reason: 'sweep' }
  }
  return { targetTabId: null, reason: null }
  ```
  (No `reminderAt` gate here — case 2 steps over ALL tabs, read or unread. `currentIndex === -1`, i.e.
  the current id was removed, falls back to scanning from index 0, preserved by the existing branch.)

### 4.2 `composables/useSuperviseTabs.ts`

- Remove `const confirmedVisited = new Set<string>()` (18).
- Remove the `watch(() => session.activePaneId, …)` block (75-87) — its ONLY effect was maintaining
  confirmedVisited; current-position tracking is already live via `session.activePaneId` at call time.
- In `supervise()`: drop `visitedTabIds` from the picker call; remove the
  `confirmedVisited.clear()/repopulate` (97-98).
- In `settle`: remove `if (promote) confirmedVisited.add(target)` (109); `settle` keeps only the
  token-guarded `pending.delete(target)`. The `promote` param becomes unused → drop it (settle just
  clears pending on any terminal outcome).
- Keep everything else (pending Map, token, watchdog, pendingRaceResolvers, onScopeDispose, gen recheck).

## 5. Data Flow

```
Cmd+` → keyAction superviseTabs → supervise(activate)
  → orderedCandidates()  [workspace.order → tab order, cross-ws flat list]
  → pickSupervisedTab({ tabs, currentTabId = session.activePaneId, pendingTabIds })
       case 1: any unread → oldest reminder (min reminderAt), skip current+pending
       case 2: else → (currentIndex+1)%n rightward, skip current+pending
  → reserve token, activate(target) [defer]; focus dismisses the reminder; settle/10s watchdog
```

## 6. Risks

- **R1 (case-2 revisits are intended).** Pure positional means a tab visited earlier this "round" is
  landed on again on a later press. This is the user's explicit choice A; not a regression.
- **R2 (concurrency suite — 8 of 9 stay green, 1 expectation updates).** `useSuperviseTabs.test.ts`
  orders (`['b','c']`, watchdog retry `'b'`, `does nothing when every non-current tab is pending`, the
  timed-out-late-settle `['b','b','c','b']`, etc.) are produced by pending-skip on the fallback path,
  independent of confirmedVisited — traced clean (codex+claude consensus). The ONE exception is
  `does not confirm an early active-tab echo before activation settles`: it relied on `settle`'s
  promote-into-confirmedVisited to make the third press land on `'c'`; under pure positional (static mock
  active `'a'`, nothing pending) the third press re-selects `'b'`, so its assertion updates
  `['b','b','c']` → `['b','b','b']`. This is the intended pure-positional behavior, NOT a regression — do
  NOT re-add the visited-set to force the old `'c'`.
- **R3 (rapid-press).** Two presses before the first activation settles: press 1 targets currentIndex+1
  = b (pending); press 2 (activePaneId still old) skips pending b → c. Correct stepping preserved by
  pending-skip.
- **R4 (test churn).** `superviseTabs.test.ts` asserted `nextVisitedTabIds` and visited-set round-wrap;
  those cases are removed. Rewrite to the two-case model: reminder-priority cases + positional
  right-step cases (incl wrap, cross-ws flat order, pending-skip, single-tab no-op, current-removed
  index-0 fallback, `reason` values). Drop nextVisitedTabIds assertions. Retain dedup + input-immutability
  structural cases.
- **R5 (reminder path unchanged but re-verify dismiss).** The "jump oldest + dismiss" loop depends on
  `activateTab`'s `clearResolvedTabNotifications` (primary, synchronous, no foreground gate) plus the
  focus path (secondary) clearing unread. Covered by manual E2E (§8 C), not the pure-fn suite (no focus).

## 7. Alternatives

- **A-min (keep interface, ignore visitedTabIds in case 2).** Smaller diff but leaves `confirmedVisited`
  maintained-but-unused in the composable — dead state on a user-facing feature. Rejected: the visited-set
  has exactly one consumer; removing it is the honest expression of the spec.
- **A-keep-visit-once (option B from the user prompt).** Rejected by the user (chose A).
- **Add explicit dismiss call in supervise().** Unnecessary — focus already dismisses; adding a second
  path risks double mark-read round-trips.

## 8. Testing

**A. `superviseTabs.test.ts` (pure-fn).** Rewrite to the two-case model. Required cases:
1. reminder present → oldest (min reminderAt) picked; `reason: 'reminder'`.
2. oldest-reminder excludes the current tab.
3. reminder excludes a pending tab (next-oldest picked).
4. no reminder → positional next tab to the right of current; `reason: 'sweep'`.
5. positional steps over a READ tab too (no unread gate on case 2) — e.g. current a, next is b regardless
   of b's read state.
6. positional wraps from the rightmost tab to the leftmost (cross-ws flat order).
7. positional skips a pending tab and takes the next.
8. single tab (only current) → null no-op.
9. all non-current tabs pending → null no-op.
10. current id removed (currentIndex === -1) → starts at index 0.
11. `reason` is one of 'reminder' | 'sweep' | null; positional never returns 'reminder'.
12. dedup: duplicate ids collapse to first occurrence (positional index uses the deduped list).
13. input sets are never mutated.
Remove all `nextVisitedTabIds` and round-wrap assertions.

**B. `useSuperviseTabs.test.ts` (concurrency, 9 cases).** 8 of 9 unchanged. Update ONE assertion:
`does not confirm an early active-tab echo before activation settles` — its final
`expect(activate.mock.calls.map(([id]) => id)).toEqual(['b', 'b', 'c'])` becomes `['b', 'b', 'b']`
(pure positional: static mock active `'a'`, nothing pending → third press re-selects `'b'`; the old
`'c'` came from the removed visited-set promote). Consider renaming the case (the "echo"/confirm framing
loses meaning without confirmedVisited) or keep the name and just fix the expectation. Verify the other
8 stay green; do NOT re-add the visited-set.

**C. Manual E2E (real machine, Dinotty Test.app 8998):** the user's tabs-1..6 example incl the
reminder-then-dismiss and manual-switch steps; plus "no reminder → pure right-step / next-workspace wrap".

Full suite green (`cd frontend && npx vitest run`), vue-tsc 0, eslint 0, prettier clean.

## 9. Open Questions

- None blocking. `reason` field is retained for result-shape stability though no runtime consumer reads it.
