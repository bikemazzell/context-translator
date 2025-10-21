#!/bin/bash
# Context Translator - Extension Packaging Script
# Creates installable .xpi package for Firefox
#
# Usage: ./scripts/package-extension.sh
# Must be run from project root directory

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -d "extension" ]; then
    echo -e "${RED}✗${NC} Must run from project root directory"
    echo "Usage: ./scripts/package-extension.sh"
    exit 1
fi

# Configuration
EXTENSION_DIR="extension"
BUILD_DIR="dist"
PACKAGE_NAME="context-translator.xpi"
NATIVE_HOST_DIR="$HOME/.mozilla/native-messaging-hosts"
NATIVE_HOST_MANIFEST="context_translator_host.json"

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
echo " Context Translator - Extension Packager"
echo "========================================="
echo ""

# Step 1: Validate manifest.json exists
print_step "Validating extension manifest..."
if [ ! -f "$EXTENSION_DIR/manifest.json" ]; then
    print_error "manifest.json not found in $EXTENSION_DIR/"
    exit 1
fi

# Validate JSON syntax
if ! python3 -m json.tool "$EXTENSION_DIR/manifest.json" > /dev/null 2>&1; then
    print_error "manifest.json is not valid JSON"
    exit 1
fi

# Extract version from manifest
VERSION=$(python3 -c "import json; print(json.load(open('$EXTENSION_DIR/manifest.json'))['version'])")
print_success "Found valid manifest.json (version $VERSION)"

