#!/bin/bash
# Post-deploy verification: ensures all expected pages and components exist
# Run after every deploy: bash scripts/verify-pages.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

MISSING=0

# Expected page directories
PAGES=(
  "app/page.tsx"
  "app/planning/page.tsx"
  "app/pontis/page.tsx"
  "app/partners/page.tsx"
  "app/onboarding/page.tsx"
  "app/sales-funnel/page.tsx"
  "app/partner-map/page.tsx"
  "app/market-intelligence/page.tsx"
  "app/kanban/page.tsx"
  "app/goals/page.tsx"
  "app/team/page.tsx"
  "app/knowledge/page.tsx"
  "app/bible/page.tsx"
  "app/loops/page.tsx"
  "app/mcp/page.tsx"
  "app/security/page.tsx"
  "app/crons/page.tsx"
  "app/sessions/page.tsx"
  "app/clara/page.tsx"
  "app/usage/page.tsx"
)

# Expected components
COMPONENTS=(
  "components/Sidebar.tsx"
  "components/onboarding/OnboardingClient.tsx"
  "components/onboarding/DocumentsTab.tsx"
  "components/market-intelligence/MarketIntelligenceClient.tsx"
  "components/mcp/McpDashboard.tsx"
)

# Expected API routes
API_ROUTES=(
  "app/api/onboarding-docs/route.ts"
  "app/api/onboarding-docs/rename/route.ts"
  "app/api/partner-map/route.ts"
)

# Sidebar nav entries (grep for href in Sidebar.tsx)
SIDEBAR_ENTRIES=(
  "/onboarding"
  "/market-intelligence"
  "/mcp"
  "/goals"
  "/partner-map"
  "/sales-funnel"
)

echo "🔍 Verifying Mission Control pages..."
echo ""

for page in "${PAGES[@]}"; do
  if [ ! -f "$page" ]; then
    echo -e "${RED}❌ MISSING: $page${NC}"
    MISSING=$((MISSING + 1))
  else
    echo -e "${GREEN}✅ $page${NC}"
  fi
done

echo ""
echo "🔍 Verifying components..."
for comp in "${COMPONENTS[@]}"; do
  if [ ! -f "$comp" ]; then
    echo -e "${RED}❌ MISSING: $comp${NC}"
    MISSING=$((MISSING + 1))
  else
    echo -e "${GREEN}✅ $comp${NC}"
  fi
done

echo ""
echo "🔍 Verifying API routes..."
for route in "${API_ROUTES[@]}"; do
  if [ ! -f "$route" ]; then
    echo -e "${RED}❌ MISSING: $route${NC}"
    MISSING=$((MISSING + 1))
  else
    echo -e "${GREEN}✅ $route${NC}"
  fi
done

echo ""
echo "🔍 Verifying sidebar nav entries..."
for entry in "${SIDEBAR_ENTRIES[@]}"; do
  if ! grep -q "\"$entry\"" components/Sidebar.tsx 2>/dev/null; then
    echo -e "${RED}❌ MISSING from sidebar: $entry${NC}"
    MISSING=$((MISSING + 1))
  else
    echo -e "${GREEN}✅ Sidebar: $entry${NC}"
  fi
done

# Check sidebar scrollable
if ! grep -q "overflow-y-auto" components/Sidebar.tsx 2>/dev/null; then
  echo -e "${RED}❌ Sidebar missing overflow-y-auto (scroll fix)${NC}"
  MISSING=$((MISSING + 1))
fi

echo ""
if [ $MISSING -gt 0 ]; then
  echo -e "${RED}⚠️  $MISSING issues found! DO NOT DEPLOY until fixed.${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All checks passed. Safe to deploy.${NC}"
  exit 0
fi
