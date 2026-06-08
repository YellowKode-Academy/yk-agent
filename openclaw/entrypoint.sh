#!/bin/sh
# ──────────────────────────────────────────────────────────
#  OpenClaw entrypoint — auto-configures Ollama on first run
# ──────────────────────────────────────────────────────────
set -e

OLLAMA_URL="${OLLAMA_API_URL:-http://ollama:11434}"
MODEL="${GEMMA_MODEL:-gemma4:e4b}"
CONFIG="$HOME/.openclaw/openclaw.json"

# First-run setup: configure Ollama as the model provider
if [ ! -f "$CONFIG" ] || ! openclaw config get agents.defaults.model.primary > /dev/null 2>&1; then
  echo "[openclaw] First run — configuring Ollama provider..."
  openclaw doctor --fix > /dev/null 2>&1 || true
  openclaw config set agents.defaults.model.primary "ollama/$MODEL"         || true
  openclaw config set agents.defaults.memorySearch.enabled false            || true
  openclaw config set models.providers.ollama.baseUrl "$OLLAMA_URL"         || true
  openclaw config set models.providers.ollama.api "ollama"                  || true
  echo "[openclaw] Ollama configured: $OLLAMA_URL — model: $MODEL"
fi

# Start gateway inline (--allow-unconfigured bypasses gateway.mode requirement)
exec openclaw gateway \
  --allow-unconfigured \
  --auth token \
  --port "${OPENCLAW_PORT:-18789}"
