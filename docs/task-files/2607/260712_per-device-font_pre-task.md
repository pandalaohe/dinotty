# Pre-task — Per-device font size / family / line-height override (Feature ②)

Token: **DT18**  ·  Type: build (has architecture design)  ·  Repo: fork/dinotty (`custom` branch)
Seed authored: 2026-07-12 (session b730ce45, right after Feature ① default_workspace_root shipped + PR #144).

## Origin

User request (Feature ②, deferred while Feature ① was built). Terminal font size / family /
line-height are currently **server-synced settings** — changing them on one device changes every
client of that server. The user wants each device to be able to override these locally without
affecting other devices, while the server value stays as the shared default.

## Intents

- **Intent 1**: `font_size`, `font_family`, `line_height` become **per-device overridable** via
  localStorage. When a device has an override set, the terminal uses it; when unset, it falls back
  to the server settings value. Acceptance: setting an override on device A does not change device B.
- **Intent 2**: The server settings values remain the **shared default**. Changing a server value
  still affects every device that has NOT set a local override. Acceptance: change server default →
  all non-overriding devices update; overriding devices keep their local value.
- **Intent 3**: `custom_fonts` (the server-synced custom font-name list, from DT17) stays
  server-synced and is NOT broken. Acceptance: adding a custom font still propagates to all clients.
- **Intent 4**: Settings UI distinguishes the two scopes clearly — a "server default" control group
  and a "this device only" override group (with a clear/reset-to-default affordance). Acceptance:
  user can tell at a glance which value is global vs local, and can clear a local override.

## Context

### Current shape (live-verify before implementing — this is a 2026-07-12 snapshot)
- **Backend** `src/settings/mod.rs`:
  - `font_size: u8` (~L485, `default_font_size`), `font_family: String` (~L488),
    `line_height: f32` (~L489, `default_line_height`) — all in the server `Settings` struct, synced
    via the existing full GET/PUT `/api/settings`.
  - `custom_fonts: Option<Vec<String>>` (~L506) — server-synced name-only list; leave as-is.
  - Sanitization helpers exist: `trim_font`, `clamp_custom_fonts`, `font_family_is_unsafe` (~L557-637).
- **Frontend consumers** of font config: `useTerminal.ts` (xterm fontSize/fontFamily/lineHeight),
  `useSettings.ts`, `utils/fontList.ts`, plus tests (`fontFamily.test.ts`, `fontList.test.ts`,
  `AppPaneClose.test.ts`). `useTerminal.ts` is the read site to intercept for override-vs-default.

### Per-device localStorage precedent (reuse this pattern, do NOT invent new)
- `useSettings.ts:329-359` already syncs `action_keyboard` to localStorage (`dinotty_action_keyboard`)
  as a per-device value — same shape needed here.
- Other per-device localStorage keys: `dinotty_tabs` (App.vue:646), tree width
  (`useFileWorkspaceLayout.ts`), api base (`apiBase.ts`). Naming convention: `dinotty_<thing>`.

### Suggested architecture (seed — the cycle's design step decides the final shape)
- Keep server `font_size` / `font_family` / `line_height` as the **default**.
- Add a per-device override store (e.g. localStorage key `dinotty_font_override` holding
  `{ font_size?, font_family?, line_height? }`, each field optional).
- In `useTerminal.ts`, resolve each font property as `localOverride ?? serverSetting`.
- Settings UI: a "this device only" group writing localStorage (no PUT to server) + a
  reset-to-default control; the existing font controls stay as the server default group.
- Priority per property: **per-device localStorage override > server default**.
- `custom_fonts` untouched (stays server-synced).

### upstream_context: yes
Fork of xichan96/dinotty. If this turns out upstreamable, follow W3 (clean branch off `upstream/dev`,
minimal diff, no infra leak, no Co-Authored-By) — same recipe just used for PR #144. Note DT17
font-preset was upstreamed as #135 (merged); this per-device layer is a natural follow-up but may be
more opinionated — decide upstreamability at design time.

## Acceptance Criteria

- Device A override changes only device A; device B unaffected.
- Clearing device A's override → A falls back to the current server default.
- Changing a server default → all non-overriding devices reflect it; overriding devices do not.
- `custom_fonts` still syncs across devices.
- Build clean: `pnpm build` + `cargo tauri build`; reinstall clears WKWebView cache (LOCAL_MODS recipe).

## Updates

(appended mid-cycle when scope changes)
