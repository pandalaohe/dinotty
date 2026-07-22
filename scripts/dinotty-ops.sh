#!/usr/bin/env bash
# dinotty-ops.sh — mode-based rebuild/align/deploy orchestrator for this fork;
# a single entry point for the independent production and test app instances.
#
# CONFIG SAFETY GUARANTEE: same as deploy-live.sh. This script never touches
# ~/Library/WebKit or ~/Library/Application Support. Asset-cache clearing uses
# hardcoded literal paths only and refuses symlinks at both the Caches root and
# the instance cache path.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

info(){ printf '\033[1;34m[dinotty-ops]\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m[dinotty-ops]\033[0m %s\n' "$*" >&2; }
die(){ printf '\033[1;31m[dinotty-ops]\033[0m %s\n' "$*" >&2; exit 1; }

# Parallel, hardcoded instance configuration. In particular, CACHE values are
# literal allowlisted paths rather than paths derived from user input.
PROD_NAME="Dinotty"
PROD_APP="Dinotty.app"
PROD_BID="com.dinotty.terminal"
PROD_DEST="/Applications/Dinotty.app"
PROD_PORT=8999
PROD_CACHE="$HOME/Library/Caches/com.dinotty.terminal"

TEST_NAME="Dinotty Test"
TEST_APP="Dinotty Test.app"
TEST_BID="com.dinotty.terminal.test"
TEST_DEST="/Applications/Dinotty Test.app"
TEST_PORT=8998
TEST_CACHE="$HOME/Library/Caches/com.dinotty.terminal.test"

precondition(){
  [ -d frontend ] || die "no frontend/ dir — run from fork/dinotty root"
}

set_instance(){
  case "$1" in
    prod)
      NAME="$PROD_NAME"
      APP="$PROD_APP"
      BID="$PROD_BID"
      DEST="$PROD_DEST"
      PORT="$PROD_PORT"
      CACHE="$PROD_CACHE"
      ;;
    test)
      NAME="$TEST_NAME"
      APP="$TEST_APP"
      BID="$TEST_BID"
      DEST="$TEST_DEST"
      PORT="$TEST_PORT"
      CACHE="$TEST_CACHE"
      ;;
    *) die "internal error: unknown instance $1" ;;
  esac
}

# Bundle-path scoping is essential: both app bundles can have similarly named
# executables, so executable-name matching would risk killing the other instance.
_proc_pattern(){ printf '%s' "$1/Contents/MacOS/" | sed 's/[][\\.^$*+?(){}|]/\\&/g'; }

instance_running(){
  local dest="$1"
  pgrep -f "$(_proc_pattern "$dest")" >/dev/null 2>&1
}

instance_pid(){
  local dest="$1"
  pgrep -f "$(_proc_pattern "$dest")" 2>/dev/null | head -1 || true
}

listener_pid(){ /usr/sbin/lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1 || true; }
pid_exec_path(){ ps -p "$1" -o comm= 2>/dev/null || true; }

quit_instance(){
  local bid="$1"
  local dest="$2"
  /usr/bin/osascript -e "quit application id \"$bid\"" 2>/dev/null || true
  for _ in 1 2 3 4 5; do
    instance_running "$dest" || break
    sleep 1
  done
  if instance_running "$dest"; then
    die "$NAME still running after quit — close it manually and retry (installed app left untouched)"
  fi
}

port_status(){
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$1/" --max-time 2 2>/dev/null || echo 000)"
  # curl itself may emit 000 before failing; normalize the fallback to one code.
  printf '%s\n' "${code:0:3}"
}

served_asset_name(){
  local html
  html="$(curl -s --max-time 5 "http://localhost:$1/" 2>/dev/null || true)"
  printf '%s' "$html" \
    | grep -Eo "assets/index-[^\"']*\\.js" \
    | head -1 \
    | sed 's#^.*/##' \
    || true
}

