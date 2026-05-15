#!/bin/bash
# Claude Code hook: notify dinotty when a task completes
# Usage: add to Claude Code settings as a post-response hook
#
# Example curl (standalone):
#   ./notify-done.sh "编译完成" "耗时 30s，消耗 5,000 tokens"

DINOTTY_URL="${DINOTTY_URL:-http://127.0.0.1:8999}"
TITLE="${1:-任务完成}"
BODY="${2:-}"
TYPE="${3:-success}"

curl -s -X POST "$DINOTTY_URL/api/notify" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg title "$TITLE" \
    --arg body "$BODY" \
    --arg type "$TYPE" \
    '{title: $title, body: $body, notification_type: $type}'
  )" > /dev/null
