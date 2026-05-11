# xterm-server

[English](#english) | [中文](#中文)

---

<a id="english"></a>

A **mobile-first** terminal server purpose-built for **coding agents**. Run Claude Code, opencode, Codex, or OpenClaw on your phone with the same experience as on your laptop — use fragmented time to stay productive while you're on the go.

## Why xterm-server?

Terminal-based coding agents (Claude Code, opencode, Codex, OpenClaw, etc.) are powerful, but they are tethered to your desktop. What if you could:

- **Kick off a coding task from your phone** while waiting in line, commuting, or walking around
- **Check on a long-running agent** without pulling out your laptop
- **Review and verify agent output** — code diffs, rendered pages, generated files — right from the browser on your phone
- **Never lose your session** — put your phone to sleep, switch apps, lose signal in the subway — come back and everything is exactly where you left it

xterm-server is designed for this. It's a mobile-first web terminal that gives you the **full desktop coding agent experience on any device with a browser**.

### Mobile-First, Desktop-Complete

The interface adapts to your device:

- **Responsive layout** — portrait mode stacks terminal and preview vertically; landscape mode places them side-by-side, just like a desktop IDE
- **Touch-optimized** — touch scrolling in terminal viewport, touch-friendly buttons, touch-aware pane resizing
- **Customizable shortcut keyboard** — mobile devices lack Ctrl, Esc, and function keys; xterm-server provides a fully customizable shortcut bar where you can define buttons for any key combination or escape sequence
- **Same agent experience** — Claude Code, opencode, Codex, OpenClaw all work identically on mobile and desktop; the terminal doesn't know the difference

### Lightweight — Not a Remote Desktop

You might think: "Why not just VNC / RDP / screen share into my desktop?" You can, but:

| | xterm-server | Remote Desktop (VNC/RDP/Parsec) |
|---|---|---|
| **Data transmitted** | Text only (JSON, bytes) | Full screen pixels at 30-60 fps |
| **Bandwidth** | ~1–10 KB/s typical | ~1–10 MB/s (100–1000x more) |
| **Mobile data friendly** | ✅ Works on 3G/4G without lag | ❌ Choppy, high latency, burns data |
| **Weak signal tolerance** | ✅ Auto-reconnect, no frame loss | ❌ Frozen screen, input lag |
| **Battery consumption** | Low (text rendering) | High (video decoding) |
| **Resolution adaptation** | Native text at any size | Scaled bitmap, blurry on phone |
| **Interaction** | Native touch, custom keyboard | Simulated mouse, tiny desktop UI |

Remote desktop streams the entire screen as video — even when nothing changes. xterm-server only transmits **the text that actually changed**, making it orders of magnitude more efficient. On a spotty mobile connection, the difference between a few KB of JSON and a continuous video stream is the difference between usable and unusable.

### Virtual Terminal (VT Screen)

The backend maintains a full **virtual terminal emulator** (`vt_screen.rs`, 600+ lines) that parses the PTY output in real time using the VTE state machine. Every character, every escape sequence, every cursor movement is tracked server-side. This means:

- The server always knows the exact screen state — not just raw bytes, but a structured grid of characters with attributes (colors, bold, italic, etc.)
- Scrollback history is preserved server-side in a ring buffer
- Screen snapshots can be generated on demand as ANSI-encoded text

### Session Persistence & Auto-Reconnect

Sessions survive network disconnections. When a client reconnects:

1. The PTY process keeps running on the server — nothing is interrupted
2. The server replays the scrollback history in chunks, then sends the current screen snapshot
3. The client terminal is restored to the exact state before disconnection

The frontend implements **automatic reconnection** with exponential backoff (1s → 30s cap). Alternatively, simply refreshing the browser page restores the full session — no need to restart processes or recreate terminals.

### Multi-Pane Sync

Multiple panes are managed via `SessionManager` with a `DashMap` of pane-id → PTY. A dedicated `/ws/sync` WebSocket keeps all connected clients in sync on tab state, so you can open the same server from multiple browser windows.

### Customizable Shortcut Keyboard

Mobile devices lack the Ctrl, Esc, Alt, and function keys that terminals depend on. xterm-server provides a **fully customizable shortcut keyboard** that solves this:

- **Action panel** — one-tap buttons for Ctrl+C, Ctrl+D, Escape, Tab, and other terminal essentials out of the box
- **Fully customizable** — add, remove, and reorder shortcut buttons in Settings; each button has a custom label and can send arbitrary raw escape sequences
- **Send anything** — configure a button to send any key combination or escape sequence (e.g., `\x03` for Ctrl+C, `\x1b[A` for arrow up), so you can build your own shortcut bar for any workflow
- **Modifier state tracking** — sticky Ctrl/Alt/Shift modifiers that work with the full keyboard layout
- Complete key layout with all printable characters, function keys (F1–F12), and a dedicated arrow key cluster

### Built-in File & Web Browser

Coding agents generate code, documents, and web pages — but verifying the output usually means switching to a separate file manager or browser. xterm-server embeds both directly alongside the terminal:

- **File workspace** — tree-view file browser with file listing, upload, rename, and delete. Click any file to preview it instantly
- **Code preview** — syntax-highlighted source code with line numbers (highlight.js), supporting dozens of languages
- **Markdown preview** — live-rendered Markdown with sanitized HTML (marked + DOMPurify)
- **Office documents** — preview Word, Excel, PowerPoint files directly in the browser (officeparser)
- **Media playback** — built-in audio/video player with seek, volume, and playback controls
- **Image preview** — inline image rendering for common formats
- **Web preview** — enter a URL or local port number and browse it in an embedded iframe; a built-in reverse proxy (`/preview/:port/*`) routes to local dev servers, so you can see your app running without leaving the terminal
- **Address bar** — type a URL or port to navigate, with auto-detection of web vs. file preview

This means an agent can `npm run dev`, write code, and the user can immediately verify the results — all within a single browser tab.

## Comparison with Other Terminals

| Capability | xterm-server | ttyd | gotty | Wetty | Traditional terminal (iTerm2, etc.) |
|---|---|---|---|---|---|
| Server-side virtual terminal (VT Screen) | ✅ Full VTE parser, server knows screen state | ❌ | ❌ | ❌ | N/A |
| Session survives network disconnect | ✅ Auto-reconnect + screen restore | ❌ Session lost | ❌ Session lost | ❌ Session lost | Needs tmux/screen |
| Refresh page = restore session | ✅ Scrollback + screen snapshot replayed | ❌ New session | ❌ New session | ❌ New session | N/A |
| Built-in file browser & preview | ✅ Code, Markdown, Office, image, audio/video | ❌ | ❌ | ❌ | ❌ |
| Built-in web preview (reverse proxy) | ✅ Embed local dev server in iframe | ❌ | ❌ | ❌ | ❌ |
| File change watching | ✅ Real-time via WebSocket | ❌ | ❌ | ❌ | ❌ |
| Customizable shortcut keyboard | ✅ User-defined keys with raw escape sequences | ❌ | ❌ | ❌ | N/A |
| Multi-server management | ✅ Save & switch between servers | ❌ | ❌ | ❌ | N/A |
| Multi-pane with tab sync | ✅ DashMap sessions + sync WebSocket | ❌ | ❌ | ❌ | ✅ Local only |
| System monitor (CPU/mem/disk/net) | ✅ Real-time charts | ❌ | ❌ | ❌ | ❌ |
| Command palette | ✅ | ❌ | ❌ | ❌ | ✅ |
| Token auth | ✅ | ✅ | ❌ | ✅ | N/A |
| Desktop app | ✅ Tauri | ❌ | ❌ | ❌ | Native |

**Key differentiator**: Other web terminals (ttyd, gotty, Wetty) are thin WebSocket-to-PTY pipes — they stream raw bytes and have no knowledge of what's on screen. xterm-server runs a **full virtual terminal emulator on the server**, which enables session recovery, screen snapshots, and a level of resilience that other solutions require pairing with tmux/screen to achieve. Combined with the built-in file/web browser, it provides a self-contained environment where coding agents can work and users can verify results — no tool-switching required.

## All Features

- **Virtual terminal emulation** — server-side VT screen with full ANSI/SGR support
- **Session persistence** — PTY processes survive disconnection, auto-reconnect with state recovery
- **Multi-pane sessions** — split and manage multiple terminal panes with tab sync
- **File workspace** — browse, edit, upload, and preview files (code highlighting, Markdown, Office docs)
- **Web preview** — built-in reverse proxy to preview local dev servers
- **System monitor** — real-time CPU/memory/network charts via vue-chartjs
- **Command palette** — quick-access command launcher
- **Customizable shortcut keyboard** — add Ctrl/Esc/custom escape-sequence buttons for mobile & touch devices
- **Settings & i18n** — persistent settings with multi-language support
- **Authentication** — token-based access control
- **Desktop app** — optional Tauri-based native client

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust, Axum 0.7, Tokio, portable-pty, vte |
| Frontend | Vue 3, TypeScript, Vite, xterm.js 5 |
| Desktop | Tauri |

## Quick Start

### Prerequisites

- Rust toolchain (stable)
- Node.js + pnpm (or npm)

### Build & Run

```bash
# Build frontend
cd frontend && pnpm install && pnpm run build && cd ..

# Run server
cargo run
```

Open http://127.0.0.1:8999 in your browser.

### Development

```bash
# Backend with debug logging
RUST_LOG=debug cargo run

# Frontend type-check
cd frontend && npx vue-tsc --noEmit
```

## Project Structure

```
src/               # Rust backend
  main.rs          # Axum router & server entry
  ws.rs            # WebSocket ↔ PTY bridge
  vt_screen.rs     # Virtual terminal emulator (VTE-based)
  session.rs       # Session manager (multi-pane)
  workspace.rs     # File workspace API
  proxy.rs         # Reverse proxy for preview
  monitor.rs       # System monitor
  settings.rs      # Settings persistence
  auth.rs          # Authentication
  file_watcher.rs  # File change watching

frontend/          # Vue 3 SPA
  src/
    App.vue
    components/    # TabBar, TerminalPane, MobileKeyboard, etc.
    composables/   # useTerminal, useTransport, useSettings, etc.

src-tauri/         # Tauri desktop client
docs/              # Design documents
```

## WebSocket Protocol

JSON messages over `/ws`:

| Direction | `type` | Fields |
|-----------|--------|--------|
| Client → Server | `input` | `data: String` |
| Client → Server | `resize` | `cols: u16, rows: u16` |
| Server → Client | `output` | `data: String` |
| Server → Client | `shell_info` | `shell_type: String` |

## License

MIT

---

<a id="中文"></a>

# xterm-server 中文文档

为 **Coding Agent** 打造的**移动优先**终端服务器。在手机上运行 Claude Code、opencode、Codex 或 OpenClaw，获得与电脑上完全一致的体验——利用碎片时间，随时随地编程。

## 为什么选择 xterm-server？

终端 Coding Agent（Claude Code、opencode、Codex、OpenClaw 等）功能强大，但它们被束缚在桌面上。如果你可以：

- **在手机上启动编程任务**——排队、通勤、陪女朋友逛街时，掏出手机就能让 agent 干活
- **随时查看长时间运行的 agent**——不用打开笔记本电脑
- **直接在手机上验证 agent 产出**——代码 diff、渲染的网页、生成的文件，浏览器里一目了然
- **永远不会丢失会话**——手机息屏、切换 App、地铁里断网——回来后一切都在原处

xterm-server 就是为此而生。它是一个移动优先的 Web 终端，让你在**任何有浏览器的设备上获得完整的桌面级 Coding Agent 体验**。

### 移动优先，桌面同样完美

界面自适应你的设备：

- **响应式布局**——竖屏时终端和预览面板上下排列；横屏时左右并排，和桌面 IDE 一样
- **触控优化**——终端视口触摸滚动、触控友好的按钮、支持触摸拖拽的面板缩放
- **可自定义的快捷键盘**——手机没有 Ctrl、Esc、功能键；xterm-server 提供完全自定义的快捷按钮栏，可以为任意按键组合或转义序列定义按钮
- **一致的 agent 体验**——Claude Code、opencode、Codex、OpenClaw 在手机和电脑上的行为完全相同，终端感知不到区别

### 轻量级——不是远程桌面

你可能会想："为什么不直接用 VNC / RDP / 远程桌面连到电脑上？" 你可以，但：

| | xterm-server | 远程桌面 (VNC/RDP/Parsec) |
|---|---|---|
| **传输数据** | 纯文本（JSON，字节流） | 全屏像素流，30-60 fps |
| **带宽消耗** | 通常 ~1–10 KB/s | ~1–10 MB/s（多 100–1000 倍） |
| **移动网络友好** | ✅ 3G/4G 下流畅无延迟 | ❌ 卡顿、高延迟、流量消耗大 |
| **弱信号容忍度** | ✅ 自动重连，无画面丢失 | ❌ 画面冻结、输入延迟 |
| **电量消耗** | 低（文本渲染） | 高（视频解码） |
| **分辨率适配** | 任意尺寸下原生文本渲染 | 位图缩放，手机上模糊 |
| **交互方式** | 原生触控 + 自定义键盘 | 模拟鼠标，桌面 UI 在手机上很小 |

远程桌面把整个屏幕当作视频流传输——即使画面没有变化也在持续传输。xterm-server 只传输**实际发生变化的文本**，效率高出几个数量级。在不稳定的移动网络下，几 KB 的 JSON 和持续的视频流之间的差距就是"能用"和"不能用"的差距。

### 虚拟终端（VT Screen）

后端维护了一个完整的**服务端虚拟终端仿真器**（`vt_screen.rs`，600+ 行代码），使用 VTE 状态机实时解析 PTY 输出。每个字符、每个转义序列、每次光标移动都在服务端被跟踪。这意味着：

- 服务端始终掌握精确的屏幕状态——不是原始字节，而是带属性（颜色、粗体、斜体等）的结构化字符网格
- 滚动历史在服务端以环形缓冲区保留
- 可随时按需生成 ANSI 编码的屏幕快照

### 会话持久化与自动重连

会话在网络断开时不会丢失。当客户端重新连接时：

1. PTY 进程在服务端持续运行——不会被中断
2. 服务端分块回放滚动历史，然后发送当前屏幕快照
3. 客户端终端恢复到断开前的精确状态

前端实现了**指数退避自动重连**（1s → 30s 上限）。或者，直接刷新浏览器页面即可恢复完整会话——不需要重启进程或重建终端。

### 多面板同步

多面板通过 `SessionManager` 管理，使用 `DashMap` 映射 pane-id → PTY。专用的 `/ws/sync` WebSocket 保持所有连接客户端的标签页状态同步，你可以从多个浏览器窗口打开同一个服务器。

### 可自定义的快捷键盘

手机没有终端依赖的 Ctrl、Esc、Alt 和功能键。xterm-server 提供了**完全可自定义的快捷键盘**来解决这个问题：

- **快捷面板**——开箱即用的一键按钮：Ctrl+C、Ctrl+D、Escape、Tab 等终端常用操作
- **完全自定义**——在设置中添加、删除、重新排列快捷按钮；每个按钮可设置自定义标签和发送任意原始转义序列
- **发送任何内容**——配置按钮发送任意按键组合或转义序列（如 `\x03` 表示 Ctrl+C，`\x1b[A` 表示方向上键），打造专属工作流的快捷按钮栏
- **修饰键状态跟踪**——粘滞 Ctrl/Alt/Shift 修饰键，配合完整键盘布局使用
- 完整按键布局，包含所有可打印字符、功能键（F1–F12）和专用方向键区

### 内建文件和网页浏览器

Coding Agent 会生成代码、文档和网页——但验证产出通常需要切换到单独的文件管理器或浏览器。xterm-server 将两者都直接嵌入到终端旁边：

- **文件工作区**——树形文件浏览器，支持文件列表、上传、重命名和删除。点击任意文件即可预览
- **代码预览**——带行号的语法高亮源码（highlight.js），支持数十种语言
- **Markdown 预览**——实时渲染 Markdown，带 HTML 净化（marked + DOMPurify）
- **Office 文档**——直接在浏览器中预览 Word、Excel、PowerPoint 文件（officeparser）
- **媒体播放**——内建音频/视频播放器，支持进度条、音量和播放控制
- **图片预览**——支持常见格式的内联图片渲染
- **网页预览**——输入 URL 或本地端口号，在嵌入式 iframe 中浏览；内建反向代理（`/preview/:port/*`）路由到本地开发服务器，无需离开终端即可查看应用运行效果
- **地址栏**——输入 URL 或端口进行导航，自动检测网页/文件预览

这意味着 agent 可以执行 `npm run dev`、编写代码，用户可以立即验证结果——全部在一个浏览器标签页内完成。

## 与其他终端的对比

| 能力 | xterm-server | ttyd | gotty | Wetty | 传统终端（iTerm2 等） |
|---|---|---|---|---|---|
| 服务端虚拟终端（VT Screen） | ✅ 完整 VTE 解析，服务端掌握屏幕状态 | ❌ | ❌ | ❌ | N/A |
| 会话在断网后存活 | ✅ 自动重连 + 屏幕恢复 | ❌ 会话丢失 | ❌ 会话丢失 | ❌ 会话丢失 | 需要 tmux/screen |
| 刷新页面 = 恢复会话 | ✅ 回放滚动历史 + 屏幕快照 | ❌ 新建会话 | ❌ 新建会话 | ❌ 新建会话 | N/A |
| 内建文件浏览器和预览 | ✅ 代码、Markdown、Office、图片、音视频 | ❌ | ❌ | ❌ | ❌ |
| 内建网页预览（反向代理） | ✅ 在 iframe 中嵌入本地开发服务器 | ❌ | ❌ | ❌ | ❌ |
| 文件变更监听 | ✅ 通过 WebSocket 实时推送 | ❌ | ❌ | ❌ | ❌ |
| 可自定义快捷键盘 | ✅ 用户定义按键，支持原始转义序列 | ❌ | ❌ | ❌ | N/A |
| 多服务器管理 | ✅ 保存并切换服务器 | ❌ | ❌ | ❌ | N/A |
| 多面板 + 标签页同步 | ✅ DashMap 会话 + 同步 WebSocket | ❌ | ❌ | ❌ | ✅ 仅限本地 |
| 系统监控（CPU/内存/磁盘/网络） | ✅ 实时图表 | ❌ | ❌ | ❌ | ❌ |
| 命令面板 | ✅ | ❌ | ❌ | ❌ | ✅ |
| Token 认证 | ✅ | ✅ | ❌ | ✅ | N/A |
| 桌面应用 | ✅ Tauri | ❌ | ❌ | ❌ | 原生 |

**核心差异**：其他 Web 终端（ttyd、gotty、Wetty）只是 WebSocket 到 PTY 的透传管道——它们传输原始字节，对屏幕上显示的内容一无所知。xterm-server 在服务端运行**完整的虚拟终端仿真器**，这使得会话恢复、屏幕快照成为可能，提供了其他方案需要配合 tmux/screen 才能达到的弹性。结合内建的文件/网页浏览器，它提供了一个自包含的环境——Coding Agent 在其中工作，用户在其中验证结果——无需切换工具。

## 全部功能

- **虚拟终端仿真** — 服务端 VT Screen，完整支持 ANSI/SGR
- **会话持久化** — PTY 进程在断网后存活，自动重连并恢复状态
- **多面板会话** — 分屏管理多个终端面板，标签页同步
- **文件工作区** — 浏览、编辑、上传、预览文件（代码高亮、Markdown、Office 文档）
- **网页预览** — 内建反向代理，预览本地开发服务器
- **系统监控** — 通过 vue-chartjs 实时展示 CPU/内存/网络图表
- **命令面板** — 快速访问命令启动器
- **可自定义快捷键盘** — 为移动端和触屏设备添加 Ctrl/Esc/自定义转义序列按钮
- **设置与国际化** — 持久化设置，多语言支持
- **身份认证** — 基于 Token 的访问控制
- **桌面应用** — 可选的 Tauri 原生客户端

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Rust, Axum 0.7, Tokio, portable-pty, vte |
| 前端 | Vue 3, TypeScript, Vite, xterm.js 5 |
| 桌面端 | Tauri |

## 快速开始

### 前置条件

- Rust 工具链（stable）
- Node.js + pnpm（或 npm）

### 构建与运行

```bash
# 构建前端
cd frontend && pnpm install && pnpm run build && cd ..

# 运行服务器
cargo run
```

在浏览器中打开 http://127.0.0.1:8999 。

### 开发

```bash
# 带调试日志运行后端
RUST_LOG=debug cargo run

# 前端类型检查
cd frontend && npx vue-tsc --noEmit
```

## 项目结构

```
src/               # Rust 后端
  main.rs          # Axum 路由与服务入口
  ws.rs            # WebSocket ↔ PTY 桥接
  vt_screen.rs     # 虚拟终端仿真器（基于 VTE）
  session.rs       # 会话管理器（多面板）
  workspace.rs     # 文件工作区 API
  proxy.rs         # 反向代理（预览）
  monitor.rs       # 系统监控
  settings.rs      # 设置持久化
  auth.rs          # 身份认证
  file_watcher.rs  # 文件变更监听

frontend/          # Vue 3 SPA
  src/
    App.vue
    components/    # TabBar, TerminalPane, MobileKeyboard 等
    composables/   # useTerminal, useTransport, useSettings 等

src-tauri/         # Tauri 桌面客户端
docs/              # 设计文档
```

## WebSocket 协议

通过 `/ws` 传输的 JSON 消息：

| 方向 | `type` | 字段 |
|------|--------|------|
| 客户端 → 服务端 | `input` | `data: String` |
| 客户端 → 服务端 | `resize` | `cols: u16, rows: u16` |
| 服务端 → 客户端 | `output` | `data: String` |
| 服务端 → 客户端 | `shell_info` | `shell_type: String` |

## 许可证

MIT
