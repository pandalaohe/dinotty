# Design: per-surface `DINOTTY_URL` injection (dinotty fork)

- Date: 2026-07-14
- Repo/branch: `fork/dinotty` @ `custom` (base HEAD `33d9d033`)
- Status: v2.2 — code landed (uncommitted), codex code-review CLEAN; ready for build + E2E
- Audit trail: cross-suggest (A+B) → cross-audit design-lens (r1) → code-lens (r2) → implement → code-review r3 (#4 desktop startup-race fix iterated B→B′→B″; final CLEAN)

## 1. Problem

每个 dinotty 部署面(web-remote server 与 desktop app)在各自端口上监听 `POST /api/notify`。
Claude Code 的通知 hook 原本硬编码 `127.0.0.1:8998`,导致**桌面版(监听 8999)终端里的
claude 会话把通知发到 web UI(8998)**,而非它所属的桌面版 —— 串台。

目标:每个面把 `DINOTTY_URL=http://127.0.0.1:<该面实际绑定的端口>` 注入它 spawn 的每个终端,
hook 改用 `${DINOTTY_URL}/api/notify` → 通知永远回到拥有该终端的那个面。**一一对应,零串台。**

## 2. Ground truth(经两轮审计核实,修正 v1 的错数)

- 终端 env 注入唯一入口:`src/pty.rs` `create_session()`(fn@138),`CommandBuilder`@152,
  现注入 `TERM`@159 / `DINOTTY_PANE_ID`@160 / `DINOTTY_TAB_ID`@162。
- **`create_session` 有 5 个调用点**(v1 误记 4):`tabs.rs:70/204/230`、`ws/mod.rs:685`、
  `src-tauri/src/main.rs:190`(Tauri IPC `pty_spawn`)。这些**无需改动** —— manager 已带端口。
- **`SessionManager::new()` 有 20 个调用点**(v1 误记 8):生产 2 个(`main.rs:643`、
  `src-tauri/src/main.rs:507`)+ 测试 18 个(`session/tests.rs` 15 + `workspace/tests.rs` 3)。
- `SessionManager` 经 `lib.rs:32` 公开导出 → 改 `new()` 签名是**破坏性公共 API 变更**。
- S1 env-strip(`claude_session_env_keys_to_strip`,pty.rs:153-155)只删 `CLAUDE_CODE_*`/
  `CLAUDECODE`/`CLAUDE_SESSION_ID`,**故意保留所有 `DINOTTY_*`**(测试@pty.rs:624 锁定)。
- 端口来源:web `main.rs:642` 解析在 `643` 构造 manager 之前;desktop `src-tauri/src/main.rs:504`
  `parse_port` 在 `507` 构造 manager 之前。两面构造 manager 时端口均已知。
- desktop 把 `run_server(port, mgr)` 以 `tauri::async_runtime::spawn` **detach 异步**启动
  (`src-tauri/src/main.rs:536-538`),不等 bind;Tauri IPC `pty_spawn`(@190)可独立、立即创建终端。
- 已存在同名约定:`scripts/notify-done.sh:8` 已用 `DINOTTY_URL`(默认 8999)。docs 硬编码 8999。
- 仅一条真实 PTY spawn 路径(`portable_pty` @pty.rs:145/198),无 bypass。SSH 会话跑在远端,
  够不着本地 loopback,**范围外**。

## 3. Final design (v2.1)

### 3.1 SessionManager 携带端口(加法,不改签名)
- `src/session/mod.rs`:struct 加私有字段 `notify_port: AtomicU16`;`new()` 里 `AtomicU16::new(0)`;
  加 `notify_port(&self) -> u16` getter + `set_notify_port(&self, port: u16)` setter。
- **`new()` 签名与 `Default` 不动,零测试文件改动**(推翻 v1 的"强制 `new(port)`" —— 那是破坏
  公共 API + 18 处测试永久 merge 冲突)。`SessionManager` 非 serde-derive,新字段无需属性。

### 3.2 create_session 注入(pty.rs,`DINOTTY_PANE_ID` 之后)
```rust
cmd.env_remove("DINOTTY_URL");                       // 无条件先清(S1 保留 DINOTTY_*,防继承串台)
if let Some(url) = notify_url_for(manager.notify_port()) {
    cmd.env("DINOTTY_URL", url);
}
// fn notify_url_for(port: u16) -> Option<String> = (port != 0).then(|| format!("http://127.0.0.1:{port}"))
```
**`env_remove` 必须无条件**(即使 port==0)—— 这堵住"child 继承父进程 stale `DINOTTY_URL`"的串台洞。

### 3.3 端口来源 = 实际绑定端口 + bind-before-publish fail-safe
- **web `src/main.rs`**:bind 后、serve 前 `set_notify_port(listener.local_addr().expect("bound listener").port())`。web 无独立 IPC racing server,bind 成功才设,本就 fail-safe(bind 失败留 0)。`map_or(port,…)` 回落改 `expect`(codex #3:回落会在 local_addr 失败时发布 CLI 端口而非真实端口)。
- **desktop(v2.2 —— 推翻 v2.1 的 `:508` 构造期 set)**:构造期就 `set_notify_port(port)` 会在**未确认 own 端口**时发布端口 —— 若 bind 失败(端口被占/误配),desktop 仍注入该端口 → **串台**,违反 §4 fail-safe(codex r3 复审判定)。注意:`#4` 原症状(启动竞态窗口内 `pty_spawn` 读到 0)本身只是**良性漏发**,`:508` 用它换来了非良性的 bind 失败串台,方向错。改为 bind-before-publish:
  - `bind_listener(port)` = **同步 `std::net::TcpListener::bind` + `set_nonblocking(true)`**。std bind 无需 runtime → 避开 `.setup()` 内 `runtime.enter()` 已激活时再 `tauri::async_runtime::block_on` 的**嵌套-runtime panic**(codex r3 HIGH:否则桌面版每次启动崩)。
  - `src-tauri/src/main.rs` `.setup`:**同步** bind → 成功才 `set_notify_port(actual)` → `spawn(run_server(listener, mgr))`;bind 失败 → 记 error、notify_port 留 0(零串台)、app 继续。headless `--server`:同样先 bind 再 `run_server`(bind 失败 panic,同旧)。**无 `block_on`。**
  - `run_server` 改为**同步 factory `pub fn … -> impl Future<Output=()>`**:`from_std` 转 tokio listener(graceful `match{Err→log+return}`),`local_port` 来自 `listener.local_addr()`,并持有 **RAII `NotifyPortGuard`**(`Drop → set_notify_port(0)`)。guard 在**同步部分**创建、被 `async move` future **拥有** → future 无论 never-polled-drop / unwind panic / task abort / 正常退出都 reset 端口回 0。**不变量:notify_port≠0 ⟺ server 存活。**(caller 已在 spawn 前 set(actual),故成功路径无 pty_spawn 读到 0 的窗口。)

### 3.4 变量名 = 复用 `DINOTTY_URL`
不新造 `DINOTTY_NOTIFY_URL`。复用后 `scripts/notify-done.sh` **零改动**自动受益、对齐作者约定、PR 更干净。

### 3.5 hook 命令(本地配置,非仓库)
```
[ -n "$DINOTTY_PANE_ID" ] && [ -n "$DINOTTY_URL" ] && \
  curl -s -m 3 -X POST "${DINOTTY_URL}/api/notify" -H 'Content-Type: application/json' \
  -d "{...,\"pane_id\":\"$DINOTTY_PANE_ID\"}" || true
```
两变量都在才发:旧终端(还没 `DINOTTY_URL`)静默跳过 —— 零串台、零报错噪音,**不回落 8998**。

### 3.6 docs
`docs/notifications.md` + `.en.md`:env 表加 `DINOTTY_URL` 行;curl/hook 示例硬编码 8999 → `${DINOTTY_URL}`。

## 4. Fail-safe direction
`notify_port==0` → 不注入 → hook 守卫跳过 → **不发通知(绝不发错)**。所有退化路径(bind 失败、
启动竞态、旧终端、ephemeral)最坏结果都是"漏发",从不"发错家"。符合零串台目标。

## 5. Blast radius
4 个 `.rs`(session/mod.rs、pty.rs、main.rs、src-tauri/embedded_server.rs + v2.1 追加 src-tauri/main.rs)
+ **0 个测试文件被签名波及** + docs×2 + 本地 hook(settings.json + cc-switch×2)。一轮两面重编重装。

## 6. 审计结论(两轮)
- **Round 1(design-lens)**:codex FAIL / claude CONDITIONAL,收敛 must-fix:stale 继承串台、
  强制 `new(port)` 破坏 API、desktop 存未绑端口、命名冲突、ground-truth 数错 → 全部吸收进 §3。
- **Round 2(code-lens,对 v2 diff)**:claude PASS / codex FAIL。3 个旧 HIGH 两路一致 RESOLVED;
  codex 新提:#3 `map_or` 回落(→ `expect`,已修)、#4 desktop 启动竞态(初判 MED,以 `:508` 构造期 set 修 —— **后被 r3 推翻**)、#5 测试盲点(§7 跟踪)。
- **Round 3(code-lens,对实现迭代)** —— `#4` 的修法迭代三轮,每轮 codex 都揪出真 bug:
  - **B(:508 构造期 set)**:codex 判 MED —— 构造期发布端口,bind 失败时串台,违反 fail-safe。推翻 `:508`,改 bind-before-publish(§3.3)。
  - **B′(同步 bind + RAII guard 首版)**:codex 判 **HIGH** —— `.setup` 里 `tauri::async_runtime::block_on` 在 `runtime.enter()` 已激活的主线程上 → 嵌套-runtime panic,**桌面版必崩**。改 `bind_listener` 为同步 std bind(无 `block_on`);+ MED:guard 建在 `from_std().expect()` 之后,转换 panic 时端口已发布却无 guard。
  - **B″(sync factory `fn -> impl Future`,guard 由 future 拥有 + graceful from_std)**:codex 判 **CLEAN**。MED 全闭(never-polled-drop / panic / abort / 正常退出均 reset),无 Send/`'static`/lifetime 缺陷,无 success-path 零窗口。
  - 验证:`cargo check --workspace` exit 0;`cargo test -p dinotty-server --lib pty::` 8/8 pass。

## 7. Tracked follow-up(非阻塞)
- **测试盲点**:`notify_url_for` 已测端口映射,但"port=0 时无条件清除 stale `DINOTTY_URL`"这条不变量
  未被直接测试(仅代码复审确认)。建议后续把 env-ops 抽成可测小函数补一个回归测试。今日实现正确,不阻塞 ship。

## 8. Upstream/PR 备注
- 通用能力(终端知道该往哪发通知),可上游 —— 补 `docs/notifications.md` 即可。
- LOCAL_MODS.md 记为 upstreamable candidate。PR 前跑 infra-git-hygiene 泄漏闸;不带 `share/` 等未跟踪物。
