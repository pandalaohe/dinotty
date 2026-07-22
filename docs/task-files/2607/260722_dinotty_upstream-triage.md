# 260722 dinotty upstream-triage — run 2 (post-washboard, first run of full-lifecycle skill)

- mode: merge · skill: upstream-update @ core b7378cee0 · date: 2026-07-22
- base (merge-base custom/upstream): `83f1c670` (= main tip) · upstream tip: `f958848c` (4 new commits)
- gh: AVAILABLE (account pandalaohe) — all reality-checks at **verified** level; write-phase permitted.

## Preflight (Phase A)

| Check | Result |
|---|---|
| A0 main-FF | PASS (`upstream/dev..main` empty); `$UPSTREAM_DEFAULT`=dev |
| A1 upstream remote | present |
| A2 worktree | untracked only (`artifacts/`, `share/`) → report, no block; no incoming-path collision |
| A3 ledger | v1-family prose ledger (998L) → Phase F one-time v2 migration fires |
| A4 rerere | UNSET → user must pick `enable` / `continue without rerere` |
| A5 topology | after backup-prefix exclusion: `custom` + `fix/tab-close-null-successor` → D13 (resolution: custom is the mods branch; fix branch is a GC candidate this run) |
| A6 backup | planned tags `pre-update-main-<ts>` + `pre-update-custom-<ts>` (no backup branch) |
| A7 submodule/LFS | none |

## Upstream delta (Phase B)

4 commits, 39 files: `f958848c` (#204 — OUR PR), `2eebeb32` + `0f3629bf` + `21de3b24` (/ws/sync refactor family).

## Overlap + convergence

- Layer 1: exactly 2 files — `useTabLifecycle.ts`, `AppPaneClose.test.ts` (#204 files).
- Layer 2 symbols (fork symbols in upstream diff): 0 hits. Layer 3 renames: n/a.
- B4.5 blob parity: both #204 files identical (custom OID == upstream/dev OID). **verified MERGED + parity → LOW auto-flip.**

## Per-mod verdicts (Phase C)

| mod_id (minted preview) | files | verdict | risk | rationale |
|---|---|---|---|---|
| `1dff1a86-null-successor-fallback` | useTabLifecycle.ts + AppPaneClose.test.ts | ADOPT (flip) | LOW auto | #204 verified MERGED (2026-07-22T08:05Z, mergeCommit f958848c) + blob parity → absorption=absorbed, lifecycle=merged-upstream |
| `mocha-theme` | themes.ts, ThemeManager.vue, useI18n.ts | KEEP | LOW auto | 3-layer empty; fork identity, never upstreamed |
| `signing-identity` | src-tauri/tauri.conf.json | KEEP | LOW auto | 3-layer empty; machine-local |
| `deploy-scripts` | dinotty-ops.sh, deploy-live.sh, dinotty launcher | KEEP | LOW auto | 3-layer empty; fork ops |
| `fork-meta` | .gitignore, .upstream-update.json, LOCAL_MODS.md, docs/task-files/ | KEEP | LOW auto | 3-layer empty |

No MEDIUM/HIGH/UNCERTAIN rows. Predicted merge conflicts: **zero** (parity files resolve identical; 37 upstream-only files untouched by fork; 23 fork-only files untouched by upstream).

## GitHub reality-check (B3.5, all verified)

| Ref | Ledger says | API verified | Drift action (Phase F) |
|---|---|---|---|
| #204 | OPEN | **MERGED** 07-22 | flip → merged-upstream / absorbed |
| #203 | OPEN | **CLOSED unmerged** | flip → closed-superseded (upstream `b6521103` + our #204 cover it) |
| #190 | prose "PR open" vs table "merged" | MERGED 07-21 | resolve contradiction → merged |
| #191 | prose "PR open" vs table "merged" | MERGED 07-21 | resolve contradiction → merged |
| #194 | prose "PR open" vs table "merged" | MERGED 07-21 | resolve contradiction → merged |
| #180 | entry "#180 (OPEN)" vs table "merged" | MERGED 07-19 | resolve stale ref → merged |

Volatile API state recorded in state.json + this receipt only, not in ledger rows.

## GC plan (Phase J preview) — plan-hash-bound

Candidate: `fix/tab-close-null-successor` @ `b00b2bb3` (local + origin)
1. verified MERGED ✓ (#204, this run) 2. head owner = pandalaohe = origin fork ✓ 3. not protected/never_gc/backup ✓ 4. headRefOid == local == origin OID ✓ 5. no other OPEN PR shares head ✓ (`gh api pulls?head=` → 0) 6. dual push confirmed — run-time 7. plan hash unchanged — run-time.
Order: remote first (old-OID lease) → local `git branch -d`.
Non-candidates: `backup/*` (managed prefix), `custom`/`main` (never_gc). Note: PR #203's branch `fix/tab-close-workspace-hop` no longer exists on origin (already deleted).

PLAN_HASH: sha256 over (GC candidate list + deployment steps) — computed at Phase P presentation, verified at Phase J/Q.

## v1→v2 migration plan (Phase F)

- Build Contribution Index (8-col) from snapshot + prose rows; contradictions resolved per verified table above.
- mod_id minting: feature row from commit short hash (`1dff1a86`), meta rows from stable slugs (shared re-apply commits `4d3367c5`/`4e4715e0` are not unique join keys).
- Historical merged-PR table + dated narrative retained as provenance (Index wins conflicts).
- Config `.upstream-update.json` v1 `deploy.cmd` → v2 `deployment.steps[0]` human-only migration + declared verify/branches/gc sections (user-confirmed at Phase P).

## Run receipt (Phase L) — appended after execution

(pending)
