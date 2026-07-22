# LOCAL_MODS — pandalaohe/dinotty (fork of xichan96/dinotty)

Upstream: https://github.com/xichan96/dinotty (MIT)

## Contribution Index (registry format version: 2 — authoritative; schema home: upstream-update `templates/local-mods-init.md.tmpl`)

| mod_id | upstreamable | upstream_pr | upstream_issue | lifecycle | absorption | head_branch | exit-condition |
|--------|--------------|-------------|----------------|-----------|------------|-------------|----------------|
| `1dff1a86-null-successor-fallback` | yes | https://github.com/xichan96/dinotty/pull/204 | | merged-upstream | absorbed | fix/tab-close-null-successor | met `2026-07-22` — merged upstream `f958848c`, blob parity |
| `mocha-theme` | no | n/a | n/a | private | n/a | | never — fork identity (excluded from #148/#149 by design) |
| `signing-identity` | no | n/a | n/a | private | n/a | | never — machine-local config |
| `deploy-scripts` | no | n/a | n/a | private | n/a | | never — fork ops (dinotty-ops.sh / deploy-live.sh / dinotty launcher) |
| `fork-meta` | no | n/a | n/a | private | n/a | | never — fork bookkeeping (.gitignore, .upstream-update.json, LOCAL_MODS.md, docs/task-files/) |

- Index wins conflicts with narrative/tables below (those are provenance). Volatile API state (PR state / checked_at) lives in run receipts, not here.
- Migrated v1→v2 `2026-07-22` by the upstream-update run; mod_id minted from commit short hash (feature rows) or stable slug (meta rows sharing re-apply commits `4d3367c5`/`4e4715e0`); never renumbered.

## Live-alignment snapshot (source of truth — consult here; do not re-derive from git each session)

> **Reconciled against git `2026-07-22`.** Upstream shipped a large composable-splitting refactor
> (`f90b843b..83f1c670`, 13 commits, 112 files, +18280/−15967): `App.vue`, `useTerminal`, `TabBar`,
> `MobileKeyboard`, `TerminalPane`, `useNotification` split into focused composables; backend into
> `src/ws/*` submodules; plus `b6521103` (activate successor workspace on last-tab close) which
> converges ~95% with our cross-workspace hop. Because the refactor MOVED the files our 78-commit
> layer edited, `custom` was rebuilt by WASHBOARD (re-cut fresh from `upstream/dev`, re-apply only
> the genuine fork layer) rather than merge — user-directed, and safe here because the surviving
> fork layer was verified against upstream first and the old lineage is preserved in
> `backup/custom-20260722`. Detailed "Ours-only" / "Pending recovery" / PR-table entries BELOW
> predate this re-align and describe the pre-refactor layout; kept for provenance. Trust THIS
> snapshot + the newest re-align log entry for current state.
- **Aligned to `upstream/dev` @ `f958848c` (2026-07-22 2nd align, clean merge via the upstream-update
  full-lifecycle run; same-day washboard base was `83f1c670`).** Fork-layer diff vs `upstream/dev` = fork files
  only (no resurrected relocated `src/*.rs`). Fork layer now:
  - Config/meta: Mocha theme (`themes.ts` / `ThemeManager.vue` / `useI18n.ts`), macOS signing
    identity (`src-tauri/tauri.conf.json`), deploy orchestrator (`scripts/dinotty-ops.sh` +
    `scripts/deploy-live.sh` + `scripts/dinotty` short launcher — global via a symlink into a PATH
    dir, e.g. `/opt/homebrew/bin/dinotty`; `dinotty rebuild 8999|8998|all` — detaches to background
    by default (survives the app restarting its own terminal; `--fg` for foreground), `dinotty log
    [-f]`, `dinotty status`, `dinotty help`), meta (`.gitignore`, `.upstream-update.json`, `LOCAL_MODS.md`,
    `docs/task-files/*`).
  - Feature (1): positional fallback + `activateWorkspace` sync when no successor tab remains on
    close, in `useTabLifecycle.ts`. Upstream's `b6521103` covers the rest of the cross-workspace
    hop, but its failed-hop rescue only re-searches the (now-empty) active workspace, so
    `activePaneId` can go `null` (no tab selected) — a real gap, verified against `upstream/dev`;
    our positional fallback closes it. **PR #204 MERGED** (`f958848c`, `2026-07-22T08:05Z`; branch
    `fix/tab-close-null-successor`, GC candidate this run; 2 files, +54/−1). Blob parity verified —
    fork delta now byte-identical with upstream; absorbed (exit condition met, reconciled `2026-07-22`).
    Plugin-tab restore validation — **DECIDED 2026-07-22, follow upstream, do not re-raise as unmerged
    work.** Re-applied on 2026-07-22 then DROPPED the same day (`3e04bb14`): it lived in the hot,
    actively-reworked `useSyncWebSocket.ts`, and upstream restores plugin tabs unconditionally (no
    reconcile), so following upstream costs only a manually-closable ghost tab after a plugin
    uninstall/rename while disconnected — not worth the recurring hot-file conflict. Reopen only if the
    user asks or upstream's plugin-restore code materially changes.
  Everything else from the prior 78-commit layer verified already upstream/converged (action-keyboard,
  per-device supervise-reload, plugin-tab resurrect-race fix, NUX1 notification, badge mode, etc.).
  Verified: vitest 741 + vue-tsc + cargo check/test/clippy all green; code-reviewed (1 MED fixed —
  workspace sync on cross-workspace fallback). `main` fast-forwarded to `83f1c670`, pushed origin.
  Pre-refactor backups: branch `backup/custom-20260722` (old `custom` snapshot) +
  `backup/custom-20260721-214526` (prior baseline).
