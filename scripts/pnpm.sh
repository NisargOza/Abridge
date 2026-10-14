#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"

# Corepack reads the pinned packageManager in web/package.json. This also works
# in a regular terminal without Codex's bundled pnpm directory on PATH.
if command -v pnpm >/dev/null 2>&1; then
  exec pnpm "$@"
elif command -v corepack >/dev/null 2>&1; then
  export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  exec corepack pnpm "$@"
fi

echo 'Neither pnpm nor Corepack is available in this terminal.' >&2
echo 'Install pnpm 11.25 (https://pnpm.io/installation), then run this command again.' >&2
exit 127
