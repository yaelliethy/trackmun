#!/usr/bin/env sh
# Clear ./.sqld (libSQL data). Docker sqld often leaves root-owned files; host rm then fails.
set -e
REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

rm -rf local.db 2>/dev/null || true

if [ ! -d .sqld ] || [ -z "$(ls -A .sqld 2>/dev/null)" ]; then
  mkdir -p .sqld
  exit 0
fi

if rm -rf .sqld/* 2>/dev/null; then
  mkdir -p .sqld
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "db:reset: cannot remove .sqld (permission denied). Install Docker, or run: docker compose stop sqld && sudo rm -rf .sqld" >&2
  exit 1
fi

docker run --rm -v "$REPO_ROOT/.sqld:/d" alpine:3.20 find /d -mindepth 1 -delete
mkdir -p .sqld