- Update trigger: on any upstream re-align OR when a PR flips open<->merged — refresh SHA, date, table.
- Re-align log (newest first):
    - `2026-07-22` (**2nd — first full-lifecycle upstream-update run**) → base `f958848c` (was
      `83f1c670`): clean merge, zero conflicts (#204 files blob-parity; /ws/sync refactor family has
      zero overlap with the fork layer). GitHub reconcile (all verified): #204 OPEN→MERGED (absorbed);
      #203 OPEN→CLOSED unmerged (superseded by upstream `b6521103` + our #204 — no content lost);
      #190/#191/#194/#180 stale "PR open" prose reconciled to merged. Ledger migrated v1→v2
      (Contribution Index added, top); config migrated to v2 (declared verify.steps + human-only
      deployment). `fix/tab-close-null-successor` = GC candidate (conditions 1-5 verified; outcome in
      receipt). Triage receipt: `docs/task-files/2607/260722_dinotty_upstream-triage.md`.
    - `2026-07-22` (**washboard onto refactored dev**) → base `83f1c670` (was `f90b843b`): upstream
      landed a large composable-splitting refactor (13 commits, 112 files, +18280/−15967). Re-cut
      `custom` fresh from `upstream/dev` and re-applied only the fork layer rather than merging the
      78-commit layer into the moved files. Feature survival re-verified: only 2 code items remained
      unmerged — cross-workspace null-successor fallback (into `useTabLifecycle.ts`, complementing
      upstream's `b6521103`) and plugin-tab restore validation. The plugin validation was re-applied
      then DROPPED the same day (`3e04bb14`) to follow upstream — it sits in the hot, actively-reworked
      `useSyncWebSocket.ts` and upstream restores plugin tabs unconditionally, so the only cost is a
      manually-closable ghost tab. Kept: only the null-successor fallback. All other prior fork code
      confirmed converged upstream. `main` FF to `83f1c670` + pushed. Old backups pruned to
      `backup/custom-20260721-214526`; new pre-refactor snapshot `backup/custom-20260722`. Verified
      green (vitest 741 / vue-tsc / cargo check+test+clippy) + code review (1 MED workspace-sync fixed).
    - `2026-07-21` (2nd) → base `f90b843b` (was `1344e553`): merge `62cacaad`. Upstream landed SIX of
      our PRs at once (#197-#202); all six conflicts resolved to upstream. Kept ours: the
      cross-workspace hop on tab close, and `handleTabClosed()` as one function. Two defects came
      through as CLEAN auto-merges rather than conflicts — duplicate `const closedWorkspaceId` in
      `App.vue` (compile break) and a duplicate `reloadApp` action row (typechecks; fails both
      array-length tests); `test/{actionKeyboard,keybindings}.test.ts` were restored to upstream
      since the fork held no changes there beyond that duplicated row. Verified: cargo check/test
      (384) + clippy -D warnings + vitest (746) + vue-tsc, all green.
    - `2026-07-19` (fork-layer change, no re-align) → the per-device localStorage monogram toggle landed
      earlier the same day was REPLACED by a four-state server-settings mode `workspace_badge_mode`
      (`off`/`tab`/`icon`/`both`); `useDeviceMonogramSetting.ts` deleted. Reasons: a localStorage toggle
      is per-device and cannot be upstreamed, and it conflated "can I edit abbr/color" with "is the badge
      shown" — abbr/color are now editable in EVERY mode including `off`. Settings schema v4 → v5 with a
      migration (`Some(true)`→`tab`, `Some(false)`→`off`; v3-and-earlier stays `None` because there the
      boolean was a global default, not a user choice). Unset resolves device-aware
      (`isMobile ? 'tab' : 'off'`) so upstream default behaviour is unchanged. Settings UI uses a new
      reusable `ui/SegmentedControl.vue` (radiogroup semantics + roving tabindex) instead of a dropdown,
      matching the existing NotificationTab segmented control. Opened as PR #180. Two review routes each
      caught what the other missed: codex found `put_settings` persisting an unmigrated payload and later
      the wrong tablist/tab a11y semantics; a second reviewer caught a regression introduced during a
      slimming pass (upstream-exported `contrastRatio`/`relativeLuminance` demoted to private, invariant
      assertions replaced by hardcoded hex). Verified: cargo fmt/clippy clean, 316 Rust lib tests,
      vue-tsc 0, vitest 691/691, production build green.
    - `2026-07-19` (merge) → base `bd65a2a6` (was `e0be277e`): merged 9 upstream commits into `custom`
      (merge `bf2e1954`). `git merge-tree` predicted and the real merge confirmed ZERO conflicts — every
      remaining fork code mod sits in files upstream did not touch. THE EVENT OF THIS ALIGN: upstream
      `dc7e0b6d` "drop monogram and switch to lucide icons" REVERSED our own PR #172 (merged upstream only
      one day earlier at `84e21312`), deleting `frontend/src/utils/workspaceIcon.ts` + its test and stripping
      the abbr/color inputs from `CreateWorkspaceDialog.vue`. Per the new Upstream divergence policy we
      re-landed the monogram behind a per-device toggle rather than dropping it (11 files, +610/−12; detail
      in Ours-only). Four review rounds were needed: codex found (P2) an always-on MutationObserver, (P2)
      missing toggle tests, (P1) BOTH `.mc-trigger` monograms silently lost because a grep of the CURRENT
      tree cannot see call sites upstream already deleted, (P1) frontend fallback palette drifted from the
      Rust backend's new One Dark Pro colors, and finally (P1) the dialog still SUBMITTING abbr/color while
      the toggle hid the inputs. Verified: vue-tsc 0, vitest 670/670, production build green. Also seeded
      `.git/info/exclude` via `infra-git-hygiene.sh` (it was EMPTY — all 5 Tier-1 infra patterns unignored,
      a live PR-leak risk).
    - `2026-07-17` (merge) → base `e0be277e` (was `83f2ab77`): merged `upstream/dev` into `custom` via the
      `feat/notification-ux` merge `9b5c0e35` (+ direct `7331ff43`). Landed the NUX1 notification UX overhaul
      and, in the same lineage, supervise-tabs design docs (docs-only), `dinotty-ops.sh` (DOP1), login-shell
      PATH import, `createTerminalTab` workspace activation, and this session's TabBar mouseleave fix
      (`e22bc146`, PR #160) + `dinotty-ops` `quit_instance` set-e fix (`9f5bf329`). 8999 redeployed via
      `dinotty-ops rebuild-prod` (v0.17.2, fingerprint OK).
    - `2026-07-15` (merge) → base `83f2ab77` (was `ba689a77`): merge `upstream/dev` (5 commits) into `custom`.
      Pulled upstream terminal fixes: write-pump stall/render-freeze recovery `348d0d48`, IME-composition
      skip-focusActive `e49ffbe4`, onData-dedup Tauri-only `f2590a7d`, freeze/resize + P3/P4/P5 repro/verify
      `.mjs` scripts (`b2ebe9c4`/`83f2ab77`). Clean FF-style merge — upstream touched NO fork file
      (themes.ts/ThemeManager.vue/useI18n.ts/deploy-live.sh diff empty), `git merge-tree` reported zero
      conflict; Mocha + 6-file meta layer intact post-merge. Rebuilt both surfaces: web (`pnpm build` +
      `cargo build -p dinotty-server` + 8998 restart env-stripped PID 25411) + desktop (`deploy-live.sh` →
      release Tauri build + config-safe atomic reinstall v0.17.2, 8999 PID 26903). Backup tags
      `pre-update-custom-20260715-232259` / `pre-update-main-20260715-232259` + branch
      `backup/custom-20260715-232259`. Merge commit `79064a06`.
    - `2026-07-15` (**washboard**) → base `ba689a77` (was `4ab352da`): user-requested clean re-align to
      official dev — all our PRs merged upstream, so upstream leads. Hard-reset `custom` to `upstream/dev`,
      re-applied ONLY meta files + Mocha theme; dropped fork code drift so over-done bug fixes can be
      re-investigated fresh against official (old peer-follow refit in `useTerminal.ts` → took upstream's
      newer "always refit after peer follow" `ba689a77`; `useI18n` defaultDir wording → upstream). Rebuilt
      web (`pnpm build` + `cargo build -p dinotty-server`, green) + desktop (`deploy-live.sh`). Backup tag
      `backup/washboard-pre-260715` = `ae0c0e16`.
    - `2026-07-15` → base `4ab352da` (was `cf1c54dc`): merge `806c75ed` into `custom`. Pulled 2 upstream
      commits (workspace remote-upload dest/error-surface fix `4ab352da`). Single conflict `src/pty.rs`
      test-import — kept our HEAD superset; **upstream independently shipped the SAME env-strip**
      (`is_claude_session_env_key` / `claude_session_env_keys_to_strip`), now in `upstream/dev`, converged
      net-zero with our S1. NEW fork mod this align: per-surface `DINOTTY_URL` injection (commits `d40911ce`
      feat + `9ed83361` design; see Ours-only). Rebuilt both surfaces (web `cargo build` + 8998 restart;
      desktop `deploy-live.sh`). Verified `cargo check --workspace` + `pty::` tests + fmt green; codex +
      Claude reviewer 2-round CLEAN. **PR #154 (S1+S2) MERGED upstream** (`1250438a` "strip Claude Code
      session env from spawned terminals") — env-strip + configurable reap now in base; our custom S1
      commits fold net-zero. Reconciled #154 OPEN→MERGED this align. S3 deploy-live scrub stays fork-only.
  - `2026-07-14` (2nd) → base `cf1c54dc` (was `4473eab1`): merge `6ff564ab`. Pulled upstream SSH
    relative-path fix `cf1c54dc` + theme-template/App.vue additions. Clean, no conflict. Rebuilt
    frontend (`pnpm build`) + backend so the rust_embed dist is current (prior 8998 served stale
    pre-merge dist → notification UI button was missing); 8998 web server restarted on the fresh
    binary. Notification integration wired at the user/global layer (not a fork code mod): `Notification`
    + `Stop` hooks in `~/.claude/settings.json` POST to `127.0.0.1:8998/api/notify` gated on
    `$DINOTTY_PANE_ID`; CCS1 `cc-settings-sync` snapshot committed; 2 hooks-bearing cc-switch providers
    (Claude Official, DS) patched so provider-switch keeps notify.
  - `2026-07-14` → base `4473eab1` (was `d44d9682`): merge `635d7ddc`. Pulled 6 upstream commits
    (notification per-tab-severity aggregate, terminal refit/viewport fixes, #152 vt fix now merged
    upstream). Single conflict `src/vt_screen.rs` — one test line, semantically identical
    (`[b'>',b'<',b'=']` vs upstream `*b"><="`), took the upstream #152 form. Reconciled #152 open→merged.
    Landed the Claude env-leak / tab-kill fix on `custom` (S1/S2/S3 commits `e6eec8d4`/`41b4c071`/`1ad3240e`).
    Verified cargo check + test + fmt + clippy green.
  - `2026-07-13` → base `d44d9682` (was `6ba98b4d`): merge `b8818452`. DT19 #148 MERGED upstream
    (`bfe59572`); reconciled DT19 open→merged. 7-file conflict resolved — theme frontend files kept OURS
    (= upstream DT19 + mocha + theme-export superset; verified no upstream hunk dropped), `src/settings/`
    `mod.rs`/`tests.rs` took UPSTREAM (clippy-clean struct-init + doc-comment style). Filed theme-export
    PR #149. Pruned merged zombie branch `pr/theme-manager` (content preserved in `bfe59572` + `custom`).
    Verified: vue-tsc 0 / vitest 376 / build green; cargo settings tests 4/4. Pre-existing upstream
    `clippy -D` unused-import warns in `platform/shell.rs`/`ssh/mod.rs` left untouched (identical to
    `upstream/dev`, platform-conditional — not ours to fix in a re-align).
  - `2026-07-13` → base `6ba98b4d` (was `2c1a407c`): pulled upstream logging-unify fix; clean auto-merge
    (`src/settings/mod.rs` both-side additive). Reconciled #138/#144 open→merged. Repo hygiene: pruned 21
    merged-PR branches + 8 stale backup tags; DT13 quick-key recovery work re-preserved in tag
    `recovery/dt13-quick-key` (was on deleted branch `feature/dt6-input-autogrow`). Rebuilt+reinstalled via
    `scripts/deploy-live.sh` (config-safe: localStorage + server settings preserved).
  - `2026-07-13` → base `2c1a407c`: DT18 #147 merged into base; DT19 recorded (PR pending).

### Our PRs -> upstream state
| PR | Feature | State |
|----|---------|-------|
| #103 | terminal line-editing keybinds | merged |
| #108 | mobile long-press word-select | merged |
| #109 | shift-symbol rescue (Tauri + macOS IME) | merged |
| #112 | Windows Alt-as-Cmd (+ virtual-Meta) | merged |
| #118 | mobile-web input box (auto-grow, upload) | merged |
| #125 | Space-confirms-dialogs | merged |
| #126 | DT5 adaptive scroll suite | merged |
| #129 | workspace folder-picker | merged |
| #133 | terminal refresh-realign + resize follow | merged |
| #134 | DT16 settings sections default-expanded | merged |
| #135 | DT17 font-family preset | merged (maintainer hardened `7e3745c` + merged into dev) |
| #138 | macOS workspace delete (in-app confirm) | merged (`2026-07-12`, part of base) |
| #144 | configurable default workspace root | merged (`2026-07-12`, part of base) |
| #147 | DT18 per-device font override | merged (`1c7f0dfc`, part of 0.17.2 base) |
| #148 | DT19 per-device custom theme manager | merged (`bfe59572`, `2026-07-13`; mocha excluded from PR, stays fork-only) |
| #149 | theme export (readable ghostty-compatible, `# name` + per-color comments) | merged |
| #152 | vt: reject private-marker CSI in screen parser (fixes web underline leak on reconnect) | merged (`4473eab1`, `2026-07-14`, part of base) |
| #154 | Claude env-leak strip + configurable reap (S1+S2) | merged (`1250438a`, `2026-07-15`, part of base) |
| #155 | per-surface `DINOTTY_URL` injection (notify routing) | merged (`2026-07-15`) |
| #160 | tabbar: stop plugin/new-tab menus closing on mouseleave | merged |
| #172 | workspace: monogram icons with color outline | merged (`84e21312`, `2026-07-18`) then REVERSED upstream by `dc7e0b6d` (dropped monogram for lucide icons). Re-landed fork-side, now as the `icon`/`both` states of PR #180. |
| #177 | settings: keep the font dropdown inside the settings panel | merged (`156c9973`, `2026-07-19`, part of base) |
| #180 | settings: four-state workspace badge mode (off/tab/icon/both) | merged (`2026-07-19`) |
| #181 | editable mobile action keyboard (app-action keys, data-driven footer, drag reorder, user defaults) | merged (`2026-07-20`) |
| #185 | tabs: shrink overflowing tabs (flex min-content floor), wheel scroll, edge fade, tab context menus | merged (`2026-07-21`) |
| #186 | supervise: exclude plugin tabs from supervise rotation | merged (`f6aec596`, `2026-07-21`) |
| #187 | tabs: validate cached plugin tabs on restore, close resurrect race | **CLOSED — superseded** by upstream's own `eaf656ab` (flush plugin tab closures synchronously). Upstream fixed the close race independently; see Ours-only for the restore-validation half, which `eaf656ab` does NOT cover |
| #188 | mission-control: stop panel close button overlapping the first row | merged (`fa04d662`, `2026-07-21`) |
| #190 | settings: optional reload after supervise-tabs jump + per-device override | merged (`ff08584f`, `2026-07-21`) |
| #191 | scroll: stop wheel events becoming arrow keys on the alt screen | merged (`8780d3a0`, `2026-07-21`) |
| #194 | output: sync-mode cross-task race (reordering) + `screen`→`clients` reader deadlock | merged (`2026-07-21`) |
| #195 | session: keep sync-buffer flush chunks on UTF-8 boundaries | **landed as `9e312750`** (`2026-07-21`, commit body says `Closes #195`) — the maintainer rebased it onto dev after #194 restructured sync state and committed it himself; the PR itself shows CLOSED, not merged. Content IS upstream |
| #196 | pty: stop a transient lock failure from killing keyboard input (`try_lock` → `blocking_lock` in the four `spawn_blocking` writers) | **landed as `96a8d115`** (`2026-07-21`, `Closes #196`). Same pattern as #195: the maintainer rebased and committed it himself rather than squash-merging, because the PR's `src/session/tests.rs` referenced the pre-#194 `sync_active`/`sync_buffer`/`sync_buffer_bytes` fields — the exact breakage our own merge hit. PR shows CLOSED; content IS upstream |
| #197 | plugin: kill the child process when `plugin_exec` times out (`kill_on_drop(true)`) | merged (`c86ecde8`, `2026-07-21`; branch `fix/plugin-exec-kill-timed-out-child` cut from clean `upstream/dev`; 1 file, +1; no test — a real one needs to outlive a timeout and poll for process death, judged too flaky to be worth it on a one-line builder change; leak gate CLEAN) |
| #198 | vt: stop a UTF-8 boundary panic freezing the screen mirror permanently (`output_buf` String → `Vec<u8>`) | merged (`d5f5c161`, `2026-07-21`; branch `fix/vt-command-output-utf8` cut from clean `upstream/dev`; 1 file, +49/−7; discriminating regression test verified — fails pre-fix on the `is_char_boundary` panic; leak gate CLEAN) |
| #199 | tabs: keep the tab-close successor in the same workspace | merged (`8e1fe150`, `2026-07-21`; branch `feat/workspace-aware-tab-successor`; 4 files, +108/−5; wired into BOTH upstream close paths (app-level + `tab_closed` sync handler); cross-workspace hop behaviour deliberately left out to stay single-purpose; test discriminating by construction — `[A₁,B₁,A₂]`, close `A₁`, upstream's clamp yields `B₁`, test asserts `A₂`) |
| #200 | keyboard: make reload a bindable app action (default Cmd/Ctrl+R) | merged (`7d6d0df3`, `2026-07-21`; branch `feat/reload-app-keybinding`; 5 files, +16/−4). Smaller than expected: upstream ALREADY has the `reloadApp()` function (supervise flow calls it) and merely never exposed it as an action, so App.vue needed one line. Motivation is the Tauri shell, which has no reload affordance at all |
| #202 | workspace: give the default workspace a real identity (name/abbr/colour/badge over a `__default__` sentinel) | **landed as `e1f9c589`** (`2026-07-21`) — the maintainer rebased and committed it himself, body says `Closes #202`; the #195/#196 pattern again, so the PR shows CLOSED rather than merged. Content IS upstream. (branch `feat/default-workspace-identity`; 13 files, +287/−83). Deliberately does NOT relocate upstream's `default_workspace_root` control out of `GeneralTab.vue` the way our fork does — that would move a maintainer's existing control as a side effect of an unrelated feature. Backward compat pinned by a test parsing a settings blob with only `default_workspace_root` |
| #201 | vt: track and replay DEC private modes (mouse protocol/encoding, DECCKM, DECNKM, bracketed paste) | merged (`132388d5`, `2026-07-21`; branch `feat/vt-private-mode-replay`; 1 file, +322/−9). Replay call needed in TWO places — `snapshot()` AND `snapshot_for_replay()`; the reconnect path would otherwise stay broken while a fresh snapshot worked. 1004 tracked-not-replayed; 2026/1049-family/6/7/45/1005/1015/1048 excluded with per-mode reasons stated inline in the PR (NOT by reference to our design doc, which lives outside the fork repo and is invisible to upstream) |
| #203 | tabs: follow the successor tab across workspaces on close | **CLOSED unmerged** (verified `2026-07-22`) — superseded: upstream landed its own cross-workspace successor (`b6521103`, ~95% convergent) and our #204 closed the remaining failed-hop gap; no content lost. (was OPEN `2026-07-21`, branch `fix/tab-close-workspace-hop` cut from clean `upstream/dev` @ `f90b843b`; 4 files, +165/−9). The half deliberately cut from #199, unblocked once #199 merged. Upstream's successor fallback can activate a tab outside the workspace filter, so the tab bar does not contain the active tab. Two discriminating tests, one per close path — verified red by reverting both source files to `dev` (exactly those two fail, 738/740) and green with the fix (740/740). PR body discloses the `handleMsg` async change to the maintainer. NOT manually verified on a running build — the evidence is the code-path analysis plus the tests) |
| #207 | i18n: supervise-tabs hint → functional wording shown on all platforms + Alt-as-Cmd toggle rename | OPEN (filed `2026-07-22`) |

### Ours-only — NOT in upstream (no PR, or PR not yet accepted)
- **Terminal output-path concurrency: sync-mode race + reader deadlock** (2026-07-21;
  `fd982c3c` + `1367fcd9`) — two general upstream bugs in `src/session/mod.rs` + `src/pty.rs`,
  both verified present verbatim in `upstream/dev @ d5a819e8`:
  1. **DEC 2026 synchronized-output race → visible garbling.** `sync_active` (AtomicBool),
     `sync_buffer` (Mutex) and `sync_buffer_bytes` (AtomicUsize) are three separate pieces of state
     mutated from different tokio tasks with no shared critical section. `set_sync_mode(false)`
     drains the buffer and enqueues `SyncEnd` BEFORE clearing the active flag; a concurrent
     `broadcast()` observing the stale flag in that gap pushes its payload into the just-emptied
     buffer, where it strands until the next frame. An escape sequence split across that boundary
     arrives with its halves REORDERED — the tail renders as literal text. Not data loss: the wire
     capture shows bare `;2;153;153;153m` at offset 979457 with its orphaned head `ESC[38`
     reappearing at 980535, exact complements, three independent occurrences. Fixed by merging the
     three fields into one `Mutex<SyncState>` with the guard held across the whole teardown
     (`fd982c3c`).
  2. **`screen` -> `clients` lock cycle freezes the PTY reader.** The reader held the screen lock
     while dispatching drained sync events, and `set_sync_mode` -> `enqueue_control` takes `clients`;
     meanwhile `atomic_resize_and_snapshot_for_client` takes `clients` then `screen`. ABBA cycle,
     both tasks block permanently, pane goes dead. Fixed by collecting the events under the screen
     lock and applying the transitions after releasing it (`1367fcd9`).
  Verified on the 8998 test instance across two rebuilds: 1.25M then 2.0M chars of wire capture over
  4111 synchronized frames, zero truncated CSI / bare SGR / malformed colour. Pre-fix rate was
  4.2 per million chars, so P(0 | unfixed) ~ 0.02%. The sync-race regression test is proven
  discriminating (splicing the old ordering back in fails it at the intended assertion); the deadlock
  fix has NO test — a lock cycle cannot be reproduced deterministically, so its argument is a full
  enumeration showing no `screen -> clients` edge survives anywhere.
  upstreamable: **yes** (both — general upstream bugs, verified verbatim in `upstream/dev`) ·
  status: **merged** (reconciled `2026-07-22`; verified MERGED `2026-07-21`, mergeCommit `f485d8d2`) · upstream_pr: **#194** (`2026-07-21`, branch `fix/sync-output-race` cut from
  clean `upstream/dev @ d5a819e8`; 3 files, +215/−97; pre-PR leak gate CLEAN, fmt clean,
  365 tests pass) · upstream_issue: —
  **Deliberately EXCLUDED from that PR:** upstream's `flush_sync_buffer` chunks with
  `combined.as_bytes().chunks(FLUSH_CHUNK_SIZE)` + `from_utf8_lossy`, which splits a multibyte
  character at every 64KB boundary (CJK/emoji corruption on large flushes). The fork fixed this
  locally with the char-boundary-safe `for_each_flush_chunk` helper, which does NOT exist upstream.
  The PR adapts to upstream's chunking verbatim to stay single-purpose; the chunking bug is a
  separate upstreamable candidate and needs its own PR.
- **Supervise/plugin-tab restore/Mission Control mobile fixes** (2026-07-20; three separate local
  commits: `29334fc4`, `a9be2c23`, `c00b351f`) — three general upstream frontend bugs:
  1. Supervise rotation iterated the full tab list and could enter a plugin tab. The candidate-building
     site now filters plugin tabs, leaving the pure picker plugin-agnostic (`29334fc4`).
  2. Plugin tabs exist only in per-client localStorage — backend `TabInfo` has no plugin concept — but
     every `tab_list` restored them unconditionally with a title snapshot frozen when the tab was opened.
     An uninstalled or renamed plugin therefore left a permanent dead tab with a stale name, and different
     clients accumulated different ghost tabs. Restore now reconciles against the loaded plugin set:
     missing entries are dropped and survivors take the current manifest name. Deletion runs only after
     the initial plugin load completes, so a `tab_list` arriving during load cannot drop a valid tab; the
     memoized load promise clears on rejection so one failed load does not permanently disable
     reconciliation. Also fixed the close race: `closeTab` removed the in-memory tab while the localStorage
     write remained behind a 200ms debounce, so a `tab_list` in that window could resurrect the just-closed
     tab from stale storage. Plugin closes now flush synchronously, and the invalid-tab set is hoisted above
     connection scope so it survives reconnects (`a9be2c23`).
  3. At the 600px breakpoint the workspace list becomes full-width and moves to the top, putting its first
     row's count badge under the absolutely-positioned panel close button. The first row now reserves room
     and has a 46px minimum height, so the 44x44 touch target fits fully inside it (`c00b351f`).
  upstreamable: **yes** (all three — general upstream bugs, not fork-specific) ·
  status (updated `2026-07-21`): **#186 merged** (`f6aec596`) · **#188 merged** (`fa04d662`) ·
  **#187 CLOSED — superseded, but only PARTIALLY covered** · upstream_issue: —
  **#187 residual — ABANDONED `2026-07-21`, deliberately unmaintained. Follow upstream.**
  Upstream closed #187 and fixed the close-resurrect race its own way via `eaf656ab` (their PR #189).
  That covers only half the original bug: the restore-validation half has no upstream equivalent
  (`git grep -i "invalidTab|reconcile.*plugin" upstream/dev -- frontend/src` → no match), so upstream
  still restores every cached plugin tab unconditionally with a frozen title snapshot, and an
  uninstalled or renamed plugin still leaves a dead tab with a stale name.

  **Decision: do not fix, in fork or upstream.** Upstream is actively reworking this area, so a fork
  patch here would be re-conflicting churn against a moving target. Accepted workaround: manually
  close ghost plugin tabs when they appear. No taskboard token — the exit condition is upstream's,
  not ours, and is recorded here at the workaround site per P8.
  Re-evaluate only when upstream's plugin-tab handling has settled and been observed for a while.

  **Keep this finding — it applies to the CURRENT fork and to upstream, not just to the abandoned
  patch.** A rewrite of the restore path onto `eaf656ab` was built and reviewed on
  `2026-07-21`, then discarded. Review found a HIGH data-loss defect worth not rediscovering:
  `usePluginLoader.ts::loadAll()` does NOT reject when the whole `/api/plugins` fetch fails — both
  `if (!res.ok)` and the outer `catch` swallow it and resolve normally. So "the plugin load resolved"
  does NOT mean "the plugin list is valid". Any logic that treats an empty/stale `loadedPlugins` as
  positive evidence a plugin was uninstalled will, on one transient 500 or a startup race, silently
  and permanently delete every cached plugin tab. This is a live trap for anyone (us or upstream)
  who later builds reconciliation on that promise. The discarded patch's own comment claimed it only
  dropped on positive evidence; it could not, because of this contract.
  The abandoned branch `fix/plugin-tab-restore-validation-v2` and its worktree were deleted.
  All three branches were cut from clean `upstream/dev`, single-purpose, and passed the pre-PR
  infra-leak check. #187 carries a pre-existing `no-redeclare` eslint error on the `newTab`
  overloads, reproduced on unmodified `dev`; the suite's two `addCursorsInFiles` test failures are
  likewise pre-existing (upstream `f163ff25` introduced that feature). Both facts are stated in the
  PR bodies rather than silently carried.
  Verified: vue-tsc 0 errors; vitest 57 files / 736 tests all pass. Two independent review rounds: round 1
  caught the close button overflowing 6px into the second row; round 2 caught both a failed plugin load
  permanently disabling reconciliation and the reconnect window resetting the invalid-tab set. All were
  fixed and reverified. Real-device end-to-end verification: **NOT RUN** — user declined the 8998
  rebuild; verified at the code/test level only. Noted in the upstream PR bodies.
- **Block alt-screen wheel→arrow-key conversion, keep touch-scroll path** (2026-07-20) —
  xterm.js 5.5.0 hardcodes converting wheel events into cursor-key sequences (`ESC[A`/`ESC[B`) whenever
  the alternate screen buffer is active and the app hasn't taken over mouse reporting, with no DECSET
  1007 read and no option to disable it (upstream xterm.js issue
  https://github.com/xtermjs/xterm.js/issues/5194, open since 2024-10-18, no PR). This punches arrow
  keys into full-screen TUIs' input boxes (e.g. Claude Code) on every real mouse-wheel scroll. Added a
  new private method `_isWheelReportedByApp()` in `_setupAdaptiveWheel`'s custom wheel handler
  (`useTerminal.ts`) that reads xterm.js's internal `_core.coreMouseService` (`activeProtocol` getter +
  `_protocols[activeProtocol].events` bit-16 mask distinguishing VT200/DRAG/ANY from X10/NONE) to detect
  whether the app has actually taken over wheel reporting; when alt-screen is active and the app has
  NOT taken over, the real wheel event is swallowed (`preventDefault`/`stopPropagation`/return false)
  before xterm's built-in conversion runs.
  ORDER CONSTRAINT: the new check sits AFTER the existing `_wheelBypass` early-return, never before —
  `frontend/src/utils/touchScroll.ts` dispatches synthetic WheelEvents for finger-drag scrolling and
  relies on xterm's wheel→arrow-key conversion to scroll full-screen programs; moving the check earlier
  would silently break touch scrolling.
  UPGRADE FRAGILITY: `_isWheelReportedByApp()` depends on xterm.js PRIVATE internals
  (`_core.coreMouseService`, `activeProtocol`, `_protocols[...].events` bit layout) that are not part of
  the public API. On every xterm.js upgrade, re-verify these fields still exist with the same shape —
  if they don't, the method silently returns `undefined` and the fix silently stops working with no
  error.
  Known residual: mobile finger-drag still converts to arrow keys inside alt-screen (intentional — it
  preserves touch scrolling in full-screen programs); xterm.js's old-style X10 mouse mode is already
  handled correctly.
  upstreamable: **yes** · status: **merged** (reconciled `2026-07-22`; verified MERGED `2026-07-21`, mergeCommit `8780d3a0`) · upstream_pr: **#191** (`2026-07-21`) ·
  upstream_issue: —
  Corrected `2026-07-21` (was `maybe` / "undecided"): the old note conflated two different upstreams.
  Filing against xterm.js IS undecided and stays so (their #5194 is open since 2024-10-18 with no PR),
  but that has no bearing on dinotty — this is a dinotty-side guard around a third-party quirk, is
  self-contained in `useTerminal.ts`, and needs nothing xterm.js does not already expose. Pushed as
  PR #191 off clean `upstream/dev`, 1 file / +28, cherry-picked from `f9eeb8dd` (conflict was
  `LOCAL_MODS.md` modify/delete only — dropped; the code applied clean).
- **Reload once after the supervise-tabs shortcut** (2026-07-20, local `17fe80a0`) — setting
  `reload_after_supervise_tabs` (Rust `#[serde(default)]` + TS type/default + a toggle rendered
  directly under the `superviseTabs` shortcut row in `KeyboardTab.vue`, so it adds no top-level
  settings row), plus the two `keybinding.superviseTabsReload*` i18n keys. `useSuperviseTabs.ts`
  `supervise()` changed void → `Promise<boolean>` so no-target / rejected activation / 10s watchdog
  timeout do NOT reload.
  upstreamable: **yes** · status: **merged** (reconciled `2026-07-22`; verified MERGED `2026-07-21`, mergeCommit `ff08584f`) · upstream_pr: **#190** (`2026-07-21`, bundled with the
  per-device override `45cbd5ed`) · upstream_issue: —
  **Corrected `2026-07-21` (was `no` / "fork-only").** Two compounding errors, both worth not
  repeating:
  1. The stated blocker — "depends on our `reloadApp` keybinding, which upstream does not have" — is
     no longer true: `reloadApp`/Cmd+R is now present upstream and byte-identical to ours, arrived at
     independently. That part of `fc8bcb37` is moot, and with it the whole basis for "fork-only".
  2. The deeper error is that this was never blocked on upstream in the first place — it was simply
     never pushed. `17fe80a0` bundled three unrelated things (tab shrink, context menus, this toggle);
     PR #185 took the first two and left this one behind, and the leftover then got reasoned about as
     if upstream had rejected it. **A mixed commit is how a change goes missing** — the visible part
     ships, the remainder is later mistaken for a deliberate exclusion. Keep commits single-purpose.
