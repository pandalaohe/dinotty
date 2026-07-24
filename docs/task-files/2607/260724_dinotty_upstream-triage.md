# upstream-update triage — dinotty (2026-07-24, mode=merge)

Base `dfbbc1bc` (merge-base custom↔upstream/dev). Custom behind upstream/dev by 4; main behind by 10 (custom already carries the 6 PR'd ones). Main-FF check OK (`upstream/dev..main` empty).

## Incoming (4 commits, custom..upstream/dev)

| commit | area | note |
|--------|------|------|
| `9cbb9d5d` | mobile-keyboard | **our QKB2 (PR #215) merged back** — keyboard guard mode + dismiss button + sticky typing |
| `46df7faf` | frontend | popover click listeners registered on mount |
| `68726398` | templates | template picker preview + delete |
| `a66e8019` | templates | apply templates with workspace context |

## Overlap / conflict (Layer-1 = 19 files; blob-parity + merge-tree)

- **16/19 overlap files byte-IDENTICAL** custom==upstream/dev → QKB2 merged unmodified; zero conflict.
- `useI18n.ts` diverged but **auto-merges clean** (QKB2 keys + template keys + our QKB3 hint keys are disjoint hunks).
- **2 real conflicts** (`git merge-tree`): `frontend/src/App.vue`, `frontend/src/components/settings/KeyboardTab.vue` — QKB3 sits on top of QKB2 here; upstream's merged QKB2 touched adjacent lines.
- All 11 pure-new template/popover files: clean adds (custom never touched them).

## Per-mod verdict

| mod | verdict | reason |
|-----|---------|--------|
| qkb2 keyboard-guard-mode (`9cbb9d5d`, PR #215) | ADOPT (absorbed) | verified MERGED + blob parity — upstream authoritative |
| qkb3-ime-keyboard-overlap (App.vue/KeyboardTab.vue/useI18n.ts) | KEEP | PR #216 still OPEN; not in upstream — preserve our additions |
| popover fix, 2 template features | ADOPT (clean add) | new upstream features, no overlap |

**Conflict resolution (Phase E-M, D14 hunk-level, 2 files)**: combine upstream QKB2 base (theirs) + our QKB3 additions (ours) — the overlap-px setting relocated to Keyboard→Advanced + bilingual hint. Not pure `--ours`/`--theirs`; needs manual hunk merge preserving both.

## Ledger reconcile (Phase F) — gh three-state drift

| row | ledger says | gh reality | action |
|-----|-------------|-----------|--------|
| qkb2 / PR #215 | **no row** | MERGED | backfill merged-upstream row (head_branch feature/keyboard-guard-mode) |
| #210 plugin-ws | pr-open | MERGED | flip → merged-upstream / absorbed |
| #214 quickkb-send | pr-open | MERGED | flip → merged-upstream / absorbed |
| #212 app-shortcuts | "merged→absorbed" (pr-open) | **CLOSED** | contradiction — verify content landed elsewhere before flipping; else mark closed-not-merged (user decision) |
| #216 qkb3 | pr-open | OPEN | keep |
| candidates (#16/#18/#19) | candidate | n/a | keep |

## Verify plan (config-declared)

`npm run test` (frontend) → `npm run build` (frontend) → `cargo check` (.), all required.

## GC candidates (Phase J, after push, 7-condition gated)

MERGED local branches: `feature/keyboard-guard-mode` (#215), `fix/plugin-workspace-attribution` (#210), `upstream-pr/quickkb-send-threshold` (#214), `fix/session-detach-data-loss` (#211), `upstream-pr/keybinding-copy-fixes` (#207). NOT `upstream-pr/mobile-quickkb-app-action-keys` (#212 CLOSED).

## Deploy handoff (Phase K, human-only)

`dinotty rebuild all` (rebuilds both 8999+8998, backgrounds by default) → `dinotty status` (expect both MATCH). User runs; agent never deploys.

## Backup tags (created at real-run A6)

`pre-update-main-<ts>`, `pre-update-custom-<ts>`.