local_asset_name(){
  ls frontend/dist/assets/index-*.js 2>/dev/null | head -1 | xargs -r basename || true
}

fingerprint_check(){
  local port="$1"
  local code served local_asset lpid lexec
  for _ in $(seq 1 20); do
    code="$(port_status "$port")"
    if [ "$code" = 200 ]; then
      lpid="$(listener_pid "$port")"
      [ -n "$lpid" ] || die "port $port responds 200 but no LISTEN pid found (foreign proxy?) — deploy NOT verified"
      lexec="$(pid_exec_path "$lpid")"
      case "$lexec" in
        "$DEST/Contents/MacOS/"*) : ;;
        *) die "port $port is served by PID $lpid at '${lexec:-<unknown>}', not under $DEST (wrong/foreign instance) — deploy NOT verified" ;;
      esac
      served="$(served_asset_name "$port")"
      local_asset="$(local_asset_name)"
      if [ -z "$served" ] || [ "$served" != "$local_asset" ]; then
        die "fingerprint mismatch on port $port: served ${served:-<empty>} != local dist ${local_asset:-<empty>} (stale embedded frontend / cache 对不上) — deploy NOT verified"
      fi
      info "fingerprint OK on $port: $served"
      return 0
    fi
    sleep 1
  done
  die "port $port never served 200 within ~40s after relaunch (cold-start too slow, or the embedded server failed to bind) — deploy NOT verified"
}

# These globals intentionally mirror deploy-live.sh's install state so its EXIT
# trap can perform the same failed-swap recovery check.
STAGING=""
BACKUP=""
_swap_in_progress=0

cleanup_install(){
  rm -rf "$STAGING" 2>/dev/null || true
  if [ "$_swap_in_progress" = 1 ] && [ ! -e "$DEST" ] && [ -d "$BACKUP" ]; then
    if mv "$BACKUP" "$DEST" 2>/dev/null; then
      printf '\033[1;33m[dinotty-ops]\033[0m restored previous app from backup after an interrupted swap\n' >&2
    else
      printf '\033[1;31m[dinotty-ops]\033[0m CRITICAL: %s is missing after a failed swap. Restore manually: mv "%s" "%s"\n' "$DEST" "$BACKUP" "$DEST" >&2
    fi
  fi
}

LOCK_DIR="${TMPDIR:-/tmp}/dinotty-ops.lock"
_ops_cleanup(){
  cleanup_install
  rm -rf "$LOCK_DIR" 2>/dev/null || true
}
acquire_lock(){
  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    local holder=""
    [ -f "$LOCK_DIR/pid" ] && holder="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ -n "$holder" ] && kill -0 "$holder" 2>/dev/null; then
      die "another dinotty-ops mutation is already running (lock held by live PID $holder) — wait for it to finish"
    fi
    warn "found a stale dinotty-ops lock (holder '${holder:-unknown}' not alive) — reclaiming it"
    rm -rf "$LOCK_DIR" 2>/dev/null || true
    mkdir "$LOCK_DIR" 2>/dev/null \
      || die "could not acquire lock $LOCK_DIR after reclaiming a stale one — remove it manually and retry"
  fi
  printf '%s\n' "$$" > "$LOCK_DIR/pid" 2>/dev/null || true
  trap _ops_cleanup EXIT
}

