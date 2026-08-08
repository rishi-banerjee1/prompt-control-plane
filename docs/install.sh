#!/usr/bin/env bash
# Prompt Control Plane: Quick Installer
# Usage: curl -fsSL https://getpcp.site/install.sh | bash

set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}Prompt Control Plane${NC}"
echo -e "${CYAN}─────────────────────────────${NC}"
echo ""

# ─── Check Node.js ────────────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found.${NC}"
  echo "  Install Node.js 20+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}✗ Node.js $NODE_VERSION found: version 20+ required.${NC}"
  echo "  Upgrade at https://nodejs.org"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"

# ─── Check npm ────────────────────────────────────────────────────────────────
if ! command -v npm &> /dev/null; then
  echo -e "${RED}✗ npm not found.${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} npm $(npm -v)"

# ─── Install ──────────────────────────────────────────────────────────────────
echo ""
echo -e "Installing ${BOLD}pcp-engine${NC} globally..."
npm install -g pcp-engine

echo ""
echo -e "${GREEN}${BOLD}✓ Installed successfully!${NC}"
echo ""

# ─── Quick Start ─────────────────────────────────────────────────────────────
echo -e "${BOLD}Quick start:${NC}"
echo ""
echo -e "  ${CYAN}pcp preflight \"Your prompt here\" --json${NC}"
echo -e "  ${CYAN}pcp check \"Write a REST API\" --json${NC}"
echo -e "  ${CYAN}pcp hook install${NC}  ${GREEN}# auto-check every prompt${NC}"
echo ""

# ─── MCP Config (optional) ───────────────────────────────────────────────────
echo -e "${BOLD}Optional:${NC} Add MCP integration for AI-assisted workflows."
echo -e "Add this to your ${BOLD}.mcp.json${NC} or ${BOLD}claude_desktop_config.json${NC}:"
echo ""
echo -e "${CYAN}"
cat << 'CONFIG'
{
  "mcpServers": {
    "prompt-optimizer": {
      "command": "npx",
      "args": ["-y", "pcp-engine"]
    }
  }
}
CONFIG
echo -e "${NC}"
echo -e "Docs: ${BOLD}https://getpcp.site/docs.html${NC}"
echo ""
