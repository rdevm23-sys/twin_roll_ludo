#!/bin/bash
# Integration verification script
# Run this before deploying to ensure everything is configured correctly

echo "🔍 LibreLudo Integration Verification"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 found"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 not found - please install"
        ((checks_failed++))
    fi
}

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 missing"
        ((checks_failed++))
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 directory exists"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 directory missing"
        ((checks_failed++))
    fi
}

echo "📋 Checking Prerequisites..."
check_command "node"
check_command "npm"
check_command "python3"
check_command "git"
echo ""

echo "📁 Checking Project Structure..."
check_dir "backend"
check_dir "libre_ludo"
check_dir "libre_ludo/src"
check_dir "deploy"
echo ""

echo "📄 Checking Configuration Files..."
check_file "backend/main.py"
check_file "backend/routes.py"
check_file "backend/requirements.txt"
check_file "backend/websocket.py"
check_file "libre_ludo/package.json"
check_file "libre_ludo/vite.config.ts"
check_file "deploy/deploy.sh"
check_file "deploy/nginx.conf"
check_file "deploy/twin-roll.service"
echo ""

echo "🔧 Checking Configuration Content..."

# Check if backend/main.py references libre_ludo/dist
if grep -q "libre_ludo.*dist" backend/main.py; then
    echo -e "${GREEN}✓${NC} backend/main.py configured for LibreLudo dist"
    ((checks_passed++))
else
    echo -e "${YELLOW}⚠${NC} backend/main.py may not reference LibreLudo dist"
    ((checks_failed++))
fi

# Check if deploy.sh includes Node.js installation
if grep -q "nodejs" deploy/deploy.sh; then
    echo -e "${GREEN}✓${NC} deploy.sh configured for Node.js"
    ((checks_passed++))
else
    echo -e "${YELLOW}⚠${NC} deploy.sh missing Node.js installation"
    ((checks_failed++))
fi

# Check if deploy.sh includes npm build
if grep -q "npm.*build" deploy/deploy.sh; then
    echo -e "${GREEN}✓${NC} deploy.sh configured for frontend build"
    ((checks_passed++))
else
    echo -e "${YELLOW}⚠${NC} deploy.sh missing npm build step"
    ((checks_failed++))
fi

# Check if nginx.conf routes to dist
if grep -q "libre_ludo.*dist" deploy/nginx.conf; then
    echo -e "${GREEN}✓${NC} nginx.conf configured for LibreLudo dist"
    ((checks_passed++))
else
    echo -e "${YELLOW}⚠${NC} nginx.conf may not reference LibreLudo dist"
    ((checks_failed++))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for local testing.${NC}"
    echo ""
    echo "📝 Next Steps:"
    echo "  1. Frontend Dev:  cd libre_ludo && npm install && npm run dev"
    echo "  2. Backend Dev:   source venv/bin/activate && uvicorn backend.main:app --reload"
    echo "  3. Frontend Build: cd libre_ludo && npm run build"
    echo "  4. Then test in browser at http://localhost:5173 (frontend) and http://localhost:8000/docs (backend)"
    exit 0
else
    echo -e "${RED}✗ $checks_failed check(s) failed. Review above and fix.${NC}"
    exit 1
fi
