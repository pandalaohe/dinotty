#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BODY="$(awk '/^relaunch_instance\(\)\{/{on=1} on{print} on && /^}/{exit}' "$ROOT/scripts/dinotty-ops.sh")"

for required in \
  '-u CLAUDE_CODE_CHILD_SESSION' \
  '-u CLAUDECODE' \
  '-u CLAUDE_SESSION_ID' \
  '-u NO_COLOR' \
  '/usr/bin/open "$DEST"'
do
  grep -F -- "$required" <<<"$BODY" >/dev/null || {
    printf 'missing relaunch environment guard: %s\n' "$required" >&2
    exit 1
  }
done
