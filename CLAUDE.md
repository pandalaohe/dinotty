# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cargo build                        # build backend
cargo run                          # run server on http://127.0.0.1:8999
RUST_LOG=debug cargo run           # run with debug logging
cd frontend && npm run build       # build Vue SPA
cd frontend && npx vue-tsc --noEmit  # type-check frontend
```

## Architecture

**Stack**: Axum 0.7 (HTTP + WebSocket) · Tokio · portable-pty · xterm.js 5 · Vue 3 + TypeScript + Vite

**Backend** (`src/`):
- `main.rs` — Axum router: `/ws`, `/ws/sync`, `/ws/watch`, `/api/settings`, `/api/workspace/*`, `/preview/:port/*`
- `ws.rs` — WebSocket ↔ PTY bridge
- `terminal.rs` / `session.rs` — `SessionManager` (`DashMap` of pane-id → PTY writer)
- `settings.rs` — settings persistence
- `workspace.rs` — file workspace API (list, read, write, upload, delete, rename)
- `proxy.rs` — reverse proxy for preview & external URL proxy
- `file_watcher.rs` — file change watching via WebSocket

**Frontend** (`frontend/`):
- Entry: `src/main.ts` → `App.vue`
- Components: `TabBar`, `TerminalPane`, `SettingsPanel`, `FileWorkspacePreview`, `PreviewPanel`, `CommandPalette`, `MobileKeyboard`, `ServerList`
- Composables: `useSettings`, `useTerminal`, `useTransport`, `useI18n`, `useDraggable`, `usePaneResize`

**WebSocket protocol** (JSON):

| Direction | `type` | Fields |
|-----------|--------|--------|
| client → server | `input` | `data: String` |
| client → server | `resize` | `cols: u16, rows: u16` |
| server → client | `output` | `data: String` |
| server → client | `shell_info` | `shell_type: String` |

## Docs

See `docs/` for detailed design documents and history:
- `docs/architecture-design.md` — system architecture & evolution plan
- `docs/desktop-client-design.md` — Tauri desktop client design
- `docs/web-preview-design.md` — web preview panel & proxy design
- `docs/file-preview-design.md` — file workspace & preview design
- `docs/settings-design.md` — settings feature design
- `docs/additional-features-design.md` — mobile & supplementary features
- `docs/tech-debt-changelog.md` — resolved tech debt history
