#!/usr/bin/env sh
# After wiping ./.sqld, a running libsql-server often returns HTTP 500 until it is restarted.
set -e
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

if ! command -v docker >/dev/null 2>&1; then
  exit 0
fi

if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx 'trackmun-sqld'; then
  echo "Restarting trackmun-sqld (volume was cleared; server must reopen data)..."
  docker restart trackmun-sqld >/dev/null
  # Give sqld time to bind and initialize an empty store
  sleep 4
fi
