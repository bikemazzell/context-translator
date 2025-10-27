# Scripts

## Release Script

The unified `release.sh` script automates the entire release process.

### Usage

```bash
# Patch release (default) - bug fixes
npm run release
# or
./scripts/release.sh patch

# Minor release - new features
npm run release:minor
# or
./scripts/release.sh minor

# Major release - breaking changes
npm run release:major
# or
./scripts/release.sh major

# Dry run to preview changes
npm run release:dry-run
# or
./scripts/release.sh patch --dry-run
```

### What It Does

1. **Validates environment**
   - Checks git working directory is clean
   - Confirms on main branch (or asks for confirmation)
   - Pulls latest changes from remote

2. **Runs tests**
   - Executes full test suite
   - Fails if any tests fail

3. **Bumps version**
   - Updates `package.json`
   - Updates `extension/manifest.json`
   - Updates `CHANGELOG.md` with new version and date
   - Note: `updates.json` is updated by GitHub Actions after release

4. **Builds package**
   - Runs `./scripts/package-extension.sh`
   - Creates `.xpi` file in `dist/`

5. **Creates git commit and tag**
   - Commits version changes (package.json, manifest.json, CHANGELOG.md)
   - Creates annotated git tag

6. **Pushes to remote** (optional)
   - Asks for confirmation
   - Pushes commit and tag to origin
   - GitHub Actions workflow will:
     - Build and sign the extension
     - Create GitHub release
     - Update `updates.json` with signed package details

### Prerequisites

- Clean git working directory (no uncommitted changes)
- All tests passing
- Python 3 installed (for JSON manipulation)

### Dry Run Mode

Always test with `--dry-run` first to preview what will happen:

```bash
./scripts/release.sh patch --dry-run
```

This shows all operations without making any changes.

## Package Extension Script

Creates the `.xpi` package from the extension source:

```bash
./scripts/package-extension.sh
```

Output: `dist/context-translator.xpi`
