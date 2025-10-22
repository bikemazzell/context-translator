#!/bin/bash
# Context Translator - Backend Startup Script
# Starts the FastAPI backend server with uvicorn

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Print header
echo ""
echo "========================================="
echo " Context Translator - Backend Startup"
echo "========================================="
echo ""

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check if running from project root or scripts directory
if [ ! -d "$PROJECT_ROOT/backend" ]; then
    print_error "Backend directory not found"
    echo "Usage: ./scripts/start-backend.sh"
    exit 1
fi

# Validate backend exists
print_step "Validating backend files..."
if [ ! -f "$PROJECT_ROOT/backend/app/main.py" ]; then
    print_error "Backend application not found: backend/app/main.py"
    exit 1
fi

print_success "Backend files validated"

# Check Python environment
print_step "Checking Python environment..."

# Use python3 by default
PYTHON_PATH="python3"

# Check if Python is available
if ! command -v $PYTHON_PATH &> /dev/null; then
    print_error "Python not found. Please ensure Python 3.12+ is installed."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$($PYTHON_PATH --version 2>&1 | awk '{print $2}')
print_success "Using Python $PYTHON_VERSION"

# Check required modules
print_step "Checking required Python modules..."
REQUIRED_MODULES=("fastapi" "uvicorn" "aiosqlite" "httpx" "pydantic" "yaml")
MISSING_MODULES=0

for module in "${REQUIRED_MODULES[@]}"; do
    if ! $PYTHON_PATH -c "import $module" 2>/dev/null; then
        print_error "Missing Python module: $module"
        MISSING_MODULES=$((MISSING_MODULES + 1))
    fi
done

if [ $MISSING_MODULES -gt 0 ]; then
    print_error "Missing $MISSING_MODULES required module(s)"
    echo ""
    echo "Install with:"
    echo "  cd backend && pip install -r requirements.txt"
    exit 1
fi

print_success "All required modules present"

# Check config file
print_step "Checking configuration..."
if [ ! -f "$PROJECT_ROOT/config.yaml" ]; then
    print_warning "config.yaml not found (will use defaults)"
else
    print_success "Found config.yaml"
fi

# Print startup info
echo ""
echo "========================================="
echo " Starting FastAPI Backend"
echo "========================================="
echo ""
echo "The backend will run on http://localhost:8080"
echo "API documentation available at http://localhost:8080/docs"
echo ""
echo "To stop: Press Ctrl+C"
echo ""
echo "========================================="
echo ""

# Start the backend with uvicorn
print_step "Starting FastAPI backend..."
echo ""

cd "$PROJECT_ROOT/backend"
exec $PYTHON_PATH -m uvicorn app.main:app --host localhost --port 8080 --log-level info
