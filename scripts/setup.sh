#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v uv >/dev/null || { echo 'Install uv first: https://docs.astral.sh/uv/'; exit 1; }
command -v pnpm >/dev/null || { echo 'Install pnpm first: https://pnpm.io/installation'; exit 1; }
uv sync --project "$ROOT/engine" --frozen
pnpm --dir "$ROOT/web" install --frozen-lockfile
uv run --project "$ROOT/engine" python -m abridge.memory.bootstrap
printf 'Ready. Run ./scripts/dev.sh (or ./scripts/dev.sh --ai after downloading the model).\n'
