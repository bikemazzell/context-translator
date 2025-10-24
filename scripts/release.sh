#!/bin/bash
# Context Translator - Release Preparation Script
# Synchronizes version across all files and creates a release tag
#
# Usage: ./scripts/release.sh <version> [--dry-run]
# Example: ./scripts/release.sh 1.0.2
# Example: ./scripts/release.sh 1.0.2 --dry-run

set -e

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

# Parse arguments
VERSION=""
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        *)
            if [ -z "$VERSION" ]; then
                VERSION="$arg"
            fi
            ;;
    esac
done

# Validate version argument
if [ -z "$VERSION" ]; then
    print_error "Version number required"
    echo "Usage: ./scripts/release.sh <version> [--dry-run]"
    echo "Example: ./scripts/release.sh 1.0.2"
    exit 1
fi

# Validate semantic versioning format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    print_error "Invalid version format. Must be semantic version (e.g., 1.0.2)"
    exit 1
fi

# Check if running from project root
if [ ! -d "extension" ]; then
    print_error "Must run from project root directory"
    echo "Usage: ./scripts/release.sh <version>"
    exit 1
fi

# Print header
echo ""
echo "========================================="
echo " Context Translator - Release Preparation"
echo "========================================="
echo ""
echo "Version: $VERSION"
if [ "$DRY_RUN" = true ]; then
    print_warning "DRY RUN MODE - No changes will be made"
fi
echo ""

# Step 1: Check git status
print_step "Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
    print_error "Working directory is not clean. Commit or stash changes first."
    echo ""
    git status --short
    exit 1
fi
print_success "Working directory is clean"

# Step 2: Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    print_warning "Not on main branch (currently on: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Release cancelled"
        exit 1
    fi
fi

# Step 3: Check if tag already exists
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    print_warning "Tag v$VERSION already exists"

    # Check if tag was pushed to remote
    if git ls-remote --tags origin | grep -q "refs/tags/v$VERSION"; then
        print_warning "Tag v$VERSION exists on remote"
        echo "This version has already been released and pushed."
        echo ""
        echo "If you need to modify this release:"
        echo "  1. Create a new patch version (e.g., ${VERSION%.*}.$((${VERSION##*.}+1)))"
        echo "  2. Or delete the tag locally and remotely (dangerous):"
        echo "     git tag -d v$VERSION"
        echo "     git push origin :refs/tags/v$VERSION"
        exit 1
    else
        print_warning "Tag v$VERSION exists locally but not on remote"
        read -p "Delete local tag and continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [ "$DRY_RUN" = false ]; then
                git tag -d "v$VERSION"
                print_success "Deleted local tag v$VERSION"
            else
                print_warning "Would delete local tag v$VERSION (dry-run)"
            fi
        else
            print_error "Release cancelled"
            exit 1
        fi
    fi
else
    print_success "Tag v$VERSION is available"
fi

# Step 4: Run tests
print_step "Running test suite..."
if ! npm test > /dev/null 2>&1; then
    print_error "Tests failed. Fix tests before releasing."
    exit 1
fi
print_success "All tests passed"

# Step 5: Update manifest.json
print_step "Updating extension/manifest.json..."
MANIFEST_FILE="extension/manifest.json"
CURRENT_VERSION=$(grep -oP '"version":\s*"\K[^"]+' "$MANIFEST_FILE")
echo "  Current version: $CURRENT_VERSION"
echo "  New version: $VERSION"

if [ "$DRY_RUN" = false ]; then
    # Use python to update JSON properly
    python3 -c "
import json
with open('$MANIFEST_FILE', 'r') as f:
    data = json.load(f)
