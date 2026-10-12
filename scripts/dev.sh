#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
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
pnpm --dir web dev & WEB_PID=$!
printf '\nAbridge: http://127.0.0.1:5173 · Ctrl+C stops this session.\n'
wait "$WEB_PID"
