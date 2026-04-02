#!/usr/bin/env sh
# Apply migrations to Turso after a wipe (used by db:reset).
# Runs Node with @libsql/client from the worker package.
set -e
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"
pnpm --filter @trackmun/web exec node "$REPO_ROOT/apps/web/scripts/reset-turso-migrations.mjs"
