#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
command -v uv >/dev/null || { echo 'Install uv first: https://docs.astral.sh/uv/'; exit 1; }
# Check tools before starting any service; never print a ready URL after a
# background command failed because its executable was missing.
"$ROOT/scripts/pnpm.sh" --version >/dev/null
API_PID=''; WEB_PID=''; AI_PID=''
cleanup() {
  for process in "$WEB_PID" "$API_PID" "$AI_PID"; do
    if [ -n "$process" ]; then kill "$process" 2>/dev/null || true; fi
  done
}
trap cleanup EXIT INT TERM
for port in 8000 5173; do
  if lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port $port is already in use. Keep using that session or stop it before starting another."
    exit 1
  fi
done
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    case "$key" in LLM_BASE_URL) export "$key=$value" ;; esac
  done < .env
fi
if [ "${1:-}" = '--ai' ] && ! curl --fail --silent http://127.0.0.1:8080/health >/dev/null; then
  ./scripts/run-llm.sh & AI_PID=$!
fi
uv run --project engine uvicorn abridge.api.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log & API_PID=$!
"$ROOT/scripts/pnpm.sh" dev & WEB_PID=$!
for attempt in {1..100}; do
  if ! kill -0 "$WEB_PID" 2>/dev/null || ! kill -0 "$API_PID" 2>/dev/null || { [ -n "$AI_PID" ] && ! kill -0 "$AI_PID" 2>/dev/null; }; then
    echo 'A local service stopped before startup completed. See the error above.' >&2
    exit 1
  fi
  if curl --fail --silent --max-time 2 http://127.0.0.1:5173/ >/dev/null && curl --fail --silent --max-time 3 http://127.0.0.1:8000/api/health >/dev/null && { [ "${1:-}" != '--ai' ] || curl --fail --silent --max-time 2 http://127.0.0.1:8080/health >/dev/null; }; then
    break
  fi
  if [ "$attempt" = 100 ]; then
    echo 'The local services did not become ready. See the errors above.' >&2
    exit 1
  fi
  sleep 0.2
done
printf '\nAbridge: http://127.0.0.1:5173 · Ctrl+C stops this session.\n'
wait "$WEB_PID"