- **Default workspace as a first-class entity + Cmd+R reload + two tab-navigation bug fixes**
  (2026-07-20) — five bundled changes:
  1. `reloadApp` keybinding, default Cmd+R (registry entry 3, nav group). Cmd is IMPLICIT in this
     registry, so the literal is `{ key: 'r', shift: false }`. The action-keyboard "app actions"
     catalog derives from `defs` automatically, so no extra wiring.
  2. The "default workspace" was a sentinel state (`activeWorkspaceId === null`) with no record
     behind it, so it could not be named, colored, or edited. It is now SYNTHESIZED as a computed
     `Workspace` from new settings fields `default_workspace_name` / `_abbr` / `_color` (reusing the
     existing `default_workspace_root` as `path`). Deliberately NOT stored as a real record in
     `workspaces.json`: a real record would need an exclusion condition at every site iterating
     `workspaces` (list render, sort, delete API, path-prefix attribution) — more exclusion points
     than adaptation points — and would require a user-data migration.
     HARD INVARIANT: the synthesized object never enters the `workspaces` array and its `path` never
     participates in directory-prefix attribution. If it did, and its path were a parent of a real
     workspace's path (`/Volumes/Dev/ai` vs `/Volumes/Dev/ai/core`), it would steal that workspace's
     tabs. Its path is used ONLY as the new-terminal cwd.
     Also: `activeWorkspacePath` must coerce empty to `undefined` (`||`, not `??`) — the backend
     (`src/tabs.rs`) treats `Some("")` as an explicit cwd request and skips its own fallback.
     No SSH for the default workspace (`connection_id` always undefined, selector hidden): binding a
     remote to the catch-all workspace makes "where does a new terminal go" unpredictable.
  3. `default_workspace_tab_badge: Option<bool>` — a per-default-workspace override on the main badge
     setting. `None`/unset = follow the main setting; `false` = never show. Gated with strict
     `=== false` so unset means allowed. Render-layer only (`resolveRenderedTabWorkspace`).
     NOTE: `visibleTabList`'s FILTER stage must keep using un-fallback attribution while ONLY the map
     stage applies the default-workspace render fallback — otherwise the `return !ws` branch can never
     be true and every default-workspace tab disappears.
  4. BUG: closing a tab jumped to an arbitrary workspace's tab and the tab bar did not follow.
     Successor selection was a bare array-index neighbour that bypassed workspace sync, and the tabs
     array is flat across workspaces. Now prefers a same-workspace successor at the same relative
     position and synchronizes via `activateWorkspace()`. The rule lives in ONE place
     (`frontend/src/utils/tabSuccessor.ts::pickSuccessorTab`) because there are TWO close paths: the
     REST close in `App.vue::closeTab` AND the WebSocket `tab_closed` handler. The backend broadcasts
     `TabClosed` with `broadcast_sync` (all clients INCLUDING the initiator — contrast
     `broadcast_sync_others` in `src/ws/mod.rs`) BEFORE returning the HTTP response, so the WS echo can
     win the race and make `closeTab` bail at `idx === -1`. Fixing only `closeTab` leaves the bug live.
     Both paths also guarantee a non-dangling `activePaneId`: the tab is spliced before the awaited
     activation, so an activation failure or a superseded nav-generation must not return early past the
     reassignment and `persist()`.
     The nav generation is allocated BEFORE the DELETE, so an explicit user navigation made while the
     request is in flight is newer and stays authoritative. Known narrow tradeoff: a `closeTab` that
     ends up a no-op (tab already removed by the WS echo) still bumps the generation.
  5. BUG: the title bar fell back to the literal string `'dinotty'`. Same root cause as (2) — it
     renders the workspace NAME, never the cwd, and the default workspace had no name. Fixed by the
     entity. Real-time cwd in the title bar was evaluated and REJECTED for now: the data exists
     (`sniff_cwd_from_title_osc` → `cwd_state.cwd`) but is never pushed to the frontend, needing a new
     broadcast message across ~4-6 files, AND it has an unfixable gap — fish/cmd.exe/dash have no
     shell injection, and zsh preexec sets the title to the command name during execution.
  upstreamable: **yes** for 2/3/4/5 (bug fixes 4 and 5 most clearly); **(1) is MOOT** ·
  status: **candidate — extraction required, not a straight cherry-pick** · upstream_pr: — ·
  upstream_issue: —
  Updated `2026-07-21`:
  - **(1) `reloadApp`/Cmd+R is moot** — upstream now has it, byte-identical, arrived at independently.
    Drop it from any extraction. (This is also what unblocked PR #190; see the `17fe80a0` entry.)
  - This is a MIXED commit (`fc8bcb37`, 20 files) and must NOT be cherry-picked whole. Before any PR:
    drop (1), and strip the fork-only `scripts/deploy-live.sh` / `scripts/dinotty-ops.sh`
    `assert_not_self_hosted()` additions described below. Roughly 13 of the 20 files are genuinely
    upstreamable; core logic verified absent upstream (`useWorkspaces.ts` defaultWorkspace/
    activeWorkspace, `utils/tabSuccessor.ts`, the `useSyncWebSocket.ts` echo-race fix).
  - Deliberately NOT bundled with the `2026-07-21` PR batch (#190/#191): those were single-file or
    single-feature and cheap to verify, this needs a hunk-level extraction pass of its own.
  Rename: the workspace context-menu item is "Settings" (new `workspace.settings` key), not "Rename" —
  the old label reused the SHARED `palette.rename` key, which was left unmutated. The default workspace
  gets the same context menu with the delete item suppressed.
  Semantics fix: the two settings rows were near name-swapped. `settings.workspace.defaultRoot`
  ("默认工作区") actually set the new-terminal cwd — it moved into the default workspace's own settings
  and the standalone settings row was removed. `settings.uploads.defaultDir` ("默认工作区目录") only
  sets where the folder PICKER opens and does NOT prefill the path (`CreateWorkspaceDialog` forces
  `path = ''` on create) — relabelled with an explicit hint saying so.
  Ops (local-only, NOT upstreamable): `scripts/dinotty-ops.sh` + `scripts/deploy-live.sh` gained
  `assert_not_self_hosted()` — an ancestor process-walk refusing to rebuild the instance whose app
  bundle is hosting the invoking shell. Guard is FAIL-CLOSED: an unresolvable exec path, an
  unresolvable parent PID, or an over-long ancestor chain all refuse rather than proceed, since none of
  them can PROVE the shell is not self-hosted. Escape hatch `DINOTTY_SKIP_SELFHOST_GUARD=1`. The two
  copies are hand-synced siblings — cross-referencing comments in both; keep them in sync.
- **Four-state workspace badge mode** (2026-07-19) — `workspace_badge_mode`: `off` / `tab` / `icon` /
  `both`, replacing upstream's `show_workspace_badge_on_tab` boolean. Re-lands our PR #172 monogram
  (workspace name abbreviated to <=3 chars, CJK-aware, colored outline) as the `icon`/`both` states after
  upstream reversed it in `dc7e0b6d`.
  upstreamable: **yes** · status: **merged** (as #180; reconciled `2026-07-22`) · upstream_pr: **#180 (MERGED `2026-07-19`)** · upstream_issue: —
  Storage: server settings (NOT localStorage — the earlier per-device toggle was replaced precisely
  because a device-local flag cannot be upstreamed). Schema v4 → v5, `migrate_settings` maps
  `Some(true)`→`tab`, `Some(false)`→`off`; v3-and-earlier stays `None` (there the boolean was a global
  default, not a user choice). `put_settings` migrates BEFORE stamping the version so a legacy PUT cannot
  persist an unmigrated shape.
  Unset resolves device-aware via `resolveWorkspaceBadgeMode()`: `mode ?? (isMobile ? 'tab' : 'off')` —
  reproduces upstream default behaviour exactly, which is what makes this PR-able as opt-in.
  Abbr/color inputs are reachable in EVERY mode including `off` (fixes the earlier design, which
  conflated "can I edit it" with "is it displayed").
  Settings UI: new reusable `ui/SegmentedControl.vue` — radiogroup semantics (`role="radiogroup"` /
  `aria-checked`), roving tabindex, arrow keys on both axes, Home/End, no wrap-around, no transition
  (matches the existing NotificationTab `.segmented-control`, which is left untouched). Spacing is
  applied at the usage site (`.ws-badge-control`), not in the component, and NOT by touching the shared
  `.settings-hint` rule the whole panel depends on.
  NOT gated, deliberately: upstream's own per-tab `tab-ws-badge` spans (`showWsBadge`) are a separate
  upstream feature in a different position — left unconditional and untouched.
  Palette: `WORKSPACE_COLORS` mirrors the Rust `WORKSPACE_PALETTE` (One Dark Pro) in
  `src/workspace_mgmt/mod.rs` exactly, same values AND order — both sides select via `fnv1a32(id) % 7`,
  so a drift silently desyncs frontend/backend fallback color for any workspace with no explicit color.
  Contrast: `outlineColor()` needs the gamma-decoded WCAG relative luminance; `themes.ts`'s `luminance()`
  is a simplified channel average and is NOT interchangeable. Not dead code — against the light theme's
  `#F5F5F5` all seven palette colors fail 3:1 unadjusted.
  Files (17): `src/settings/mod.rs`, `src/settings/tests.rs`, `composables/useWorkspaceBadgeMode.ts` +
  `useSettings.ts`, `ui/SegmentedControl.vue` (new), `utils/workspaceIcon.ts`, `WorkspaceBadge.vue`,
  `overview/WorkspaceList.vue`, `terminal/TabBar.vue`, `ui/CreateWorkspaceDialog.vue`, `App.vue`,
  `settings/GeneralTab.vue`, `composables/useI18n.ts`, and 4 test files.
  RETIRED by this change: `composables/useDeviceMonogramSetting.ts` (localStorage key
  `dinotty_device_monogram_v1`) — deleted, do not resurrect.
  COST (accepted): upstream actively develops `WorkspaceBadge.vue` / `TabBar.vue` /
  `CreateWorkspaceDialog.vue`, so every future align will need manual conflict resolution here. Unlike the
  Mocha theme (upstream never touches it), this mod sits in hot files.
  Exit condition: drop the fork side if upstream ever ships an equivalent user-facing choice.
- **Font dropdown flip-up + max-height clamp** (2026-07-19) — fixes an UPSTREAM bug (the whole font
  dropdown is upstream code, untouched by us): `.font-dropdown-menu` was `position: absolute` with a
  hardcoded `max-height: 260px` and always opened downward, so when the trigger sits near the bottom of
  `.settings-body` (`overflow-y: auto`) the menu overshot the scroll container's edge and was clipped.
  Fix: pure helper `utils/dropdownPlacement.ts` computes available space above/below, flips the menu up
  when there is more room above, and clamps `max-height` to the actually-available space (the clamp, not
  the flip, is what guarantees no clipping). CSS `max-height` moves to an inline style; new
  `.font-dropdown-menu.drop-up { top: auto; bottom: calc(100% + 4px) }`.
  CONSTRAINT (do not regress): stays `position: absolute`, NO `<Teleport>`, NO scroll listener. DT17
  (`d608efd0`) added `onFontMenuWheel` + `overscroll-behavior: contain` to stop wheel-scroll chaining out
  of the menu into `.settings-body` under WKWebView; a scroll listener would fire on residual chained
  scroll and break the interaction. Absolute positioning also means the menu tracks the trigger on scroll
  for free, so no repositioning code is needed.
  TWO INDEPENDENT WHEEL PATHS — keep them distinct: `.font-dropdown-backdrop` carries `@wheel.prevent`
  for events originating OUTSIDE the menu (without it a wheel over the backdrop bubbles to
  `.settings-body` and scrolls the panel while the menu stays open, re-clipping it with a stale height);
  `onFontMenuWheel` (DT17) handles events originating INSIDE the menu. Do not merge or cross-wire them.
  KNOWN LIMIT (accepted): `maxHeight` is measured at open time only. The wheel path above is closed, but
  a touch-pan over the backdrop and an on-screen-keyboard resize can still make it stale; `@touchmove`
  is deliberately NOT prevented (mobile-regression risk we cannot verify without a device). Self-corrects
  on close/reopen; strictly better than the old always-clipped behavior; accepting it is what avoids the
  DT17 conflict.
  Files (4): `utils/dropdownPlacement.ts` (new), `test/dropdownPlacement.test.ts` (new, 7 cases incl.
  tie-break and zero-clamp), `settings/AppearanceTab.vue`, `SettingsPanel.vue`.
  Upstreamable: **yes** — pure bug fix in upstream's own code, zero behavior change when there is room
  below, no new user-visible strings. Status: in-flight.
  upstream_pr: https://github.com/xichan96/dinotty/pull/177 (opened 2026-07-19, base `dev`, head
  `pandalaohe:fix/font-dropdown-placement`, single commit cherry-picked from `3892dabf`). Verified with
  upstream's own CI commands before opening: vue-tsc / vite build / cargo fmt / clippy -D warnings /
  cargo test --lib all clean, plus vitest 641 (upstream CI does NOT run frontend tests).
  Exit condition: merged upstream -> move this entry to Previously Applied and drop the fork-side delta.
- Plugin exec timeout child-process kill — **the earlier MOOT/converged verdict was WRONG; RETRACTED
  `2026-07-21`.** Our local `88579f26` added `cmd.kill_on_drop(true)` inside `plugin_exec`. The
  retracted entry claimed upstream had converged because it carries the same call at
  `src/plugin/handlers.rs:851` — the line number is real, but line 851 sits inside
  `plugin_process_start`, a DIFFERENT function. Re-verified against `upstream/dev` by reading the
  whole file: `plugin_exec` (upstream line 138) builds its `Command` at 151-154 with no
  `kill_on_drop`, and its timeout arm (178-183) only returns a `timeout after Nms` error — the
  `tokio::time::timeout(.., cmd.output())` future is dropped, and tokio does NOT kill a `Child` on
  drop by default, so the spawned plugin process keeps running after every exec timeout. Upstream has
  exactly one `kill_on_drop` in that file and it is not on this path.
  Lesson: a symbol match at a plausible line number is not convergence evidence — confirm which
  FUNCTION the match is inside.
  upstreamable: **yes** (general upstream bug, leaks a process per timed-out plugin exec) ·
  status: **candidate, needs its own PR** · upstream_pr: — · upstream_issue: —
- Desktop startup login-shell PATH import — imports the user's login-shell PATH before logging,
  runtimes, or threads start so argv tabs (e.g. `claude --resume`) spawn under GUI launch.
  Upstreamable: maybe.
- `createTerminalTab({cwd, argv, title?})` plugin API — opens a real terminal tab by spawning argv
  directly in an existing directory, with host-boundary validation and unchanged legacy shell/hook
  behavior when argv is absent. Upstreamable: yes. Exit condition: upstream provides an equivalent API.
  It now activates the workspace matched from `cwd` before creating the tab. Upstreamable: maybe.
- TabBar dropdown mouseleave fix — plugin-picker + new-tab menus no longer close on pointer-leave;
  they close on click-outside / trigger-toggle / item-select instead (`@mouseleave` removed, document
  `mousedown` outside-click listener added). **PR #160 MERGED** (base dev @ `e0be277e`, commit `7a72c507`,
  `TabBar.vue` only). Also present on `feat/supervise-tabs-r2` as `b1ee185c` (byte-identical cherry-pick
  dup) — **exclude `b1ee185c` from any supervise-tabs upstream PR**; the fix went up via #160 (merged),
  dedup `b1ee185c` on next rebase. Upstreamable: done.
- `scripts/dinotty-ops.sh` `quit_instance` set-e fix (`9f5bf329`) — the final `instance_running "$dest"
  && die` returned non-zero on the success path (instance down), so under `set -euo pipefail` the bare
  call aborted `rebuild-prod`/`rebuild-test` right after quitting the app, before `staged_atomic_install`
  (app quit but never reinstalled). Wrapped in an `if`-block so success returns 0; verified by a full
  `rebuild-prod` end-to-end (8999 fingerprint OK). Fork deploy tooling (DOP1). Upstreamable: no.
- NUX1 notification model & UX overhaul — fork branch `feat/notification-ux`, **merged into `custom`
  2026-07-17** (merge `9b5c0e35`; same merge pulled `upstream/dev @ e0be277e`; per-commit ledger +
  upstreamable flags below — docs closeout DONE 2026-07-17)
  (upstreamable: yes in parts — planned PRs: P1 Lagged-transport repair, P2 `bell.ingest_debounce_ms` wiring,
  P6 `revealPane` goto fix as standalone; P3+P4 attention protocol as ONE bundle; P5 local presentation is
  fork-leaning but generic). Backend-authoritative AttentionLedger (`src/attention.rs` NEW, ~1300L pure logic)
  + bidirectional `/ws/notify?v=1` protocol (`src/notification.rs` rewrite: client registry, bounded data/control
  lanes, connect-time version gate close-4001, generation-guarded `(clientId,requestId)` dedup, `/api/notify`
  R11 evolution with snake_case aliases, pane-close GC via `kill_and_remove` + `register_notifier` + 60s sweep)
  + frontend reconcile (`attentionReconcile.ts` NEW: BigInt revision gate, requestId overlay masking, epoch reset;
  `useNotification.ts` rewrite: envelope dispatcher, ack-timeout bounded resend, idempotent history)
  + read triggers (`active_observed` state-driven, focus/terminal_input foreground-guarded, `useAppForeground.ts`
  NEW dual-surface adapter, plugin bridge → pane-less POST `/api/notify` with bounded retry pool)
  + local presentation pipeline (`useNotificationPresentation.ts` NEW: presentationGate base→E1→active-leaf→D2→E5
  masks + E2 coalesce scheduler; guarded per-surface localStorage with settings-loaded migration gate; server
  legacy channels/sounds echo-back save boundary; `NotificationTab.vue` rewire). Commits `2840ce8e` P6 →
  `3e24b0f4` P1 → `152a4454` P2 → `d862afac` P3a → `eae5182e` P3b → `79428600` P4a → `60c214be` upstream merge →
  `8790b533` P4b → `ae41d38d` P5. Post-review tail per-commit ledger (upstreamable flag each; all
  codex-reviewed to convergence, reports in `.collab/audit-reports/`):
  - `fd7726a5` toast dismissed instantly on any mark-read; toast X ≠ read (yes — rides P3+P4 bundle)
  - `fa6a96a3` popup channel split from bell-history storage; popup toggle per-client (yes — rides P5)
  - `122abda7` build-time `DINOTTY_DEFAULT_PORT`/`DINOTTY_CONFIG_SUFFIX` instance identity (maybe — generic
    multi-instance capability, fork-motivated)
  - `2cde6ca2` port-scoped session cookie `dinotty_session_{port}`, no legacy fallback (yes — standalone PR
    together with `39fbf781`)
  - `5949cef0` bell history = unhandled inbox: always recorded, pruned only on authoritative read evidence
    (yes — rides P3+P4 bundle)
  - `33a362ce` NotificationTab i18n + idle-reminder source toggle default-OFF, drops `category=idle_reminder`
    pre-side-effect (maybe — toggle mechanism generic; `idle_reminder` category is our hook convention)
  - `8a5c8f2f` bell panel auto-hide on goto / on empty (yes — small standalone or rides P5)
  - `39fbf781` fail loud on conflicting session-cookie port reconfiguration — back-audit F2 fix (yes — rides
    `2cde6ca2`)
  - `b8202ad1` cargo fmt (n/a — folds into whichever PR)
  - post-merge on `custom`: `db6e7947` history-prune fail-safe — pane/notif missing from attention store ≠
    read (yes — rides inbox commit); `6cb20a8d` App.vue `persistNow()` localStorage guard (yes — trivial
    standalone).
  Multi-instance isolation boundary (back-audit F1, DECLARED INTENTIONAL): the config suffix scopes
  settings/auth-token/logs/workspaces; SSH `known_hosts`, plugin storage (`~/.dinotty/plugins*`), default
  upload dir, and Windows cmd history stay SHARED across 8998/8999 by design (same user, same plugins/trust).
  F4 note: GUI bind-fail panic occurs after logging/settings init (not fail-before-write) — accepted. Full
  disposition + reviewer non-blocking notes: design §17. Every stage codex-adversarial-reviewed to
  convergence (3-4 rounds each); backend 292 tests / frontend 574 tests / dual cargo check green. Design
  (binding, with §15-§17 amendments): `docs/task-files/2607/260716_notification-ux_design.md`.
- Per-surface `DINOTTY_URL` injection (notify routing) — **PR #155 MERGED** (`2026-07-15`, base
  `xichan96/dinotty:dev`, head `pandalaohe:feat/notify-url-per-surface`, single-purpose branch cherry-picked
  from `d40911ce` → `43ec6d8c`; 7-file diff, pre-PR leak gate CLEAN, fmt clean, 242 tests pass) (upstreamable:
  yes, generic capability). Each surface injects `DINOTTY_URL=http://127.0.0.1:<its bound port>` into every
  spawned terminal so the notify hook (`${DINOTTY_URL}/api/notify`) reaches the surface that owns the pane
  (was hardcoded `8998` → desktop-8999 terminals cross-talked to web-8998). Fail-safe: port 0 → no injection
  → no notify, never wrong; desktop uses sync std bind + RAII guard (`notify_port != 0` iff server alive).
  Commits `d40911ce` (feat: `src/{pty,session/mod,main}.rs` + `src-tauri/src/{main,embedded_server}.rs` +
  `docs/notifications{,.en}.md`) + `9ed83361` (design). codex + Claude reviewer 2-round CLEAN; `cargo`/`pty::`
  green. Design: `docs/task-files/2607/260714_notify-url-injection_design.md`.
