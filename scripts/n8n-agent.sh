#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  n8n-agent.sh — Run agent task and POST result to n8n webhook
#
#  Usage:
#    ./scripts/n8n-agent.sh "Your task prompt here"
#
#  Or schedule via cron:
#    */30 * * * * /path/to/gemma4-agent/scripts/n8n-agent.sh "Check BTC price" >> /var/log/agent.log 2>&1
# ══════════════════════════════════════════════════════════════

set -e

TASK="${1:-Check the current Bitcoin price and sentiment}"
WEBHOOK_URL="${N8N_WEBHOOK_URL}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
OUTPUT_FILE="/tmp/agent-result-$(date +%s).txt"

if [ -z "$WEBHOOK_URL" ]; then
  # Try to load from .env
  if [ -f ".env" ]; then
    WEBHOOK_URL=$(grep '^N8N_WEBHOOK_URL=' .env | cut -d= -f2-)
  fi
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Agent Task: $TASK"
echo "  Time: $TIMESTAMP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run agent and capture output
docker compose exec -T openclaw openclaw chat "$TASK" > "$OUTPUT_FILE" 2>&1
AGENT_RESULT=$(cat "$OUTPUT_FILE")

echo ""
echo "Agent result:"
echo "$AGENT_RESULT"
echo ""

# Send to n8n if webhook configured
if [ -n "$WEBHOOK_URL" ]; then
  echo "Sending to n8n..."
  curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg task "$TASK" \
      --arg result "$AGENT_RESULT" \
      --arg ts "$TIMESTAMP" \
      '{task: $task, result: $result, timestamp: $ts, source: "gemma4-agent"}'
    )"
  echo ""
  echo "✅ Sent to n8n"
else
  echo "⚠ N8N_WEBHOOK_URL not set — skipping webhook"
fi

rm -f "$OUTPUT_FILE"
