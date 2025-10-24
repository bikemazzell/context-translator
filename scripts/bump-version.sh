#!/bin/bash

# Version bump script for Context Translator
# Automatically updates version in manifest.json and package.json
# Usage: ./scripts/bump-version.sh [major|minor|patch]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the bump type (default to patch)
BUMP_TYPE="${1:-patch}"

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo -e "${RED}Error: Invalid bump type. Use 'major', 'minor', or 'patch'${NC}"
  exit 1
fi

echo -e "${GREEN}Bumping version: $BUMP_TYPE${NC}"

# Check if files exist
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found${NC}"
  exit 1
fi

if [ ! -f "extension/manifest.json" ]; then
  echo -e "${RED}Error: extension/manifest.json not found${NC}"
  exit 1
fi

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# Use npm version to bump (this updates package.json)
npm version $BUMP_TYPE --no-git-tag-version > /dev/null 2>&1

# Get the new version from package.json
NEW_VERSION=$(node -p "require('./package.json').version")

echo -e "New version: ${GREEN}$NEW_VERSION${NC}"

# Update manifest.json version
echo "Updating extension/manifest.json..."
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('extension/manifest.json', 'utf8'));
manifest.version = '$NEW_VERSION';
fs.writeFileSync('extension/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
"

# Update updates.json with new version
echo "Updating updates.json..."
node -e "
const fs = require('fs');
const updates = JSON.parse(fs.readFileSync('updates.json', 'utf8'));
const addonId = 'context-translator@bike-mazzell';
updates.addons[addonId].updates = [{
  version: '$NEW_VERSION',
  update_link: 'https://github.com/anthropics/context-translator/releases/download/v$NEW_VERSION/context-translator-$NEW_VERSION.xpi',
  update_info_url: 'https://github.com/anthropics/context-translator/releases/tag/v$NEW_VERSION'
}];
fs.writeFileSync('updates.json', JSON.stringify(updates, null, 2) + '\n');
"

# Validate the versions match
MANIFEST_VERSION=$(node -p "require('./extension/manifest.json').version")
PACKAGE_VERSION=$(node -p "require('./package.json').version")
UPDATES_VERSION=$(node -p "require('./updates.json').addons['context-translator@bike-mazzell'].updates[0].version")

if [ "$MANIFEST_VERSION" != "$PACKAGE_VERSION" ] || [ "$MANIFEST_VERSION" != "$UPDATES_VERSION" ]; then
  echo -e "${RED}Error: Version mismatch!${NC}"
  echo "  package.json: $PACKAGE_VERSION"
  echo "  manifest.json: $MANIFEST_VERSION"
  echo "  updates.json: $UPDATES_VERSION"
  exit 1
fi

echo -e "${GREEN}✓ Version bumped successfully: $CURRENT_VERSION → $NEW_VERSION${NC}"
echo ""
echo "Next steps:"
echo "  1. Update CHANGELOG.md with changes for v$NEW_VERSION"
echo "  2. git add package.json extension/manifest.json updates.json CHANGELOG.md"
echo "  3. git commit -m \"Release version $NEW_VERSION\""
echo "  4. git tag v$NEW_VERSION"
echo "  5. git push && git push --tags"