- Theme export (readable ghostty-compatible file) — PR #149 merged (frontend-only, mocha-free; sits on the now-merged DT19); detail below.
- Configurable quick-key toolbar (DT13) — never PR'd; work preserved in tag `recovery/dt13-quick-key` (detail: Pending recovery below).
- Standalone "Uploads" settings group — SUPERSEDED by upstream filesFolders; decision pending; snapshot in branch `backup/dt6-pre-squash` (Pending recovery).
- Catppuccin Mocha built-in theme (`26890fa6`) — fork-only, never upstreamed (excluded from #148/#149).
- `.gitignore` local-only ignores — never upstreamed by design.
- Claude Code env-leak / tab-kill fix (S1/S2/S3) — **PR #154 MERGED** (`1250438a`, 2026-07-15; S1+S2 now in base) (was OPEN — S1+S2, base `xichan96/dinotty:dev`,
  head `pandalaohe:fix/claude-session-env-leak-and-configurable-reap`, 2 squashed commits `f5c5c3b8` S1 /
  `3e3fa5ff` S2). upstreamable: S1 pty env-strip YES, S2 configurable reap-timeout YES, S3 deploy-live.sh
  scrub NO (fork-local launcher, excluded from PR). Custom-branch base commits `e6eec8d4`/`41b4c071`/`1ad3240e`;
  dual cross-audit remediation `8561f533` (plugin spawn_ws+process_start coverage) / `b5686962`
  (parse_reap_secs + tests) / `3283d8fb` (deployment doc). Detail below.

