#!/bin/sh
# ──────────────────────────────────────────────
# Playwright MCP server start script
# Exposes browser automation via MCP/SSE transport
# ──────────────────────────────────────────────

PORT="${MCP_PORT:-8931}"
BROWSER="${PLAYWRIGHT_BROWSER:-chromium}"
HEADLESS="${PLAYWRIGHT_HEADLESS:-true}"

echo "Starting Playwright MCP Server"
echo "   Browser : $BROWSER"
echo "   Headless: $HEADLESS"
echo "   Port    : $PORT"
echo "   Output  : /output"
echo ""

# Build base args (no wildcards in variable to avoid quoting issues)
ARGS="--port $PORT --host 0.0.0.0 --browser $BROWSER --output-dir /output --viewport-size 1280x800 --no-sandbox"

if [ "$HEADLESS" = "true" ]; then
  ARGS="$ARGS --headless"
fi

# --allowed-hosts '*' must be passed directly (not via $ARGS) so the shell
# correctly strips the single quotes and passes a bare * to the process.
exec npx @playwright/mcp $ARGS --allowed-hosts '*'