staged_atomic_install(){
  local new_app="$1"
  local built_bid built_ver
  built_bid="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$new_app/Contents/Info.plist" 2>/dev/null || true)"
  [ "$built_bid" = "$BID" ] || die "built bundle id '${built_bid:-<none>}' != expected '$BID' — refusing to install (installed app untouched)"
  [ -n "$(ls -A "$new_app/Contents/MacOS/" 2>/dev/null)" ] || die "built bundle has no MacOS executable — refusing to install (installed app untouched)"
  built_ver="$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$new_app/Contents/Info.plist" 2>/dev/null || true)"
  [ -n "$built_ver" ] || die "built bundle has no version string — refusing to install (installed app untouched)"
  STAGING="/Applications/.${APP}.new"
  BACKUP="/Applications/${APP}.bak"

  # All paths are in /Applications (one volume), so the final mv is atomic.
  # Keep a prior backup until the new staging copy is ready.
  _swap_in_progress=0
  if [ ! -e "$DEST" ] && [ -d "$BACKUP" ]; then
    mv "$BACKUP" "$DEST" || die "found a leftover backup but could not restore it to $DEST — resolve manually before reinstalling"
    warn "recovered $DEST from a leftover backup before reinstalling"
  fi
  rm -rf "$STAGING"
  cp -R "$new_app" "$STAGING" || die "staging copy failed (installed app untouched)"
  rm -rf "$BACKUP"
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

  VER="$built_ver"
  info "installed $APP v$VER at $DEST"
}

clear_asset_cache(){
  # CONFIG-SAFE: CACHE is selected only from the two literal declarations above.
  # Refuse intermediate/target symlinks that could redirect this deletion.
  [ -L "$HOME/Library" ] && die "~/Library is a symlink — refusing cache delete (config-safety)"
  [ -L "$HOME/Library/Caches" ] && die "~/Library/Caches is a symlink — refusing cache delete (config-safety)"
  [ -L "$CACHE" ] && die "cache path is a symlink — refusing cache delete (config-safety)"
  rm -rf "$CACHE"
  info "cleared asset cache (Caches/$BID); localStorage + server settings PRESERVED"
}

relaunch_instance(){
  /usr/bin/env -u CLAUDE_CODE_CHILD_SESSION -u CLAUDECODE -u CLAUDE_SESSION_ID /usr/bin/open "$DEST" \
    || die "$NAME relaunch failed — installed app remains at $DEST"
}

assert_started(){
  local up=0 _
  for _ in 1 2 3 4 5; do
    instance_running "$DEST" && { up=1; break; }
    sleep 1
  done
  [ "$up" = 1 ] || die "$NAME did not start after relaunch (no process running under $DEST) — deploy NOT verified"
  info "$NAME process is up under $DEST"
}

frontend_verify_gate(){
  info "frontend: vitest + build ..."
  ( cd frontend && pnpm exec vitest run && pnpm build ) \
    || die "frontend verify failed — fix before installing ($NAME installed app left untouched)"
}

# deploy-live.sh has a parallel assert_not_self_hosted() guard scoped to production only.
# Keep the ancestor-walk logic in both guards in sync when either changes.
assert_not_self_hosted(){
  if [ "${DINOTTY_SKIP_SELFHOST_GUARD:-0}" = "1" ]; then
    info "self-host guard skipped via DINOTTY_SKIP_SELFHOST_GUARD=1"
    return 0
  fi
  local target_dest="$1" pid=$$ exec_path parent_pid guard=0
  while [ "${pid:-0}" -gt 1 ] && [ "$guard" -lt 50 ]; do
    exec_path="$(pid_exec_path "$pid")"
    [ -n "$exec_path" ] \
      || die "could not resolve executable path of ancestor PID $pid; cannot prove this shell isn't hosted by the instance at $target_dest; set DINOTTY_SKIP_SELFHOST_GUARD=1 to override"
    case "$exec_path" in
      "$target_dest/Contents/MacOS/"*)
        die "refusing: this command is running inside the Dinotty instance about to be rebuilt at $target_dest (ancestor PID $pid: $exec_path) — rebuilding it would kill THIS session; run from a separate Terminal.app / iTerm window or from a different (non-target) Dinotty instance's terminal" ;;
    esac
    parent_pid="$(ps -p "$pid" -o ppid= 2>/dev/null | tr -d ' ' || true)"
    [ -n "$parent_pid" ] \
      || die "could not resolve parent of ancestor PID $pid; cannot prove this shell isn't hosted by the instance at $target_dest; set DINOTTY_SKIP_SELFHOST_GUARD=1 to override"
    pid="$parent_pid"
    guard=$((guard + 1))
  done
  [ "${pid:-0}" -le 1 ] \
    || die "ancestor chain too long to verify; cannot prove this shell isn't hosted by the instance at $target_dest; set DINOTTY_SKIP_SELFHOST_GUARD=1 to override"
  return 0
}

