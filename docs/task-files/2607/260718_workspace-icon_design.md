# Design/Spec — Workspace icon: 3-letter monogram + vivid color outline (rev.3, post r2 dual-audit)

Pre-task: `260718_workspace-icon_pre-task.md`. Cycle: build (run informally — steps followed, no
state-machine init). Target: upstream-PR-able additive feature on xichan96/dinotty:dev.
rev.3 resolves the r2 dual cross-audit (codex 13 findings
`.collab/audit-reports/20260718_workspace-icon-design-r2_codex.md` + reviewer
`.collab/audit-reports/20260718_workspace-icon-design-r2_claude.md`). The two auditors converged on
3 HIGH self-contradictions + 2 HIGH omissions that rev.2 left for implementer judgment; rev.3 pins
them in spec text. Net change from rev.2: the color model is now a SINGLE hash-derived formula
(no count/order, no render-time divergence), text/border contrast roles are split, normalization
strips zero-width on both ends, and the protocol.ts + create-path wiring is made explicit.

## 1. Locked design decisions (user-confirmed 2026-07-18, refined by 2 audit rounds)

- **Color — ONE deterministic derivation, always a concrete stored hex** (resolves codex #2/#3/#4/#8,
  Claude #2). The workspace color is NEVER resolved at render and NEVER count/order-based. It is:
  1. **Canonical formula**: `palette[ fnv1a32(id) % 7 ]` where `id` is the immutable workspace uuid
     and `palette` is the 7 preset hexes (§2). `fnv1a32` is a byte-exact, unsigned, version-pinned
     hash (§2.1) implemented IDENTICALLY in Rust and TS.
  2. **At CREATE** (server-side, inside the existing write-lock): if the request carries a valid
     `#RRGGBB` override → store it (uppercased); else → store `palette[fnv1a32(id) % 7]`. Either way
     the stored `color` is a concrete hex. Color is NEVER stored as `None` for a new workspace.
  3. **On CLEAR** (user empties the color picker): the client sends no override; the server re-derives
     `palette[fnv1a32(id) % 7]` and stores it. Clearing reverts to the SAME stable default it was born
     with — not a different value, not `None` (fixes the rev.2 "clear jumps color" contradiction).
  4. **Legacy migration** (pre-existing `workspaces.json` with no `color`): `load_workspaces()` fills
     any workspace missing a valid `color` with `palette[fnv1a32(id) % 7]` and persists ONCE on load.
     After first load every stored workspace carries a concrete color (fixes the false rev.2 claim
     "first edit/save bakes it in" — baking now happens deterministically at load, codex #4).
  5. **Self-healing persistence** (codex #11): because the value is a pure function of the immutable
     `id`, a best-effort `save_workspaces()` failure at create/migration is non-fatal — the next load
     re-derives the identical color. "Assigned at creation" is guaranteed in-memory + broadcast; the
     on-disk write is an optimization, not a correctness dependency. (The existing best-effort save
     contract is unchanged — out of scope to harden.)
  - No `count % 7`, no `order`-based assignment anywhere. `id` is uuid-v4 (unique per create) → two
    concurrent creates get different ids → different hashes → deterministic WITHOUT serializing the
    handler (dissolves the codex #7 race and #8 count-reuse collision; residual hash collisions past
    a few workspaces are the accepted "duplicate color, abbr disambiguates" case, §7).

- **Monogram (abbr)** — the stored `abbr` is an OPTIONAL user override; when unset, the monogram is
  auto-derived at RENDER from `name` (so it follows renames). Auto-derivation is FRONTEND-ONLY
  (`autoMonogram`, §4); the server only bounds/normalizes the override, so Rust needs no grapheme
  library (codex #10 / Claude #4 minimal-diff choice).
  - **`autoMonogram(name)` algorithm** (frontend, `Intl.Segmenter` grapheme iteration — WebView
    baseline, no npm dep):
    1. Segment `name` into grapheme clusters; drop clusters that are meaningless per the shared
       "meaningful content" predicate (§3.1: whitespace, Unicode Cc control, Cf format incl.
       zero-width U+200B/200C/200D/2060/FEFF, and separator marks).
    2. If the first meaningful cluster is WIDE/CJK (East-Asian Wide/Fullwide, or Han/Hiragana/
       Katakana/Hangul script) → take the first **2** clusters as-is (no case transform).
    3. Else → take up to **3** clusters, `toLocaleUpperCase()`, then hard-cap the RESULT to 3 code
       points (covers `ß`→`SS` expansion; cap counts code points, documented).
    4. Empty result → `"?"` (never blank).
  - **Override normalization** (both server + client, §3.1): apply the meaningful-content strip; if
    empty → treat as unset (None); else cap to 3 code points (scalar cap — dep-free, a max-length
    guard on user input, not text processing; a ZWJ-emoji override may truncate — accepted edge, §9).

- **Contrast — split the two roles (this is the literal "用框不填充")** (resolves codex #1, Claude #5):
  - **Monogram TEXT color = the theme's foreground token** (the theme's normal body-text color), NOT
    the workspace color. Readability (WCAG 4.5:1 small-text) is guaranteed BY CONSTRUCTION because the
    theme foreground is already tuned against the theme background. Text contrast is now independent
    of any workspace/custom color.
  - **Workspace color = the OUTLINE (border) only**, plus an optional very-faint fill tint (low alpha
    ~12–16%). A UI-component border needs only WCAG 3:1, and the border is clamped to ≥3:1 against the
    ACTUAL card background (§2.2), so custom/vivid colors are always safe. The vivid color still
    identifies the workspace via the frame + tint; the color visibly changes on workspace switch.
  - NOT a solid filled background; NOT colored text.

- **Render surfaces** (surface B LOCKED — codex #12, Claude #6):
  - (A) **Mission Control overview cards** — primary. `WorkspaceList.vue` already renders a
    placeholder `<span class="mc-ws-dot" />` per row (line 22); `WorkspaceBadge.vue` replaces it.
  - (B) **Persistent active-workspace indicator = the overview-trigger button in `TabBar.vue`**
    (`.desktop-mc` desktop + the mobile trigger, TabBar.vue:5 — a real, always-visible element).
    `App.vue:556/558` is the document-title STRING (not a DOM slot) and is REJECTED. Wiring is
    specified, not deferred (§6): add `activeWorkspaceAbbr?`/`activeWorkspaceColor?` props to
    `TabBar.vue`, threaded from the parent that already holds `useWorkspaces()`.

## 2. Palette + canonical hash + contrast model

### 2.0 Palette (vivid on dark; clamped on light) — 7 presets, index 0–6
```
red    #FF5D5D    orange #FF9F45    yellow #FFD23F    green  #35D07F
cyan   #29D6E8    blue   #4D9DFF    purple #B084FF
```
- **Ownership** (resolves codex #3 "contradictory single-source" honestly): the palette is duplicated
  in exactly two places — a Rust `const WORKSPACE_PALETTE: [&str; 7]` (needed for server-side CREATE/
  migration assignment) and a frontend `WORKSPACE_COLORS` constant (needed for the picker swatches +
  the defensive fallback). This is 7 hand-synced hex literals, NOT a codegen contract (over-engineering
  for 7 constants on a fork PR). Drift is guarded by a matching test on BOTH sides asserting the exact
  7 uppercase hexes, and a `// KEEP IN SYNC WITH frontend/src/… (and vice-versa)` comment on each. The
  earlier rev.2 "single source of truth" phrasing is retracted — it was never achievable without a
  build-time bridge this repo does not have.

### 2.1 `fnv1a32(s)` — version-pinned, unsigned, byte-exact (resolves codex #9)
- Input: the workspace `id` string, encoded UTF-8 (uuid-v4 is ASCII, so bytes == chars, but the spec
  is UTF-8 for generality).
- Algorithm: FNV-1a 32-bit. `hash = 0x811c9dc5`; for each byte `b`: `hash = (hash XOR b)`, then
  `hash = hash * 0x01000193` truncated to 32 bits (unsigned wrapping).
  - Rust: `u32`, `hash ^= b; hash = hash.wrapping_mul(0x0100_0193);`
  - TS: `h = (h ^ b) >>> 0; h = Math.imul(h, 0x01000193) >>> 0;` (`>>> 0` keeps it unsigned — a signed
    hash + JS `% 7` could yield a negative index → `undefined`; this is the codex #9 bug, closed here).
- Index: `fnv1a32(id) % 7` → always `0..=6`.
- A shared test vector table (≥5 sample uuids → expected index) is asserted in BOTH the Rust `tests`
  module AND the frontend unit test, so the two implementations are proven identical.

### 2.2 `outlineColor(hex, cardBgHex)` — border ≥3:1 vs the ACTUAL background (resolves codex #1)
- rev.2's `badgeColor(hex, isLight)` used a light/dark boolean + a flat `color-mix 60%` constant; the
  audit showed that fails for yellow/cyan on white and ignores the real card bg. rev.3 replaces it:
- Compute WCAG relative luminance of `hex` and `cardBgHex` and their contrast ratio.
  - If ratio ≥ 3.0 → return `hex` (vivid color shown as-is; the common dark-theme case).
  - Else → blend `hex` toward the direction that increases contrast (toward `#000000` when the card bg
    is light, toward `#FFFFFF` when dark) in fixed 10% steps, recomputing until ratio ≥ 3.0, capped at
    9 steps; if still <3:1 (near-impossible for a 6-digit color) → fall back to the theme foreground
    token. Deterministic, pure, unit-tested.
- `cardBgHex` is the RESOLVED background of the surface the badge sits on (overview card / trigger
  button), read from the active theme — not a boolean. Text is theme-fg (§1) so only the border runs
  through `outlineColor`.
- QA computes the actual post-clamp ratio for all 7 presets against BOTH the app's real dark card bg
  and light card bg (values from `frontend/src/themes.ts`), asserting ≥3:1 (§8) — no blanket constant
  asserted un-verified.

## 3. Data model (additive, backward-compatible)

Two new fields on the shared `Workspace`, stored so they sync across all clients of one server.
- Backend `struct Workspace` (`src/workspace_mgmt/mod.rs:23` → `workspaces.json`), mirroring the
  existing `connection_id` precedent (which has a live backward-compat round-trip test at
  `src/workspace_mgmt/tests.rs:33`):
  - `#[serde(default, skip_serializing_if = "Option::is_none")] pub abbr: Option<String>`
  - `#[serde(default, skip_serializing_if = "Option::is_none")] pub color: Option<String>`
  - `serde(default)` → an old `Vec<Workspace>` file with neither field still parses. Add a round-trip
    test on the real file shape. Downgrade note: an OLDER binary drops these on its next save
    (documented, acceptable — codex #8 confirmed resolved).
  - Post-load invariant: `color` is always `Some` (migration §1.4 fills it); `abbr` may be `None`
    (→ auto-derive at render). The field stays `Option<String>` only for wire/serde back-compat.
- Frontend `interface Workspace` (`frontend/src/types/workspace.ts`): `abbr?: string` + `color?: string`.
- **protocol.ts sync types** (resolves codex #13, Claude #7 — HIGH omission): `frontend/src/types/
  protocol.ts:147` inlines THREE separate hand-written Workspace shapes for the WS sync channel —
  `SyncWorkspaceCreated`, `SyncWorkspaceUpdated`, `SyncWorkspaceList` — that do NOT reuse the
  `Workspace` interface. Add `abbr?: string; color?: string` to all three inline shapes (minimal-diff;
  not refactoring them to `import Workspace`). Without this, typed consumers of
  `SyncWorkspaceCreated['workspace']` silently never see the new fields even though the runtime payload
  carries them, and `vue-tsc` won't flag it.

### 3.1 Shared "meaningful content" normalization (single predicate, both ends — codex #5, Claude #3)
One predicate, applied identically server (Rust) and client (TS), used by BOTH auto-derive and
override normalization. A cluster/char is MEANINGLESS if it is any of: whitespace, Unicode `Cc`
(control), Unicode `Cf` (format — incl. U+200B ZWSP, U+200C ZWNJ, U+200D ZWJ, U+2060 WORD JOINER,
U+FEFF BOM), or `Zl`/`Zp` separators. Rust `str::trim()` / `char::is_whitespace()` do NOT cover `Cf`
— the override path MUST strip these explicitly, not just `trim()` (the rev.2 blank-badge hole).
- Rust: filter chars by `c.is_control() || c.is_whitespace() || is_format_or_zero_width(c)` where the
  latter tests the pinned codepoint set + general-category `Cf` (dep-free explicit list is acceptable
  since the set is small and pinned).
- TS: the same predicate; `resolveAbbr` (§4) uses it instead of `.trim()` for its "is the override
  meaningful?" short-circuit.

### 3.2 Server-side CREATE/UPDATE handling (single ownership point — deterministic precedence, codex #6)
`CreateWorkspaceReq` (mod.rs:136) + `UpdateWorkspaceReq` (mod.rs:146) each gain
`#[serde(default)] pub abbr: Option<String>` + `#[serde(default)] pub color: Option<String>`.
Normalize BEFORE `save_workspaces()`:
- **abbr**: strip via §3.1; empty → `None`; else cap to 3 code points.
- **color**: if it matches `^#[0-9A-Fa-f]{6}$` (opaque `#RRGGBB`, NO alpha → no invisible badge) →
  store uppercased. Else:
  - **at CREATE** (omitted / invalid / empty) → store `palette[fnv1a32(id) % 7]` (§1.2). Never `None`.
  - **at UPDATE clear** (client sends empty/whitespace/omitted-with-clear-intent) → re-derive
    `palette[fnv1a32(id) % 7]` (§1.3). Never `None`.
  This is the ONE deterministic server rule the audit demanded (codex #6): a new/cleared workspace's
  stored color is always a concrete hash-derived hex; only an explicit valid override overrides it.

### 3.3 Create-path wiring (resolves Claude #7 second omission — HIGH)
rev.2 never wired the custom abbr/color from the create dialog to the server. Fix the whole chain:
- `CreateWorkspaceDialog.vue` `onSubmit` → `createWorkspace(path, name, connectionId, overrides?)`
  where `overrides?: { abbr?: string; color?: string }`.
- `useWorkspaces.ts::createWorkspace(...)` → `useWorkspaceApi.ts::apiCreateWorkspace(...)` gain the
  same optional `overrides` param, sent as `abbr`/`color` in the `CreateWorkspaceReq` body.
- The EDIT path already works: `updateWorkspace(id, data: Partial<Workspace>)` accepts an arbitrary
  partial, so once `Workspace` has the fields the edit path threads them with no signature change.

## 4. Resolution helpers (frontend, pure, unit-tested)
- `autoMonogram(name): string` — §1 grapheme algorithm via `Intl.Segmenter`; never empty (`"?"`).
- `resolveAbbr(ws): string` — `hasMeaningfulContent(ws.abbr) ? normalized(ws.abbr) : autoMonogram(ws.name)`
  (uses the §3.1 predicate, NOT `.trim()`).
- `resolveColor(ws): string` — `isValidHex(ws.color) ? ws.color : palette[fnv1a32(ws.id) % 7]`. The
  fallback uses the IDENTICAL canonical formula (§1.1), so it can never diverge from the server value;
  it is DEFENSIVE-ONLY (should never fire post-migration — documented). This is the key rev.2 fix: one
  formula everywhere.
- `outlineColor(hex, cardBgHex): string` — §2.2 clamp.
- `isValidHex(s): boolean` — `^#[0-9A-Fa-f]{6}$`.
- `fnv1a32(s): number` — §2.1.

## 5. Render component
- New presentational `WorkspaceBadge.vue` (props `abbr`, `color`, `cardBg`, `size?`) — one visual
  source reused by overview cards + surface-B indicator.
  - Monogram text → theme foreground token (readable by construction).
  - Border → `outlineColor(color, cardBg)`; optional low-alpha fill tint from `color`.
  - Font-size/weight pinned for legibility; border-radius/width tuned. Reactive to the active
    `Workspace` object so a switch re-renders.

## 6. Settings / edit UI + surface-B wiring
- `CreateWorkspaceDialog.vue` + the workspace edit path gain: an abbr text input (maxlength by code
  point, placeholder = live `autoMonogram(name)`) + a color picker = 7 preset swatches + a custom
  `#RRGGBB` input. Selecting a preset stores its HEX (self-describing; no key↔hex mapping drift,
  codex-r1 #9). Clearing the color → server re-derives the hash default (§3.2), NOT unset.
- **Surface-B wiring (LOCKED)**: add `activeWorkspaceAbbr?: string` + `activeWorkspaceColor?: string`
  props to `TabBar.vue`; thread them from the parent that holds `useWorkspaces()` (the same parent
  that renders TabBar) down to the overview-trigger button, which renders a small `WorkspaceBadge`.
  This is the concrete data path the audit asked to be spec'd, not reverse-engineered.

## 7. Edge cases / safety
- Empty/whitespace/zero-width/emoji-only name → monogram `"?"`; never blank (auto path AND override
  path both go through §3.1 — the rev.2 zero-width override hole is closed).
- `ß`/expanding-uppercase → hard-capped to 3 code points.
- Duplicate colors: possible past 7 workspaces or on an `fnv1a32(id) % 7` collision — accepted; the
  monogram disambiguates. (No count-reuse artifact — codex #8 dissolved by dropping count.)
- Custom/vivid color illegible on some theme → `outlineColor` clamps the BORDER to ≥3:1; TEXT is
  theme-fg so always readable. No unbounded-custom-color contrast failure (codex #1 closed).
- Remote (SSH) workspaces: same treatment (fields on the shared struct).
- Invalid/alpha/garbage color from any REST client → normalized to the hash default (never a broken
  or invisible badge).
- No dead/blank badge under any unset/partial/legacy state.

## 8. Verification / delivery
- Rust `cargo clippy --all-targets -- -D warnings` + `cargo test --lib`:
  - serde round-trip with/without the new fields on a real `Vec<Workspace>` file.
  - `fnv1a32` shared test-vector table (matches the TS table).
  - color-regex validation; empty/zero-width abbr → None; CREATE precedence (omitted/invalid → hash
    default, valid override honored); UPDATE clear → hash default (not None).
  - legacy migration on load bakes a concrete color for a field-less workspace.
  - palette const == pinned 7 uppercase hexes.
- Frontend `pnpm exec vue-tsc --noEmit` + `pnpm run build` + `pnpm test`:
  - `autoMonogram` (latin / CJK / emoji / ZWJ / empty / `ß` / whitespace / zero-width).
  - `resolveAbbr` zero-width override → falls through to auto (not blank).
  - `resolveColor` defensive fallback == server formula; `fnv1a32` shared vectors; `isValidHex`.
  - `outlineColor` ≥3:1 for all 7 presets vs the real dark AND light card bg; text-fg ≥4.5:1.
  - `WORKSPACE_COLORS` == pinned 7 hexes (drift guard vs Rust).
- Dual cross-audit on the CODE (lens=code) before PR.
- User E2E on 8999: create workspace → auto color + monogram; set custom abbr + custom color; clear
  color → reverts to the SAME default; switch workspaces → trigger-button color changes; light-theme
  legible; a name with a CJK / emoji / zero-width edge renders sanely.
- Build both surfaces (8999 + 8998), asset-fingerprint MATCH.
- PR to xichan96/dinotty:dev — no Co-Authored-By, no fork-local leak (infra-git-hygiene pre-pr gate).

## 9. Out of scope
- Per-workspace custom image/emoji icons (monogram + color only).
- Theming the whole workspace UI by color (only the badge/indicator).
- Workspace picker/creation flow changes beyond adding the abbr + color fields.
- Grapheme-perfect override truncation of ZWJ-emoji sequences (scalar cap is a max-length guard;
  adding `unicode-segmentation` to Rust is deliberately avoided to keep the upstream diff minimal).
- Hardening the pre-existing best-effort `save_workspaces()` contract (self-healing via §1.5 makes it
  non-blocking for this feature).

## 10. Audit disposition (r2: codex 13 + reviewer)

codex r2:
- #1 contrast (H) → FIXED: text=theme-fg (4.5:1 by construction), border=`outlineColor` clamp ≥3:1 vs
  actual bg, custom colors bounded.
- #2 two color paths (H) → FIXED: single `palette[fnv1a32(id)%7]`; clear re-derives same; no divergence.
- #3 palette ownership (H) → ADDRESSED: retracted "single source of truth"; 7-literal dup guarded by
  matching tests + sync comment (codegen bridge over-engineered for a fork PR).
- #4 legacy bake unsupported (H) → FIXED: explicit load-time migration with the same hash/palette.
- #5 blank override (H) → FIXED: §3.1 shared strip covers Cf/zero-width on both ends + override path.
- #6 CREATE precedence (M) → FIXED: one deterministic server rule (§3.2).
- #7 count race (M) → DISSOLVED: dropped count; id-hash is deterministic without serializing.
- #8 count reuse collision (M) → DISSOLVED: dropped count; residual hash collision accepted (§7).
- #9 hashStr underspecified (M) → FIXED: fnv1a32 pinned, unsigned, shared test vectors (§2.1).
- #10 monogram determinism (M) → ADDRESSED: Intl.Segmenter + pinned strip + code-point cap; Rust
  dep-free override cap; residual ZWJ-emoji override truncation documented out of scope.
- #11 best-effort persist (M) → ADDRESSED: hash derivation self-heals; claim softened accordingly.
- #12 surface-B anchor (L) → FIXED: locked to TabBar overview-trigger + prop path spec'd (§6).
- #13 protocol.ts wire types (L) → FIXED: add abbr/color to the 3 inline sync shapes (§3).

reviewer (Claude) r2:
- #1 backward-compat OK → no change (confirmed via connection_id precedent test).
- #2 color coherence (H) → FIXED (see codex #2/#3/#4).
- #3 zero-width blank badge (H) → FIXED (see codex #5, §3.1).
- #4 grapheme tooling (M) → ADDRESSED (Intl.Segmenter frontend, dep-free Rust — see codex #10).
- #5 contrast target/computation (M) → FIXED: 4.5:1 text via theme-fg; 3:1 border computed per-color
  in QA vs real bg (see codex #1).
- #6 surface-B wiring gap (M) → FIXED: prop path spec'd (§6).
- #7 protocol.ts + create-path wiring (H omission) → FIXED: both spec'd (§3, §3.3).