## Branch model
- `custom` -> the branch we BUILD, RUN, and base work on; LOCAL-ONLY (never pushed to origin, so
  re-align needs no force-push). It tracks `upstream/dev` by MERGE (not reset): each re-align merges
  the newer `upstream/dev` into `custom`, so all merged feature code arrives via the merge and only
  the still-local mods (Mocha, `.gitignore`, in-flight DT19) remain as a real net diff. Merged-PR
  commits stay in `custom` history but carry zero net tree-diff vs base (no duplication).
- feature branches (`feat/*`, `fix/*`, `pr/*`) -> cut off a CLEAN `upstream/dev` base (not off
  `custom`) as a minimal single-purpose branch for one upstream PR; squashed, rebased on latest dev,
  pushed to origin, PR'd. Deleted once the PR merges (recovery via reflog ~90d if needed).
- Re-align recipe (MERGE model — never `reset --hard`, which would discard all local mods):
  `git fetch upstream && git tag backup/custom-pre-align-<date> custom && git checkout custom &&
  git merge --no-edit upstream/dev`, resolve any conflict by inspection, then rebuild via
  `scripts/deploy-live.sh`. Latest pre-align snapshots: `backup/custom-pre-6ba-align-260713`,
  `backup/custom-pre-align-260713` (drop older ones once the new build is confirmed good).