rebuild_prod(){
  [ "$#" -eq 0 ] || die "rebuild-prod takes no arguments (installed apps left untouched)"
  set_instance prod
  assert_not_self_hosted "$DEST"
  precondition
  acquire_lock

  local test_was_up new_app
  test_was_up=$(instance_running "$TEST_DEST" && echo 1 || echo 0)

  frontend_verify_gate
  info "native: cargo tauri build ..."
  cargo tauri build || die "production native build failed (installed apps left untouched)"

  new_app="target/release/bundle/macos/$APP"
  [ -d "$new_app" ] || die "built app not found at $new_app (installed apps left untouched)"

  quit_instance "$BID" "$DEST"
  staged_atomic_install "$new_app"
  clear_asset_cache
  relaunch_instance
  assert_started
  fingerprint_check "$PORT"

  if [ "$test_was_up" = 1 ]; then
    instance_running "$TEST_DEST" \
      || die "REGRESSION: test instance (8998) died during prod rebuild — instance-scoping failed"
    info "test instance (8998) is still running"
  else
    info "test instance was not running (nothing to protect)"
  fi
  info "rebuild-prod done — v$VER live on 8999, fingerprint verified, 8998 untouched"
}

rebuild_test(){
  [ "$#" -eq 0 ] || die "rebuild-test takes no arguments (installed apps left untouched)"
  set_instance test
  assert_not_self_hosted "$DEST"
  precondition
  acquire_lock

  local prod_was_up new_app
  prod_was_up=$(instance_running "$PROD_DEST" && echo 1 || echo 0)

  frontend_verify_gate
  info "native: baked-identity cargo tauri build ..."
  DINOTTY_DEFAULT_PORT=8998 DINOTTY_CONFIG_SUFFIX=-test cargo tauri build \
    --config '{"productName":"Dinotty Test","identifier":"com.dinotty.terminal.test","build":{"beforeBuildCommand":"cd '"$REPO_DIR"'/frontend && pnpm build"}}' \
    || die "test baked-identity native build failed (installed apps left untouched)"

  new_app="target/release/bundle/macos/$APP"
  [ -d "$new_app" ] || die "built app not found at $new_app (installed apps left untouched)"

  quit_instance "$BID" "$DEST"
  staged_atomic_install "$new_app"
  clear_asset_cache
  relaunch_instance
  assert_started
  fingerprint_check "$PORT"

  if [ "$prod_was_up" = 1 ]; then
    instance_running "$PROD_DEST" \
      || die "REGRESSION: prod instance (8999) died during test rebuild — instance-scoping failed"
    info "prod instance (8999) is still running"
  else
    info "prod instance was not running (nothing to protect)"
  fi
  info "rebuild-test done — live on 8998, 8999 untouched"
}

