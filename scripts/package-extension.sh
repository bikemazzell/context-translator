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

# Copy files
cp "$EXTENSION_DIR/manifest.json" "$BUILD_DIR/package/"
cp "$EXTENSION_DIR/background/background.js" "$BUILD_DIR/package/background/"
cp "$EXTENSION_DIR/content/translator.js" "$BUILD_DIR/package/content/"
cp "$EXTENSION_DIR/content/translator.css" "$BUILD_DIR/package/content/"
cp "$EXTENSION_DIR/popup/popup.html" "$BUILD_DIR/package/popup/"
cp "$EXTENSION_DIR/popup/popup.js" "$BUILD_DIR/package/popup/"
cp "$EXTENSION_DIR/icons/"*.png "$BUILD_DIR/package/icons/"

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

print_success "Done! Extension ready to install."
echo ""
