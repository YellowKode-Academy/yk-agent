#!/bin/bash
# ══════════════════════════════════════════════════════════════
#  setup.sh — First-time setup for Gemma 4 Agent Stack
#  Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ══════════════════════════════════════════════════════════════

set -e

B="\033[1m"
G="\033[32m"
C="\033[36m"
Y="\033[33m"
R="\033[31m"
X="\033[0m"

print_banner() {
  echo ""
  echo -e "${B}${C}"
  echo "  ╔════════════════════════════════════╗"
  echo "  ║   Gemma 4 Agent Stack — Setup      ║"
  echo "  ║   OpenClaw + Playwright + Ollama   ║"
  echo "  ╚════════════════════════════════════╝"
  echo -e "${X}"
}

check_deps() {
  echo -e "${B}Checking dependencies...${X}"
  local ok=1

  if ! command -v docker &>/dev/null; then
    echo -e "  ${R}✗ Docker not found${X}"
    echo "    → Install: https://docs.docker.com/get-docker/"
    ok=0
  else
    echo -e "  ${G}✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')${X}"
  fi

  if ! docker compose version &>/dev/null 2>&1; then
    echo -e "  ${R}✗ Docker Compose v2 not found${X}"
    echo "    → Update Docker to get Compose v2"
    ok=0
  else
    echo -e "  ${G}✓ Docker Compose $(docker compose version --short)${X}"
  fi

  # RAM check
  local ram_mb
  ram_mb=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo 2>/dev/null || echo 0)
  if [ "$ram_mb" -lt 3500 ]; then
    echo -e "  ${Y}⚠ RAM: ${ram_mb}MB — minimum 4GB recommended${X}"
  else
    echo -e "  ${G}✓ RAM: ${ram_mb}MB${X}"
  fi

  # Disk check
  local disk_gb
  disk_gb=$(df -BG . 2>/dev/null | awk 'NR==2 {gsub("G","",$4); print $4}' || echo 0)
  if [ "$disk_gb" -lt 15 ]; then
    echo -e "  ${Y}⚠ Free disk: ${disk_gb}GB — models need 10-15GB${X}"
  else
    echo -e "  ${G}✓ Free disk: ${disk_gb}GB${X}"
  fi

  [ "$ok" = "1" ] || exit 1
  echo ""
}

choose_model() {
  echo -e "${B}Choose Gemma 4 model:${X}"
  echo ""
  echo "  1) gemma4:e2b  → ~1GB   RAM  — fastest, great for CPU-only"
  echo "  2) gemma4:e4b  → ~2.5GB RAM  — balanced ✅ recommended for 8GB VPS"
  echo "  3) gemma4:12b  → ~7GB   RAM  — highest quality, needs 8GB+ free"
  echo "  4) gemma4:26b  → ~15GB  RAM  — GPU server only"
  echo ""
  read -rp "Choice [1-4] (default: 2): " choice

  case "${choice}" in
    1) MODEL="gemma4:e2b" ;;
    3) MODEL="gemma4:12b" ;;
    4) MODEL="gemma4:26b" ;;
    *) MODEL="gemma4:e4b" ;;
  esac

  sed -i "s/^GEMMA_MODEL=.*/GEMMA_MODEL=${MODEL}/" .env
  # Also update openclaw.json
  sed -i "s/gemma4:e[0-9]*b/${MODEL}/g" config/openclaw.json
  echo -e "  ${G}✓ Model set: ${MODEL}${X}"
  echo ""
}


start_services() {
  echo -e "${B}Building and starting services...${X}"
  docker compose up -d --build
  echo ""

  echo -e "${B}Waiting for Ollama to be ready...${X}"
  for i in $(seq 1 40); do
    if docker compose exec -T ollama curl -sf http://localhost:11434/api/version &>/dev/null 2>&1; then
      echo -e "  ${G}✓ Ollama ready${X}"
      break
    fi
    echo -n "  ."
    sleep 3
  done
  echo ""

  echo -e "${B}Pulling model ${MODEL}...${X}"
  echo "  (First run: this can take 5-15 minutes depending on connection)"
  echo ""
  docker compose exec ollama ollama pull "${MODEL}"
  echo ""

  echo -e "${B}Waiting for Playwright MCP...${X}"
  for i in $(seq 1 20); do
    if docker compose exec -T playwright-mcp curl -sf http://localhost:8931/health &>/dev/null 2>&1; then
      echo -e "  ${G}✓ Playwright MCP ready${X}"
      break
    fi
    echo -n "  ."
    sleep 3
  done
  echo ""
}

run_onboard() {
  echo -e "${B}Running OpenClaw onboard...${X}"
  echo -e "${Y}  This sets up the agent with Ollama as the provider.${X}"
  echo ""

  # Non-interactive onboard pointing to our Ollama
  docker compose exec openclaw openclaw onboard \
    --non-interactive \
    --auth-choice ollama \
    --custom-base-url "http://ollama:11434" \
    --custom-model-id "${MODEL}" \
    --accept-risk 2>/dev/null || {

    echo -e "${Y}  Auto-onboard failed — run manually:${X}"
    echo ""
    echo "    docker compose exec openclaw openclaw onboard"
    echo ""
    echo "  When prompted:"
    echo "    • Provider: Ollama"
    echo "    • Base URL: http://ollama:11434"
    echo "    • Model: ${MODEL}"
    echo ""
  }
}

print_summary() {
  echo ""
  echo -e "${G}${B}══════════════════════════════════════════${X}"
  echo -e "${G}${B}  ✦ Gemma 4 Agent Stack is running!${X}"
  echo -e "${G}${B}══════════════════════════════════════════${X}"
  echo ""
  echo -e "  ${C}OpenClaw gateway:${X}  http://localhost:18789"
  echo -e "  ${C}Ollama API:${X}        http://localhost:11434"
  echo -e "  ${C}Playwright MCP:${X}    http://localhost:8931"
  echo ""
  echo -e "  ${B}Test the agent:${X}"
  echo "    docker compose exec openclaw openclaw chat"
  echo ""
  echo -e "  ${B}Run a browser task:${X}"
  echo "    docker compose exec openclaw openclaw chat \\"
  echo "      'Go to https://news.ycombinator.com and give me the top 5 stories'"
  echo ""
  echo -e "  ${B}Check logs:${X}"
  echo "    docker compose logs -f"
  echo ""
  echo -e "  ${B}Stop:${X}"
  echo "    docker compose down"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────
print_banner
check_deps

# Init .env
[ -f ".env" ] || cp .env.example .env

choose_model
start_services
run_onboard
print_summary
