# LOCAL_MODS — pandalaohe/dinotty (fork of xichan96/dinotty)

Upstream: https://github.com/xichan96/dinotty (MIT)

## Contribution Index (registry format version: 2 — authoritative; schema home: upstream-update `templates/local-mods-init.md.tmpl`)

| mod_id | upstreamable | upstream_pr | upstream_issue | lifecycle | absorption | head_branch | exit-condition |
|--------|--------------|-------------|----------------|-----------|------------|-------------|----------------|
| `1dff1a86-null-successor-fallback` | yes | https://github.com/xichan96/dinotty/pull/204 | | merged-upstream | absorbed | fix/tab-close-null-successor | met `2026-07-22` — merged upstream `f958848c`, blob parity |
| `mocha-theme` | no | n/a | n/a | private | n/a | | never — fork identity (excluded from #148/#149 by design) |
| `signing-identity` | no | n/a | n/a | private | n/a | | never — machine-local config |
| `deploy-scripts` | no | n/a | n/a | private | n/a | | never — fork ops (dinotty-ops.sh / dinotty launcher) |
| `fork-meta` | no | n/a | n/a | private | n/a | | never — fork bookkeeping (.gitignore, .upstream-update.json, LOCAL_MODS.md, docs/task-files/) |
| `eb14ee6a-quickkb-app-shortcuts` | yes | https://github.com/xichan96/dinotty/pull/212 (closed on GitHub; landed as `3d17d8e3`) | | merged-upstream | absorbed | upstream-pr/mobile-quickkb-app-action-keys | met `2026-07-27` — absorbed upstream via maintainer DIRECT PUSH `3d17d8e3` (`2026-07-23`), not the merge button: the PR conflicted with dev after #210 + the templates feature, so `gh pr view 212` reports `state: CLOSED, mergedAt: null` while the content IS upstream. Verified: `3d17d8e3` is an ancestor of `upstream/dev`, subject is the #212 feature, and `src/api/clipboard.rs` + `frontend/src/utils/{clipboard,hostClipboardPaste}.ts` + both clipboard tests + `docs/clipboard-api.md` show zero custom-vs-upstream diff. Maintainer accepted the `/api/clipboard` security posture and recorded independent verification (cargo test 412/412, vitest 820/820, vue-tsc clean); one non-blocking note — `empty_token_mode_is_forbidden_and_no_store` does not discriminate the empty-bearer branch (check correct, test name misleading), a clean future upstream candidate. Branch GC'd this run under tag `archived/pr212-07bc7e22`. **Lesson: GitHub API state is not the absorption verdict — `remote_state=CLOSED` can coexist with `absorption_state=absorbed`.** |
| `6596abd9-plugin-ws-attribution` | yes | https://github.com/xichan96/dinotty/pull/210 | | merged-upstream | absorbed | fix/plugin-workspace-attribution | met `2026-07-24` — PR #210 MERGED upstream; custom carries same change as `6596abd9` |
| `t260723-015-session-input-dispatcher` | maybe | | | dropped | n/a | | met `2026-08-24` — REMOVED by the custom rebuild onto `upstream/dev@1255721d`. The fork now carries upstream's per-connection `input_tx` + `replace_input_channel()` model instead of the session-lifetime `InputState` dispatcher; `grep -c 'InputState\|enqueue_input' src/session/mod.rs` returns 0. Never filed upstream: it was never adapted to upstream's lifecycle infrastructure, and the rebuild made that adaptation moot. What the fork gave up with it — (a) SSH sessions no longer auto-close on write failure, leaving an unusable tab instead; (b) local PTY write failures no longer emit the distinct `3 PTY write failures within 10s` diagnostic. Both are standalone upstream-PR candidates against upstream's own model, NOT local carries to re-add. |
| `qkb5-quick-send-threshold` | yes | https://github.com/xichan96/dinotty/pull/214 | | merged-upstream | absorbed | upstream-pr/quickkb-send-threshold | met `2026-07-24` — PR #214 MERGED upstream |
| `ff9c1049-preview-loopback-auth` | yes | | | merged-upstream | absorbed | | met `2026-08-10` — upstream independently replaced the preview proxy/auth path in `eb889919`; current `src/proxy/mod.rs` has zero custom-vs-upstream diff and preserves trusted loopback preview access |
| `epv1-preview-freeze-annotate` | no | | | dropped | n/a | | met `2026-07-28` — REMOVED from the fork; never filed upstream. User abandoned in-app page capture in favour of the OS screenshot tool, which is simpler and has no fidelity ceiling. Upstream had absorbed none of it (all four EPV1-exclusive files absent from `upstream/dev`, no snapdom dep, `PreviewPanel.vue` still a bare `<iframe>`), so nothing was owed upstream and no PR/issue was ever opened. Frontend removed in `938401f8`: `WebPreview.vue` / `PreviewPanel.vue` / `vite.config.ts` restored to `upstream/dev` verbatim; `WebAnnotationLayer.vue`, `previewImage.ts`, `previewAnnotationRetention.ts`, `preview-bridge/`, 3 test files, the `@zumer/snapdom` dep and its 380 KB patch deleted; 80 `preview.annotation.*` i18n keys dropped. Proxy capture-bridge injection removed in `a204b655`, deliberately preserving `ff9c1049`'s loopback-auth fix in the same files. Why it is not merely deferred: the only true-pixel web path (`getDisplayMedia` + Element Capture) needs a secure context, a per-use permission click, and is viewport-clipped; every DOM-rasterizing alternative (snapdom/html2canvas class) re-renders rather than captures, so it drifts — which defeats the bug-reporting purpose. The separate "let an agent open a preview pane" need is already met by upstream `POST /api/tabs/:tab_id/pane/web` plus the auto-injected `DINOTTY_URL` / `DINOTTY_TAB_ID` / `DINOTTY_PANE_ID` PTY env vars (`upstream/dev` `src/main.rs:839`, `src/pty.rs:255-265`) — verified live 2026-07-28 |
| `qkb2-keyboard-guard-mode` | yes | https://github.com/xichan96/dinotty/pull/215 | | merged-upstream | absorbed | feature/keyboard-guard-mode | met `2026-07-24` — PR #215 MERGED upstream as `9cbb9d5d`; blob parity (16/19 keyboard-area files byte-identical); pulled back into custom via 2026-07-24 upstream-update merge (triage: docs/task-files/2607/260724_dinotty_upstream-triage.md) |
| `qkb3-ime-keyboard-overlap` | yes | https://github.com/xichan96/dinotty/pull/216 | | merged-upstream | absorbed | upstream-pr/ime-keyboard-overlap-grow | met `2026-07-27` — PR #216 MERGED `2026-07-24T14:41:56Z` as upstream `96bcb296`; pulled back into custom via the 2026-07-27 upstream-update merge (triage: docs/task-files/2607/260727_dinotty_upstream-triage.md); 5/7 files byte-identical with upstream (`App.vue` + `useI18n.ts` differ only because custom additionally carries EPV1 + mocha-theme content); branch GC'd this run |
| `4b0828d8-plugin-pane-identity-visibility` | yes | https://github.com/xichan96/dinotty/pull/225 | | merged-upstream | absorbed | upstream-pr/plugin-pane-identity | met `2026-07-28` — PR #225 merged upstream as `e4989de3`; current plugin pane identity/visibility implementation is upstream-owned |
| `14c22b5a-windows-terminal-native-resolver` | yes | https://github.com/xichan96/dinotty/pull/239 | | merged-upstream | absorbed | codex/windows-terminal-native-resolver | met `2026-08-08` — PR #239 merged as `38e657c4`; stable patch-id matches local `14c22b5a` |
| `ae8b0902-plugin-tab-persistence` | yes | https://github.com/xichan96/dinotty/pull/242 | | merged-upstream | absorbed | codex/plugin-tab-persistence | met `2026-08-09` — PR #242 merged as `f304cf57`; stable patch-id matches local `ae8b0902` |
| `4f71c726-quick-send-multiline` | yes | https://github.com/xichan96/dinotty/pull/245 | | merged-upstream | absorbed | codex/quick-send-multiline | met `2026-08-10` — PR #245 merged as `21399eec`; stable patch-id matches local `4f71c726` |
| `notification-ledger-empty-clear` | yes | https://github.com/xichan96/dinotty/pull/246 | | merged-upstream | absorbed | codex/upstream-notification-ledger-empty-clear | met `2026-08-10` — PR #246 merged as `a6d682ff`; official four-file implementation replaces the local copy with zero residual notification diff |
| `action-shortcut-hold-repeat` | yes | https://github.com/xichan96/dinotty/pull/249 | | merged-upstream | absorbed | codex/upstream-action-repeat | met `2026-08-12` — PR #249 merged as `492321dd` (current `upstream/dev` tip); absorbed into custom by the `T260812-009` alignment merge, which took the official implementation in `MkbKey.vue` + its test and re-layered the KB delta on top |
| `mobile-keyboard-active-panel-height` | yes | https://github.com/xichan96/dinotty/pull/250 | | merged-upstream | absorbed | codex/upstream-action-panel-height | met `2026-08-12` — PR #250 merged as `49b611f6`; absorbed into custom by the same alignment merge, which took the official `useSwipePanel.ts` sizing and re-layered the KB gesture delta |
| `kb01-kb06-mobile-ime-closure` | maybe | | | dropped | n/a | | met `2026-08-24` — CLOSED as an AGGREGATE candidate; it was never filed as one, and no longer can be. Every upstreamable slice reached upstream individually instead, each with its own acceptance: PRs #254, #256, #257, #258, #259, #260 and #261 (all merged-upstream, see their own rows). The custom rebuild onto `upstream/dev@1255721d` retains NO keyboard code at all — none of the 14 retained files is under `frontend/src/**` — so no local residual keeps this row open. The gate that blocked filing the aggregate (frozen 8998/native QA plus real-iPhone Simplified Pinyin and WeChat IME acceptance) was never completed and is now moot: upstream owns the behavior. Branch `codex/kb-series-20260810` GC'd in the 2026-08-24 cleanup. |
| `zsh-zle-highlight-wrapped-cell` | yes | https://github.com/xichan96/dinotty/pull/251 | | merged-upstream | absorbed | upstream-pr/zsh-zle-highlight-wrapped-cell | met `2026-08-14` — PR #251 merged as `b37c1d43`; official implementation now owns the zsh wrapped-cell suppression |
| `desktop-lifecycle-localstorage` | yes | https://github.com/xichan96/dinotty/pull/252 | | merged-upstream | absorbed | upstream-pr/desktop-lifecycle-localstorage | met `2026-08-14` — PR #252 merged as `d7ebaae1`; official test setup owns the localStorage fixture |
| `mobile-toast-top-center` | yes | https://github.com/xichan96/dinotty/pull/253 | | merged-upstream | absorbed | upstream-pr/mobile-toast-top-center | met `2026-08-14` — PR #253 merged as `c12f829c`; official responsive toast implementation replaces the local candidate |
| `system-keyboard-toolbar-customization` | yes | https://github.com/xichan96/dinotty/pull/254 (closed on GitHub; landed as `990e1bc7`) | | merged-upstream | absorbed | codex/upstream-system-keyboard-customization | met `2026-08-14` — PR #254 closed/conflicting, but upstream independently absorbed the same toolbar/settings behavior as `990e1bc7`; later touch/IME closure is PR #256 |
| `kb09-modifier-touch-open` | yes | https://github.com/xichan96/dinotty/pull/256 | | merged-upstream | absorbed | codex/upstream-system-keyboard-kb09-final | met `2026-08-14` — PR #256 merged as official squash `83ab63c0`; stable patch-id and resulting tree are identical to reviewed head `6d1ffb9b` |
| `manual-guard-terminal-focus` | yes | https://github.com/xichan96/dinotty/pull/257 | | merged-upstream | absorbed | codex/upstream-manual-guard-settings-gap | met `2026-08-14` — PR #257 merged upstream as official squash `387c9628`; its product behavior and five platform-neutral guard test instances were already byte-equivalent in the integration tree, so reconciliation preserves the evolved local blobs without stacking a duplicate product or test layer |
| `builtin-ime-first-frame-geometry` | yes | https://github.com/xichan96/dinotty/pull/258 | | merged-upstream | absorbed | codex/upstream-builtin-ime-first-paint | met `2026-08-14` — PR #258 merged upstream as `19f04016`; its stable patch-id exactly matches reviewed head `ac1f563f`. Alignment adds official ancestry without duplicating the already accepted, more complete integration implementation |
| `ios-dictation-tail-replacement` | yes | https://github.com/xichan96/dinotty/pull/259 | | merged-upstream | absorbed | codex/fix-ios-dictation-tail-replacement | met `2026-08-18` — PR #259 merged upstream as `72123f46`; the alignment adopts the official `terminalInputCore`/KeyboardContext ownership while retaining the richer physically accepted input and geometry coverage |
| `system-ime-overlap-toolbar-docking` | yes | https://github.com/xichan96/dinotty/pull/260 | | merged-upstream | absorbed | codex/upstream-system-ime-overlap | met `2026-08-18` — PR #260 merged upstream through `7a99861b`; official flex docking and synchronized setting are upstream-owned. The fork now keeps only the follow-up that keys overlap to a real focused terminal IME rather than the independent keyboard-visibility switches |
| `touch-web-terminal-selection-guard` | yes | https://github.com/xichan96/dinotty/pull/261 | | merged-upstream | absorbed | codex/upstream-touch-web-selection-20260818-r2 | met `2026-08-22` — PR #261 MERGED `2026-08-22T10:34:29Z` as "fix(mobile): preserve touch terminal selection" (verified live via `gh pr view 261 --json state,mergedAt`). The two-file patch removed the touch-Web `preventDefault()` focus guard blocking native terminal text selection under `open_only`/`both`; manual IME opening remains governed by the xterm helper textarea policy. Upstream now owns it and it is present in the rebuild base `upstream/dev@1255721d`; the local PR branch was GC'd in the 2026-08-24 cleanup |
| `agent-launch-no-color-backstop` | no | n/a | n/a | private | n/a | | never — local Codex/Claude launch hygiene: PTY children discard inherited `NO_COLOR` only when a session-scoped agent marker proves it came through an automation launch; an ordinary user-owned `NO_COLOR` remains intact |
| `default-locale-zh` | no | n/a | n/a | private | n/a | | never — fork identity: `default_locale()` in `src/settings/types/mod.rs` returns `"zh"` where upstream returns `"auto"`. A one-line divergence carried since before the v2 index existed and never registered; the 2026-08-24 rebuild file-by-file audit found it in the retained set and added this row. Registered late, not newly introduced |
| `b238998-plugin-store-instance-isolation` | yes | | | candidate | n/a | | upstream absorbs per-instance plugin-store resolution. `PluginManager::new` hardcoded `~/.dinotty/plugins` and `~/.dinotty/plugin-data`, so a build carrying `DINOTTY_CONFIG_SUFFIX` shared its plugin store with the default instance — installing a plugin on the test instance mutated production's store, and production's filesystem watcher hot-swapped it into live pages within ~1s. Fix reuses upstream's OWN suffix mechanism (`option_env!("DINOTTY_CONFIG_SUFFIX")`, PR #169): `settings::instance_suffix()` extracted from `config_dir()`, instance root resolved once, both directories joined from it. Empty suffix keeps today's paths byte-identical. Generic — any project running a test instance beside a prod one has this. Task `T260825-009`, board `KB12` |
| `1f0cd07-builtin-kb-seed-scoping` | yes | | | candidate | n/a | | upstream absorbs the seed scoping. `build-seed.mjs` concatenated the HOST stylesheet `frontend/src/styles/mobile-keyboard.css` into the plugin's shipped `styles.css`; the plugin sheet is injected AFTER the core stylesheet at equal specificity, so an installed copy of a host rule WINS over the app's own. An install dated 2026-08-18 kept `#system-mobile-kb { position: relative }` while the app had moved to a fixed toolbar with a reserved band — a blank band exactly `--mkb-height` tall below the terminal in system-IME mode. Never self-healed: `plugin.json` was hand-pinned at `0.1.0` and the installer early-returns on `installed >= seed`. Fix emits `scoped.css` alone, fails the build on any selector lacking this build's `data-v-` hash, and bumps to `0.1.1`. Upstream code, upstream defect. Task `T260825-009`, board `KB12` |
| `ff419d4-viewport-pan-lock` | yes | | | candidate | n/a | | upstream absorbs the keyboard-open pan cancel. With the system IME open, dragging the status bar pans the visual viewport and drags the whole UI. Originally fixed `2026-08-12` (`af4711bc` + `c62328e0`) and LOST by the 2026-08-24 rebuild of `custom` from clean `upstream/dev`; restored verbatim from tag `backup/custom-20260824`. **Never filed upstream — verified 2026-08-26, not merely assumed**: `gh pr list --author pandalaohe --state all` returns 76 PRs and none touches `useViewportPanLock.ts`; `git merge-base --is-ancestor` says neither commit is an ancestor of `upstream/dev`; GitHub search for the symbol returns 0. The omission was OUR scoping choice (rows below: PRs #249/#250/#258 "deliberately exclude KB08's system-input, visualViewport and terminal-input paths"), never a maintainer decision, so an upstream PR is owed and is a FIRST submission. `touch-action: pan-x` does not substitute — it governs element scrolling, not the keyboard-open pan. Task `T260825-009`, board `KB12` |
| `b7ab5da-ios26-capsule-reclaim` | no | n/a | n/a | private | n/a | | met when iOS stops leaving dead space above its floating form-assistant capsule, or when upstream ships an equivalent — iOS-26-specific with no upstream test surface. `useViewportResize` publishes `--kb-capsule-reclaim` (13px on iPhone, 0px elsewhere); `#system-mobile-kb.ime-open` consumes it through `bottom`, not the pre-rebuild `margin-bottom`, because the toolbar is now `position: fixed`. A SECOND casualty of the 2026-08-24 rebuild, masked until `1f0cd07` removed the stale installed plugin that still carried the consuming rule. Cannot be verified without the user's own iOS 26 device — no emulator reproduces the capsule; the 13px is a restoration of a previously shipped value, not a fresh measurement. The rule's other former declaration `padding-bottom: 5px` is deliberately NOT restored: it shrank a then-fixed 8px bottom padding, and the base rule now uses `max(8px, env(safe-area-inset-bottom))`, so forcing 5px would drop the safe-area inset for exactly the episode that needs it. Task `T260825-009`, board `KB12` |

- Index wins conflicts with narrative/tables below (those are provenance). Volatile API state (PR state / checked_at) lives in run receipts, not here.
- `kb09-modifier-touch-open` (2026-08-13; board `KB09`, task `T260812-014`) keeps modifier sending family-based while recording the selected special-key owner, so Cmd/Win and Alt/Opt no longer cross-highlight. With system-IME protection off, xterm helpers stay disabled from terminal touchstart until the same gesture's original-terminal compatibility click authorizes one focus; retargeted `mousedown`/`click`, scroll, long press, cancellation and links cannot open the IME or activate newly moved controls. User iPhone QA accepts the no-flash/no-ghost-activation boundary. Dinotty input locally resamples at rAF plus the existing 320ms settlement point. Final cleanup preserves that state machine, prevents its cleanup from releasing builtin typing locks, skips only duplicate App 100/280ms terminal fits on iPhone system mode, and makes Login/Setup consume the existing `--vv-height`; the shared 320ms pan release and input-method-switch geometry remain unchanged. For non-composition `keyCode=229`, one platform-neutral `{value, selectionStart, selectionEnd}` snapshot plus `InputEvent.data` turns paired insertion, selection replacement and the physically observed later-closer stale-caret shape into equivalent PTY edit/cursor sequences for iOS, macOS, Windows and Linux. The narrow correction fires only when removing `data` at the observed collapsed caret exactly restores the baseline, then normalizes both textarea and PTY caret after the newly inserted closer. ESC/DEL reconciliation batches bypass virtual modifier prefixing and leave one-shot modifiers armed for the next literal key. Missing-keyup fallback, Unicode offsets, application cursor and the no-229 Tauri rescue remain covered; superseded caret-blind, duplicate normalization and unused helper code/tests were deleted. Complete audit plus correction mini-review passed; frontend is 119 files / 1227 tests and build/typecheck pass. The prior signed 8998 PID 78373 / `index-CKAN7nxe.js` failed physical closer-caret acceptance and is superseded. Corrected signed 8998 runs PID 88814 and serves byte-matched `index-BLNxm22D.js`, SHA-256 `eaa8ffedc773640f4453d3743d255d5046f44edf44c6b4e48969ca63165e5a5d`. 8999 remains PID 71653 / `index-B3EP-Uh2.js` at its original hash. Physical-iPhone acceptance is CLOSED: PR #256 (merged `2026-08-14`) records "Physical iPhone E2E is accepted by the reporter". Physical Windows/Linux IME verification is the only device check still open, and is the sole remaining residual of the whole KB series. Canonical evidence: `dinotty_mods/docs/task-files/26/08/260812_T260812-014_keyboard-alias-touch-open_pretask.md` and `260812_T260812-014_verification.md`.
- `kb09-modifier-touch-open` board-card migration (2026-08-25; board `KB09`, task `T260812-014`): the KB09 continuation card was deleted at the T260825-004 board reconcile and its unique content is preserved here. ROOT CAUSE, found before any code was written: `frontend/src/config/keyboardSpecialKeys.ts` folds 8 key ids into 4 modifier families (`cmd` and `win` both map to `meta`; `alt` and `opt` both map to `alt`), and the highlight at `frontend/src/components/MkbKey.vue:79-80` reads `props.state[modifier]` — the family boolean — so pressing `cmd` also lit `win`. The two keys of a family were already equivalent at the sending layer (`terminalInput.ts:85` sends `\x1b` for both `altActive` and `metaActive`), making this a display defect, not a behavioural one. Introduced by `898fc383`. Opt-in: the default layout ships only Ctrl+Alt and neither pair appeared in the then-current 8999 build, so no live user was ever affected. THREE FIX DIRECTIONS were recorded, with the card reserving the choice to the user (「等用户在三个修法里选一个, 选完才动手」) and recommending A: (A) dedupe — collapse the 8 ids to 6, cleanest semantics, requires a one-time user-config migration and a `.ts` change; (B) highlight follows the key actually pressed — `MkbKey.vue` only, no config change, minimal; (C) mark the alias relationship in the selector — no behaviour change, only reduces confusion. OUTCOME: **B shipped** in PR #256 (`83ab63c0`) without the reserved A/B/C choice being put to the user; Codex's own rollout confirms the gate was read and B was then selected unilaterally. The user ratified B on 2026-08-25 after observing that the cross-highlight is gone, and KB09 was closed on B. REPRODUCTION CAVEAT, if this is ever revisited: the default layout carries neither pair, so a repro requires manually adding `cmd`/`win` or `alt`/`opt` keys first; `.ts` edits route through codex; device verification runs on 8998 only, never on 8999.
- `syskb-upstream-pr` board-card migration (2026-08-25; board `KB10`, task `T260812-015`): the KB10 continuation card was deleted at the same reconcile and its unique content is preserved here. STATE AT CARD TIME: the SYSKB (system-IME direct input) line was 61 files on `custom` with all gates green and already classified upstreamable vs fork-only, deliberately withheld from branching, pushing, and PR-opening pending physical device acceptance. It was explicitly judged NOT a P8 "waiting on an upstream release" case — the unblock condition was in our own hands — which is why it held a board row at all. REPLAY PROCEDURE, preserved because it is the reusable part: run an iPhone device QA pass covering 丢字符 / 垃圾串 / 重复上屏; only on pass, branch from clean `upstream/dev`, replay code-only hunks, run the gates, require `infra-git-hygiene.sh check --pre-pr` to exit 0, then push to origin and `gh pr create --repo xichan96/dinotty --base dev`. If the device pass fails, stop at step one and do not open the PR. CONSTRAINTS: cut the upstream branch from `upstream/dev`, never from `custom`; upstream commit subjects must contain no `T2608` and no `KB` strings; no `Co-Authored-By`; no generation markers; device QA on 8998 only. OUTCOME: the line landed upstream as PRs #256, #257, #258, #259, #260 and #261 — 33 unique upstreamable files, the 61 having counted fork-only files as well.
- `manual-guard-terminal-focus` (2026-08-14) separates touch software-IME authorization from xterm DOM focus. Under `open_only`/`both`, touch helpers remain enabled and focusable for hardware input but use `inputMode=none`/manual virtual-keyboard policy until the fixed keyboard action synchronously authorizes `inputMode=text`; `off`/`collapse_only` and builtin mode retain their prior configuration. The same shared Web/xterm path covers browser/PWA and Tauri on macOS, Windows and Linux. A complete audit found one non-touch refocus asymmetry in the pre-existing `canRestoreSystemInputFocus`; the correction gates that rejection on `isTouchDevice()` and fixes the previously mis-scoped toolbar-action test. Focused proof is 6 files / 110 tests; complete proof is 119 files / 1233 tests, production build/typecheck, `cargo check`, target ESLint, Prettier and diff integrity. The shared follow-up build below is deployed to Test 8998 and the user accepted its physical iPhone behavior; physical Windows/Linux evidence remains unobserved rather than inferred.
- `manual-guard-terminal-focus` upstream filing (2026-08-14): PR #257 represents the accepted behavior on a clean `upstream/dev@83ab63c0` base without local ledger/config/viewport files. A complete Codex/Claude audit closed with no product correction; exact-branch QA passed 115/1148 frontend tests, production build, `cargo check`, `cargo fmt --check`, changed-file ESLint and diff guards. The adjacent system-keyboard reset-to-Advanced spacing is instance-scoped in the same PR. No rebuild followed the filing.
- `manual-guard-terminal-focus` upstream absorption (2026-08-14): PR #257 merged as `387c9628`. Its production hunks and five platform-neutral guard test instances were already present in the integration tree, so `systemMobileInput.test.ts` resolves to its pre-merge blob with no net test delta. The two textual conflicts were in app-pane test fixtures where the integration side contains the same #257 assertions plus the later accepted no-ghost-activation state machine, so that evolved coverage remains authoritative. At that alignment PR #258 was still open and remained layered pending upstream disposition.
- `builtin-ime-first-frame-geometry` (2026-08-14) follows the earlier `builtin-input-viewport-resample` recovery. The first candidate captured the pre-focus panel inset as `--mkb-opening-floor`; automation passed, but signed 8998 `index-CpM9obI-.js` was physically rejected. In the 60fps failure the Dinotty header began leaving the viewport near frame 41, stayed fully off-screen through roughly frames 45–81, and returned near frame 91 only after the last viewport event plus the debounced 320ms settle. The custom input toolbar also disappeared and returned. That floor, its prop/state/cleanup branches and five self-confirming tests are deleted rather than retained as residue. The focused toolbar still consumes the shared `--sys-kb-height` instead of publishing a competing local bottom. The replacement keeps the 320ms final sample/bounded fallback, but while the actual Dinotty textarea owns focus on iPhone it re-samples and releases WebKit's temporary caret pan on the first paint after the shared inset has laid out. Login/Search/other native inputs, system mode and keyboard-closed stale offsets cannot take that early path; a close between frames is re-sampled before any scroll. The same correction fixes the default `mobile_input_mode=null` ownership gap so all iPhone modes leave duplicate 100/280ms terminal fits to the ResizeObserver. Initial RED was two focused failures (zero early releases; two default-null duplicate fits); audit-correction RED added unrelated-input and close-between-frame failures. The system-input settings follow-up adds one instance-scoped 16px gap between the preset controls and Advanced; it does not change global collapsible-section spacing. Focused GREEN is 9 files / 124 tests plus the 17-test settings suite; complete audit/correction mini-review and fresh QA close with 119 files / 1242 tests, production build, `cargo check`, `cargo fmt --check`, task-path ESLint/Prettier, diff integrity and zero untracked residue. The authorized Test-only rebuild installed signed v0.22.0 as PID 69458; 8998 serves `index-Ch1hGNBz.js`, byte-identical to local dist at SHA-256 `99101a6044ef02f440c84cb11fe73a6683212b59c833620cac6e140dd16832da`. Production 8999 remains PID 66202 / `index-CiZF7HzP.js`, SHA-256 `dd399f02de5baa33367501093bd3edc614be420810a1770991afc0a122f82d93`, protected and untouched. The user accepted the physical iPhone opening, IME-switch, guard and settings-spacing checks; Windows/Linux physical IME behavior remains unobserved.
- `builtin-ime-first-frame-geometry` upstream filing (2026-08-14): PR #258 intentionally extracts only upstream-owned first-paint behavior rather than copying the full KB08 viewport stack. Its synchronous pan-invariant inset, single CSS bottom owner, next-paint iPhone release and ResizeObserver ownership are automated on the exact branch; the three-release/reset boundary has direct coverage. After one test-only `Navigator` type correction invalidated the first QA pass, the complete audit and entire QA matrix were restarted: 115/1147 frontend tests, production build, `cargo check`, `cargo fmt --check`, changed-file ESLint and diff guards pass. The physically accepted integration implementation supplies motivating device evidence, but is not claimed byte-identical to this minimal extraction. No rebuild followed the filing.
- `builtin-ime-first-frame-geometry` upstream absorption (2026-08-14): PR #258 merged as official squash
  `19f04016`, with the same stable patch-id as reviewed head `ac1f563f`. The three textual conflicts were
  confined to the richer integration owners (`MobileKeyboard.vue`, `useViewportResize.ts`, and its tests),
  so alignment retained their physically accepted final blobs; the other three PR paths auto-merged to the
  same integration blobs. The merge therefore adds official ancestry with zero product/test-tree delta.
- `ios-dictation-tail-replacement` upstream filing (2026-08-15): PR #259 extracts the two-file web-system-
  dictation correction from clean `upstream/dev@19f04016`. The 8998 integration build reconciles interim
  tail replacements into one PTY edit and the user accepted the exact spoken phrase without duplication.
  Frontend artifact CI and backend CI are green; the self-hosted Windows job remains queued at this ledger
  update. The custom merge keeps its already-reviewed richer touch/keyCode-229 owner rather than replacing
  it with the narrower upstream extraction.
- `system-ime-overlap-toolbar-docking` upstream filing (2026-08-15): PR #260 is two reviewable commits on
  clean `upstream/dev@19f04016`: first move the system shortcut toolbar into app flex flow and delete the
  obsolete independent size/bottom owner, then reclaim measured system-IME overlap while counter-offsetting
  only the toolbar. Full PR proof is 115 files / 1158 tests, production build, `cargo check`, Rust fmt,
  changed-file ESLint with zero errors, infra hygiene and bounded fork guard. The user accepted 8998 iPhone
  Tasks-expanded input, stationary shortcut position, repeated close/reopen reset and speech preservation.
- `system-ime-overlap-toolbar-docking` synchronization follow-up (2026-08-16): local PR head `da7d4c9a`
  moves `ime_keyboard_overlap_px` from device-only localStorage into settings schema v13 while preserving
  `None` (uninitialized) versus explicit synchronized zero, seeding a legacy value only when present, and
  preventing pre-v13 clients from erasing an initialized value. The real Keyboard Settings number input now
  saves exactly once through the shared PUT channel. Complete coding audit found and closed that UI-save gap;
  focused proof is 44 tests, complete frontend proof is 115 files / 1162 tests plus production build/typecheck,
  and Rust workspace/all-target tests, fmt, clippy, target ESLint, Prettier and diff integrity pass. The follow-up
  is integrated in custom and pushed to PR #260. A signed 8998 rebuild passed 119 files / 1255 tests,
  served the fingerprint-matched `index-VdoR3cOf.js`, and ran as PID 24563. Live E2E changed 110 to 112,
  confirmed settings v13 / 112 through the server API and a second client, restored 110 from that client,
  then confirmed 110 after the first client reloaded; both clients reported zero console errors.
- `builtin-input-viewport-resample` (2026-08-13; task `T260812-014`) fixes a physical-iPhone failure where focusing the Dinotty textarea opened the native IME but left the local input bar hidden below it. `MobileKeyboard.vue` now samples its existing local position on the next animation frame and once after the 320ms WebKit settle window, and reuses that path when focus enters while the IME is already open. It does not change the shared viewport owner, bottom-offset formula, pan release, system-toolbar geometry, CSS safe areas or input-mode switching. Five component tests cover early/stale events, settle without a second event, already-open focus transfer, single protected dismiss and unmount cleanup. Combined proof is 12 files / 121 focused tests, 118 files / 1200 full tests, production build, 0 lint errors and PASS/FULL complete coding audit. Corrected 8998 serves fingerprint-matched `index-DANr2kke.js` (SHA-256 `0bb75bbb59a326c4c96928043fb21707852e56d78534514683adbd61a047e55a`) with a valid signature; 8999 remains `index-B3EP-Uh2.js`. Physical-iPhone acceptance remains open. Canonical evidence: `dinotty_mods/docs/task-files/26/08/260812_T260812-014_keyboard-alias-touch-open_pretask.md` and `260812_T260812-014_verification.md`.
- `kb01-kb06-mobile-ime-closure` (2026-08-10–11; board `KB01`–`KB06`) closes the mobile keyboard series in one isolated worktree. Settings v12 synchronizes a fully editable system-IME upper/lower layout, phone-only persistence policy, and an optional user-default snapshot. Both rows independently pin a left prefix of 0–5 keys (default 0); only the remainder pages, while the structural upper IME toggle stays fixed and outside the count. A request-only client capability marker prevents an old client that merely echoes the server's v12 number from erasing `lower_pinned`; the marker is absent from GET and disk. Every functional key can be added, deleted, relabeled, reordered and assigned terminal/special/application behavior; both rows paginate to at most five pages without split keys, and disabling the lower row keeps its data and pin count. One shared candidate policy now gates editor and gesture recovery rather than duplicating capacity logic. New system keys default to adaptive width; clearing adaptive width freezes the current integer unit and enables whole-step edge dragging. Explicit fixed width is authoritative for text, application, agent and special-key icons; only adaptive icons default to one unit. Both system rows provide factory reset / save default / restore default, and the built-in keyboard keeps its existing numeric width model and toolbar quick keys. Terminal modifiers support multiple simultaneous latches, default one-use release, and per-key keep-held-until-retap with visible/ARIA active state; application actions and ordinary terminal/special keys expose opt-in hold-repeat. Send-type labels equal to Claude, Codex or OpenCode case-insensitively expose the Agent-icon switch without changing the payload/arguments. Runtime keeps the phone toolbar tied to the single keyboard control, prevents ordinary focus restoration from bypassing manual guard modes, gates every fit/settle path during composition, bounds post-IME VisualViewport settling, and sizes the built-in keyboard from the active rows rather than inactive pages. While the native IME is open, the toolbar uses a 5px bottom pad instead of duplicating the physical-screen safe area; the closed persistent-phone state keeps safe-area protection. Primary files: `src/settings/{types,io,handlers,normalize,tests}.rs`; `frontend/src/{App.vue,components/keyboard/{MobileKeyboard,MkbKey,SystemKeyboardToolbar}.vue,components/settings/KeyboardTab.vue,composables/{orderedKeyGesture,useActionKeyboardGesture,useSettings,useSystemKeyboardGesture,useTerminal,useViewportResize}.ts,styles/mobile-keyboard.css,utils/{actionKeyDef,agentShortcutIcon,appActionCatalog,keyboardSpecialKeys,systemKeyboardLayout}.ts,test/**}`. Canonical design/acceptance: `dinotty_mods/docs/260810_KB-series-design.md`; QA evidence: `dinotty_mods/tmp/20260810/kb-series/verification-report.md`. The stable system-toolbar/settings/modifier slice is filed as PR #254; the unresolved visualViewport/PWA-gap, keyCode-229 and terminal white-cell experiments remain local and are not implied by that PR.
- P21 standalone follow-up (2026-08-11): an iPhone Chrome-installed app exposed about 60 CSS pixels of
  app background below the closed persistent system toolbar even though ordinary mobile-browser mode
  was correct. Pixel evidence showed this was outside the toolbar, not its safe-area padding. The
  shared viewport owner now treats only gaps above 120px as keyboard-sized occlusion and, only when
  `display-mode: standalone`/`navigator.standalone` also matches the same coarse-pointer phone layout
  used by `useIsMobile`, publishes the full layout viewport while the IME is closed. A real IME returns
  immediately to the visual viewport; ordinary browser and installed-desktop paths keep their previous
  visual frame. Focused proof covers all three paths plus IME reopen; final frontend is 114 files / 1127
  tests, lint/typecheck/build and diff check pass. Codex complete review found and closed the initial
  missing phone gate; correction-only mini-review passed. The fixed Claude launcher failed before
  starting its lane because its local wrapper required unavailable prompt/schema arguments, so this
  incremental audit is explicitly Codex SOLO rather than falsely claimed cross-lane. Rebuilt/signed
  8998 serves fingerprint-matched `index-BXoNUsER.js`; 8999 stayed on `index-BGrF3H7F.js`. Chrome
  390×844 ordinary-browser QA measured root bottom = viewport bottom = 844 with zero app errors. The
  exact installed-phone bottom observation remains the P21 user-device gate.
- P23 fullscreen/input follow-up (2026-08-11): the installed Chrome App uses manifest
  `display: fullscreen`, so the phone viewport owner now recognizes both fullscreen and standalone.
  iOS 26 non-composition `keyCode=229` edits use one textarea snapshot/diff owner at keyup with the
  existing bounded missing-keyup fallback; real compositions cancel it, concurrent xterm delivery is
  suppressed, touch ignores the desktop replacement workaround, and the chosen delta returns through
  the normal modifier/symbol path. Complete audit found and closed three defects: multi-character
  shrink had emitted one DEL, 229 flush bypassed virtual modifiers, and its guard could swallow a
  wheel report. Focused RED/GREEN is 42/42; full frontend is 114 files / 1148 tests, typecheck/build,
  target lint and diff check pass; correction-only mini-review passed. The upper fixed IME control now
  uses the same accent as pinned keys. Rebuilt/signed Test only: 8998 serves `index-DygAO9Y4.js`, whose
  served/local SHA-256 is `32af7fc91712ecc6bf567f1437fa16c5b14abc1ada23beab5d38398063457d18`.
  The deploy helper falsely selected unrelated 2.26 kB `index-CMbo3dUG.js`; direct HTML entry and hash
  are authoritative. Chrome 393×852 measured toolbar bottom=852/gap=0, no clipped keys on either page,
  and exact fixed-toggle/pinned accent equality. Native Test is PID 96006; production stayed PID 2526
  on `index-BGrF3H7F.js`. Real-iPhone installed-fullscreen bottom geometry and Simplified Pinyin/WeChat
  timing remain the final READY gate.
- v12 independent-pinning supplement (2026-08-11): upper and lower system-IME rows each persist an
  independent 0–5 left-prefix count, default 0. Pinned keys remain outside their pager; the upper IME
  toggle remains structural. Active settings, factory/user defaults, Rust normalization/migration and
  old-client preservation carry both fields. Complete code audit was FULL/FAIL on one duplicated
  recovery guard; the correction centralized the policy and added the missing lower-capacity check.
  Codex additionally proved that body `settings_version` could be an old client's echoed server value;
  v12 now stamps a request-only compiled-client marker that is never returned or saved. Correction-only
  mini-review passed. Full proof is 114 frontend files / 1131 tests plus 535 Rust server tests, focused
  settings proof, typecheck/build, target-path lint, fmt, clippy and diff check. Fresh 390x844 mobile
  Chrome QA on 8998 proved both selectors expose `0..5`; lower pinning `Esc`/`Tab` survives a page-1
  to page-2 change with identical positions and widths; upper pinned keys and the structural IME toggle
  likewise remain fixed. The temporary lower `0 -> 2 -> 0` mutation persisted and restored across a
  reload. Final 390px QA rejected a Chinese orphan line; a complete Codex/Claude audit then caught
  English overflow and lower-toggle alignment in the first responsive correction. `Pinned on left`,
  an explicit right alignment and regression assertions closed both findings; correction mini-review
  passed. Bilingual geometry then showed no overlap/clipping and pagination still held pinned keys
  fixed. Final fingerprint-verified 8998 entry is `index-CTWY5S5r.js` (served/local SHA-256
  `792bdc7583b766aa1c403275d0610e4cb77714b5038c87d9dc78c90049cbfc78`); production 8999 remained
  PID 2526 on `index-BGrF3H7F.js`. Exact evidence is in the verification report.
- `kb01-kb06-mobile-ime-closure` latest verification supplement (2026-08-11): this supersedes the
  earlier v14/1120/`index-E5pt1ZxD.js` verification figures in the narrative above. Final complete
  audit is v18 FULL/PASS (Codex + fixed-launcher Claude Sonnet 5, no findings); frontend is 114 files /
  1124 tests; final fingerprint-verified 8998 asset is `index-BnVLDcLn.js`; 8999 remains untouched.
  The simplified system editor exposes only bar-level page counts and explicit `添加快捷键` controls.
  Both bars measure 6px heading-to-card and 1px card-to-card gaps; all four 466px cards have no
  horizontal overflow; minimum full-height edit targets are 25.6px adaptive / 17.6px fixed; add
  controls provide pressed accent/inset/transform and focus feedback. Chrome CUA opened/cancelled the
  add modal, opened both minimum edit targets, moved and restored `Extended`; native Computer Use
  displayed the same compact v11 cards. Real-iPhone P1–P4, finger-only P7, swipe-only P9 and final P20
  safe-area observation still gate READY.
- `kb01-kb06-mobile-ime-closure` v19 layout supplement (2026-08-11): page streams now use one
  rounded outer container, borderless pages and exactly one 1px adjacent-page separator. The shared
  10px vertical page padding gives 10px clearance above and below that line on upper and lower bars.
  Full 114/1124 and complete Codex+Claude v19 audit pass. Rebuilt 8998 serves `index-zbCMXthm.js`;
  direct local/served entry comparison matches, while the helper's broad glob false-selected the
  unrelated 2.2KB `index-DveDxF2v.js`. Chrome and native QA confirmed the single-line layout;
  production 8999 remains untouched.
- `kb01-kb06-mobile-ime-closure` v20 visible-gap correction (2026-08-11): v19 measured the grid box,
  not visible key edges; 50px grid vs 44px keys produced an actual 16px/10px asymmetric gap. The
  system editor grid now matches keys at 44px and page padding is 5px, yielding verified visible
  5px/1px/5px on both upper/lower bars while retaining 42px edit-hit height and 466/466 no-overflow.
  Full 114/1124 and complete Codex+Claude v20 audit pass. Rebuilt 8998 serves
  `index-BpyBR9UH.js` with direct local/served entry equality; 8999 remains untouched.
- `qkb5-quick-send-threshold`: adds the persisted/clamped `quick_send_threshold`, keyboard settings UI and EN/ZH copy, split-send policy/guards, frozen broadcast routing, async send-result forwarding, and focused frontend/Rust coverage. Files: `src/settings/{types,normalize,handlers,io,mod,tests}.rs`, `frontend/src/{App.vue,components/keyboard/MobileKeyboard.vue,components/settings/KeyboardTab.vue,components/terminal/TerminalPane.vue,composables/useI18n.ts,composables/useSettings.ts,composables/useTerminal.ts,composables/useTransport.ts,utils/frozenSend.ts,test/MobileKeyboard.sendThreshold.test.ts}`.
- `qkb3-ime-keyboard-overlap`: opt-in device-local `ime_keyboard_overlap_px` (default 0, 0–300) under Keyboard→Advanced; `#app-root` height calc with `max(0px, mkbHeight − overlap)` clamp; app-state gate (kbVisible && textInputFocused && single-terminal-tab && !hasVerticalPreview) so it fires on web-remote AND Tauri; visualViewport hardening (reset/revalidate lifecycle, BFCache recovery). Files: `frontend/src/{App.vue,components/settings/KeyboardTab.vue,composables/useDeviceKeyboardSettings.ts,composables/useI18n.ts,composables/useKeyboardOverlap.ts,composables/useViewportResize.ts,test/useKeyboardOverlap.test.ts}`. The later P27 cleanup removed the now-unused `imeOccluding` export; no follow-up remains.
- `4b0828d8-plugin-pane-identity-visibility`: dynamic plugin components previously received only `api`, so a plugin could not tell its panes apart and never learned that its tab had been hidden or revealed. It now passes `paneId` / `workspaceId` / `isVisible` / `isFocused` down through `PaneContent` into `PluginView`, which forwards them as props to the mounted component. `isVisible` is deliberately the TAB-level fact (the `tab.paneId === activePaneId` comparison that drives `display:none`), NOT `SplitContainer`'s leaf-level active flag — every tab has that set on exactly one leaf, including hidden ones; zoom occludes path-locally and is threaded as a recursive conjunction. Defaults to visible, so an omitted binding preserves prior behaviour. Files: `frontend/src/{App.vue,components/plugin/PluginView.vue,components/split/PaneContent.vue,components/split/SplitContainer.vue}`. Consumer: the session-browser per-pane runtime + scroll restore (dinotty-plugins `03459e6…187262b`) — its transcript position cannot be restored without a visibility signal, because a hidden pane's width collapses to 0 and the reflow on return invalidates the stored `scrollTop`. The two changes are separable: the plugin's per-pane split works without this, only the scroll restore degrades to a width-transition heuristic. Upstream's own plugin-development example teaches the shared-closure pattern that produced the defect, so the contract is worth settling upstream rather than carrying locally.
- Filed `2026-08-11`: PR #249 preserves the existing per-key `repeat` option for application-action shortcuts through Rust/frontend normalization, exposes it in the editor, and reuses the established hold timer with release/unmount cleanup. PR #250 independently sizes Dinotty's built-in mobile keyboard to the active swipe page, observes both panels' intrinsic sizes, and smooths the page-height transition. Both heads were cut directly from `upstream/dev@d4fd5389`, passed the fork guard with one commit and no merge commits, and deliberately exclude KB08's system-input, visualViewport and terminal-input paths. Verification: #249 frontend 1048/1048 + build + Rust check/clippy/all-targets; #250 frontend 1047/1047 + build. Device-side visual confirmation remains open for #250.
- Migrated v1→v2 `2026-07-22` by the upstream-update run; mod_id minted from commit short hash (feature rows) or stable slug (meta rows sharing re-apply commits `4d3367c5`/`4e4715e0`); never renumbered.
- Reconciled `2026-07-27` (upstream-update merge run, `main` → `5fec991b` v0.19.1, triage: `docs/task-files/2607/260727_dinotty_upstream-triage.md`): `qkb3-ime-keyboard-overlap` and `eb14ee6a-quickkb-app-shortcuts` both flipped `pr-open`→`merged-upstream` / `pending`→`absorbed`. Zero merge conflicts — upstream's plugin overhaul (`08d2f119`), template restyle (`134c7f56`) and version bump (`5fec991b`) have no intersection with the fork layer; the only overlap was PR #216's own footprint returning. Active rows after that run: 5 merged-upstream/absorbed, 4 private, 3 candidate (`t260723-015-session-input-dispatcher`, `ff9c1049-preview-loopback-auth`, `epv1-preview-freeze-annotate`), 0 pr-open. `4b0828d8-plugin-pane-identity-visibility` was added later the same day by T260727-001, bringing candidates to 4.
- Dropped `2026-07-28` (T260723-028 / EPV1 abandonment): `epv1-preview-freeze-annotate` flipped `candidate`→`dropped`, removed from the tree in `938401f8` (frontend) + `a204b655` (proxy injection). Candidates back to 3 (`t260723-015-session-input-dispatcher`, `ff9c1049-preview-loopback-auth`, `4b0828d8-plugin-pane-identity-visibility`). The fork's preview-related surface is now `ff9c1049` alone; `PreviewPanel.vue`, `WebPreview.vue` and `vite.config.ts` are byte-identical to `upstream/dev` again, so future upstream merges no longer carry a preview conflict surface.
- Filed `2026-07-28` (T260727-001 / SBF1): `4b0828d8-plugin-pane-identity-visibility` flipped `candidate`→`pr-open` as [PR #225](https://github.com/xichan96/dinotty/pull/225), head `upstream-pr/plugin-pane-identity` cut fresh from `upstream/dev` (cherry-pick clean; 4 files, +46/−10; `vue-tsc --noEmit` and `pnpm run build` both clean locally; infra-leak `check --pre-pr` CLEAN). Upstream CI green on Backend (clippy + fmt + test) and Frontend build. Candidates now 2 (`t260723-015-session-input-dispatcher`, `ff9c1049-preview-loopback-auth`), pr-open 1. Paired plugin-side PR [dinotty-plugins#8](https://github.com/xichan96/dinotty-plugins/pull/8) went up the same day; the two are INDEPENDENT — the plugin consults `isVisible` only when it is a boolean and otherwise falls back to a width-transition heuristic, so either can merge alone.
- Reconciled `2026-07-28` (UU3 upstream-update merge run, triage + receipt: `docs/task-files/2607/260728_dinotty_upstream-triage.md`): synced the 10 `upstream/dev` commits that landed after the 2026-07-27 run (33 files, +1447/−463; new `src/event_bridge.rs`, no upstream deletions). **Zero lifecycle flips** — every PR reference in the Index was re-verified live against GitHub and all match what is recorded, so nothing was owed a status change. **Zero merge conflicts**, predicted by `git merge-tree` and confirmed on the real merge. The one real risk was upstream `3fbaee55` (#222) rewriting `App.vue` by 468 lines under three of our mods; verified afterwards that both #222's `:pane-id="activeTab?.type === 'terminal' ? …"` binding AND our `:is-visible` binding survive, that the residual `App.vue` delta vs upstream is only 3 hunks (our `4b0828d8`, plus the pre-existing authenticated-clipboard carry under `eb14ee6a`), and that upstream touched no part of that carried region this batch. Follow-up recorded, not acted on: `t260723-015-session-input-dispatcher`'s exit-condition ("adapt `InputFailure` to upstream lifecycle infrastructure") should be re-evaluated against the new `src/event_bridge.rs` + `BusEvent` publication this run brings.
- Registered `2026-08-26` (T260825-009 / board `KB12`, design: `core/docs/task-files/dinotty_mods/26/08/260825_T260825-009_mobile-syskb-blank-and-statusbar-drag-fix_design.md`): four new rows — `b238998-plugin-store-instance-isolation` and `1f0cd07-builtin-kb-seed-scoping` as upstream `candidate`s, `ff419d4-viewport-pan-lock` as a `candidate` owed a FIRST upstream submission, `b7ab5da-ios26-capsule-reclaim` as `private`. **Two of the four are rebuild casualties this batch RESTORES, and that is the lesson worth carrying**: the pan lock and the capsule reclaim were both dropped by the 2026-08-24 rebuild of `custom` from clean `upstream/dev`, and neither had a Contribution Index row to make the loss visible — the capsule reclaim's absence was additionally MASKED for two days by a stale installed plugin that still carried its consuming rule, so it surfaced only when the seed scoping removed that copy. A mod with no row is a mod a rebuild deletes silently. Verification state at registration: build-level evidence only (`pnpm build:builtin-kb` exit 0, `#system-mobile-kb` absent from the emitted seed, `cargo check` ×2 exit 0, vitest green across the four touched suites); no runtime verification yet, and the capsule reclaim is not verifiable without the user's own iOS 26 device.

## Live-alignment snapshot (source of truth — consult here; do not re-derive from git each session)

> **REBUILT on `upstream/dev@1255721d` on `2026-08-24` — this was a rebuild, not a merge.** Every prior
> snapshot in this file describes a branch that no longer exists. `custom` was recreated from clean
> upstream with only the private mods replayed on top, as a single commit `e86d122a`; the pre-rebuild
> lineage (158 local commits) is preserved at tag `backup/custom-20260824`, pushed to `origin`.
> Why a rebuild and not a merge: of those 158 commits, 22 PRs' worth had already merged upstream, and
> the remaining delta collided with upstream's refactor of `App.vue` into six composables and
> `KeyboardTab.vue` into section components — 52 conflicts that were a re-port, not a merge.
> Historical narrative below is provenance and may describe files that have since moved or been absorbed.
- Currently aligned to `upstream/dev@06208bc` (`2026-08-26`, custom HEAD `c5008b9`) by MERGE on top of
  that rebuild baseline; `behind=0`, `ahead=21`.
- Residual fork layer vs `upstream/dev`: **29 paths, 4431 insertions / 44 deletions** (`git diff --stat
  upstream/dev...custom`, measured `2026-08-26` — re-run the command rather than trusting this figure).
  Ten mods, plus one unclassified test fixture. The six `lifecycle=private` carries:
  - `fork-meta` — `.gitignore`, `.upstream-update.json`, `LOCAL_MODS.md`
  - `mocha-theme` — `frontend/src/themes.ts`
  - `deploy-scripts` — `scripts/dinotty`, `scripts/dinotty-ops.sh`, `scripts/upstream_custom.py`,
    `scripts/upstream_pr.py`, `scripts/test-upstream-workflows.py`,
    `scripts/test-dinotty-ops-relaunch-env.sh`, `scripts/repro-input-channel-replay.mjs`
  - `signing-identity` — `src-tauri/tauri.conf.json`
  - `agent-launch-no-color-backstop` — `src/pty.rs`
  - `default-locale-zh` — `src/settings/types/mod.rs`
  - `b7ab5da-ios26-capsule-reclaim` — `frontend/src/composables/useViewportResize.ts`,
    `frontend/src/test/useViewportResize.test.ts`, `frontend/src/styles/mobile-keyboard.css`
  The three `lifecycle=candidate` rows added `2026-08-26` by the `KB12` batch (`T260825-009`):
  - `b238998-plugin-store-instance-isolation` — `src/plugin/manager.rs`, `src/settings/mod.rs`,
    plus the test-instance build path in `scripts/dinotty-ops.sh` (counted under `deploy-scripts`)
  - `1f0cd07-builtin-kb-seed-scoping` — `frontend/src/keyboard/builtin-keyboard/build-seed.mjs`,
    `.../plugin.json`, `.../vite.config.ts`, `frontend/src/test/builtinKeyboardSeedCss.test.ts`,
    `frontend/src/test/mobileKeyboardCssContract.test.ts`
  - `ff419d4-viewport-pan-lock` — `frontend/src/composables/useViewportPanLock.ts`,
    `frontend/src/test/useViewportPanLock.test.ts`, `frontend/src/composables/useAppKeyboard.ts`,
    `frontend/src/App.vue`
  - unclassified — `frontend/src/test/OverlayDragItem.test.ts`, added by `d52b4f0` (`2026-08-25`) after
    the previous snapshot. The same path EXISTS in `upstream/dev` (`git cat-file -e
    upstream/dev:frontend/src/test/OverlayDragItem.test.ts` exits 0), so this is not an unfiled
    candidate: diff the fork copy against upstream's at the next sync and drop it if they do not differ
    meaningfully.
- NOTHING ELSE is local. No session input dispatcher, no notification implementation, no Windows
  resolver, no plugin-tab persistence, no multiline quick-send, no plugin pane identity/visibility, no
  preview-loopback-auth patch, no touch-web selection guard: all upstream-owned. **"No keyboard code"
  no longer holds** — it was true of the 2026-08-24 rebuild baseline and is false since the `KB12`
  batch, which restored two keyboard-adjacent mobile mods the rebuild had dropped and added the seed
  scoping. The four `KB12` paths above are the whole of it; nothing else keyboard-side is ours.
- Rebuild verification (`2026-08-24`): `cargo check --workspace` pass; `src-tauri` checked separately as
  its own crate (it is not in the workspace) pass; both `pty.rs` NO_COLOR tests pass; `cargo fmt --check`
  clean; frontend `npm run build` pass; frontend `npm test` 1294 passed / 15 failed — the same 15
  failures, item for item, occur on pure `upstream/dev` (measured on a detached checkout the same day),
  so they are inherited, not a rebuild regression.
- Two upstream-PR candidates opened BY the rebuild, neither filed yet: (a) SSH session close on write
  failure, which upstream lacks — an SSH write failure currently leaves an unusable tab; (b) the
  `OverlayDragItem.test.ts` localStorage fixture, which our merged PR #252 supplied and upstream's newer
  copy of that test file does not carry. Both must be reproduced on clean upstream before filing.
- Newly absorbed this reconciliation: PR #259 (`72123f46`) and PR #260 (`7a99861b`). The provider/context
  refactor is the new owner; local conflict resolution retains the accepted viewport settlement, modifier
  ownership, responsive toast, and terminal-input coverage without restoring the superseded prop/event APIs.
- New shareable follow-up: `touch-web-terminal-selection-guard` removes the upstream manual-open capture
  branch that cancels terminal pointer/mouse defaults and therefore blocks browser text selection. The
  replacement keeps IME authorization unchanged and is covered by real event tests plus accepted 8998 touch-Web QA.
  Filed as PR #261 from `codex/upstream-touch-web-selection-20260818-r2` at head `b57b8242`; the
  outbound branch contains only `frontend/src/App.vue` and its focused system-keyboard test.
- Verification for this snapshot is recorded in the newest re-align log entry and the alignment merge commits.
- Update trigger: on any upstream re-align OR when a PR flips open<->merged — refresh SHA, date, table.
- Re-align log (newest first):
    - `2026-08-26` → base `06208bc` (was `acaf6fb`), custom HEAD `c5008b9`: five upstream commits, all
      backend security or CI — `0d4122e` (block ws/watch path traversal and IPv6 SSRF), `4986577`
      (abort SSH auth monitor on socket close), `02653fd` (reject cross-site browser requests to
      trusted endpoints), `802a01a` (pin external proxy to validated DNS results), `06208bc` (satisfy
      rustfmt and clippy). Conflict surface EMPTY: they touch `src/auth/{mod,tests}.rs`,
      `src/file_watcher.rs`, `src/proxy/{external,mod}.rs`, `src/ws/sync.rs`, and NOT ONE of those
      appears in `git diff --name-only upstream/dev...custom`, so `custom` carries no local change in
      any file they modify. Ledger audit before merging found nothing frozen against the old
      interface: the only Contribution Index row naming any of these paths is
      `ff9c1049-preview-loopback-auth`, already `merged-upstream`/`absorbed` with zero
      custom-vs-upstream diff in `src/proxy/mod.rs`. Backup tags:
      `backup/custom-20260826-pre-align` (ours, at `4ffae93`) and `pre-update-custom-20260826-125814`
      (the tool's). NO keyboard, plugin-store, settings, or build-script file was touched, so this
      align does not affect the T260825-009 / KB12 verification that motivated it.
      Why this align happened: `rebuild-test` preflight refused to build the 8998 test instance while
      `custom` was five commits behind, and the script carries no skip flag — aligning was the only
      path to the QA the fix required. Verification: `cargo test` 607 passed / 0 failed, frontend
      vitest 1355 passed / 0 failed, `vue-tsc -b` clean, then `rebuild-test` green with its own
      fingerprint check on 8998.
    - `2026-08-25` (second re-align of the day) → base `acaf6fb` (was `13e6b86`), custom HEAD `e01c978`:
      TWO consecutive aligns, because upstream moved again mid-build. First align took `82bf004`
      (route OSC notify through the pane-decoupled notif path — `src/notification/broadcast.rs`,
      `src/session/session_stub_tests.rs`, `frontend/src/test/oscPopupMigration.test.ts`) and `3d0ac56`
      (star-history chart, docs image only); backup tag `pre-update-custom-20260825-175202`. The second
      took `acaf6fb` (`chore: bump version to 0.23.1`, `Cargo.toml` + `Cargo.lock`, 3 lines); backup tag
      `pre-update-custom-20260825-175427`. Conflict surface was EMPTY on both: the 15 residual fork paths
      and the incoming file sets are disjoint (`comm -12` of the two `git diff --name-only` lists returned
      nothing), and `git merge-tree --write-tree` previewed clean each time. NO keyboard, IME, or
      `keyboardSpecialKeys`/`MkbKey`/`terminalInput` file was touched, so the T260825-004 KB reconcile
      verdicts — pinned to `upstream/dev@13e6b86` — are unaffected. Verification per align:
      `cargo check --workspace`, `cargo test --workspace -- --skip terminal_exit_regression`,
      `terminal_exit_regression` (known upstream flake, debug-db `db0807727548`), `vue-tsc --noEmit`,
      and `pnpm build` all pass. Deployment: `rebuild-test` installed `Dinotty Test.app v0.23.1` and 8998
      is live under it (PID 43140). Prod 8999 remains the `2026-08-25 12:28` build at app version 0.23.0
      — deliberately NOT rebuilt; both surfaces serve the SAME frontend entry `index-hQGn659K.js`, so the
      only end-to-end delta is the app version carrying `82bf004` + `acaf6fb`. Blind spot: no physical
      device pass was run against this build on either end.
    - `2026-08-25` → base `13e6b86` (was `1255721d`): merged the 2 upstream commits that arrived after the
      2026-08-24 rebuild — `661895e` (keep terminal viewport pinned to tail during heavy output; adds
      `useTerminalWheelPin.spec.ts` and `useTerminalWritePumpPin.spec.ts`) and `13e6b86` (PR #269 asset
      compression: asset-hash invariant, compression layer, service-worker precache, PWA icons, proxy
      inject path). Merge preview clean, no textual conflicts. `frontend/src/composables/useTerminal.ts`
      was the only merge-touched file overlapping the residual fork layer, and both new upstream pin specs
      pass against our copy. Verification: `cargo check --workspace` pass (`dinotty-server` and
      `dinotty-desktop`); `cargo test --workspace -- --skip terminal_exit_regression` 11 suites pass, 0
      failed; `vue-tsc --noEmit` clean; `pnpm build` pass; `vitest run` 1301 passed / 15 failed — the 15
      are the SAME inherited `OverlayDragItem.test.ts` localStorage-fixture failures recorded in the
      2026-08-24 rebuild verification above (each fails in `beforeEach` on `localStorage.clear()`; the
      happy-dom env supplies no `localStorage` and every passing sibling test stubs it via
      `vi.stubGlobal`, while upstream's copy of this file still lacks the fixture our PR #252 supplied).
      No new failure; the passing count rose 1294 → 1301 with the two new upstream specs. Backup tag:
      `pre-update-custom-20260825-112500`.
      Blind spots: no device or browser QA ran on this merge — PR #269 touches the service worker, PWA
      manifest and proxy inject path, which only a real 8998 load exercises. `dinotty rebuild all` had NOT
      completed at the time of this entry, so neither 8999 nor 8998 carries this merge yet.
      Tooling defect found (not fixed here): `align-upstream` runs `cargo check --workspace` BEFORE
      `pnpm build`, but the `#[derive(RustEmbed)]` folder `frontend/dist/` must exist at compile time. On a
      tree with no prior build product the run aborts with a proc-macro panic plus 7 spurious
      `StaticFiles::get` "no associated function" errors whose only real cause is the missing dist. Running
      `pnpm build` first, then re-running the cargo steps, passes.
    - `2026-08-18` → base `7a99861b` (was `19f04016`): fetched and merged the 12 upstream commits that
      include the keyboard provider/host-bridge refactor and official PR #259/#260 absorption. Eight textual
      conflicts were reconciled onto `KeyboardContext`/`terminalInputCore`; the local 320ms viewport resample,
      modifier-owner cleanup, responsive toast placement, richer terminal input state machine, and touch
      compatibility-click protections remain. The follow-up fixes system-IME overlap so `off`,
      `collapse_only`, `open_only`, and `both` all honor the configured overlap in both toolbar modes without
      requiring `kbVisible`; the shortcut toolbar remains counter-shifted outside the overlap. PTY spawn now
      removes inherited `NO_COLOR` only when Codex/Claude session markers prove an automation launch, closing
      the direct-`open` path while preserving a user's explicit ordinary-shell setting. Backup tag:
      `pre-update-custom-20260818-ime-color`. Deployment is authorized for Test 8998 only; 8999 is excluded.
    - `2026-08-16` → same latest base `19f04016`: merged PR #260's reviewed local settings-v13
      synchronization head `da7d4c9a` into the isolated custom candidate. `App.vue` and its system-keyboard
      fixture kept the richer physically accepted custom input/viewport state machine while replacing the
      device-only overlap source with the shared settings owner. Combination testing exposed one independent
      stale `workspace_session` fixture left by the local session-input dispatcher mod after upstream added
      workspace upload coverage; it now constructs the current `InputState::Uninitialized` field. Final source
      proof is frontend 119 files / 1255 tests, production build/typecheck, `cargo check`, `cargo fmt --check`,
      Rust workspace/all-targets (desktop 12; server 543 passed / 10 ignored; integration 6), and diff integrity.
      Backup tag: `pre-update-custom-20260816-0934-sync`. The signed 8998 rebuild serves fingerprint-matched
      `index-VdoR3cOf.js`; cross-client live E2E passed and restored the original value 110. PR #260 is pushed
      at `da7d4c9a` and remains open/mergeable. Production 8999 is still untouched pending the final fresh
      upstream/ledger receipt and authorized rebuild-all gate.
    - `2026-08-15` → same base `19f04016`: filed PR #259 (iOS dictation tail replacement) and PR #260
      (system-IME toolbar docking + overlap). Fast-forwarded the accepted custom integration through
      `6effca49` / `3b3e7feb`, then merged both clean PR heads for ancestry. Conflicts were confined to the
      richer custom input/viewport owners and retained the pre-merge accepted blobs; the final production
      artifact is again `index-DbVJCEoI.js`, byte-identical to the 8998 E2E build. User iPhone acceptance
      passed for closed 8999 parity, Tasks-expanded input, stationary shortcut toolbar, two close/reopen
      cycles and no dictation duplication. Declared source gates pass: frontend 119 files / 1251 tests,
      production build, and `cargo check`. Backup tag: `backup/custom-pre-pr260-align-20260815`.
      Deployment stops before the human-only `rebuild-all` step.
    - `2026-08-14` → base `19f04016` (was `387c9628`): fetched and merged official PR #258.
      Stable patch-id equality proves the upstream squash is the reviewed clean PR head. Three conflicts were
      in the richer integration owners and retained their accepted final blobs; all six PR paths are unchanged
      from the pre-merge integration tree. Declared source gates pass after installing the isolated worktree's
      locked frontend dependencies: frontend 119 files / 1242 tests, production build, and `cargo check`.
      Backup tag: `backup/custom-pre-pr258-align-20260814-1856`. Fresh `rebuild all` installed signed v0.22.0
      on 8999 PID 38834 and 8998 PID 40196; both serve matched `index-Ch1hGNBz.js` and omit `NO_COLOR`.
    - `2026-08-14` → base `387c9628` (was `83ab63c0`): fetched and merged official PR #257.
      Product files auto-merged to the pre-existing accepted behavior; two conflicts were confined to
      `appPaneClose` test fixtures and retained the integration side because it includes the same #257 intent
      plus the later no-ghost-activation state machine. Complete audit caught an automatic three-way merge
      duplication of five already-equivalent guard tests; it was deleted before commit, restoring the prior
      `systemMobileInput.test.ts` blob and leaving no product/test delta. Focused correction proof is 62/62.
      Declared source gates pass: frontend 119 files / 1242 tests, production build, and `cargo check`.
      PR #258 remains OPEN.
      Backup tag: `backup/custom-pre-pr257-align-20260814-160650`. Deployment deliberately stops before the
      human-only `rebuild-all` step.
    - `2026-08-14` → same base `83ab63c0`: filed clean one-commit upstream PR #257 and #258 for every
      remaining shareable follow-up. Both passed complete review, exact-branch frontend/build/Rust gates,
      infra hygiene and bounded-path fork guards. The integration candidate already contains their accepted
      behavior plus the deliberate local layer, so no duplicate cherry-pick was stacked. `custom` remains the
      rebuild source; deployment deliberately stops before the human-only `rebuild-all` step.
    - `2026-08-14` → base `83ab63c0` (was `8ec5375a`): fetched and merged official PR #256.
      Its stable patch-id and tree are identical to the previously reviewed `6d1ffb9b`, so conflict
      resolution preserved the integration side that already contained the same official code plus the
      accepted follow-up. Added follow-up commit `9d5bd9b3`; full pre-alignment proof is 119 frontend files /
      1242 tests, production build, `cargo check`, `cargo fmt --check`, task-path ESLint/Prettier and diff
      integrity. Physical 8998 iPhone acceptance passed before alignment. Backup tag:
      `backup/custom-pre-align-20260814-1545`. Deployment remains deliberately stopped before the
      human-only `rebuild-all` step.
    - `2026-08-14` → base `8ec5375a` (was `492321dd`): merged official PR #251/#252/#253,
      upstream's independently absorbed system-keyboard toolbar `990e1bc7`, workspace upload limits and
      v0.22.0. The reviewed KB09 closure was merged first so its later viewport/input fixes remained
      authoritative at overlapping owners; open PR #256 head `6d1ffb9b` was then merged into the
      candidate ancestry without changing the already-reviewed local final tree. Retired four filed
      layers (#251/#252/#253 and #254-equivalent); retained PR #256 plus private fork identity, signing,
      operations, session-input and other ledger-declared local behavior/configuration. Backup tag:
      `backup/custom-pre-align-20260814-0023`. Merge correction `09ac5015` removed duplicate imports/test
      fragments and restored v0.22 locked-modifier rendering. Final source gates: frontend 119 files / 1227
      tests, production build, task-path ESLint, diff integrity, and `cargo check` all pass. Deployment
      deliberately stops before the human-only `rebuild-all` step.
    - `2026-08-12` (`T260812-009`) → base `492321dd` (was `a6d682ff`): merged upstream through #249/#250,
      then merged the KB series onto `custom`. Six conflicts on the KB branch (`MkbKey.vue`,
      `KeyboardTab.vue`, `useSwipePanel.ts` and their three tests) all sat where the KB work and upstream's
      #249/#250 implement the same thing; each took the official implementation and re-layered the KB delta.
      Two more on the custom merge: `desktopLifecycle.test.ts` (an uncommitted duplicate of the same
      localStorage shim was sitting in the custom worktree — committed first as `7a97ae3c` so the merge could
      not silently overwrite it, then superseded by the KB branch's formatted version) and this ledger.
      Retired two local layers: #249 (`492321dd`) and #250 (`49b611f6`), now upstream-owned.
      Filed three new upstream PRs off clean `upstream/dev`: #251 (`src/pty.rs` zsh `zle_highlight`),
      #252 (`desktopLifecycle` localStorage — repairs 10 tests that are red on `upstream/dev` itself),
      #253 (mobile toast top-center strip). `infra-git-hygiene.sh check --pre-pr` exited 0 CLEAN on all three.
      Gate proof on the merged KB tree: `vue-tsc` exit 0; vitest 1185/1185; `cargo check --workspace` exit 0;
      `src-tauri` standalone `cargo check` exit 0; `cargo test --lib settings::` 68 passed / 478 filtered.
      Backup tags `pre-upstream-merge-T260812-009` and `pre-custom-merge-T260812-009`.
      The stable system-keyboard toolbar/settings/modifier slice was subsequently extracted into one clean
      commit and filed as PR #254. It deliberately excludes the visualViewport/PWA-gap, keyCode-229 and
      terminal white-cell experiments; those still await a separately evidenced solution and real-iPhone QA.
    - `2026-08-10` → base `a6d682ff` (was `f958848c`): merged current upstream through #246. Five
      structural conflicts from upstream's i18n/session/proxy refactors were resolved with official code as
      the conflict authority, then the still-required session input-dispatcher behavior/tests and two private
      i18n keys were re-applied at their new owners. Retired six stale local layers: #225/#239/#242/#245/#246
      and preview loopback auth. #239/#242/#245 have stable patch-id parity with their local commits; #246
      leaves zero notification diff; the preview proxy and plugin-pane paths also leave zero residual diff.
      Frontend proof: 103 files / 1045 tests, typecheck, and production build green. Rust proof and final audit
      are run against this final `a6d682ff` tree before advancing `custom`.
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
- **T260825-009 / `KB12` batch (2026-08-26)** — four mods, full detail in their Contribution Index
  rows above (the Index wins; these lines are pointers, not a second copy):
  `b238998-plugin-store-instance-isolation`, `1f0cd07-builtin-kb-seed-scoping`,
  `ff419d4-viewport-pan-lock` (owed a FIRST upstream PR — never filed, verified 2026-08-26 across
  76 PRs, ancestry, and GitHub search), `b7ab5da-ios26-capsule-reclaim` (private, iOS-26-specific).
  The pan lock and the capsule reclaim are 2026-08-24 rebuild casualties restored here; both lacked
  an Index row, which is why the rebuild took them silently.
- **Preview proxy loopback-auth fix** (2026-07-23; `ff9c1049`, `src/proxy/mod.rs`
  `check_preview_auth`) — with `preview.allow_external = true`, the session-auth requirement also
  applied to loopback clients; the localhost UI is auth-exempt (no session cookie), so enabling
  external access broke local `/preview/*` panes (observed live: loopback curl → 401, WebScope
  local pane dead). Fix: unconditional `real_ip.is_loopback() → allow` before both checks —
  restores the implicit pre-`allow_external` trust; external clients still need
  allow_external + session cookie/Bearer. upstreamable: **yes** (general upstream defect in the
  preview auth model, not fork-specific) · status: **candidate** · exit-condition: upstream absorbs
  the loopback bypass.
- **Detach-reap redesign: reference-based session liveness + crash-orphan boot sweep** (2026-07-23;
  `7a9a1fea` task1 → `95b9fa4f` task2 → `80d8f798` task3 → `7e33f0fa` task4; review fixes
  `c34b8c44` + `222578f0`) — TRC1 root fix for overnight workspace-tab loss. status: filed;
  upstream_pr: https://github.com/xichan96/dinotty/pull/211 (branch `fix/session-detach-data-loss`
  from `upstream/dev` 348e8353, worktree `../dinotty-pr-worktree`; range-diff verified — sole delta
  vs custom series is the LOCAL_MODS.md exclusion; hygiene --pre-pr CLEAN; CI on branch 388/0/10);
  upstreamable: YES (all touched reaper code is upstream-original; frame as data-loss fix; branch
  from `upstream/dev` per W3, NEVER from `custom`). Design doc of record:
  `dinotty_mods/docs/task-files/2607/260723_T260723-003_detach-reap-redesign_design.md` (rev2).
  1. Time-based detach reap DELETED (`DINOTTY_DETACH_REAP_SECS` gone — supersedes the #154 S2
     timeout): a session lives iff a `tab_layouts` terminal leaf references it (60s `unowned_since`
     grace, `Connected` veto via atomic mirror, single lifecycle-critical-section reap claim).
  2. Unified `close_session` chokepoint: single winner claim = `sessions.remove` under new
     `lifecycle` mutex; ClosePlan side-effects after unlock; layout-only close for sessionless
     panes; pane-generation identity (`Arc::ptr_eq`, vacant-only insertion).
  3. `#[cfg(unix)]` PID ledger (`config_dir()/session-ledger.json`, per-entry owner identity,
     flock, temp+rename) + boot sweep at BOTH entrypoints (start_time-verified TERM→KILL, never
     kill on uncertainty); ledger removal only on confirmed termination. Windows: no-op stub.
  4. Singleton layout registration at both layoutless creation paths (Tauri `pty_spawn` + WS
     fallback) so every session is tab-referenced; post-broadcast membership recheck for SSH.
  Accepted residual (flagged): microsecond insert→broadcast race can leave a client-side ghost tab
  (manual close clears it via layout-only close path); review capped at 2 redo rounds.
  QA: cargo 378/0/10; live crash-orphan sweep kill verified; user trial passed detach-survival
  (2.75 min disconnect, 4/4 sessions kept). Deployed 8998 only; overnight soak SKIPPED by user
  decision (PR filed directly 2026-07-23); 8999 deploy still pending user release (board token TRC2).
- **Mobile quick-keyboard: host-clipboard paste + terminal-sequence app-action keys** (2026-07-23;
  `eb14ee6a` → `0b71556e`; incl. review fixes `99e2f358`, r3 rework `14057ca3`, polish `98c5fb1e`) —
  QKB1. Lets a phone one-tap paste the HOST (Mac) clipboard into the terminal and send.
  1. **Backend**: new `GET /api/clipboard` shared handler (`src/api/clipboard.rs`, arboard +
     `spawn_blocking`) mounted on BOTH routers (`src/main.rs` + `src-tauri/src/embedded_server.rs`);
     headless → 503; mockable provider for CI. Security posture deliberately STRICTER than the
     global auth middleware — MUST persist across refactors: never added to any auth-exempt list;
     empty-token mode → 403; IP-whitelist-only requests → 403; cookie-auth requires same-origin
     proof (Sec-Fetch-Site same-origin/none when present, else Origin-vs-Host match) because the
     embedded CORS echoes configured origins WITH credentials; Bearer requests exempt from the
     same-origin check; clipboard content never logged; 256 KB cap → generic 413; `Cache-Control:
     no-store` on every response path incl. OPTIONS preflight; generic error bodies.
  2. **Frontend**: `pasteTerminal` is an OPT-IN selectable app-action key (key editor → 按键类型 →
     应用快捷键), NOT a fixed strip; per-key 「发送后追加回车」 governs auto-enter (Rust keeps
     `auto_enter` as presence-preserving `Option<bool>`). Paste flow: trim trailing newline runs →
     empty → info toast; multiline → two-tap confirm (3 s disarm); sends through the same
     input/broadcast path as typing (split-pane fanout). Existing toolbar phone-paste button
     unchanged.
  3. **r4**: 4 terminal-sequence keybindings (`term.newline` `\x1b\r`, `term.lineStart` `\x01`,
     `term.lineEnd` `\x05`, `term.deleteToLineStart` `\x15`) exposed as selectable app-action
     candidates via a derived catalog over `kind:'terminal'` defs; appendEnter checkbox hidden for
     them; no keyboard binding is created, so desktop shortcuts are untouched.
  i18n EN+ZH throughout. Tests: vitest 785/785, cargo 372 pass; scoped reviews PASS (final round
  conf8, zero findings). Design contract: dinotty_mods
  `docs/task-files/2607/260723_qkb1-quickkeyboard-shortcuts_design.md`.
  upstreamable: **yes** — PR filed 2026-07-23 (user decision; the security-posture question is put
  to upstream in the PR body itself instead of gating the filing) · status: **filed** ·
  upstream_pr: https://github.com/xichan96/dinotty/pull/212 · upstream_issue: —
- **Mobile quick-keyboard: keep-on-scroll setting effective + persistent** (2026-07-23;
  `33c4b749`) — two general upstream bugs, both verified against upstream history:
  1. Upstream #193 (`55a0b451`) added `keyboard_keep_on_scroll` guards only to App.vue's three
     collapse sites and missed MobileKeyboard.vue's older duplicate unconditional
     `terminal-scroll` listener (introduced `4e250cd8`), which collapsed the keyboard regardless
     of the setting — the toggle had no effect on phones. Fixed by DELETING the duplicate
     listener (App.vue's guarded consumer already handles the same document-level event and flips
     the same `kbVisible` ref) and guarding the `globalSelectedPath` watcher's collapse.
  2. #193 touched 4 frontend files only; the Rust `Settings` struct has no
     `keyboard_keep_on_scroll` field, so the typed `Json<Settings>` PUT silently dropped the key
     and the toggle reset to false on every refresh. Fixed by adding the serde-defaulted bool
     (no version bump — follows the `keyboard_sound` pattern).
  Plus: keepOnScrollHint EN/ZH expanded to the pinned semantics; KbToggleButton hardcoded title
  → i18n. Tests: backend missing-field default + round-trip; frontend pin behavior ON/OFF.
  Known accepted risk: a stale already-open client PUTs the full Settings without the field and
  resets a saved true → refresh clients after deploy (no field-merge built for one bool).
  upstreamable: **yes** (both — #193 is incomplete upstream) · status: **superseded by
  `keyboard-guard-mode` below** — that branch carries the same two fixes plus the mode field, so
  the bool is never filed on its own · upstream_pr: — · upstream_issue: —
- **Mobile keyboard: guard mode (4 modes) + app-owned dismiss button** (2026-07-24; merged into
  `custom` at `49dc1f0e`; PR branch `feature/keyboard-guard-mode` off `upstream/dev`) — supersedes
  the `33c4b749` bool above and subsumes both of its upstream bug fixes.
  1. `keyboard_keep_on_scroll` (frontend-only on upstream: declared in `useSettings.ts` but absent
     from the Rust `Settings` struct, so the typed `Json<Settings>` PUT dropped it) is replaced by
     a real backend field `keyboard_guard_mode`: enum `off | collapse_only | open_only | both`,
     hand-written `Deserialize` folding any unknown/missing value to `off`, settings v7 migration
     mapping the legacy `true` → `collapse_only`. The legacy bool stays as a
     `deserialize_with = tolerant_legacy_bool, skip_serializing` input so v6 configs and older
     clients migrate instead of erroring; it is never written back.
  2. The two guards are now independent: collapse-guard (only the toolbar ▼ closes the keyboard)
     and open-guard (a plain terminal tap no longer auto-opens it; only the floating icon does).
     `off` is the default, so a fresh install behaves exactly as upstream today.
  3. Includes the `33c4b749` duplicate `terminal-scroll` listener deletion.
  4. App-owned dismiss button in the toolbar. iOS's own dismiss entry points cannot be relied on:
     the input-accessory bar varies per IME and Safari's keyboard-down button disappears in
     standalone PWA mode, and a page can neither detect nor drive either one.
  Tests: Rust settings migration/tolerance/round-trip (`src/settings/tests.rs`), frontend
  predicates + wiring + off-mode lock (`keyboardGuardMode.test.ts`, `MobileKeyboard.pin.test.ts`,
  `AppPaneClose.test.ts`). All four upstream CI gates run locally on the rebased branch.
  Reviewer risk to watch: the retained legacy bool is dead weight for a user who only ever ran
  upstream (the field was never persisted there) — drop it if the maintainer objects; fork users
  need it.
  Also in this branch (added after real-device QA passed): sticky-typing mode, squashed as
  `b52bb50f` on the PR branch (custom lineage `9ca9978c..e5652f57`). While the user types in the
  app's own textarea it disables every `.xterm-helper-textarea` so a terminal tap or scroll cannot
  hand focus to the input-suppressing helper and close the iOS system keyboard. Reviewer risk to
  watch: disabling all xterm helper textareas is more opinionated than the mode field.
  upstreamable: **yes** · status: **candidate** · upstream_pr: https://github.com/xichan96/dinotty/pull/215 · upstream_issue: —
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
  Ops (local-only, NOT upstreamable): `scripts/dinotty-ops.sh` gained
  `assert_not_self_hosted()` — an ancestor process-walk refusing to rebuild the instance whose app
  bundle is hosting the invoking shell. Guard is FAIL-CLOSED: an unresolvable exec path, an
  unresolvable parent PID, or an over-long ancestor chain all refuse rather than proceed, since none of
  them can PROVE the shell is not self-hosted. Escape hatch `DINOTTY_SKIP_SELFHOST_GUARD=1`. This is
  the only copy of the guard; the hand-synced sibling in `scripts/deploy-live.sh` went away with that
  script (retired `2026-07-28`).
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
  (timeout parser + tests) / `3283d8fb` (deployment doc). Detail below.

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
  `dinotty rebuild all`. Latest pre-align snapshots: `backup/custom-pre-6ba-align-260713`,
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
  and `dinotty-ops.sh` / `build.sh` read the same base config; prod and test get distinct DRs
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
  - **S2 (upstreamable, subsequently replaced)** `src/session/mod.rs`: the detached-session reaper
    hard-coded a 5-min kill, which reaped live sessions that briefly lost their WebSocket (sleep /
    network drop). PR #154 replaced that with a configurable 90-min default. Dual-dig
    confirmed the 5-min reaper — NOT the env leak — is the tab-kill cause (dinotty has zero code reading
    those env vars to kill anything; inner-`claude` exit leaves the shell alive so it does not close the
    tab). Commit `41b4c071`. **terminal_exit_regression upstream-issue decision (2026-07-18): DROPPED —
    the 90-min-default reap fix is already in base via #154, so there is nothing pending upstream and no
    separate GitHub issue was warranted at that time. The timeout mechanism was later superseded by
    reference-based liveness. Exit-condition met; off-board.**
  - **S3 (fork-local)** `scripts/deploy-live.sh`: relaunch unsets the 3 vars via `/usr/bin/env -u` —
    source-side companion to the pty backstop. Commit `1ad3240e`.
    Extended `2026-08-14` in the current `scripts/dinotty-ops.sh` relaunch boundary: Codex tool shells
    intentionally carry `NO_COLOR=1`, and `/usr/bin/open` had inherited it into rebuilt Dinotty apps,
    making Claude and Starship monochrome even though Dinotty correctly supplies `TERM=xterm-256color`
    to PTYs. Relaunch now also unsets only `NO_COLOR`; normal app launches and user-owned terminal
    environments retain their explicit setting. `scripts/test-dinotty-ops-relaunch-env.sh` guards all
    four relaunch exclusions without launching or replacing an app.
    Extended `2026-08-18` at the PTY spawn boundary: a direct `/usr/bin/open` from an agent shell can bypass
    `relaunch_instance`, so terminal children now remove `NO_COLOR` when the inherited environment also has a
    session-scoped Codex (`CODEX_SESSION_ID`/`CODEX_THREAD_ID`/tool markers) or Claude marker. `NO_COLOR` alone,
    or alongside generic `CODEX_HOME`, is preserved. The policy has a pure Rust regression test and applies to
    both shell and direct-argv terminal creation.
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

## Session-owned input dispatcher (T260723-015)

- **Server fix, commit 1/3 (2026-07-23)** — replaces the connection-owned, last-attacher-wins
  input channel with one dispatcher owned by each `Session`. Tauri, terminal WebSocket, sync-WS
  hardware-keyboard input, and HTTP `/api/input` channel-class entrances enqueue through that dispatcher; direct synchronous REST,
  agent, and MCP writers deliberately retain their written-not-queued contract. Local write errors
  drop the failed batch without retry and canonically close after 3 failures in 10 seconds; a dead
  SSH command channel closes immediately. Attach/detach no longer replaces or aborts input ownership.
  The change is upstreamable in principle but **not a standalone upstream PR as implemented**:
  `CloseReason::InputFailure` and generation-safe `close_session_for_session` depend on fork-side
  lifecycle machinery absent upstream, so an upstream proposal must adapt that failure path first.
  Verified with server state/churn/detach/failure/SSH/HTTP tests plus server and desktop cargo checks.
- **Frontend visibility, commit 2/3 (2026-07-23)** — warns in the console when a Tauri `pty_write`
  rejection would otherwise be swallowed. It deliberately does not add a `channel` reconnect trigger:
  the native transport has no reconnect scheduler, and dispatcher failure now closes the session through
  the existing `exited` flow.
- **Native escape hatch, commit 3/3 (2026-07-23)** — installs Tauri's default macOS application
  menubar, preserving its standard Edit/clipboard role items, and appends `Reload UI` with reserved
  `CmdOrCtrl+R` into the existing View submenu. Its app-wide native menu handler reloads the main
  `WebviewWindow` without depending on DOM keyboard or IME event delivery; the tray menu remains separate.

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
**#224** filed 2026-07-28 against `dev` @ `e398811c` — a trackpad click on a tab can leave the app
stuck in tab-drag state, because `mouseup` is the ONLY terminator in `useTabDrag.ts` (no `e.buttons`
check in `onPointerMove`, no `pointercancel`/`blur`/`visibilitychange`); `PaneHeader.vue` shares the
gap and additionally leaks its full-viewport `z-index:9999` grabbing overlay, which swallows all
clicks. NOT reproduced on demand — this is a user observation on the packaged macOS app plus a code
reading, and the issue text says so explicitly. Clean-upstream repro was satisfied structurally
instead: `useTabDrag.ts` / `TabBar.vue` / `PaneHeader.vue` are byte-identical to `upstream/dev`, so
the defect is unambiguously upstream's; what stays unverified is the trigger for the lost `mouseup`.
Same official-dependency class as the three above: no board token, exit = upstream ships a fix. We
could carry a local one-line fix (`e.buttons === 0` → cancel) if the wait becomes painful; not done
because T260727-001 scoped this defect to report-only by user decision.
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
> (`scripts/dinotty-ops.sh rebuild-test`) and stop there. Do NOT run
> `dinotty-ops.sh rebuild-prod` — it QUITs the 8999 app, and the user is actively working
> inside that instance; rebuilding it interrupts their live session. Touch 8999 only when the
> user explicitly asks in that turn. This SUPERSEDES the earlier "DEPLOY 做全 / never prod-only"
> rule (2026-07-17) until the user says prod is free again.

Toolchain: pnpm (corepack), rustup stable, `cargo install tauri-cli --version "^2"`.

Upstream ships two convenience build scripts (dinotty-specific — NOT wired into the core rebuild skills; fork-cwd use only):
- `./scripts/build.sh` (no arg / `native`) → builds frontend + `cargo build --release -p dinotty-server` → the SERVER binary at `dist/dinotty-server-<host>` (web/embedded surface; runtime `./xterm-server`, port 8999).
- `./scripts/build.sh desktop` → builds frontend + `cargo tauri build` → the DESKTOP Tauri `.app`.
- Other subcommands: `cross` / `all` / `frontend` / `list` / `clean`.
- GOTCHA: `native`/`desktop`/`cross` call `git_version()` (needs a `v*` git TAG to exist) then `sync_version()`, which sed-REWRITES the version string in tracked `Cargo.toml`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`. So build.sh mutates tracked files and fails with no release tag. Our canonical macOS reinstall stays `dinotty rebuild all` (config-safe atomic install + cache refresh, no version rewrite); reach for `build.sh` only for a raw build artifact when the tag/version-sync behavior is acceptable.
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
- **Reinstall + cache refresh is now `dinotty rebuild all`** (build→quit→staged atomic install→
  cache clear→relaunch). It clears ONLY the asset cache of each instance it rebuilds
  (`~/Library/Caches/com.dinotty.terminal`, plus `~/Library/Caches/com.dinotty.terminal.test` when
  the run includes 8998) and DELIBERATELY does NOT touch
  `~/Library/WebKit/com.dinotty.terminal` (localStorage/IndexedDB — the
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

## P24 Chrome-iOS viewport/render/replay follow-up (2026-08-11, geometry superseded by P25)

The 14:19 device recording showed P23 had removed the delayed input burst, but the closed Chrome
installed App still left a bottom strip, iOS produced stale white cells near wrapped line ends, and a
refresh could fit the terminal before its replay bytes finished. The no-display-mode fallback is now
limited to iPhone/iPod `CriOS`, coarse phone layout, scale 1, zero top offset and a bottom-only inset
no larger than 120px; ordinary browser, zoom/pan, desktop, Android and iPad keep their prior frame.
P24 temporarily reserved a 60px native input-assistant clearance in the fixed-toolbar bottom and
`#app-root` height; the 15:41 real-device recording disproved that model and P25 removes it in full.
iPhone skips optional WebGL and uses xterm 5.5's built-in DOM
renderer; other clients retain WebGL. Direct and settle fits accrue one pending debt while `_writing`,
released through the existing rAF refit after the write queue drains; reconnect/destroy clear it.

RED failed the four intended assertions; focused GREEN is 37/37, expanded input/viewport proof 65/65,
and full frontend is 114 files / 1152 tests. Production build, target ESLint (0 errors) and diff check
pass. Complete Codex+Claude Sonnet 5 code audit is FULL/PASS with no correction-worthy finding.
Test-only rebuild serves `index-ag41PZkU.js`; direct local/served SHA-256 is
`5ac305b4c436a5b822fd6a4917eebf3758abe6f7fdecd6d219d37d5516194a6c`. Chrome 393x852 proved
ordinary-mobile WebGL and iPhone-simulated DOM fallback. Three reloads were internally stable in the
desktop compositor, but that simulation cannot reproduce iOS Chrome App fixed-element composition or
prove the real bottom gap. Native Test PID 74504 recovered one transient post-install white first frame with
`Cmd+R`; production stayed PID 2526 on `index-BGrF3H7F.js`. Actual installed-iPhone viewport, native
candidate selection and stale-cell behavior remained the P24 READY gate. P25 supersedes the failed
geometry portion; the input/write-fit/DOM-renderer portions remain active.

## P25 real-iPhone geometry correction (2026-08-11)

The 15:41 device recording proved two P24 geometry mistakes: the 60px assistant constant was counted
once above and once below the shortcut toolbar even though iOS had already positioned the native
assistant, and expanding only `#app-root` could not move `#system-mobile-kb`, which is independently
fixed. P25 deletes `IPHONE_INPUT_ASSISTANT_HEIGHT`, its computed/watch/CSS publication/cleanup and the
App height subtraction. Open-IME toolbar bottom is now exactly measured keyboard occlusion.

Closed installed iPhone geometry derives one transient CSS-pixel shell difference from the bounded
`(0,120]` visual/layout-to-screen bottom gap at scale 1 and top offset 0. That identical value extends
`--vv-height` and offsets the fixed toolbar through `--system-shell-bottom-gap`; it becomes zero when
the keyboard opens, on zoom/pan, reset and dispose. Screen-derived extension is iPhone-only; ordinary
browser, desktop install, Android/iPad and a 121px gap keep their previous frame. The complete audit
found declared-standalone zoom/pan initially bypassed this stability gate; one shared predicate and a
RED regression closed it. No setting, schema, dependency, observer or guessed replacement constant
was added. The moving single light cell is the synchronized xterm block cursor; cursor style was not
overridden.

Proof before deployment: intended RED 6 failures plus one audit-correction RED; viewport 21/21,
expanded integration 72/72, full frontend 114 files / 1156 tests, production build/typecheck, target
ESLint (0 errors), Prettier and diff integrity pass. Complete coding review closed `SOLO/PASS` after
correction-only mini-review; the fixed Claude lane and required retries returned expired-OAuth 401.
Only 8998 may be rebuilt. Real iPhone closed/open geometry remains the READY gate; desktop Chrome is
not accepted as physical-height evidence.

Deployment was initially blocked before installation by the machine-local signing identity, not by
the P25 code or bundle. `./scripts/dinotty rebuild test --fg` completed all 1156 frontend tests and
the frontend production build, then `codesign` failed on the Test executable with
`errSecInternalComponent`; the script explicitly left installed apps untouched. A disposable
same-binary probe proved ad-hoc signing and verification pass while `Dinotty Local Signing` alone
fails. Keychain Access shows the login keychain unlocked and the certificate expanded to an attached
private key. A subsequent read-only inspection disproved the initial ACL hypothesis: the private key
already selects “allow all applications”, with no password-per-use requirement. Unified logs instead
show `CSSMERR_CSP_OPERATION_AUTH_DENIED` / `errSecAuthFailed` at `SecKeyCreateSignature`; running the
same probe through the GUI user's `launchctl asuser` session still fails. The remaining blocker is
login-keychain/private-key authentication state, not a missing `codesign` allow-list entry. Do not
change that ACL, replace the identity with ad-hoc signing or reinstall a failed artifact. Live Test
therefore intentionally remains PID 74504 on `index-ag41PZkU.js`; production remains PID 2526 on
`index-BGrF3H7F.js`. The user re-authenticated the login keychain; a fresh identity-sign probe then
passed. The complete 8998-only rebuild passed 1156/1156 tests, built and signed both Test bundles,
installed `/Applications/Dinotty Test.app`, and launched Test PID 8491. Live 8998 and local dist both
serve `index-9uzZCiMF.js`, with identical SHA-256
`2479d9778458399de1d38431c288cf213dd2f74a9e7d7eb9b24543a3f48d324b`; deep strict codesign
verification passes. Production remains on `index-BGrF3H7F.js` (PID 1937 at final preflight; it had
already restarted before the Test rebuild). Real-iPhone closed/open geometry and native input remain
the only P25 READY gate.

## P26 real-device correction: measured frame only, explicit IME-height refresh and wrap cursor (2026-08-11)

The 16:49 real-iPhone recording and user ownership correction supersede P25's closed-IME shell-fill
model. The strip below Chrome's installed-App viewport belongs to the host App; moving Dinotty's
toolbar into it obscures controls. P26 therefore deletes the complete screen-derived
`--system-shell-bottom-gap` path and publishes only measured `visualViewport.offsetTop` and
`visualViewport.height`. The fixed shortcut toolbar again ends at its own viewport edge, without a
negative bottom offset or an iPhone/standalone/screen-height exception.

The remaining status-to-toolbar gap and refresh/IME-switch overlap shared one stale measurement:
the toolbar's closed state includes bottom safe-area padding, while `.ime-open` uses a compact 5px
bottom; `--mkb-height` was not republished when only `imeOpen` changed. The existing focus-intent
contract remains the single state owner, and the toolbar now schedules `updateHeight` whenever
`actionOpen` or `imeOpen` changes. No second keyboard-state machine, observer or guessed device
constant was added.

The last-cell white rectangle is xterm's configured block cursor clamped onto the final DOM cell
while the logical cursor is wrap-pending (`cursorX >= cols`), especially visible beside Chinese full-
width text and punctuation. P26 keeps the full PTY width and content flow. On iPhone system-input
mode only, a public `onCursorMove` listener temporarily renders that wrap-pending block cursor as a
bar, restoring the configured block immediately when it leaves the boundary. Built-in and non-block
cursor styles are untouched; focus/blur/device-text transitions resynchronize the presentation.

Proof before deployment: intended RED was exactly 3 failures; focused tests pass 51/51, expanded
mobile-input tests 152/152, and the complete frontend passes 114 files / 1150 tests. Production
typecheck/build, target ESLint (0 errors), Prettier and `git diff --check` pass. The complete Codex +
exact Claude Sonnet 5 coding audit is `FULL/PASS` with no required correction. One non-blocking note
remains: an idle orientation resize exactly at wrap-pending may retain the prior cursor presentation
until the next cursor movement; it cannot alter PTY data, columns or layout.

The 8998-only Test rebuild passed all 1150 tests, built and signed the native bundles, installed and
launched `/Applications/Dinotty Test.app`. Its helper's final glob again selected an unrelated small
Monaco `index-*` chunk and reported a false fingerprint mismatch; exact `index.html` script-source
verification proves live/local entry `index-D7EXBmZv.js`, with byte-identical SHA-256
`7aff077d87043eb9756db98481fc16294f70bae80ff5d3f2b2a857a04f58e8bd`. Deep strict codesign passes.
Live Test is PID 47879. Production 8999 remains untouched at PID 1937 / `index-BGrF3H7F.js`.
Real-iPhone repeated refresh/IME-switch geometry and right-edge Chinese input remain the P26 READY
gate; code is frozen during that verification.

## P27 real-device correction: stable mobile cursor and single measured geometry owner (2026-08-11)

The 17:42 real-iPhone recording rejects P26's wrap-boundary cursor state machine and shows that
refresh, IME switching or vertical touch interaction can still leave stale layout geometry. P27
removes `_wrapPendingCursorOverride` completely. On iPhone system-input mode, a configured block
cursor now has one stable runtime presentation (`bar`) regardless of terminal column; all other
platforms, modes and configured cursor styles retain their existing presentation. A cursor-move
listener only resynchronizes that platform/mode/style decision and owns no boundary state.

`useViewportResize` is again the only viewport/keyboard geometry owner. Toolbar occlusion now comes
solely from the currently measured system-keyboard height, not terminal focus. Bare `window.blur` no
longer clears an otherwise valid open-keyboard measurement; page hide and hidden visibility still
reset it, while focus/pageshow revalidate. Dead `--kb-open`, `imeOccluding`, `kbVisible` and
`terminalImeFocused` geometry channels are deleted. System-mode ResizeObserver bursts use one local
100ms quiet-period refit; switching to another mode cancels any pending delayed refit. When keyboard
collapse guard is active, cancelable vertical terminal touch moves in system-input mode are consumed
at the event boundary so iOS cannot interactively drag the viewport/keyboard; builtin mode and an
open-only guard keep their prior behavior.

Proof: intended RED reproduced four failures and the audit-correction RED reproduced three more.
Focused GREEN is 36/36; the expanded mobile matrix is 187/187; the complete frontend passes 115
files / 1152 tests and the production build. Target ESLint is clean (the repository-wide lint still
has four pre-existing errors in unchanged files). `cargo fmt --all -- --check` and the Rust workspace
tests pass: desktop 12, server library 536 with 10 ignored, terminal regression 1 and login 5. The
complete coding audit initially found stale blur/timer/cursor-mode paths plus dead geometry state;
all were corrected and the correction-only mini-review passes.

Only Test was redeployed. `/Applications/Dinotty Test.app` passes deep strict signature verification;
8998 runs PID 33412 and serves `index-D7A7r3WL.js`, byte-identical to local dist at SHA-256
`118db584a36722b2734514dbaeddaf3a433f183b34c2b3492041f9fb32121728`. Production 8999 remains
PID 1937 on `index-BGrF3H7F.js`. READY still requires the installed iPhone to prove repeated
refresh/IME-switch and vertical-drag stability plus continuous Chinese/full-width input without a
retained white cell; automated Chrome emulation cannot close that device-only gate.

## P28 real-device correction: one layout frame and pre-open DOM cursor style (2026-08-11)

The 18:43 installed-iPhone recording disproves P27's geometry and cursor closure. Several full-cell
white blocks remain at prior right-edge endpoints while a distinct thin live cursor moves, proving a
stale xterm DOM block-cursor paint path rather than one current wrap cursor. P28 resolves configured
block to both active and inactive bar styles before xterm is constructed/opened on iPhone system-input
mode. Later mode/config changes use the same resolver without an intermediate block write. A narrowly
scoped high-specificity fallback neutralizes any stale block DOM node on that surface without hiding
underline/bar inactive cursors or changing another platform/input mode.

The recording also proves the app/status frame and fixed shortcut toolbar were independently movable.
P28 removes that two-owner geometry. While the system toolbar is visible, `#app-root` spans the measured
visual viewport and the toolbar is its relative, non-shrinking normal-flow flex child. The toolbar no
longer observes/publishes `--mkb-height`, and `useViewportResize` no longer computes or publishes a
separate toolbar-bottom offset. StatusBar uses horizontal-only touch action and contained overscroll,
so a vertical gesture cannot pull the app/status region away from its toolbar. Built-in Dinotty
keyboard sizing remains unchanged.

Proof: focused 56/56; full frontend 115 files / 1156 tests; typecheck/build; target lint with zero
errors; `git diff --check`; Rust format; desktop 12; serialized server 536 with 10 ignored; terminal
regression 1; login 5. The complete Codex+Claude audit found a missing App test mock and overly broad
fallback selector; both were corrected and correction-only mini-review passes. Test-only deployment
runs PID 10108 and serves `index-CuHTk0zl.js`, byte-identical to local dist at SHA-256
`baa1860bb42043fa73d0cad4c8765283e48698ee300f0300ddbaa04f393f40e8`; the app passes deep strict
signature verification. The helper's final mismatch is a false positive from selecting auxiliary
`index-BLz_qtUF.js`; both served and local HTML select the byte-matched main entry. Production remains
PID 1937 / `index-BGrF3H7F.js`. READY requires the exact real-iPhone refresh, WeChat IME, edge input
and StatusBar drag acceptance run.

## P29 closed-IME bottom parity and one-column iPhone reserve (2026-08-11)

The post-P28 iPhone comparison proved that the normal-flow system toolbar still ended at a closed
`visualViewport` edge above the usable lower edge reached by Dinotty keyboard mode. P29 keeps P28's
single flex owner: only while the iPhone system toolbar is visible and the native IME is closed,
`#app-root` stretches from its existing top to layout `bottom: 0` with automatic height. Opening the
IME removes that class and retains the measured visual-viewport frame. No screen-height estimate,
safe-area constant, second fixed toolbar or replacement viewport owner was added.

The same device evidence showed that leaving one terminal cell unused prevents the retained white
cell at Chinese/full-width wrap. All local FitAddon paths now share `_fitToWrapper()`, based on public
`proposeDimensions()`. It reserves exactly one column only for iPhone system-input mode (with the
existing two-column floor), commits the dimensions through xterm `resize()`, and leaves resize and
snapshot wire messages sourced from committed `xterm.cols/rows`. Peer-follow resize is unchanged, so
an already-reserved remote size is not decremented twice. A real synchronized input-mode change
immediately refits iPhone terminals; desktop, Android, iPad and Dinotty keyboard mode keep full width.

Proof before deployment: intended RED 6 failures; focused GREEN 48/48; expanded mobile matrix
154/154; complete frontend 115 files / 1163 tests; typecheck, production build, Prettier,
`git diff --check`, target ESLint with zero errors, Rust format, desktop 12, serialized server 536
(10 ignored), terminal regression 1 and login 5 all pass. Complete Codex + exact Claude Sonnet 5
audit initially found stale FitAddon test spies; the correction batch uses real
`proposeDimensions()`/`resize()` proof and correction-only mini-review passes.

Only Test was redeployed. `/Applications/Dinotty Test.app` passes deep strict signature verification;
8998 runs PID 51504 and serves `index-IxDZoz_7.js`, byte-identical to local dist at SHA-256
`5d47aeba260fe998ed3b33455626ba2b59c676dea6d00b9ac07c652f5d8db63a`. The helper's status glob
still reports a false mismatch because it chooses auxiliary `index-CLYX_6ME.js`; both served and local
HTML select the matching main entry. Production 8999 remains untouched at PID 1937 /
`index-BGrF3H7F.js`.

Chrome iPhone/CriOS emulation at 390x844 proved the closed toolbar bottom equals the viewport bottom
(844px) and its top equals StatusBar bottom (745px) through three reload cycles, with no Dinotty-origin
console error. The native Test app opens successfully. READY still requires the installed iPhone to
prove physical bottom parity, open-WeChat-IME adjacency, no white cell during right-edge Chinese/full-
width input, mode-switch refit, and three refresh/IME/StatusBar-drag cycles.

## P30 deletion-first 8998/8999 xterm-path restoration (2026-08-11, verification pending)

The user's 20:42/20:48 resize recordings disprove P29's one-column reserve and show the light cell on
desktop, where that iPhone-only branch is inactive. Direct served-bundle comparison found that 8999
keeps stock `FitAddon.fit()`, configured cursor behavior and WebGL-with-DOM-fallback, while 8998 had
accumulated a local `proposeDimensions()`/manual-resize helper, iPhone renderer exclusion, cursor-mode
listener, inactive-cursor override and CSS cursor mask. Checked-in FitAddon source confirms stock
`fit()` already clears its renderer before a changed resize.

P30 deletes those P26-P29 white-cell workarounds instead of stacking another offset: all guarded local
fit sites call `fitAddon.fit()` and read committed `xterm.cols/rows`; no client loses a column; iPhone
again attempts WebGL; xterm owns active/inactive cursor rendering; and input-mode changes no longer
force-fit solely for the removed reserve. Existing IME 229/composition ordering, replay/write settle
guards, peer resize, viewport ownership, toolbar layout and the separate closed-IME bottom hypothesis
remain unchanged.

Executable RED was 24 failures. Focused GREEN is 45/45 and the expanded input/viewport matrix is
145/145. The complete independent Codex + exact Claude Sonnet 5 coding audit is `FULL/PASS` with no
correction-worthy finding. Full frontend passes 115 files / 1160 tests; typecheck/production build,
P30-target ESLint (0 errors), target Prettier and diff integrity pass. Repository-wide Prettier still
reports 128 pre-existing unformatted files and was not bulk-applied.

Only Test was rebuilt. `/Applications/Dinotty Test.app` passes deep strict signature verification and
runs PID 213; served/local entry `index-DI0_MkkD.js` is byte-identical at SHA-256
`e7c6f5eaa1b2003246918b7eec0e7a467f1c60f00d3d7324f7357eb9658caae2`. Production remains untouched
at PID 1937 / `index-BGrF3H7F.js`. Chrome ran the same 24-width continuous resize series against 8998
and 8999, plus a focused-terminal 8998 series. Both retain a natural sub-cell right margin and 8998
shows only the current cursor, with no light cell retained at an old edge. Temporary device metrics
were cleared and QA tabs finalized. Chrome is not evidence for the iPhone standalone host-owned
bottom region; real-iPhone edge input and bottom/IME geometry remain the READY gate.

## P31 failed-device closure and rollback handoff (2026-08-11)

Physical-iPhone QA rejected P30: the right-edge white cell and system-input height/overlap both remain.
The P30 Chrome result is therefore only desktop renderer evidence and never product acceptance. No
new correction is stacked. All direct white-cell workarounds remain deleted, and P31 additionally
removes P29's closed-native-IME root stretch in full: `iphone-system-input`, `system-ime-closed`, the
`bottom: 0; height: auto` selector, App-level iPhone/systemKeyboardOpen layout reads, and their dedicated
test mocks.

Shared mechanisms with independent behavior are intentionally retained and explicitly handed off for
Claude review: keyboard-open state still owns the close callback; the normal-flow dock still prevents
two independently positioned toolbar boxes; iPhone ResizeObserver coalescing and guarded vertical
touch still own resize/gesture timing; pending write/composition refits still own input/replay ordering.
Their retention does not mean they solve the device failures. Removing any of them changes another
tested behavior and requires a replacement design.

Proof of the rollback baseline: intended RED 1; focused GREEN 58/58; full frontend 115 files / 1159
tests; typecheck/build, target format/diff and target lint (0 errors) pass. Complete Codex + exact
Claude Sonnet 5 code audit is `FULL/PASS`. Test-only rebuild runs PID 13045 on local/live
`index-D7XFM3so.js`, SHA-256
`c823f8660fc93f183c0a7315069bb7e12c0cb2a8e7a3dbc1c33fedd3a6a45a05`, with a valid deep signature.
Production remains PID 1937 / `index-BGrF3H7F.js`. Canonical Claude intake is
`docs/task-files/26/08/260811_T260811-017_mobile-ime-white-cell-geometry_handoff-pretask.md` in the
managed project. The 8998 artifact is a rollback baseline, not READY.

The shared board intake committed as `bi-273efa15fda60dd4`; token `KB08` is free and links the
canonical PreTask as both `pretask` and `handoff`. Claude resumes it with the whole message
`handoff KB08`.

## P32 KB09 aliases, click-boundary touch-open and mobile viewport closure (2026-08-13, QA pending)

KB09 now keeps modifier sending by the existing ctrl/shift/alt/meta family while recording the exact
special-key instance that owns each active family. Cmd/Win and Alt/Opt therefore share combination
semantics but only the button actually pressed renders active. In system-input mode with keyboard
protection off, terminal touchstart arms one open but keeps xterm's helper unfocusable; touchend only
classifies the gesture. The same gesture's compatibility click authorizes the single focus only when
it still resolves to the exact originating terminal. If reflow retargets the sequence, capture blocks
both `mousedown` (where keyboard shortcuts execute) and `click` (where status controls execute), so
the old touch cannot activate a newly moved CPU/status/shortcut/keyboard control. Scroll, long press,
cancellation and link activation reject the open. A new real touch, mode change, timeout or unmount
releases the helper lock. The builtin Dinotty textarea separately resamples its local visual viewport
on the next frame and existing 320ms settle boundary so its input remains visible above a late-opening
IME.

The earlier shared-viewport close-delay experiment was disproved by two physical-iPhone recordings:
the bounce was coordinate-dependent and the same gesture activated controls that moved under the
finger. That experiment and its tests were deleted; shared `useViewportResize`, height formulas,
toolbar CSS, pan release and input-method switching remain at the trusted baseline. Final cleanup also
fixes ownership of the temporary typing lock so a system-touch cleanup cannot release the builtin
keyboard's active typing lock.

To reduce the remaining visible yank without disturbing the trusted geometry, iPhone system-input mode
now skips only App's duplicate 100/280ms terminal fits; the terminal ResizeObserver fit and existing
320ms viewport settlement/pan-release remain intact. LoginPage and SetupPage reuse the already-published
`--vv-height` instead of fixed `100dvh`, keeping their centered forms inside the keyboard-visible frame
without another listener or height owner.

Proof before redeployment: focused login/viewport/App GREEN is 63/63 and App pan-lock/system-keyboard
GREEN is 44/44. The later WeChat auto-pair failures added one platform-neutral 229 edit owner: value,
`selectionStart` and `selectionEnd` are diffed in Unicode code points, the changed span is applied at
the old PTY cursor, and pure caret/selection changes emit one normal CSI or application SS3 move. This
The original follow-up incorrectly modeled the physical failure as skipping an existing closer. Real-device
QA showed a new closer was inserted while the textarea caret remained before/on it, yielding the exact bad
batch `right + closer + left`. The corrected owner detects only that baseline-restoring stale-caret shape,
normalizes the textarea after the new data, and emits `right + closer` without the trailing left move.
Parametrized integration runs the corrected chain for iOS system input, macOS, Windows and Linux;
selected-closer replacement, missing keyup, Emoji offsets and genuine composition handoff are covered.
Active 229 exclusively owns the diff, while a real integration test retains the older Tauri Shift-symbol
rescue only when no 229 event appears, preventing both duplicate sends and accidental removal of the
fallback. Obsolete caret-blind and unused printable helpers are deleted. Complete audit plus the
correction-only mini-review close with no remaining findings.

Complete frontend is 119 files / 1227 tests; `vue-tsc -b`, production build, task-path ESLint (0
errors), Prettier and diff integrity pass. Chrome 390×844 loaded the installed main entry, measured
the root at exactly 0..844 with the status bar contacting its bottom, and reported no Dinotty-origin
console errors. Physical-iPhone WeChat paired punctuation, ordinary composition, reduced-yank,
two-IME layout and Login/Setup visibility remain the READY gate; 8999 must stay untouched.

The previous Test-only build at PID 78373 / `index-CKAN7nxe.js` was physically rejected and is not a final
artifact. The corrected 1227-test build runs PID 88814 on 8998 with byte-verified `index-BLNxm22D.js`,
SHA-256 `eaa8ffedc773640f4453d3743d255d5046f44edf44c6b4e48969ca63165e5a5d`, and a valid deep signature.
Production 8999 remains PID 71653 / `index-B3EP-Uh2.js` with its preflight hash and was not rebuilt.
Canonical evidence is
`dinotty_mods/docs/task-files/26/08/260812_T260812-014_verification.md`.