## Upstream divergence policy (how to resolve "upstream replaced our feature")
Given upstream ships a DIFFERENT solution that overwrites or deletes a feature we already had.
When re-aligning. Then default to COEXISTENCE behind a toggle — keep upstream's implementation as the
untouched OFF path and re-land ours as the ON path; do not silently drop our feature, and do not fork
upstream's code path into an unrecognizable merge.
How:
- The OFF branch MUST be byte-equivalent to upstream (same markup, same payload keys, same CSS) so future
  merges stay cheap. Gate RENDERING and SUBMISSION/side-effects alike — a hidden control that still writes
  its value is the recurring bug (found twice: dialog submit payload, MutationObserver cost).
- Prefer per-device localStorage scope for presentation toggles (matches the existing device-override layer:
  theme, fonts, monogram); use server `Settings` only when the choice must be uniform across devices.
- Enumerate EVERY surface the deleted feature touched by diffing the upstream removal commit's full file
  list against the backup tag — a grep of the CURRENT tree finds only surviving call sites and will miss
  the ones upstream already deleted (this is exactly how the TabBar trigger + dialog inputs were missed).
- Accept the cost explicitly: a coexistence mod on a file upstream actively develops means recurring manual
  conflict resolution. Record that cost in the mod's Ours-only entry.
Precedent: PR #172 monogram (upstream merged it, then reversed it in `dc7e0b6d`) — 2026-07-19.

## Local-only modifications (never upstreamed)
- `.gitignore`: ignore `.collab/` and `.hof-hooks-enabled` — agent/hook runtime strays; keeps
  them out of the fork and PRs.
- **macOS stable signing identity** (`src-tauri/tauri.conf.json` `bundle.macOS.signingIdentity`:
  `"-"` → `"Dinotty Local Signing"`). Upstreamable: **NO — never PR this line**; it names a
  machine-local keychain identity and would break every other build host. Root cause it fixes:
  ad-hoc signing (`"-"`) leaves the code-signing designated requirement empty, so TCC falls back to
  keying permission grants on the binary cdhash — every rebuild produced a new cdhash and macOS
  re-prompted for Full Disk Access (and every other TCC grant) on both surfaces. With a fixed
  self-signed cert the DR becomes `identifier "<bundle id>" and certificate leaf = H"7a461c90…"`,
  content-independent and stable across rebuilds. Verified 2026-07-18 by rebuild A/B on 8999:
  CDHash `0521ea8a…` → `20a981ec…` (changed) while the DR stayed byte-identical; user confirmed both
  apps kept Full Disk Access. ONE line covers BOTH surfaces — `rebuild-test`'s inline `--config`
  merge overrides only productName/identifier/beforeBuildCommand and never touches `bundle.macOS`,
  and `deploy-live.sh` / `build.sh` read the same base config; prod and test get distinct DRs
  (`com.dinotty.terminal` vs `com.dinotty.terminal.test`) off the same cert, so each is granted once
  and stays granted. Cert: self-signed, code-signing EKU, in the login keychain, **expires 2036-07-15**
  (a 1-year cert would silently reset all grants on expiry — that is why it is 10y); backup at
  `~/.secrets/dinotty-signing-cert-backup.p12`. Losing or replacing the cert resets every grant.
  Exit condition: drop this local mod if the project ever adopts a real Developer ID + notarization.
- Per-device font override (DT18) — frontend-only. `font_size`/`font_family`/`line_height`/
  `letter_spacing` become per-device via a localStorage override layer; the server value stays a
  shared DEFAULT (`custom_fonts` stays fully server-synced, untouched). New singleton composable
  `composables/useDeviceTextSettings.ts` (key `dinotty_device_text_overrides_v1`,
  `effective = localOverride ?? serverDefault` nullish); override values never enter the
  whole-settings PUT. `useTerminal.ts` init + reactive apply + zoom (`adjustFontSize`/
  `resetFontSize`) read/write the device override; Appearance controls rebound to WritableComputedRef
  with an icon-button per-field reset (rotate-ccw SVG, shown only when the field has an override);
  `SettingsPanel.vue` repaint switched to the module-level `effectiveText` watcher; font_size slider
  max raised 32→72 sharing one FONT_SIZE range constant. 6 frontend files + 3 test files. Verified:
  vue-tsc 0, vitest 340/340, both surfaces rebuilt + live macOS E2E. **PR #147 MERGED** (`1c7f0dfc`,
  part of upstream 0.17.2 base as of 2026-07-13 re-align) — no longer a local mod; entry kept as history.

- Per-device custom theme manager (DT19) — full-stack, local only. 3-layer storage: built-in presets
  (`themes.ts`) + server-synced library (`Settings.custom_themes` + `hidden_builtins`, additive
  serde-default) + per-device localStorage selection (`dinotty_device_theme_v1`). Cap-15 visible, 3 base
  (dark/light/dracula) undeletable, tombstone delete, one flat ordered list, `ThemeManager.vue` +
  `ThemeEditorDialog.vue` UI (replaces the old inline color editor in `AppearanceTab.vue`), ghostty/JSON
  import + blank template, Mocha i18n. R6 load-clamp is PUT-only (load never mutates user themes);
  ghostty parser uses indexOf (no ReDoS). 17 files (+1978/-282), committed `8c240213`. Verified: cargo 38
  + vitest 372 green, vue-tsc 0, web build clean, live macOS E2E PASS 2026-07-13. **PR #148 MERGED**
  (`bfe59572`, `2026-07-13`) — now part of base; catppuccin-mocha (`26890fa6`) was excluded from the PR and
  stays fork-only. Entry kept as history.