data['version'] = '$VERSION'
with open('$MANIFEST_FILE', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
    print_success "manifest.json updated"
else
    print_warning "Would update manifest.json (dry-run)"
fi

# Step 6: Update CHANGELOG.md
print_step "Updating CHANGELOG.md..."
CHANGELOG_FILE="CHANGELOG.md"
RELEASE_DATE=$(date +%Y-%m-%d)

if [ "$DRY_RUN" = false ]; then
    # Replace [Unreleased] with version and date, and add new [Unreleased] section
    python3 << EOF
import re
from datetime import datetime

version = '$VERSION'
release_date = '$RELEASE_DATE'
changelog_file = '$CHANGELOG_FILE'

with open(changelog_file, 'r') as f:
    content = f.read()

# Find the Unreleased section
unreleased_pattern = r'## \[Unreleased\]'

# Replace [Unreleased] with the new version
content = re.sub(
    unreleased_pattern,
    f'## [Unreleased]\n\n## [{version}] - {release_date}',
    content,
    count=1
)

# Update version links at the bottom
# Add new version link
version_links_pattern = r'(## Version Links.*?\n\n)(- \[Unreleased\]:.*?\n)'
new_link = f'- [{version}]: https://github.com/bikemazzell/context-translator/releases/tag/v{version}\n'

def add_version_link(match):
    header = match.group(1)
    unreleased = match.group(2)
    # Update unreleased link to compare with new version
    unreleased_updated = re.sub(
        r'compare/v[\d.]+\.\.\.HEAD',
        f'compare/v{version}...HEAD',
        unreleased
    )
    return header + unreleased_updated + new_link

content = re.sub(version_links_pattern, add_version_link, content, flags=re.DOTALL)

with open(changelog_file, 'w') as f:
    f.write(content)
EOF
    print_success "CHANGELOG.md updated"
else
    print_warning "Would update CHANGELOG.md (dry-run)"
fi

# Step 7: Add version badge to README.md if not present
print_step "Checking README.md for version badge..."
README_FILE="README.md"

if ! grep -q "!\[Version\]" "$README_FILE"; then
    echo "  Adding version badge to README.md..."
    if [ "$DRY_RUN" = false ]; then
        # Add badge after title
        sed -i '1 a\\n![Version](https://img.shields.io/github/v/release/bikemazzell/context-translator?label=version)\n![Firefox](https://img.shields.io/badge/Firefox-MV3-orange)\n![License](https://img.shields.io/badge/license-MIT-blue)' "$README_FILE"
        print_success "Version badge added to README.md"
    else
        print_warning "Would add version badge to README.md (dry-run)"
    fi
else
    print_success "Version badge already present"
fi

# Step 8: Create git commit
print_step "Creating release commit..."
if [ "$DRY_RUN" = false ]; then
    git add "$MANIFEST_FILE" "$CHANGELOG_FILE" "$README_FILE"
    git commit -m "Release version $VERSION

- Update manifest.json to version $VERSION
- Update CHANGELOG.md with release notes
- Update README.md badges"
    print_success "Release commit created"
else
    print_warning "Would create commit with message: 'Release version $VERSION' (dry-run)"
fi

# Step 9: Create git tag
print_step "Creating git tag v$VERSION..."
if [ "$DRY_RUN" = false ]; then
    git tag -a "v$VERSION" -m "Release version $VERSION"
    print_success "Git tag v$VERSION created"
else
    print_warning "Would create tag v$VERSION (dry-run)"
fi

# Step 10: Show summary
echo ""
echo "========================================="
echo " Release Preparation Complete!"
echo "========================================="
echo ""
echo "Version: $VERSION"
echo "Tag: v$VERSION"
echo "Date: $RELEASE_DATE"
echo ""

if [ "$DRY_RUN" = false ]; then
    print_success "Changes committed and tagged locally"
    echo ""
    echo "Next steps:"
    echo "  1. Review the changes: git show HEAD"
    echo "  2. Push to remote: git push origin main && git push origin v$VERSION"
    echo "  3. GitHub Actions will automatically build and release"
else
    print_warning "DRY RUN completed - no changes made"
    echo ""
    echo "Run without --dry-run to apply changes:"
    echo "  ./scripts/release.sh $VERSION"
fi
echo ""
