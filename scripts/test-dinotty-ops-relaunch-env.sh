#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BODY="$(awk '/^relaunch_instance\(\)\{/{on=1} on{print} on && /^}/{exit}' "$ROOT/scripts/dinotty-ops.sh")"

[ -n "${BODY:-}" ] || { printf 'could not extract relaunch_instance body\n' >&2; exit 1; }

DUMP="$(mktemp "${TMPDIR:-/tmp}/dinotty-relaunch-env.XXXXXX")"
trap 'rm -f "$DUMP"' EXIT

die(){ printf 'relaunch stub die: %s\n' "$*" >&2; exit 1; }

DEST="/tmp/dinotty-relaunch-test-dest"
NAME="Dinotty-relaunch-test"

export CI=true
export NO_COLOR=1
export CLAUDECODE=1
export CLAUDE_CODE_CHILD_SESSION=1
export CLAUDE_SESSION_ID=x
export TMUX_PANE=%0
export OMNIGENT=1

open_path='/usr/bin/open'
search="${open_path} \"\$DEST\""
replacement='/usr/bin/env > "$DUMP"'
FIXED_BODY="${BODY//$search/$replacement}"

[ "$FIXED_BODY" != "$BODY" ] || { printf 'failed to stub /usr/bin/open in relaunch_instance body\n' >&2; exit 1; }

eval "$FIXED_BODY"

relaunch_instance

[ -s "$DUMP" ] || { printf 'stub did not dump environment\n' >&2; exit 1; }

for polluted in CI NO_COLOR CLAUDECODE CLAUDE_CODE_CHILD_SESSION CLAUDE_SESSION_ID TMUX_PANE OMNIGENT; do
  if grep -q "^${polluted}=" "$DUMP"; then
    printf 'polluting variable leaked into relaunch env: %s\n' "$polluted" >&2
    exit 1
  fi
done

for required in HOME USER LOGNAME SHELL TMPDIR PATH; do
  grep -q "^${required}=" "$DUMP" || {
    printf 'required variable missing from relaunch env: %s\n' "$required" >&2
    exit 1
  }
done

while IFS= read -r line; do
  [ -n "$line" ] || continue
  name="${line%%=*}"
  case "$name" in
    HOME|USER|LOGNAME|SHELL|TMPDIR|PATH) : ;;
    *) printf 'unexpected variable in relaunch env: %s\n' "$name" >&2; exit 1 ;;
  esac
done < "$DUMP"
