# Web 终端下划线泄漏 — 修复设计(rev3,真机定位后重写)

- 日期: 2026-07-14
- 类型: fix(后端 VT 解析器)
- 范围: `src/vt_screen.rs`(单文件,一处)
- 面: web 前端表现,根因在后端;native 也走同一解析器,一并受益

## 0. rev1/rev2 全错,rev3 由真机 E2E 定位重写

rev1(前端 `clearTextureAtlas`)、rev2(前端 post-replay 清渲染层)都基于同一个**错误前提**:"下划线是 WebGL 渲染残影,不在缓冲区"。用 Playwright 真机复现 + 插桩后推翻:

- 直接读客户端 `buffer.active` 单元格属性:**每个 cell 的 `isUnderline()==1`** —— 下划线是**真实单元格属性**,不是渲染残影。
- 因此 `clearTextureAtlas()`、`renderService.clear()+refresh()` 都无效(从缓冲区重绘,缓冲区本身就带下划线)——真机各截图为证(shots/08-11)。
- "resize 能清"不是清 GPU,而是 resize 让 PTY 里的 TUI(Claude Code)**重画一屏**、用正确输出覆盖坏 cell。
- rev1 的前端修复已在真机确认**无效**(用户实测 + 我 Playwright 复现)。已全部撤销。

## 1. 现象(真机实测)

- 跑全屏 TUI(Claude Code)后 reload/重连,满屏每个字底下出现下划线(空格处无字形,故看着像"每词一条")。
- `reset`/`\033[0m` 清不掉;真实拖窗 resize 能清;reload 清不掉;native 无。

## 2. 根因(真机插桩锁定)

**后端 VT 解析器把私有标记序列 `CSI > 4 ; 2 m` 误当成 SGR 处理。**

定位链:
1. 后端 `snapshot()` 插桩:跑 claude 后 `underline_cells=1097`(≈全部非空 cell),字节头 `␛[0;2;4m░░░`——连 logo 方块字都带下划线(4)+dim(2)。
2. 捕获 Claude Code 原始 PTY 输出:**全程没有任何 `\e[4m`/`24`**(它根本不发下划线 SGR),但开头有 `␛[>4;2m`。
3. `\e[>4;2m` = **XTMODKEYS / modifyOtherKeys**(私有前缀 `>`),标准终端(xterm 客户端)按私有序列忽略,不影响渲染 —— 所以 live 干净。
4. 后端 `csi_dispatch`(`src/vt_screen.rs:840`)只对 `intermediates == b"?"`(DECSET)做了私有分支,对 `>`/`<`/`=` **没有判断**,直接落到 `match action` 的 `'m'` 分支 → `apply_sgr([4, 2])` → 给 cursor 设 underline(4)+dim(2),**永不复位** → 之后每个 print 的 cell(`print()` 复制 `cursor.attrs`)都被污染。
5. reload 时后端把这个满是下划线的缓冲区 `snapshot()` 编码发给客户端 → 客户端忠实渲染 → 满屏下划线。

leak 的属性(underline+dim)正好对应 `>4;2m` 的参数 `4` 和 `2`,闭环自洽。

## 3. 修法(单文件一处)

`'m'`(SGR)只在**无 intermediate / 无私有标记**时才应用:

```rust
'm' => {
    // SGR 仅适用于标准 CSI(无私有标记/intermediate)。
    // `CSI > Pm m`(XTMODKEYS/modifyOtherKeys,Claude Code 等 TUI 会发)
    // 必须不当作 SGR,否则其参数泄漏进 cursor attrs(如 >4;2m → 满屏下划线+dim)。
    if intermediates.is_empty() {
        self.apply_sgr(params);
    }
}
```

- `>`/`<`/`=`/`?` 前缀在 vte 里进入 `intermediates`;`?` 已在函数上方单独处理并 return,其余私有 `m` 由此守卫忽略。
- 屏幕缓冲模型本就不该建模 modifyOtherKeys(那是键盘模式,非渲染),忽略语义正确、无副作用。
- 合法下划线 `\e[4m`(intermediate 为空)不受影响,照常 `apply_sgr`。

## 4. 验证(真机 5 轮 E2E,Playwright)

复现:登录 8997 → 跑 `claude`(全屏 TUI)→ reload。

| 轮 | 场景 | 结果 | 证据 |
|---|---|---|---|
| 1 | claude 主题界面 reload | 干净,`underline_cells=0`(修前 1097) | shots/12 + 后端日志 |
| 2 | 连续双 reload | 干净 | shots/13 |
| 3 | 全新 claude 登录界面 reload | 干净 | shots/14 |
| 4 | 合法下划线 + reload | `REAL_UL`/`UL2` 保留下划线,其余全不带 | shots/16 |
| 5 | 再 reload(幂等) | 稳定 | shots/17 |

修复既消除泄漏,又完整保留合法下划线的开/关(回归通过)。

## 5. Blast radius

- 单文件 `src/vt_screen.rs` 一处,+6 行守卫。
- native 与 web 共用此解析器 → 两端一并修复。
- 不动前端(rev1/rev2 前端改动已全部撤销)。
- 风险面:是否误伤需要处理的私有 `m` 序列?屏幕模型只关心渲染,`>/</=` 前缀的 `m` 均为键盘/设备模式,忽略正确。`?` 前缀(DECSET)已在守卫之前 return,不受影响。

## 6. 自测环境(可复现)

- 独立实例:临时 HOME + `DINOTTY_TOKEN` 起 `dinotty-server -p 8997`,Playwright 驱动、截图存 `shots/`。
- 触发器:任何发 `CSI > ... m`(modifyOtherKeys)的全屏 TUI(Claude Code、多数现代 TUI)+ reconnect/reload。

## 7. 参考

- 原始输出捕获分析、snapshot 插桩日志(调试用,已移除)。
- 老修复 `329fa76e`(`src/vt_screen.rs` SGR `4:0`)是**另一层**(合法下划线的 colon 子参数),与本次私有标记误判无关。
