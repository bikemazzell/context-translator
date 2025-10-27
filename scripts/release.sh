#!/bin/bash
# Context Translator - Unified Release Script
# Tests, bumps version, commits, tags, and pushes
#
# Usage: ./scripts/release.sh [major|minor|patch] [--dry-run]
# Example: ./scripts/release.sh patch
# Example: ./scripts/release.sh minor --dry-run

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
BUMP_TYPE=""
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        major|minor|patch)
            BUMP_TYPE="$arg"
            ;;
        *)
            print_error "Unknown argument: $arg"
            echo "Usage: ./scripts/release.sh [major|minor|patch] [--dry-run]"
            exit 1
            ;;
    esac
done

# Default to patch if not specified
if [ -z "$BUMP_TYPE" ]; then
    BUMP_TYPE="patch"
fi

# Check if running from project root
if [ ! -d "extension" ]; then
    print_error "Must run from project root directory"
    echo "Usage: ./scripts/release.sh [major|minor|patch]"
    exit 1
fi

# Print header
echo ""
echo "========================================="
echo " Context Translator - Release"
echo "========================================="
echo ""
echo "Bump type: $BUMP_TYPE"
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

# Step 2b: Pull latest changes from remote
print_step "Pulling latest changes from remote..."
if [ "$DRY_RUN" = false ]; then
    git pull origin "$CURRENT_BRANCH"
    print_success "Local branch is up to date"
else
    print_warning "Would pull from origin/$CURRENT_BRANCH (dry-run)"
fi

# Step 3: Run tests
print_step "Running test suite..."
if ! npm test; then
    print_error "Tests failed. Fix tests before releasing."
    exit 1
fi
print_success "All tests passed"

# Step 4: Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo ""
print_step "Version bump: $BUMP_TYPE"
echo "  Current version: $CURRENT_VERSION"

# Step 5: Calculate new version
if [ "$DRY_RUN" = false ]; then
    # Use npm version to calculate new version
    NEW_VERSION=$(npm version $BUMP_TYPE --no-git-tag-version | sed 's/^v//')
else
    # Calculate what the new version would be for dry-run
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
    case $BUMP_TYPE in
        major)
            NEW_VERSION="$((MAJOR + 1)).0.0"
            ;;
        minor)
            NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
            ;;
        patch)
            NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
            ;;
    esac
fi

echo "  New version: $NEW_VERSION"

# Step 6: Check if tag already exists
if git rev-parse "v$NEW_VERSION" >/dev/null 2>&1; then
    print_error "Tag v$NEW_VERSION already exists locally"
    if git ls-remote --tags origin | grep -q "refs/tags/v$NEW_VERSION"; then
        print_error "Tag v$NEW_VERSION also exists on remote"
        echo "This version has already been released."
        exit 1
    fi

    if [ "$DRY_RUN" = false ]; then
        print_warning "Deleting local tag v$NEW_VERSION"
        git tag -d "v$NEW_VERSION"
    fi
fi

# Step 7: Update manifest.json
print_step "Updating extension/manifest.json..."
if [ "$DRY_RUN" = false ]; then
    python3 -c "
import json
with open('extension/manifest.json', 'r') as f:
    data = json.load(f)