# Step 2: Validate required files exist
print_step "Checking required files..."
REQUIRED_FILES=(
    "$EXTENSION_DIR/background/background.js"
    "$EXTENSION_DIR/content/translator.js"
    "$EXTENSION_DIR/content/translator.css"
    "$EXTENSION_DIR/popup/popup.html"
    "$EXTENSION_DIR/popup/popup.js"
    "$EXTENSION_DIR/icons/icon-48.png"
    "$EXTENSION_DIR/icons/icon-96.png"
    "$EXTENSION_DIR/native-host/context_translator_host.py"
    "$EXTENSION_DIR/native-host/$NATIVE_HOST_MANIFEST"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    print_error "Missing $MISSING_FILES required file(s). Cannot continue."
    exit 1
fi

print_success "All required files present"

# Step 3: Create clean build directory
print_step "Creating build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/package"
print_success "Build directory created"

# Step 4: Copy extension files
print_step "Copying extension files..."

# Create directory structure
mkdir -p "$BUILD_DIR/package/background"
mkdir -p "$BUILD_DIR/package/content"
mkdir -p "$BUILD_DIR/package/popup"
mkdir -p "$BUILD_DIR/package/icons"
mkdir -p "$BUILD_DIR/package/native-host"

# Copy files
cp "$EXTENSION_DIR/manifest.json" "$BUILD_DIR/package/"
cp "$EXTENSION_DIR/background/background.js" "$BUILD_DIR/package/background/"
cp "$EXTENSION_DIR/content/translator.js" "$BUILD_DIR/package/content/"
cp "$EXTENSION_DIR/content/translator.css" "$BUILD_DIR/package/content/"
cp "$EXTENSION_DIR/popup/popup.html" "$BUILD_DIR/package/popup/"
cp "$EXTENSION_DIR/popup/popup.js" "$BUILD_DIR/package/popup/"
cp "$EXTENSION_DIR/icons/"*.png "$BUILD_DIR/package/icons/"
cp "$EXTENSION_DIR/native-host/context_translator_host.py" "$BUILD_DIR/package/native-host/"
cp "$EXTENSION_DIR/native-host/$NATIVE_HOST_MANIFEST" "$BUILD_DIR/package/native-host/"

# Ensure Python script is executable
chmod +x "$BUILD_DIR/package/native-host/context_translator_host.py"

print_success "Extension files copied"

# Step 5: Create .xpi package
print_step "Creating .xpi package..."

# Change to package directory and create zip
cd "$BUILD_DIR/package"
zip -r -q "../$PACKAGE_NAME" ./*
cd ../..

# Verify the package was created
if [ ! -f "$BUILD_DIR/$PACKAGE_NAME" ]; then
    print_error "Failed to create .xpi package"
    exit 1
fi

PACKAGE_SIZE=$(du -h "$BUILD_DIR/$PACKAGE_NAME" | cut -f1)
print_success "Package created: $BUILD_DIR/$PACKAGE_NAME ($PACKAGE_SIZE)"

# Step 6: Validate package structure
print_step "Validating package structure..."
if ! unzip -t "$BUILD_DIR/$PACKAGE_NAME" > /dev/null 2>&1; then
    print_error "Package is not a valid ZIP file"
    exit 1
fi

# Check manifest is at root
if ! unzip -l "$BUILD_DIR/$PACKAGE_NAME" | grep -q "^.*manifest.json$"; then
    print_error "manifest.json not at package root"
    exit 1
fi

print_success "Package structure validated"

# Step 7: Setup native messaging host
print_step "Setting up native messaging host..."

# Create native messaging directory if it doesn't exist
mkdir -p "$NATIVE_HOST_DIR"

# Get absolute path to Python script
PYTHON_SCRIPT_PATH="$(cd "$(dirname "$EXTENSION_DIR/native-host/context_translator_host.py")" && pwd)/$(basename "$EXTENSION_DIR/native-host/context_translator_host.py")"

# Update native host manifest with correct path
TEMP_MANIFEST=$(mktemp)
python3 -c "
import json
with open('$EXTENSION_DIR/native-host/$NATIVE_HOST_MANIFEST', 'r') as f:
    manifest = json.load(f)
manifest['path'] = '$PYTHON_SCRIPT_PATH'
with open('$TEMP_MANIFEST', 'w') as f:
    json.dump(manifest, f, indent=2)
"

# Copy updated manifest to native messaging directory
cp "$TEMP_MANIFEST" "$NATIVE_HOST_DIR/$NATIVE_HOST_MANIFEST"
rm "$TEMP_MANIFEST"

# Ensure Python script is executable
chmod +x "$PYTHON_SCRIPT_PATH"

print_success "Native messaging host configured"
print_success "Manifest installed: $NATIVE_HOST_DIR/$NATIVE_HOST_MANIFEST"
print_success "Python script: $PYTHON_SCRIPT_PATH"

# Print summary
echo ""
echo "========================================="
echo " Packaging Complete!"
echo "========================================="
echo ""
echo "Package: $BUILD_DIR/$PACKAGE_NAME"
echo "Size: $PACKAGE_SIZE"
echo "Version: $VERSION"
echo ""

# Print installation instructions
echo "========================================="
echo " Installation Instructions"
echo "========================================="
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} Regular Firefox will reject unsigned extensions!"
echo "You must use Firefox Developer Edition or Nightly."
echo ""
echo "Download: https://www.mozilla.org/firefox/developer/"
echo ""
echo "========================================="
echo ""
echo "Firefox Developer Edition or Nightly:"
echo ""
echo "1. Configure Firefox for unsigned extensions:"
echo "   - Open 'about:config'"
echo "   - Accept the risk warning"
echo "   - Search for: xpinstall.signatures.required"
echo "   - Click toggle to set it to: false"
echo "   - Restart Firefox"
echo ""
echo "2. Install the extension:"
echo "   - Open 'about:addons'"
echo "   - Click the gear icon (⚙️)"
echo "   - Select 'Install Add-on From File...'"
echo "   - Navigate to: $BUILD_DIR/$PACKAGE_NAME"
echo "   - Click 'Open'"
echo ""
echo "3. The extension will persist across browser restarts!"
echo ""
echo "Alternative (Testing Only):"
echo "   - Open 'about:debugging'"
echo "   - Click 'This Firefox'"
echo "   - Click 'Load Temporary Add-on...'"
echo "   - Select 'extension/manifest.json'"
echo "   - NOTE: Unloads when Firefox closes"
echo ""
echo "See docs/FIREFOX-SETUP.md for detailed instructions"
echo ""
echo "========================================="
echo " Troubleshooting"
echo "========================================="
echo ""
echo "If native messaging fails:"
echo "  - Check Python script path: $PYTHON_SCRIPT_PATH"
echo "  - Ensure script is executable: chmod +x <script>"
echo "  - Check native host manifest: $NATIVE_HOST_DIR/$NATIVE_HOST_MANIFEST"
echo "  - Restart Firefox after installing"
echo ""
echo "If translations don't work:"
echo "  - Ensure backend server is running (check health endpoint)"
echo "  - Check browser console for errors"
echo "  - Verify settings in extension toolbar"
echo ""
echo "For Firefox Release Edition:"
echo "  - Cannot install unsigned extensions permanently"
echo "  - Use temporary installation: about:debugging → Load Temporary Add-on"
echo "  - OR submit extension to Mozilla Add-ons for signing"
echo ""

print_success "Done! Extension ready to install."
echo ""
