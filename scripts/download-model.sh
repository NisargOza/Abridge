#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL="$ROOT/data/models/gemma-4-E2B-it-Q4_0.gguf"
mkdir -p "$ROOT/data/models"
URL='https://huggingface.co/ggml-org/gemma-4-E2B-it-GGUF/resolve/b4243c156154b6dca9324415f8c7ccc098b4aed1/gemma-4-E2B-it-Q4_0.gguf'
HASH='8e30dff3ac4c8434c49a7036fa15564bdbb6044e42bf04550bf1a096ad7e6a52'
if [ ! -f "$MODEL" ]; then
  curl --fail --location --retry 3 --continue-at - --output "$MODEL.part" "$URL"
  printf '%s  %s\n' "$HASH" "$MODEL.part" | shasum -a 256 --check
  mv "$MODEL.part" "$MODEL"
fi
printf '%s  %s\n' "$HASH" "$MODEL" | shasum -a 256 --check
