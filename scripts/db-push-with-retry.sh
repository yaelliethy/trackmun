#!/usr/bin/env sh
# Retry db:push for transient failures (e.g. libsql HTTP 500 right after wiping the volume).
# Aborts immediately on obvious non-retryable errors (missing Node, bad Drizzle config).
set -e
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

MAX_ATTEMPTS=${DB_PUSH_MAX_ATTEMPTS:-40}
SLEEP_SECS=${DB_PUSH_RETRY_SLEEP:-2}
attempt=0

LOG=$(mktemp)
trap 'rm -f "$LOG"' EXIT

should_abort() {
  grep -qE 'exec: node: not found|spawn ENOENT|is a required option for driver' "$LOG" 2>/dev/null
}

while true; do
  set +e
  pnpm run db:push >"$LOG" 2>&1
  code=$?
  set -e

  if [ "$code" -eq 0 ]; then
    cat "$LOG"
    exit 0
  fi

  cat "$LOG"

  if should_abort; then
    echo "db:push: non-retryable error, aborting." >&2
    exit 1
  fi

  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "db:push failed after $MAX_ATTEMPTS attempts." >&2
    exit 1
  fi

  echo "db:push failed (attempt $attempt/$MAX_ATTEMPTS), retrying in ${SLEEP_SECS}s..."
  sleep "$SLEEP_SECS"
done
