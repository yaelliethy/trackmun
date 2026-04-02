#!/usr/bin/env bash
# Delete every Supabase Auth user via Admin API (paginated).
# Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/web/.dev.vars
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
VARS_FILE="$REPO_ROOT/apps/web/.dev.vars"

if [ ! -f "$VARS_FILE" ]; then
  echo "clear-supabase-auth: $VARS_FILE not found; skipping Supabase user cleanup."
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "clear-supabase-auth: jq is required. Install jq or skip this step." >&2
  exit 1
fi

# Parse first matching key only (avoid matching commented or prefixed duplicates)
URL=""
KEY=""
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    SUPABASE_URL=*)
      if [ -z "$URL" ]; then
        URL="${line#SUPABASE_URL=}"
        URL="${URL#\"}"
        URL="${URL%\"}"
        URL="${URL#\'}"
        URL="${URL%\'}"
        URL="${URL#"${URL%%[![:space:]]*}"}"
        URL="${URL%"${URL##*[![:space:]]}"}"
      fi
      ;;
    SUPABASE_SERVICE_ROLE_KEY=*)
      if [ -z "$KEY" ]; then
        KEY="${line#SUPABASE_SERVICE_ROLE_KEY=}"
        KEY="${KEY#\"}"
        KEY="${KEY%\"}"
        KEY="${KEY#\'}"
        KEY="${KEY%\'}"
        KEY="${KEY#"${KEY%%[![:space:]]*}"}"
        KEY="${KEY%"${KEY##*[![:space:]]}"}"
      fi
      ;;
  esac
done <"$VARS_FILE"

if [ -z "$URL" ] || [ -z "$KEY" ]; then
  echo "clear-supabase-auth: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in $VARS_FILE; skipping."
  exit 0
fi

URL=${URL%/}

PER_PAGE=1000
deleted=0

echo "clear-supabase-auth: listing users at $URL ..."

while true; do
  resp=$(curl -sfS -X GET \
    "$URL/auth/v1/admin/users?per_page=$PER_PAGE&page=1" \
    -H "apikey: $KEY" \
    -H "Authorization: Bearer $KEY") || {
    echo "clear-supabase-auth: failed to list users (check URL, service role key, and network)." >&2
    exit 1
  }

  count=$(echo "$resp" | jq -r '(.users // []) | length')
  if [ "$count" -eq 0 ]; then
    break
  fi

  echo "clear-supabase-auth: deleting batch of $count user(s)..."
  while IFS= read -r uid; do
    [ -z "$uid" ] && continue
    curl -sfS -X DELETE "$URL/auth/v1/admin/users/$uid" \
      -H "apikey: $KEY" \
      -H "Authorization: Bearer $KEY" >/dev/null || {
      echo "clear-supabase-auth: failed to delete user $uid" >&2
      exit 1
    }
    deleted=$((deleted + 1))
  done < <(echo "$resp" | jq -r '.users[]?.id // empty')
done

echo "clear-supabase-auth: finished (${deleted} user(s) removed)."
