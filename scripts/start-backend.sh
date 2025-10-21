#!/bin/bash
# Context Translator - Backend Startup Script
# Starts the native messaging host for testing

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

# Check if running from project root
if [ ! -d "extension/native-host" ]; then
    print_error "Must run from project root directory"
    echo "Usage: ./scripts/start-backend.sh"
    exit 1
fi

# Path to native host script
NATIVE_HOST_SCRIPT="extension/native-host/context_translator_host.py"

# Validate Python script exists
print_step "Validating backend files..."
if [ ! -f "$NATIVE_HOST_SCRIPT" ]; then
    print_error "Native host script not found: $NATIVE_HOST_SCRIPT"
    exit 1
fi

# Check if script is executable
if [ ! -x "$NATIVE_HOST_SCRIPT" ]; then
    print_warning "Making native host script executable..."
    chmod +x "$NATIVE_HOST_SCRIPT"
fi

print_success "Backend files validated"

# Check Python environment
print_step "Checking Python environment..."

# Get Python from shebang
PYTHON_PATH=$(head -1 "$NATIVE_HOST_SCRIPT" | sed 's/#!//')
if [ ! -x "$PYTHON_PATH" ]; then
    print_warning "Python from shebang not found: $PYTHON_PATH"
    print_warning "Using system python3 instead"
    PYTHON_PATH="python3"
fi

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
REQUIRED_MODULES=("aiosqlite" "httpx" "asyncio" "json")
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
    echo "  pip install aiosqlite httpx"
    echo ""
    echo "Or if using conda:"
    echo "  conda activate ai312"
    echo "  pip install aiosqlite httpx"
    exit 1
fi

print_success "All required modules present"

# Check config file
print_step "Checking configuration..."
if [ ! -f "config.yaml" ]; then
    print_warning "config.yaml not found (will use defaults)"
else
    print_success "Found config.yaml"
fi

# Print startup info
echo ""
echo "========================================="
echo " Starting Backend"
echo "========================================="
echo ""
echo "The backend will run in native messaging mode."
echo "It will wait for messages from the Firefox extension."
echo ""
echo "To test manually:"
echo "  1. Send messages via stdin (JSON format)"
echo "  2. Messages must be prefixed with 4-byte length (little-endian)"
echo ""
echo "To stop: Press Ctrl+C"
echo ""
echo "========================================="
echo ""

# Start the backend
print_step "Starting native messaging host..."
echo ""

# Execute the Python script
exec $PYTHON_PATH "$NATIVE_HOST_SCRIPT"
