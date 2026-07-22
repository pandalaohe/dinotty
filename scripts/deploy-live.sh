#!/usr/bin/env bash
# deploy-live.sh — DEPLOY tail ONLY: build the native macOS app, reinstall (staged +
# atomic), refresh asset cache (CONFIG-SAFE), relaunch. This does NO re-align / fetch /
# merge — that is the job of the /upstream-update skill. This script is what the skill's
# Phase I5 deploy step runs (declared in ../.upstream-update.json) after a successful
# re-align; it is also runnable standalone.
#
# CONFIG SAFETY GUARANTEE: never touches user config. Server-side Settings live in the
# backend store under ~/Library/Application Support/, per-device selections live in WKWebView
# localStorage under ~/Library/WebKit/<bid> — both outside the app bundle and outside git.
# The cache refresh clears ONLY the asset cache (~/Library/Caches/<bid>) via a HARDCODED
# literal path; it NEVER touches WebKit/ or Application Support/.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"
APP_NAME="Dinotty.app"
BID="com.dinotty.terminal"
DEST="/Applications/$APP_NAME"
STAGING="/Applications/.${APP_NAME}.new"
BACKUP="/Applications/${APP_NAME}.bak"

info(){ printf '\033[1;34m[deploy-live]\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31m[deploy-live ERR]\033[0m %s\n' "$*" >&2; exit 1; }
pid_exec_path(){ ps -p "$1" -o comm= 2>/dev/null || true; }

# This guard has a sibling copy in scripts/dinotty-ops.sh's assert_not_self_hosted().
# Keep the ancestor-walk logic in both copies in sync when either changes.
assert_not_self_hosted(){
  if [ "${DINOTTY_SKIP_SELFHOST_GUARD:-0}" = "1" ]; then
    info "self-host guard skipped via DINOTTY_SKIP_SELFHOST_GUARD=1"
    return 0
  fi
  local pid=$$ exec_path parent_pid guard=0
  while [ "${pid:-0}" -gt 1 ] && [ "$guard" -lt 50 ]; do
    exec_path="$(pid_exec_path "$pid")"
    [ -n "$exec_path" ] \
      || die "could not resolve executable path of ancestor PID $pid; cannot prove this shell isn't hosted by the instance at $DEST; set DINOTTY_SKIP_SELFHOST_GUARD=1 to override"
    case "$exec_path" in
      "$DEST/Contents/MacOS/"*)
        die "refusing: this command is running inside the production Dinotty instance about to be rebuilt at $DEST (ancestor PID $pid: $exec_path) — rebuilding it would kill this session; run from a separate Terminal.app / iTerm window or from the test instance's (8998) terminal" ;;
    esac
    parent_pid="$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ' || true)"
    [ -n "$parent_pid" ] \
      || die "could not resolve parent of ancestor PID $pid; cannot prove this shell isn't hosted by the instance at $DEST; set DINOTTY_SKIP_SELFHOST_GUARD=1 to override"
    pid="$parent_pid"
    guard=$((guard + 1))
  done
  [ "${pid:-0}" -le 1 ] \
    || die "ancestor chain too long to verify; cannot prove this shell isn't hosted by the instance at $DEST; set DINOTTY_SKIP_SELFHOST_GUARD=1 to override"
  return 0
}

# 0. precondition (sanity: correct repo root)
[ -d frontend ] || die "no frontend/ dir — run from fork/dinotty root"
assert_not_self_hosted

# 1. frontend verify gate — fail BEFORE touching the installed app
info "frontend: vitest + build ..."
( cd frontend && pnpm exec vitest run && pnpm build ) || die "frontend verify failed — fix before installing (installed app left untouched)"

# 2. native build (release; rebuilds the embedded frontend)
info "native: cargo tauri build ..."
cargo tauri build

# 3. locate built bundle
NEW_APP="target/release/bundle/macos/$APP_NAME"
[ -d "$NEW_APP" ] || die "built app not found at $NEW_APP"