data['version'] = '$NEW_VERSION'
with open('extension/manifest.json', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
"
    print_success "manifest.json updated to $NEW_VERSION"
else
    print_warning "Would update manifest.json to $NEW_VERSION (dry-run)"
fi

# Step 8: Update CHANGELOG.md (updates.json is handled by GitHub Actions)
print_step "Updating CHANGELOG.md..."
RELEASE_DATE=$(date +%Y-%m-%d)

if [ "$DRY_RUN" = false ]; then
    python3 << EOF
import re

version = '$NEW_VERSION'
release_date = '$RELEASE_DATE'

with open('CHANGELOG.md', 'r') as f:
    content = f.read()

# Replace [Unreleased] with the new version
unreleased_pattern = r'## \[Unreleased\]'
content = re.sub(
    unreleased_pattern,
    f'## [Unreleased]\n\n## [{version}] - {release_date}',
    content,
    count=1
)

# Update version links at the bottom
version_links_pattern = r'(## Version Links.*?\n\n)(- \[Unreleased\]:.*?\n)'
new_link = f'- [{version}]: https://github.com/bikemazzell/context-translator/releases/tag/v{version}\n'

def add_version_link(match):
    header = match.group(1)
    unreleased = match.group(2)
    unreleased_updated = re.sub(
        r'compare/v[\d.]+\.\.\.HEAD',
        f'compare/v{version}...HEAD',
        unreleased
    )
    return header + unreleased_updated + new_link

content = re.sub(version_links_pattern, add_version_link, content, flags=re.DOTALL)

with open('CHANGELOG.md', 'w') as f:
    f.write(content)
EOF
    print_success "CHANGELOG.md updated"
else
    print_warning "Would update CHANGELOG.md (dry-run)"
fi

# Step 9: Validate version consistency (skip updates.json - GitHub Actions handles it)
print_step "Validating version consistency..."
if [ "$DRY_RUN" = false ]; then
    MANIFEST_VERSION=$(node -p "require('./extension/manifest.json').version")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")

    if [ "$MANIFEST_VERSION" != "$NEW_VERSION" ] || [ "$PACKAGE_VERSION" != "$NEW_VERSION" ]; then
        print_error "Version mismatch detected!"
        echo "  package.json: $PACKAGE_VERSION"
        echo "  manifest.json: $MANIFEST_VERSION"
        echo "  Expected: $NEW_VERSION"
        exit 1
    fi
    print_success "Version files are consistent"
else
    print_warning "Would validate version consistency (dry-run)"
fi

# Step 11: Build and package
print_step "Building extension package..."
if [ "$DRY_RUN" = false ]; then
    if ./scripts/package-extension.sh; then
        print_success "Extension packaged successfully"
    else
        print_error "Package build failed"
        exit 1
    fi
else
    print_warning "Would build extension package (dry-run)"
fi

# Step 10: Create git commit (exclude updates.json - GitHub Actions updates it)
print_step "Creating release commit..."
if [ "$DRY_RUN" = false ]; then
    git add package.json extension/manifest.json CHANGELOG.md
    git commit -m "Release version $NEW_VERSION"
    print_success "Release commit created"
else
    print_warning "Would create commit 'Release version $NEW_VERSION' (dry-run)"
fi

# Step 13: Create git tag
print_step "Creating git tag v$NEW_VERSION..."
if [ "$DRY_RUN" = false ]; then
    git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
    print_success "Git tag v$NEW_VERSION created"
else
    print_warning "Would create tag v$NEW_VERSION (dry-run)"
fi

# Step 14: Push to remote
echo ""
print_step "Ready to push to remote"
if [ "$DRY_RUN" = false ]; then
    read -p "Push to remote now? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin "$CURRENT_BRANCH"
        git push origin "v$NEW_VERSION"
        print_success "Pushed to remote"
    else
        print_warning "Skipped push to remote"
        echo ""
        echo "To push manually later:"
        echo "  git push origin $CURRENT_BRANCH && git push origin v$NEW_VERSION"
    fi
else
    print_warning "Would ask to push to remote (dry-run)"
fi

# Summary
echo ""
echo "========================================="
echo " Release Complete!"
echo "========================================="
echo ""
echo "Version: $CURRENT_VERSION → $NEW_VERSION"
echo "Tag: v$NEW_VERSION"
echo "Date: $RELEASE_DATE"
echo ""

if [ "$DRY_RUN" = false ]; then
    print_success "Release $NEW_VERSION is ready"
    echo ""
    echo "Next steps:"
    echo "  1. GitHub Actions will build and create the release"
    echo "  2. Verify release at: https://github.com/bike-mazzell/context-translator/releases/tag/v$NEW_VERSION"
else
    print_warning "DRY RUN completed - no changes made"
    echo ""
    echo "Run without --dry-run to execute:"
    echo "  ./scripts/release.sh $BUMP_TYPE"
fi
echo ""
