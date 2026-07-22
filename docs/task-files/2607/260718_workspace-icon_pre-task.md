# Pre-task — Workspace icon: 3-letter monogram + color outline (Dinotty fork)

## Origin
User request, recalled from a prior-session discussion (not yet documented). Surfaced 2026-07-18
while aligning the next task after the WS4 upstream-delivery run. User's own words (from transcript):
「一共设置 7 种基础颜色…能有缩写, 3 字母的, 可以自定义, 默认是工作区前三个字母大写…颜色不用填充,
用框」 and 「工作区图标的颜色随着工作区切换来变, 默认几个颜色, 也可以自定义」.

## Intents
- Intent 1 (feature — 3-letter monogram): A workspace's icon shows a short text monogram instead of
  a generic icon. Default = first 3 letters of the workspace name, uppercased; user-customizable per
  workspace.
  - Acceptance: each workspace renders a monogram; unset → auto first-3-upper from name; a custom
    abbreviation (≤3 chars) can be set per workspace and persists across restarts + syncs to all
    clients of that server.
- Intent 2 (feature — color outline): Each workspace has a color used as an OUTLINE/border (not a
  filled background — 「不用填充, 用框」). 7 base preset colors + custom color; the visible color
  tracks the active workspace so the user can tell workspaces apart at a glance.
  - Acceptance: 7 presets selectable + a custom color; color renders as a border/outline around the
    monogram; unset → a stable default (e.g. derived from workspace id/order); persists + syncs.
- Intent 3 (settings/edit surface): The abbreviation and color are editable where a workspace is
  created/edited.
  - Acceptance: create/edit workspace UI exposes abbr input + color picker (7 presets + custom);
    saving persists to workspaces.json.

## Context
- upstream_context: yes — fork `pandalaohe/dinotty`, upstream `xichan96/dinotty`, `custom` branch
  aligned to upstream/dev@ebea9252; repo-root LOCAL_MODS.md present. W3 applies: this is a strong
  upstream candidate (self-contained, backward-compatible additive fields). Target: land on
  xichan96/dinotty:dev as a PR.
- Data model (both ends gain 2 optional fields):
  - Backend `struct Workspace` at `src/workspace_mgmt/mod.rs:23` (`{id, name, path, order, ...}`),
    persisted to `workspaces.json` (`config_dir()`), save at `save_workspaces()` :56.
  - Frontend `interface Workspace` at `frontend/src/types/workspace.ts` (`{id, name, path, order,
    connection_id?}`).
  - New fields (proposed, confirm in design): `abbr?: string` (≤3 chars) + `color?: string` (hex or
    preset key). serde default None → backward-compatible; unset resolves to auto monogram + default
    color at render time (do NOT bake defaults into storage — keep "unset" distinct so future
    default changes apply).
- Render sites (design step pins exact spots): `frontend/src/components/overview/` —
  WorkspaceOverview.vue (Mission Control overview, opened via missionControl/openOverview),
  WorkspaceList.vue / WorkspaceListView.vue / WorkspaceTabGrid.vue / TabOverview.vue; App.vue title
  uses `activeWorkspaceName`. Currently workspaces render with name text / generic treatment, no
  per-workspace color or monogram.
- Create/edit surface: `frontend/src/components/ui/CreateWorkspaceDialog.vue` (create);
  workspace edit path in workspace_mgmt (`UpdateWorkspace` with optional name/path at mod.rs:148).
- Known constraints (memory): Mac-native `.app` is a separate Tauri build — reflecting frontend +
  workspaces.json schema changes requires rebuild+reinstall of BOTH 8999 (prod) and 8998 (test), not
  a web-only ship; verify Rust with `clippy --all-targets -D warnings` + `cargo test --lib`; frontend
  `pnpm exec vue-tsc --noEmit` + `pnpm run build` + `pnpm test`. PR-bound commits carry NO
  `Co-Authored-By`; exclude fork-local files (deploy scripts, LOCAL_MODS.md, docs/task-files, Mocha
  theme, .collab) from the PR; run infra-git-hygiene pre-pr leak gate.
- Design decisions deferred to brainstorm/design step (confirm with user): exact 7 preset colors;
  monogram derivation for multi-word / non-ASCII names; default color assignment when unset
  (per-id hash vs order-based palette cycle); outline visual spec (border width/radius/contrast on
  light+dark themes); whether the monogram+color also appears in the compact/always-visible surface
  or only in the overview; interaction with remote (SSH) workspaces.

## Acceptance Criteria
- New optional `abbr` + `color` fields added to backend `Workspace` (workspaces.json) and frontend
  type; serde/TS defaults keep existing workspaces valid (no migration break).
- Workspace icon renders a 3-letter monogram (auto default = first-3-upper of name; custom override)
  inside a colored outline (7 presets + custom; not a filled background).
- Active-workspace color is visible so workspaces are distinguishable at a glance.
- Create/edit workspace UI lets the user set abbr + pick color; changes persist + sync across clients
  of the same server.
- Unset abbr/color fall back safely (auto monogram + stable default color); no dead/blank icon.
- `pnpm build` + `cargo tauri build` pass; clippy/vue-tsc clean in touched files; both 8999 + 8998
  rebuilt and MATCH; codex/cross-audit review passed before PR; no infra leak in the PR diff.

## Updates
(none yet)
