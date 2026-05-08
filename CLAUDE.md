# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cargo build          # build
cargo run            # run server on http://127.0.0.1:8999
RUST_LOG=debug cargo run   # run with debug logging
cd frontend && npm run build  # build Vue SPA
```

## Architecture

**Stack**: Axum 0.7 (HTTP + WebSocket) · Tokio (async runtime) · portable-pty (PTY spawning) · xterm.js 5 (browser terminal) · Vue 3 + TypeScript (frontend SPA)

**Backend modules** (`src/`):
- `main.rs` — Axum router with routes for `/ws`, `/ws/sync`, `/ws/watch`, `/api/settings`, `/api/workspace/*`, `/preview/:port/*`, `/assets/*`, `/`
- `terminal.rs` / `session.rs` — `SessionManager`: a `DashMap` of pane-id → PTY writer, used as shared Axum state
- `ws.rs` — core logic: upgrades HTTP to WebSocket, spawns a PTY via `portable-pty`, bridges PTY ↔ WebSocket
- `settings.rs` — settings persistence (GET/PUT `/api/settings`)
- `workspace.rs` — file workspace API (list, read, write, upload, delete, rename)
- `proxy.rs` — reverse proxy for `/preview/:port/*`
- `file_watcher.rs` — file change watching via WebSocket

**Frontend** (`frontend/`):
- Vue 3 SPA built with Vite; entry: `src/main.ts` → `App.vue`
- Key components: `TabBar.vue`, `TerminalPane.vue`, `SettingsPanel.vue`, `FileWorkspacePreview.vue`, `CommandPalette.vue`, `MobileKeyboard.vue`, `PreviewPanel.vue`, `ServerList.vue`
- Composables: `useSettings.ts`, `useTerminal.ts`, `useTransport.ts`, `useI18n.ts`, `useDraggable.ts`

**WebSocket message protocol** (JSON):

| Direction | `type` | Fields |
|-----------|--------|--------|
| client → server | `input` | `data: String` |
| client → server | `resize` | `cols: u16, rows: u16` |
| server → client | `output` | `data: String` |
| server → client | `shell_info` | `shell_type: String` |

## Tech Debt

- [x] **fontFamilies 硬编码** — 已修复：`TextTab.vue` 字体下拉菜单末尾添加"自定义"选项，允许手动输入字体名。
- [x] **SettingsPanel 组件过大** — 已修复：拆分为 `GeneralTab.vue`、`ThemeTab.vue`、`TextTab.vue`、`KeyboardTab.vue` 子组件，SettingsPanel 仅保留 shell + CSS。
- [x] **静态前端与 Vue SPA 双轨维护** — 已修复：删除 `static/` 目录，仅保留 Vue SPA。
- [x] **`splits.js` 未使用** — 已修复：随 `static/` 目录一并删除。
- [x] **settingsPort 未持久化** — 已修复：`SettingsData` 添加 `port` 字段，端口设置随 settings 一起持久化。
- [x] **文件树 `@contextmenu.self` 已被 TreeRows 内部处理替代** — 已修复：改为 `@contextmenu.prevent` 并在 TreeRows 内 `stopPropagation`，空白区域右键现在显示完整菜单。
- [x] **copyAccessUrl fallback 未测试** — 已修复：提取 `utils/clipboard.ts` 共享工具函数，`GeneralTab.vue` 和 `SelectionOverlay.vue` 统一调用。
- [x] **网页预览不支持外部URL** — 已修复：通过 `/api/proxy?url=` 后端代理外部网址，剥离 X-Frame-Options/CSP 头，服务端重写 HTML/CSS 中的 URL（href/src/action/srcset/CSS url()），客户端注入脚本拦截 fetch/XHR/click/form/window.open。
- [x] **外部代理对复杂 SPA 支持有限** — 已修复：预览工具栏添加"在浏览器中打开"按钮（⎋），当 `kind === 'web'` 且有 URL 时显示，点击调用 `window.open` 在新标签页打开原始 URL 作为 fallback。
- [x] **CSS url() 正则误匹配 JS 代码** — `rewrite_html_urls` 对整个 HTML（含 `<script>`）调用 `rewrite_css_urls`，导致 JS 中 `URL(blob)` 等被 CSS `url()` 正则匹配并破坏（如 `createObjectURL(blob)` → `createObjecturl(/preview/5678/blob)`）。已修复：改为只对 `<style>` 块和 `style=""` 属性做 CSS url() 重写。
- [x] **外部代理 HTML 重写使用正则而非 DOM 解析** — 已修复：引入 `lol_html`（Cloudflare 流式 HTML 重写库）替换正则，通过 `HtmlRewriter` 的 element handler 重写 href/src/action/poster/data/srcset 属性、meta refresh URL、style 属性中的 CSS url()，并移除 `<base>` 标签。`<style>` 块内的 CSS url() 仍用正则处理。
- [x] **外部代理未处理 JavaScript 内的 URL** — 设计决策（wontfix）：服务端重写 JS 内的 URL 风险过高（可能破坏代码语义），当前客户端 fetch/XHR/window.open 拦截已覆盖大部分场景。
- [x] **外部代理 POST 表单未测试** — 已修复：对 `application/x-www-form-urlencoded` body 中的 URL 值做解码后重写。`multipart/form-data` 不做处理（复杂且少见）。
- [x] **外部代理 cookie/认证透传不完整** — 已修复：`build_proxied_response` 中对 `Set-Cookie` 响应头移除 `Domain=`/`Secure`/`SameSite=` 属性，将 `Path=` 重写为代理路径前缀（`/preview/{port}` 或 `/api/proxy`）。
- [x] **SSRF via DNS rebinding** — 已修复：新增 `check_host_not_private` 函数，通过 `tokio::net::lookup_host` 解析域名后检查所有 IP，请求前和重定向后均校验。
- [x] **workspace 边界可被绕过** — 已修复：删除 `adopt_cwd_to_contain`，workspace_resolve 对越界路径直接返回 Forbidden。
- [x] **所有端点无认证** — 已修复：启动时生成随机 token，通过 meta 标签注入前端，auth 中间件校验 `Authorization: Bearer` 头或 `?token=` 查询参数，`/` 和 `/assets/*` 免认证。
- [x] **file_watcher 资源泄漏** — 已修复：WebSocket 断开时调用 `unsubscribe` 移除 HashMap 条目，`run_watcher` 循环检测到移除后自动退出。
- [x] **file_watcher 阻塞 tokio 线程** — 已修复：改用 `tokio::sync::mpsc::unbounded_channel` 配合 `notify` 的闭包回调，事件处理全程异步。
- [x] **workspace_raw 全量读取大文件** — 已修复：Range 请求使用 `tokio::fs::File` + `seek` + `read_exact` 只读取所需字节范围。
- [x] **session.rs 双锁顺序未文档化** — 已修复：将 `cwd` 和 `cwd_sniff_buf` 合并为 `Mutex<CwdState>` 单一锁，消除死锁风险。
- [x] **OSC title 嗅探仅处理 BEL 终止符** — 已修复：同时检测 `\x07`（BEL）和 `\x1b\\`（ST）终止符，取先出现者。
- [x] **FileWorkspacePreview.vue 组件过大** — 部分修复：TreeRows/TreeInlineInput 已提取至 `workspace/TreeRows.ts`，拖拽逻辑提取至 `usePaneResize.ts`，组件从 3060 行减至 2677 行。剩余部分（预览区域、音频播放器等）仍可继续拆分。
- [x] **FileWorkspacePreview.vue 预览模板重复** — 已修复：提取 `FilePreviewContent.vue` 组件，通过 `showSave` prop 控制保存按钮显示。
- [x] **拖拽调整逻辑重复** — 已修复：合并 mouse/touch 为统一的 `usePaneResize` composable，`PreviewPanel.vue` 和 `FileWorkspacePreview.vue` 共用。
- [x] **useTerminal.ts focusin 监听器未清理** — 已修复：`_setupDragDrop` 中将清理函数存入 `_focusinCleanup`，`destroy()` 中调用清理。
- [x] **SettingsPanel.vue textChangeTimer 未清理** — 已修复：`textChangeTimer` 已不存在，文本变更通知改用直接调用。
- [x] **PreviewPanel.vue postMessage 未校验 origin** — 已修复：`onProxyMessage` 中加入 `e.origin !== window.location.origin` 校验。
- [x] **Vue Set 响应性问题** — 已修复：所有 `expanded` 修改均通过 `expanded.value = new Set(...)` 重新赋值，正确触发响应性。
- [x] **tauriInvoke 重复定义** — 已修复：`TauriIpcTransport` 新增 `_invoke` 私有方法自动附加 `paneId`，4 处调用统一复用。
- [x] **文件预览代码文本行号显示异常** — 已修复：行号字体大小改用 `--preview-code-fs` 与代码一致，滚动同步改用 `closest('.file-code-preview')` 正确定位兄弟元素，移除废弃的 `--preview-line-num-fs` 变量。