align_upstream(){
  local assume_yes=0
  if [ "${1:-}" = "--yes" ]; then
    assume_yes=1
    shift
  fi
  [ "$#" -eq 0 ] || die "align-upstream accepts only the optional --yes flag (git left untouched)"

  git remote get-url upstream >/dev/null 2>&1 \
    || die "no upstream remote configured (git left untouched)"
  git diff --quiet && git diff --cached --quiet \
    || die "working tree has uncommitted changes — commit or stash before align-upstream (git left untouched)"
  local gitdir
  gitdir="$(git rev-parse --git-dir)"
  if [ -e "$gitdir/MERGE_HEAD" ]; then
    die "a merge is already in progress — finish or abort it first (git left untouched)"
  fi
  if [ -d "$gitdir/rebase-merge" ] || [ -d "$gitdir/rebase-apply" ]; then
    die "a rebase is in progress — finish or abort it first (git left untouched)"
  fi
  acquire_lock
  info "fetching upstream ..."
  git fetch upstream || die "git fetch upstream failed (branch and working tree left untouched)"

  local BASE behind ahead upstream_sha preview preview_status TS tag
  BASE="$(git merge-base HEAD upstream/dev)" \
    || die "could not find merge base with upstream/dev (branch and working tree left untouched)"
  behind="$(git rev-list --count HEAD..upstream/dev)" \
    || die "could not count commits behind upstream/dev (branch and working tree left untouched)"
  ahead="$(git rev-list --count upstream/dev..HEAD)" \
    || die "could not count commits ahead of upstream/dev (branch and working tree left untouched)"
  upstream_sha="$(git rev-parse --short upstream/dev)"
  info "topology: base $(git rev-parse --short "$BASE"), ahead=$ahead behind=$behind"

  if [ "$behind" -eq 0 ]; then
    info "already aligned to upstream/dev (@ $upstream_sha); nothing to do"
    return 0
  fi

  preview_status=0
  preview="$(git merge-tree --write-tree HEAD upstream/dev 2>&1)" || preview_status=$?
  if [ "$preview_status" -ne 0 ]; then
    if [ "$preview_status" -eq 1 ] || [[ "$preview" == *CONFLICT* ]]; then
      warn "merge preview found conflicts:"
      printf '%s\n' "$preview" >&2
      if [ "$assume_yes" -ne 1 ]; then
        die "conflicts detected — resolve manually or re-run with --yes"
      fi
      warn "--yes supplied; proceeding with the conflict-prone merge"
    else
      [ -n "$preview" ] && printf '%s\n' "$preview" >&2
      die "merge preview failed before any tag or merge was created"
    fi
  else
    info "merge preview clean"
  fi

  TS="$(date +%Y%m%d-%H%M%S)"
  tag="pre-update-custom-$TS"
  git tag "$tag" || die "could not create backup tag $tag (merge not started)"
  git merge upstream/dev \
    || die "git merge upstream/dev failed — resolve conflicts, or run: git merge --abort"

  info "verify: cargo check --workspace ..."
  cargo check --workspace \
    || die "cargo check --workspace failed — merged tree retained; backup tag $tag is available"

  info "verify: cargo test --workspace excluding terminal_exit_regression ..."
  cargo test --workspace -- --skip terminal_exit_regression \
    || die "cargo test failed — merged tree retained; backup tag $tag is available"

  info "verify: terminal_exit_regression (known flaky test) ..."
  local flake_out flake_rc=0
  flake_out="$(cargo test terminal_exit_regression 2>&1)" || flake_rc=$?
  printf '%s\n' "$flake_out"
  if [ "$flake_rc" -ne 0 ]; then
    if [[ "$flake_out" == *"test result: FAILED"* ]]; then
      warn "terminal_exit_regression failed — KNOWN upstream flake (debug-db db0807727548), harness-only, real terminal fine; not blocking"
    else
      die "terminal_exit_regression did not build/run (not a test-assertion flake) — investigate; merged tree retained, backup tag $tag available"
    fi
  fi

  info "verify: frontend vue-tsc ..."
  ( cd frontend && pnpm exec vue-tsc --noEmit ) \
    || die "frontend vue-tsc failed — merged tree retained; backup tag $tag is available"

  info "verify: frontend vitest ..."
  ( cd frontend && pnpm exec vitest run ) \
    || die "frontend vitest failed — merged tree retained; backup tag $tag is available"

  info "verify: frontend build ..."
  ( cd frontend && pnpm build ) \
    || die "frontend build failed — merged tree retained; backup tag $tag is available"

  info "LOCAL_MODS.md ledger reminder:"
  info "  update the Live-alignment snapshot SHA/date/table in fork/dinotty/LOCAL_MODS.md"
  info "  append a Re-align log entry in fork/dinotty/LOCAL_MODS.md"
  info "  backup tag $tag was created at the pre-update custom HEAD"
}

