#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
command -v uv >/dev/null || { echo 'Install uv first: https://docs.astral.sh/uv/'; exit 1; }
"$ROOT/scripts/pnpm.sh" --version >/dev/null
uv sync --project "$ROOT/engine" --frozen
"$ROOT/scripts/pnpm.sh" install --frozen-lockfile
uv run --project "$ROOT/engine" python -m abridge.memory.bootstrap
printf 'Ready. Run ./scripts/dev.sh (or ./scripts/dev.sh --ai after downloading the model).\n'