# 4. quit the running app + verify termination (so the final relaunch starts the NEW binary,
#    not a still-running old instance). Bundle-path scoping ONLY: both instances' bundles
#    ship the same executable name (dinotty-desktop), so exec-name matching (pgrep -x)
#    would false-positive on the OTHER instance (e.g. Dinotty Test). pgrep -f patterns are
#    EREs, so paths are escaped (same sed as dinotty-ops.sh _proc_pattern); deliberately
#    UNanchored — a false "still running" dies safely, a missed match deploys wrongly.
#    Also match the freshly-built target/ bundle: a test-launched copy shares the app
#    identity and would hijack the final relaunch.
_path_pattern(){ printf '%s' "$1/Contents/MacOS/" | sed 's/[][\\.^$*+?(){}|]/\\&/g'; }
still_running(){
  pgrep -f "$(_path_pattern "$DEST")" >/dev/null 2>&1 && return 0
  pgrep -f "$(_path_pattern "$REPO_DIR/$NEW_APP")" >/dev/null 2>&1 && return 0
  return 1
}
osascript -e 'quit app "Dinotty"' 2>/dev/null || true
for _ in 1 2 3 4 5; do still_running || break; sleep 1; done
still_running && die "Dinotty still running after quit — close it manually and retry (installed app left untouched)"

# 5. staged atomic install with rollback (all paths in /Applications = same volume -> mv is atomic).
#    An EXIT trap cleans the staging copy and loudly surfaces a missing DEST after a failed swap.
_swap_in_progress=0
cleanup_install(){
  rm -rf "$STAGING" 2>/dev/null || true
  if [ "$_swap_in_progress" = 1 ] && [ ! -e "$DEST" ] && [ -d "$BACKUP" ]; then
    printf '\033[1;31m[deploy-live ERR]\033[0m CRITICAL: %s is missing after a failed swap. Restore manually: mv "%s" "%s"\n' "$DEST" "$BACKUP" "$DEST" >&2
  fi
}
trap cleanup_install EXIT
rm -rf "$STAGING"            # clean only our stale staging; keep any prior BACKUP until new staging is ready
cp -R "$NEW_APP" "$STAGING" || die "staging copy failed (installed app untouched)"
rm -rf "$BACKUP"            # new staging is ready — now safe to drop a prior backup
if [ -d "$DEST" ]; then
  _swap_in_progress=1
  mv "$DEST" "$BACKUP" || { _swap_in_progress=0; die "could not move current app aside (installed app untouched)"; }
fi
if ! mv "$STAGING" "$DEST"; then
  if [ -d "$BACKUP" ] && mv "$BACKUP" "$DEST"; then
    _swap_in_progress=0
    die "install move failed — rolled back to previous app"
  fi
  die "install move failed AND rollback failed — see recovery note above"
fi
_swap_in_progress=0
rm -rf "$BACKUP"
trap - EXIT
VER="$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$DEST/Contents/Info.plist")"
info "installed $APP_NAME v$VER at $DEST"

# 6. CONFIG-SAFE cache refresh — HARDCODED literal path, ONLY the asset cache.
#    Refuse if the Caches root or the target is a symlink (an intermediate symlink could redirect
#    the delete into ~/Library/WebKit or Application Support). NEVER touches localStorage/settings.
CACHE_DIR="$HOME/Library/Caches/com.dinotty.terminal"
[ -L "$HOME/Library/Caches" ] && die "~/Library/Caches is a symlink — refusing cache delete (config-safety)"
[ -L "$CACHE_DIR" ] && die "cache path is a symlink — refusing cache delete (config-safety)"
rm -rf "$CACHE_DIR"
info "cleared asset cache (Caches/$BID); localStorage + server settings PRESERVED"

# 7. relaunch — open and use
/usr/bin/env -u CLAUDE_CODE_CHILD_SESSION -u CLAUDECODE -u CLAUDE_SESSION_ID /usr/bin/open "$DEST"
info "done — v$VER launched, ready to use."