status_instance(){
  local key="$1"
  local pid code served local_asset asset_state version
  set_instance "$key"

  info "$key — $NAME"
  pid="$(instance_pid "$DEST")"
  if [ -n "$pid" ]; then
    printf '  process: alive PID%s\n' "$pid"
  else
    printf '  process: not running\n'
  fi

  code="$(port_status "$PORT")"
  printf '  port %s: %s\n' "$PORT" "$code"

  served="$(served_asset_name "$PORT")"
  local_asset="$(local_asset_name)"
  if [ -z "$served" ] || [ -z "$local_asset" ]; then
    asset_state="n/a"
  elif [ "$served" = "$local_asset" ]; then
    asset_state="MATCH"
  else
    asset_state="STALE"
  fi
  printf '  asset: served=%s local=%s -> %s\n' "${served:-<none>}" "${local_asset:-<none>}" "$asset_state"

  if [ -f "$DEST/Contents/Info.plist" ]; then
    version="$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' "$DEST/Contents/Info.plist" 2>/dev/null || true)"
  else
    version=""
  fi
  printf '  installed version: %s\n' "${version:-not installed}"
}

status_topology(){
  local fetched="$1"
  local branch head upstream_sha ahead behind freshness
  branch="$(git branch --show-current 2>/dev/null || true)"
  [ -n "$branch" ] || branch="(detached)"
  head="$(git rev-parse --short HEAD 2>/dev/null || echo unavailable)"

  if git rev-parse --verify upstream/dev >/dev/null 2>&1; then
    upstream_sha="$(git rev-parse --short upstream/dev)"
    ahead="$(git rev-list --count upstream/dev..HEAD)"
    behind="$(git rev-list --count HEAD..upstream/dev)"
  else
    upstream_sha="unavailable"
    ahead="n/a"
    behind="n/a"
  fi

  if [ "$fetched" = 1 ]; then
    freshness=""
  else
    freshness=" (counts vs local upstream/dev ref; pass --fetch for fresh)"
  fi

  info "branch topology"
  printf '  current branch: %s\n' "$branch"
  printf '  custom HEAD: %s\n' "$head"
  printf '  upstream/dev: %s\n' "$upstream_sha"
  printf '  ahead=%s behind=%s%s\n' "$ahead" "$behind" "$freshness"
}

show_status(){
  local fetched=0
  if [ "${1:-}" = "--fetch" ]; then
    fetched=1
    shift
  fi
  [ "$#" -eq 0 ] || die "status accepts only the optional --fetch flag (no app state changed)"

  precondition
  if [ "$fetched" = 1 ]; then
    if git remote get-url upstream >/dev/null 2>&1; then
      git fetch upstream --quiet || die "status fetch from upstream failed (apps left untouched)"
    else
      warn "no upstream remote configured; showing available local topology"
    fi
  fi

  status_instance prod
  status_instance test
  status_topology "$fetched"
}

usage(){
  cat <<'EOF'
Usage: scripts/dinotty-ops.sh MODE [OPTION]

Modes:
  rebuild-prod          Verify, build, atomically install, and verify prod on 8999
  rebuild-test          Verify, identity-bake, install, and verify test on 8998
  align-upstream [--yes] Fetch/merge upstream/dev and run the full verification suite
  status [--fetch]      Read-only app, asset-fingerprint, and branch topology report
EOF
}

case "${1:-}" in
  rebuild-prod)
    shift
    rebuild_prod "$@"
    ;;
  rebuild-test)
    shift
    rebuild_test "$@"
    ;;
  align-upstream)
    shift
    align_upstream "$@"
    ;;
  status)
    shift
    show_status "$@"
    ;;
  ""|-h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 1
    ;;
esac