- Theme export (readable ghostty-compatible file) — frontend-only, merged upstream (#149). Replaces the
  DT19 "download blank template" button with "导出当前主题" / "Export Theme": `serializeTheme(name, colors)`
  writes the SELECTED theme's real colors as an annotated ghostty `.conf` — self-explanatory header, a
  `# name = <name>` field (so the name travels with content, not just the filename), and a bilingual
  `# N <cn> <en>` comment line above every `palette = N=…` (comments on their OWN lines — trailing inline
  comments break both ghostty and our parser). Import now reads the embedded `# name` (first match), falling
  back to filename. Files: `utils/themeTemplate.ts` (PALETTE_LABELS + serializeTheme + downloadTheme,
  dropped buildBlankTemplate/downloadThemeTemplate), `utils/themeImport.ts` (name parse before comment-skip
  + JSON top-level name), `components/settings/ThemeManager.vue` (exportCurrentTheme + button), `useI18n.ts`
  (exportTheme key both locales), `test/themeImport.test.ts` (name parse + round-trip, 18 tests). Committed
  `8584afb5`. Verified: vue-tsc 0, vitest 18/18 (376 full-suite on the PR branch), build green, real-exec
  E2E of shipped serializeTheme on real Dark theme + live app v0.17.2. **PR #149 MERGED** — upstreamable: done
  (mocha-free, sits on merged DT19). (https://github.com/xichan96/dinotty/pull/149)

- Claude Code env-leak / tab-kill fix — local until PR'd; two independent root causes bundled:
  - **S1 (upstreamable)** `src/pty.rs` + `src/plugin/handlers.rs`: a terminal/plugin spawned from a parent
    Claude Code session inherited `CLAUDE_CODE_*`/`CLAUDECODE`/`CLAUDE_SESSION_ID`, so an interactive
    `claude` inside it self-detected as a child session and never persisted its transcript (absent from
    `--resume`). New pure `is_claude_session_env_key` (ASCII case-insensitive; preserves generic
    `CLAUDE_CONFIG_DIR`) + `env_remove` before spawn; 2 unit tests. Removing an absent key is a no-op
    (fail-safe). Commit `e6eec8d4`; cross-audit then found the strip was missing from the two sibling
    plugin spawn sites (`plugin_spawn_ws`, `plugin_process_start`) — extended to all 3 in `8561f533`.
  - **S2 (upstreamable)** `src/session/mod.rs`: the detached-session reaper hard-coded a 5-min kill, which
    reaped live sessions that briefly lost their WebSocket (sleep / network drop). Now
    `DINOTTY_DETACH_REAP_SECS` (default `5400` = 90 min), parsed once before the poll loop. Dual-dig
    confirmed the 5-min reaper — NOT the env leak — is the tab-kill cause (dinotty has zero code reading
    those env vars to kill anything; inner-`claude` exit leaves the shell alive so it does not close the
    tab). Commit `41b4c071`. **terminal_exit_regression upstream-issue decision (2026-07-18): DROPPED —
    the 90-min-default reap fix is already in base via #154, so there is nothing pending upstream and no
    separate GitHub issue is warranted (reaping a session detached ≥90 min is acceptable default behavior,
    further tunable via `DINOTTY_DETACH_REAP_SECS`). Exit-condition met; off-board.**
  - **S3 (fork-local)** `scripts/deploy-live.sh`: relaunch unsets the 3 vars via `/usr/bin/env -u` —
    source-side companion to the pty backstop. Commit `1ad3240e`.
  - Dual cross-audit (Claude+Codex) on the committed diff: Verdict NEEDS-FIXES → all findings fixed
    (`8561f533`/`b5686962`/`3283d8fb`); re-verified `cargo test` 241 pass / fmt / clippy green.
  - Verified: cargo test 241 pass + fmt + clippy green. Real-machine E2E pending (web 8998 + desktop).

- **Per-device supervise-reload override** (2026-07-21, local `45cbd5ed`) — setting
  `reload_after_supervise_tabs` (i18n key `keybinding.superviseTabsReload`, Chinese
  "跳转后重新加载应用") changed from a server-shared setting to a per-device localStorage override,
  key `dinotty_device_supervise_reload_v1`. The effective value is
  `local override ?? server default`, using nullish coalescing so explicit `false` remains distinct
  from unset. The key is stripped from the whole-settings `PUT /api/settings` payload before send,
  so a local choice never overwrites the shared default. The server field and settings schema are
  unchanged, and old configs remain compatible.
  This follows the existing per-device precedents `useDeviceTextSettings.ts` (DT18) and per-device
  theme (DT19), both already merged upstream. It does not conflict with the 2026-07-19 reversal of
  monogram's per-device toggle to server-side storage: that reversal was required because the feature
  was being upstreamed and needed cross-device-consistent semantics, whereas supervise-reload is a
  local rendering-quirk preference, consistent with LOCAL_MODS' existing principle that display-type
  toggles default to per-device.
  upstreamable: **yes** · status: **merged** (reconciled `2026-07-22`; bundled into #190, verified MERGED `2026-07-21`, mergeCommit `ff08584f`) · upstream_pr: **#190** (`2026-07-21`) ·
  upstream_issue: —
  **Re-corrected `2026-07-21`.** The 2026-07-21 entry below was itself wrong and is kept only as a
  record of the reasoning error:
  > ~~Corrected 2026-07-21 (was `yes`/`candidate`): the underlying setting does not exist upstream …
  > it only becomes a candidate if the parent supervise-reload toggle (PR #185 lineage) lands
  > upstream first.~~

  Every observation in that note was factually true — the setting really was absent upstream, and a
  branch off clean `upstream/dev` really did fail `vue-tsc` with 13 errors. The inference drawn from
  them was wrong. "The parent feature is absent upstream" was read as "upstream lacks a prerequisite
  we cannot supply", when the actual cause was that **we never pushed the parent** (see the
  `17fe80a0` entry above). The 13 type errors were not evidence of an upstream dependency; they were
  evidence of a missing commit of our own.
  The fix was to stop treating the two commits as a child needing an absent parent, and push them as
  one self-contained feature: PR #190 carries the `17fe80a0` toggle hunks plus this override wholesale.
  It depends on nothing fork-private — the override is a self-contained composable over browser
  storage, and upstream has no competing mechanism.
  Generalisation: when a change looks blocked because its base is missing upstream, check whether the
  base was ever pushed before concluding upstream rejected or lacks it.
  Verified: vue-tsc 0 errors; vitest 58 files / 744 tests all pass. One independent review round caught
  the missing override-state UI indicator and reset control; both were fixed to match the
  `AppearanceTab` pattern, then reverified. Real-device end-to-end verification: **NOT RUN**
  (user declined the 8998 rebuild — code/test-level verification only).
  Known minor flaw: the reset button reuses `AppearanceTab`'s literal English "reset to default" text
  instead of i18n wiring — consistent with the existing implementation; revisit if unified later.

## In-flight upstream PR
- Keyboard-settings copy fixes — **PR #207 OPEN** (`2026-07-22`, branch
  `upstream-pr/keybinding-copy-fixes` off clean `upstream/dev`, base dev, 2 commits
  `7f3917ce`+`6b0d9067` cherry-picked clean from custom `0522a67a`/`e7af7b41`; 2 files +6/−6;
  no Co-Authored-By; infra-leak pre-PR check CLEAN; vitest 736/736 on the branch).
  Contents: supervise-tabs hint rewritten from Windows key-combo prose to a functional
  explanation (jump to next unread tab, else the tab to the right) and un-gated from
  `isWindowsClient` (the new wording is platform-neutral); Alt-as-Cmd toggle renamed
  "Use Alt instead of Cmd (Windows)" / 「Windows 下用 Alt 替代 Cmd 键」. EN+ZH in sync.
  Fork-side: already on `custom`, deployed to 8998 test app and user-verified.
  Next: await upstream review. (https://github.com/xichan96/dinotty/pull/207)
- Optional reload after supervise-tabs jump, with per-device override — **PR #190 MERGED** (`ff08584f`, `2026-07-21`; reconciled `2026-07-22` — entry below is provenance)
  (`2026-07-21`, branch `feat/supervise-reload-toggle` off clean `upstream/dev`, base dev, 1 commit
  `33cc8269`, 8 files, no Co-Authored-By, infra-leak pre-PR check CLEAN). Built in an isolated
  worktree (`dinotty-wt-supreload`) because the main worktree carries unrelated WIP.
  Contents: the supervise-reload hunks extracted from mixed commit `17fe80a0` (server field, toggle
  UI, i18n, the `useSuperviseTabs.ts` void→boolean return that gates the reload on a jump actually
  landing) plus `45cbd5ed` wholesale (per-device localStorage override, `local ?? server`, key
  stripped from the settings PUT, override indicator + reset control).
  Verified: vue-tsc 0 errors; vitest 734/736 (the 2 `addCursorsInFiles` failures reproduce on clean
  `dev`); `cargo check` clean. Extraction confirmed clean — the diff was grepped for
  `min-width: 80px` / `flex: 1 1 0` / `contextmenu` / `edge-fade`, all absent.
  Real-device verification: **NOT RUN** — stated in the PR body rather than silently carried.
  Merged — no further action. (https://github.com/xichan96/dinotty/pull/190)
- Block alt-screen wheel→arrow-key conversion — **PR #191 MERGED** (`8780d3a0`, `2026-07-21`; reconciled `2026-07-22` — entry below is provenance) (branch
  `fix/alt-screen-wheel-guard` off clean `upstream/dev`, base dev, 1 commit `b32aac4a`, 1 file /+28,
  no Co-Authored-By, infra-leak pre-PR check CLEAN, isolated worktree `dinotty-wt-altwheel`).
  Cherry-pick of `f9eeb8dd`; the only conflict was `LOCAL_MODS.md` modify/delete (absent upstream),
  dropped. Verified: vue-tsc 0 errors; vitest only the 2 pre-existing failures; no user-visible
  strings so no i18n change.
  PR body discloses the behaviour change (for a full-screen program that does not enable mouse
  reporting, the wheel now does nothing instead of sending arrow keys) and states plainly that no
  structured manual test matrix exists for it, offering to run one on request.
  Next: await upstream review. (https://github.com/xichan96/dinotty/pull/191)
- ~~Tab overflow + tab context menus — **PR #185**~~ **MERGED `2026-07-21`.** Retained below for the
  root-cause note, which is worth not re-deriving. (branch `feat/tab-overflow-and-management`
  off clean `upstream/dev` @ `c951bc9e`, base dev, 1 commit `ae1d0b2f`, 6 frontend files +291/-9,
  no Co-Authored-By, no generation marker, infra-leak pre-PR check CLEAN). Root cause worth not
  re-deriving: a flex item's default `min-width: auto` resolves to its **min-content** size, which
  for a tab is the full untruncated title — so removing `min-width: 120px` / `flex-shrink: 0` alone
  does NOT restore shrink, and `overflow: hidden` + `ellipsis` on the child title does not reduce
  the parent's min-content contribution. Fix is `flex: 1 1 0` + explicit `min-width: 80px` +
  `min-width: 0` on the title; basis `0` (not `auto`) is what makes the widths uniform. Also wheel →
  horizontal scroll (the strip was already scrollable but its scrollbar is hidden and press-drag is
  bound to drag-reorder, so there was no reachable affordance), mask-image edge fade, and right-click
  menus on both the tab bar and the overview cards.
  **Branch-origin note:** built by hand-applying the upstreamable hunks of local `17fe80a0` onto a
  fresh `upstream/dev` base — NOT cherry-picked (`17fe80a0` also carries the fork-only supervise
  reload) and never merged from `custom`.
  **Excluded from this PR — and that is how the change went missing.** Everything named
  `reload_after_supervise_tabs`, the two `keybinding.superviseTabsReload*` i18n keys, and the
  `useSuperviseTabs.ts` void→boolean return were held back here. The stated reason ("dead surface
  upstream, no caller") was sound for THIS PR's scope but was never followed by a PR of its own, and
  the leftover was later re-read as a standing judgement that the feature was unupstreamable.
  Resolved `2026-07-21` — all of it now ships in **PR #190**. See the `17fe80a0` Ours-only entry.
  CI: Backend pass, Frontend build pass. **Windows tests (self-hosted) sits `queued` and never
  starts** — the maintainer's self-hosted runner is offline; PR #181 showed the identical state and
  was merged anyway, so this is not a blocker.
  Next: await upstream review. (https://github.com/xichan96/dinotty/pull/185)
- ~~Editable mobile action keyboard — **PR #181**~~ **MERGED `2026-07-20`.** Retained below for the
  branch-origin note. (branch `pr/action-keyboard` off clean
  `upstream/dev` @ `ebb98565`, base dev, 7 commits, 17 files +2156/-248, no Co-Authored-By, no
  generation marker, infra-leak pre-PR check CLEAN). App-action key kind (catalog derived from the
  existing keybinding registry), bottom cluster becomes `bottom: {rows, enter, enter_width}`, pointer
  drag reorder with draft-commit-once, factory-reset / save / restore defaults. CI green locally:
  vue-tsc 0 / vitest 721 / cargo check / `cargo test --lib settings::` 55.
  **Branch-origin note (2026-07-20):** the work was first built on `feature/action-keyboard-batch`,
  which was cut off `custom` — unrebasable for a PR. The PR branch was extracted by replaying each
  commit's code-only diff onto a fresh `upstream/dev` base (pathspec excluded `docs/task-files`,
  which 4 of the 9 source commits had touched in passing). See `## Branch model` — cut from
  `upstream/dev`, never from `custom`.
  Disclosed in the PR: `saveSettings()` does not serialize in-flight saves, so an autosave
  overlapping a long drag can complete out of order — pre-existing, not touched here.
  Next: await upstream review. (https://github.com/xichan96/dinotty/pull/181)
- Theme export (readable ghostty-compatible file) — **PR #149 MERGED** (branch `pr/theme-export` off clean
  `upstream/dev` @ `d44d9682`, base dev, 1 commit `2a1c7cde`, 5 frontend files +119/-32, no Co-Authored-By,
  infra-leak pre-PR check CLEAN, mocha-free). Frontend CI green locally: vue-tsc 0 / vitest 376 / build.
  Next: await upstream review. (https://github.com/xichan96/dinotty/pull/149)

### Merged (were in-flight; kept as history)
- #148 DT19 per-device custom theme manager — merged `2026-07-13` (`bfe59572`, was branch
  `pr/theme-manager`, pruned post-merge). catppuccin-mocha excluded from the PR, stays fork-only.
- #144 configurable default workspace root — merged `2026-07-12` (was branch `feat/default-workspace-root`).
  Local `custom` also kept the folder-picker + label polish (commits `c1b771be`/`10a845b0`), also now
  in base via the merge.
- #138 macOS workspace delete — merged `2026-07-12` (was branch `fix/macos-workspace-delete`). Native
  `window.confirm()` no-ops on Tauri v2 macOS WKWebView; replaced 5 destructive confirm() sites with a
  Promise-based `composables/useConfirm.ts` helper driving `ConfirmModal`.
- #135 DT17 font-preset — merged (maintainer hardened `7e3745c`).

## Pending recovery (real local work NOT in upstream — must PR, do NOT lose)
- Configurable quick-key toolbar (DT13 follow-up) — persisted `toolbar_quick_keys` (up to 5),
  single-row `mkb-toolbar-quick-strip` + KeyboardTab editing UI. Commit `861a5528`, now preserved in
  tag `recovery/dt13-quick-key` (its old branch `feature/dt6-input-autogrow` was pruned in the
  2026-07-13 hygiene sweep — the tag holds the full branch tip `c3529279` incl 861a5528 + follow-ups).
  Upstream #118 shipped only the FIXED toolbar; the CONFIGURABLE version was never PR'd (verified
  absent in `upstream/dev`). Action: cut clean branch off `upstream/dev`, cherry-pick 861a5528
  (+ follow-ups) from the tag, verify, open PR.
- Upload standalone "Uploads" settings group (`7141fe9f`, only in `backup/dt6-pre-squash`) —
  SUPERSEDED: upstream reorganized uploads into its own "Files & Folders" (filesFolders) group.
  Decision pending: accept upstream org (drop) OR re-apply the standalone-Uploads preference via PR.
- NAVG1: macOS nav-guard confirm() (`useTreeContextMenu.ts:77`, `FileWorkspacePreview.vue:657`) —
  same WKWebView native-confirm() no-op as the delete bug, on the synchronous "discard unsaved
  changes" navigation guards → editor-dirty navigation/create permanently blocked on macOS. Both
  lines are upstream's own code (upstream bug). **Filed upstream issue #139**
  (https://github.com/xichan96/dinotty/issues/139). Per user: NOT fixing locally while the issue is
  open (does not affect our use). Upstream-dependency — no active board token. debug-db `a0d3b8048ab3`.
- VTPANIC: UTF-8 boundary panic froze the screen mirror (`1e692da2`, `src/vt_screen.rs`).
  Upstream bug, introduced by upstream `4ebd94b6` (OSC 133 shell integration, 2026-06-25); present in
  both `upstream/dev` and `upstream/main`. `PendingCommand.output_buf` was a `String` filled
  byte-by-byte via `push(b as char)`, so the 1MB-cap `drain(..512 * 1024)` sliced by byte offset and
  panicked on `is_char_boundary`. The panic fires BEFORE the parser loop in `feed()`, so the chunk's
  screen parsing is skipped AND the buffer is never drained — it stays >1MB and every later `feed()`
  panics again. Permanent per-pane mirror freeze; reconnecting clients get a blank screen while
  already-connected ones look fine (they read the raw byte stream at `src/pty.rs:437`, which runs
  after the caught panic). 156k occurrences over 4 days in one local instance; CJK input is the
  everyday trigger. `catch_unwind` (`src/pty.rs:387`) is why it stayed silent.
  Fix: collect into `Vec<u8>`, convert with `from_utf8_lossy` at the three hand-out sites — byte-range
  drain is infallible, which breaks the latch. Regression test
  `feed_survives_multibyte_output_exceeding_cap` splits multi-byte chars across 1024B chunks and
  asserts a post-cap feed still reaches the parser; verified to FAIL against pre-fix code with the
  exact production panic message. upstreamable: yes → status: candidate.
  Action: reproduce on clean latest upstream, then file issue + PR off `upstream/dev`.

## Upstream issues we filed (defect is upstream's; we are NOT carrying a fix)
#178/#179 filed 2026-07-19 against `dev` @ `156c9973`; #182 filed 2026-07-20 against `dev` @ `ebb98565`.
Each reproduced on clean upstream first. No board token by design (P8 Official-dependency): the only
unblock is an upstream release we cannot influence. EXIT CONDITION for all = upstream ships a fix; on
the next re-align, re-check and delete the row here.
EXCEPTION — **#184 is not in that class.** It is an enhancement proposal carrying open questions we
offered to implement, so the maintainer's answer is actionable by US, not merely a release to wait on.
Per P8 it therefore KEEPS a follow-up obligation; do not drop it as an official-dependency.
- **#184** (filed 2026-07-20 against `dev` @ `9dc10f53`) — the title bar renders the workspace name and
  can never show the terminal's cwd, even though the shell integration already emits it (OSC 0, bash
  `src/pty.rs:252` / zsh `:548` / PowerShell `src/platform/shell.rs:211`) and the backend already parses
  it (`sniff_cwd_from_title_osc`, `src/session/mod.rs:670` → `cwd_state.cwd`). The gap is purely the
  last hop: `cwd_state.cwd` is read only in pull-shaped places and there is no `CwdChanged`-style push.
  We proposed OSC 7 parsing (not currently handled anywhere; only OSC 0 and OSC 133 are) plus a
  title-source setting, and asked four scoping questions — chiefly whether extending shell-integration
  coverage is in scope, since only `zsh` and `bash` actually get an injected script today.
  RESEARCH NOTE worth keeping: the widespread claim that "many shells emit OSC 7 natively" is FALSE.
  Only fish does so unconditionally; starship does NOT (verified locally — `starship init zsh` has zero
  `]7;`), and zsh/bash/PowerShell do not. Everything else organic comes from a hook another tool already
  installed (VTE `vte.sh`, kitty auto-injection, sourced iTerm2/WezTerm scripts). So OSC 7's real value
  is fixing the per-command title flicker (zsh `_dinotty_preexec`, `src/pty.rs:553-554`, sets the title
  to the command name), NOT closing the shell-coverage gap. Do not re-derive this — it cost a full
  research pass and contradicts the intuitive answer.
  Design doc: `docs/task-files/2607/260720_upstream-realtime-cwd-title_design.md` (dinotty_mods repo).
  EXIT CONDITION: maintainer answers the scoping questions → we implement, or they decline → close.
  (https://github.com/xichan96/dinotty/issues/184)
- **#182** — recording an action key drops Ctrl/Shift on special keys and every modifier on F-keys.
  `KeyboardTab.vue`: `keyEventToSequence()` returns early on the `FKEY_SEQ` lookup (all modifiers lost)
  and its tail only applies Alt (Ctrl/Shift lost on arrows, Home/End, PageUp/PageDown, Insert/Delete),
  while `keyEventToLabel()` displays every modifier — so the stored label claims a combination the
  stored sequence does not send. Single-char keys and Shift+Tab are correct. We offered a PR using the
  xterm CSI modifier-parameter encoding (`\x1b[1;5A` etc). NOT patched fork-side — user judged the
  impact minor, and a fix here would add a fork-layer file to a file upstream actively develops.
  (https://github.com/xichan96/dinotty/issues/182)
- **#178** — long session titles overflow the close-confirmation dialog. `.confirm-message` in
  `ui/ConfirmModal.vue` has no line-breaking control, so a space-less path is an unbreakable token and
  overflows `max-width: 380px`; the parent's `overflow: hidden` then clips it. Suggested one-line fix
  (`overflow-wrap: anywhere`) is in the issue. We did NOT patch it fork-side — if upstream stalls and it
  becomes annoying, patching is one line, but that would add a fork-layer file.
- **#179** — `tests/terminal_exit_regression.rs` always fails on macOS: the test waits for shell output
  but never sends the `snapshot_request` handshake the real client sends on connect, so it burns its
  full 15s deadline. Linux CI never catches it because `ci.yml` runs `cargo test --lib`, which excludes
  `tests/`; only `windows-ci.yml` uses `--all-targets`. The 4-line fix is in the issue; we deliberately
  did NOT open a PR for it (user's call — upstream's own test, upstream's own CI gap).

## Known upstream state (not ours, do not chase)
- ~~Known upstream test breakage: `frontend/src/test/AppPaneClose.test.ts` fails 8/8 on pure
  `upstream/dev`~~ — **RESOLVED upstream, stale as of 2026-07-19**: the file now passes 37/37 in the
  full suite (670/670 overall) on `upstream/dev @ bd65a2a6`. Do NOT treat a failure in this file as
  "known upstream breakage" any more — it would mask a real regression. (Upstream frontend CI still only
  builds and never runs vitest, so upstream-side breakage remains possible in future; re-verify rather
  than assuming either way.)

## Upstreamed (merged) — status lives in the snapshot table; this keeps extra detail only
All feature work goes upstream via minimal PRs, then drops from the local delta. Merge SHAs worth keeping:
- #126 DT5 scroll suite — verified absorbed 2026-07-11, patch-identical to old `custom` tips.
- #125 Space-confirms-dialogs — merged at `7abf4810`; carried two shared repair commits (clippy
  `useless-borrows` in `src/proxy/rewrite.rs`, stale cwd-sniff test in `src/session/tests.rs`).
- #118 mobile-web input box — merged at `14d1ec2e` (2026-07-09).

## Abandoned (do NOT revive)
- Touch-drag synthetic-wheel scroll in fullscreen TUIs (`626cab0a`): its `isMouseModeEnabled`
  fix is already in upstream verbatim; its only unique delta (alt-screen finger-scroll) was never
  real-device verified. Dropped 2026-07-06; retained in tag `custom-pre-align-260706` if needed.

## Build (verified recipe — version tracks upstream)

> **QA rebuild default = 8998 ONLY (user-mandated 2026-07-20).** Rebuild the TEST surface
> (`scripts/dinotty-ops.sh rebuild-test`) and stop there. Do NOT run `deploy-live.sh` /
> `dinotty-ops.sh rebuild-prod` — both QUIT the 8999 app, and the user is actively working
> inside that instance; rebuilding it interrupts their live session. Touch 8999 only when the
> user explicitly asks in that turn. This SUPERSEDES the earlier "DEPLOY 做全 / never prod-only"
> rule (2026-07-17) until the user says prod is free again.

Toolchain: pnpm (corepack), rustup stable, `cargo install tauri-cli --version "^2"`.

Upstream ships two convenience build scripts (dinotty-specific — NOT wired into the core rebuild skills; fork-cwd use only):
- `./scripts/build.sh` (no arg / `native`) → builds frontend + `cargo build --release -p dinotty-server` → the SERVER binary at `dist/dinotty-server-<host>` (web/embedded surface; runtime `./xterm-server`, port 8999).
- `./scripts/build.sh desktop` → builds frontend + `cargo tauri build` → the DESKTOP Tauri `.app`.
- Other subcommands: `cross` / `all` / `frontend` / `list` / `clean`.
- GOTCHA: `native`/`desktop`/`cross` call `git_version()` (needs a `v*` git TAG to exist) then `sync_version()`, which sed-REWRITES the version string in tracked `Cargo.toml`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`. So build.sh mutates tracked files and fails with no release tag. Our canonical macOS reinstall stays `scripts/deploy-live.sh` (config-safe atomic install + cache refresh, no version rewrite); reach for `build.sh` only for a raw build artifact when the tag/version-sync behavior is acceptable.
```
cd frontend && pnpm install && pnpm build          # produces frontend/dist
cd ../src-tauri
cargo tauri build -c '{"build":{"beforeBuildCommand":"cd /Volumes/Dev/ai/projects/dinotty_mods/fork/dinotty/frontend && pnpm build"}}'
```
Output: target/release/bundle/macos/Dinotty.app, id com.dinotty.terminal.

### Build gotchas
- beforeBuildCommand in tauri.conf.json is `cd ../frontend && pnpm build` (RELATIVE). This repo is
  a cargo WORKSPACE (root Cargo.toml members=["src-tauri"]); `cargo tauri build` runs
  beforeBuildCommand from the WORKSPACE ROOT, so `../frontend` resolves to a non-existent path and
  fails. Fix WITHOUT editing tracked source: pass `-c` with an ABSOLUTE beforeBuildCommand path
  (above). If dist/ is already fresh from a manual `pnpm build`, `beforeBuildCommand:"true"` (no-op)
  bundles the existing dist/ cleanly. Do not edit tauri.conf.json for this.
- The .app lands at the WORKSPACE-ROOT `target/release/bundle/macos/`, not `src-tauri/target/`.
- The DMG bundling step (bundle_dmg.sh) fails on local unsigned builds (exit 1) — HARMLESS, the
  .app is already produced before it.
- Local build is signed with the machine-local self-signed cert `Dinotty Local Signing` (see
  Local-only modifications). It is NOT notarized, so `spctl -a` still reports `rejected` — harmless
  for locally-built apps (no quarantine attribute). If a build is ever transferred between machines,
  first launch still needs right-click → Open (or xattr -dr com.apple.quarantine).
- The signing key's ACL must include codesign, else EVERY build prompts for the login password
  several times (one prompt per signed artifact: binary, .app, .dmg). Fix once by clicking
  **Always Allow** (not Allow) on the first prompt.
- Installed process name is `dinotty-desktop` (bundle exec `Contents/MacOS/dinotty-desktop`);
  `pgrep -x dinotty-desktop`, not `Dinotty`. Server on port 8999.
- **UNEXPLAINED, RECURRING — DELAYED CLEAN EXIT (2026-07-18, open)**: during one session, instances reported live by
  `dinotty-ops.sh` (`<NAME> process is up` + `fingerprint OK on <port>`) were gone minutes later,
  and `rebuild-prod` once emitted `REGRESSION: test instance (8998) died during prod rebuild —
  instance-scoping failed`. A first pass blamed the launch method (`open` from an agent/tool shell
  supposedly reaping the app with the shell) — **that explanation was tested and REFUTED**: both
  `/usr/bin/open "$DEST"` (the form `relaunch_instance` uses, line ~225) and `open -a <path>` launch
  correctly and detach fully (`PPID 1`, own PGID, survives across separate shell calls), and
  quitting/relaunching prod does not disturb the test instance. Do NOT change the launch method on
  this basis, and do NOT treat the REGRESSION message as a known launch-method artifact. What IS
  established: the death is DELAYED (instances survived 1–2 min and several separate shell calls,
  then were gone minutes later) and CLEAN (no crash report, no `DiagnosticReports` entry). Seen ~3x
  in one session, every time on an instance launched from an agent/tool shell; never reported for a
  Finder/Dock launch, though that discriminator is UNVERIFIED. `log show` queries for the process
  and for runningboard returned nothing (may need Full Disk Access for the querying shell).
  Root cause unknown — three successive explanations (process-group reaping, then a launch-form
  difference, then not-reproducible) were each tested and found wrong; do not adopt a fourth without
  evidence. Next probe when someone picks this up: launch from Finder, leave it, and check at
  T+5/15/30min to settle the agent-launch-only question before touching any code.
- Keep bundle id com.dinotty.terminal + external settings dir at
  ~/Library/Application Support/dinotty/ for clean replace of /Applications/Dinotty.app.
- **Reinstall + cache refresh is now `scripts/deploy-live.sh`** (build→quit→staged atomic install→
  cache clear→relaunch). It clears ONLY `~/Library/Caches/com.dinotty.terminal` (asset cache) and
  DELIBERATELY does NOT touch `~/Library/WebKit/com.dinotty.terminal` (localStorage/IndexedDB — the
  per-device theme + font selections) or `~/Library/Application Support/dinotty/` (server settings).
  This is the config-safety guarantee. **SUPERSEDES the old manual recipe that also `rm -rf`'d
  `~/Library/WebKit/...`** — that wiped per-device localStorage on every reinstall (config-loss bug).
- **WKWebView stale-asset OPEN QUESTION (verified 2026-07-10, unresolved)**: the main window loads via
  the tauri:// asset protocol and WKWebView could cache index.html across replacements → a reinstall
  might keep running the previous build's JS. The old fix (wipe WebKit) is now rejected because it
  destroys config. Whether clearing ONLY `Caches/` fully busts stale JS is NOT yet confirmed for a
  build where the JS actually changes (the 2026-07-13 DT19 reinstalls happened after DT19 JS was
  already cached, so stale-asset was not exercised). If a future reinstall shows stale UI, the fix
  must be a CONFIG-PRESERVING cache-bust (clear only the asset/network portion of WebKit, never
  LocalStorage/IndexedDB), or a startup version-keyed asset invalidation. Do NOT re-add a blanket
  `rm -rf ~/Library/WebKit`.

## Upstream tag drift caveat (verified 2026-07-01, historical)
Upstream tags shift one bump behind: the `v0.14.1` tag carried manifest version 0.14.0, and
`v0.14.0` carried 0.13.4 — the maintainer tags BEFORE bumping the version string. Cross-check the
manifest version, not the tag name, when pinning a release point.
