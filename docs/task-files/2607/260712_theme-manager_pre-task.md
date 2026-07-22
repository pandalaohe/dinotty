# Pre-task — Per-device custom theme manager (Feature ③)

Token: **DT19**  ·  Type: build (design + impl)  ·  Repo: fork/dinotty (`custom`)
Seed: 2026-07-12 (session b730ce45). Sibling of DT18 (per-device font) — both are per-device appearance.

## Origin
After adding the exact ghostty Catppuccin Mocha theme (commit on `custom`), the user wants a full
**theme management** feature rather than hard-coding themes in `themes.ts`: add/remove themes, keep a
few base ones locked, edit colors in the UI, categorize, and make the selection **per-device** (not
server-synced). To be built in a NEW session.

## Intents
- **Intent 1 (add/remove)**: user can add and remove themes. Keep **3 base themes as defaults that
  CANNOT be deleted**; total capped at **15**. Acceptance: can add up to 15, cannot delete the 3 base.
- **Intent 2 (editable/open)**: expose theme editing in the UI. The building blocks ALREADY EXIST —
  `AppearanceTab.vue` has custom fg/bg/cursor inputs AND a full 16-color "ANSI Colors" picker
  (`custom.ansi`, backend `CustomColors.ansi`), plus `themes.ts` presets. What's missing is
  saving/naming a customized set as a reusable named theme. Acceptance: user edits colors → saves as a
  named theme → appears in the theme list.
- **Intent 3 (categorize)**: group themes (e.g. base / custom, or by tag). Acceptance: list is grouped.
- **Intent 4 (per-device, NOT synced)**: theme selection + user-added themes live in localStorage,
  per-device — NOT in server settings, do NOT sync across clients. Acceptance: adding/selecting a theme
  on device A does not change device B. (Contrast: current `theme.preset`/`theme.custom` are
  server-synced — this feature moves the custom-theme store to per-device localStorage.)

## Context (live-verify before impl — 2026-07-12 snapshot)
- `frontend/src/themes.ts`: `themes[]` array of ThemeDefinition {name,label,colors} — 15 built-ins now
  incl. the new `catppuccin-mocha`. `getThemeByName`, `applyThemeToDOM`, `getXtermTheme` here.
- `frontend/src/components/settings/AppearanceTab.vue`: theme selector (themes v-for + selectTheme),
  custom fg/bg/cursor inputs, "ANSI Colors" collapsible with 16 color pickers (`custom.ansi[i]`), font
  controls. This is where add/save/delete/category UI goes.
- `frontend/src/composables/useSettings.ts:397` `applyCurrentTheme()` applies preset + custom (incl
  `custom.ansi`, L413-486) to the DOM/xterm. `useSettings.ts:329-359` = localStorage-per-device
  precedent (action_keyboard) — reuse for the per-device theme store.
- backend `src/settings/mod.rs`: `ThemeConfig{preset, custom: CustomColors{fg,bg,cursor,ansi}}` is
  currently server-synced. Feature moves user themes to a per-device localStorage store; backend
  ThemeConfig may stay for the "server default" base only.
- Sibling DT18 (per-device font) uses the same per-device localStorage pattern — consider designing the
  two per-device stores consistently (maybe one `dinotty_appearance_local` blob).

## Acceptance
- 3 base themes locked (undeletable); add/remove others; cap 15.
- Edit colors (fg/bg/cursor + 16 ANSI) → save as named theme → shows in list.
- Themes grouped/categorized in the list.
- Theme choice + custom themes are per-device (localStorage), never synced across clients.
- Build clean (pnpm + cargo tauri); reinstall clears WKWebView cache.

## Updates
(appended mid-cycle when scope changes)
