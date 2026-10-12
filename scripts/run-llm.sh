#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Only read supported config values; do not execute .env as shell code.
if [ -f "$ROOT/.env" ]; then
  while IFS='=' read -r key value; do
    case "$key" in LLM_MODEL_PATH|LLM_HF_REPO) export "$key=$value" ;; esac
  done < "$ROOT/.env"
fi
if [ "${LLM_HF_REPO:-ggml-org/gemma-4-E2B-it-GGUF:Q4_0}" != 'ggml-org/gemma-4-E2B-it-GGUF:Q4_0' ] && [ -z "${LLM_MODEL_PATH:-}" ]; then
  echo 'This model identity is not verified. Supply LLM_MODEL_PATH and run the smoke eval, or use the pinned default.'
  exit 1
fi
MODEL="${LLM_MODEL_PATH:-$ROOT/data/models/gemma-4-E2B-it-Q4_0.gguf}"
command -v llama-server >/dev/null || { echo 'Install llama.cpp 0.6.0 first. See README.'; exit 1; }
if [ ! -f "$MODEL" ]; then echo 'Run ./scripts/download-model.sh first. Model download is separate from private sessions.'; exit 1; fi
# Runtime is fully offline, prompt caching is disabled, and prompts are not logged.
exec llama-server -m "$MODEL" -c 8192 --jinja --host 127.0.0.1 --port 8080 --offline --no-cache-prompt --cache-ram 0 --no-cache-idle-slots --log-disable --reasoning off
