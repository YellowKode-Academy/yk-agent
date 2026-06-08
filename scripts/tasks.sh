#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  tasks.sh — Example agent tasks to test the stack
#  Usage: ./scripts/tasks.sh <task>
# ══════════════════════════════════════════════════════════════

AGENT="docker compose exec openclaw openclaw chat"

usage() {
  echo ""
  echo "Usage: ./scripts/tasks.sh <task>"
  echo ""
  echo "Tasks:"
  echo "  scrape <url>        Extract text content from a URL"
  echo "  screenshot <url>    Take a screenshot of a URL"
  echo "  search <query>      Web search and summarize"
  echo "  monitor <url>       Check a URL and extract key data"
  echo "  form <url>          Analyze form fields on a page"
  echo "  test                Run a quick sanity check"
  echo ""
}

case "$1" in
  scrape)
    URL="${2:-https://news.ycombinator.com}"
    $AGENT "Navigate to ${URL}, extract the main content and list the top headlines or posts in a structured format. Use the browser."
    ;;

  screenshot)
    URL="${2:-https://news.ycombinator.com}"
    $AGENT "Navigate to ${URL}, take a full-page screenshot, save it to /workspace/screenshots/, then describe what you see in the screenshot using your vision capabilities."
    ;;

  search)
    QUERY="${2:-latest AI news}"
    $AGENT "Search the web for: ${QUERY}. Summarize the top 5 results with titles, sources, and key points."
    ;;

  monitor)
    URL="${2:-https://example.com}"
    $AGENT "Navigate to ${URL}. Take a screenshot. Extract all important information like prices, stats, headlines, or any key data visible on the page. Save a JSON summary to /workspace/monitor-$(date +%Y%m%d-%H%M).json"
    ;;

  form)
    URL="${2:-https://example.com/contact}"
    $AGENT "Navigate to ${URL}. Take a screenshot. Identify and list all form fields present on the page, their types, labels, and whether they are required. Return as a structured list."
    ;;

  test)
    echo "Running sanity check..."
    $AGENT "Perform these checks in order and report each result:
      1. Navigate to https://httpbin.org/get using the browser tool and confirm you get a 200 response
      2. Take a screenshot of https://example.com
      3. Run: echo 'exec works'
      4. Confirm your model name
      Report: PASS or FAIL for each check."
    ;;

  bitcoin-sentiment)
    # Example: Bitcoin sentiment monitoring — useful for your trading bot
    $AGENT "Do the following:
      1. Search the web for 'Bitcoin price news today'
      2. Navigate to https://www.coingecko.com/en/coins/bitcoin using the browser
      3. Take a screenshot
      4. Using your vision capabilities, extract: current price, 24h change %, market cap, and any visible sentiment indicators
      5. Search for 'Bitcoin whale movements today'
      6. Compile a sentiment report: BULLISH / BEARISH / NEUTRAL with reasoning
      Save the report to /workspace/btc-sentiment-$(date +%Y%m%d-%H%M).json"
    ;;

  *)
    usage
    ;;
esac
