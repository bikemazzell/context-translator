# Versioning Strategy

Context Translator follows [Semantic Versioning 2.0.0](https://semver.org/) (SemVer).

## Version Format

```
MAJOR.MINOR.PATCH
```

Example: `1.2.3`

- **MAJOR** version: Incompatible API changes or breaking functionality
- **MINOR** version: New features, backward-compatible
- **PATCH** version: Bug fixes, backward-compatible

## When to Increment

### MAJOR Version (X.0.0)

Increment when making **breaking changes**:

- Manifest V2 → Manifest V3 migration
- Changes to native messaging protocol that break compatibility
- Removal of supported languages
- Changes to translation API contract
- Breaking changes to configuration file format
- Minimum Firefox version bump that breaks existing installations

**Example:** `1.5.2` → `2.0.0`

### MINOR Version (x.Y.0)

Increment when adding **new features** (backward-compatible):

- New translation languages added
- New API endpoints
- New configuration options (with defaults)
- Performance improvements that don't break existing functionality
- New display modes (inline, tooltip, etc.)
- Enhanced caching strategies
- LLM provider support additions

**Example:** `1.5.2` → `1.6.0`

### PATCH Version (x.y.Z)

Increment for **bug fixes and minor improvements**:

- Translation accuracy improvements
- Bug fixes that don't change behavior
- Performance optimizations
- Documentation updates
- UI polish and minor improvements
- Security patches
- Dependency updates (within compatible ranges)

**Example:** `1.5.2` → `1.5.3`

## Pre-release Versions

For pre-release versions, append a hyphen and identifier:

- **Alpha:** `1.6.0-alpha.1` - Internal testing, unstable
- **Beta:** `1.6.0-beta.1` - Public testing, feature-complete
- **RC:** `1.6.0-rc.1` - Release candidate, final testing

## Version Synchronization

The version number must be updated in the following files:

1. **Extension manifest:** `extension/manifest.json`
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **README.md:** Bottom of file
   ```markdown
   **Version:** 1.0.0
   ```

3. **Git tag:** Create annotated tag
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

## Release Process

### 1. Pre-release Checklist

- [ ] All tests passing (`pytest`, `mypy`, `ruff`)
- [ ] JavaScript syntax validated
- [ ] Extension tested in Firefox
- [ ] CHANGELOG.md updated
- [ ] README.md version updated
- [ ] manifest.json version updated

### 2. Version Bump

```bash
# For patch release
./scripts/bump-version.sh patch

# For minor release
./scripts/bump-version.sh minor

# For major release
./scripts/bump-version.sh major
```

### 3. Create Release

```bash
# Create git tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0

# Package extension
./scripts/package-extension.sh
```

### 4. Post-release

- [ ] Upload `.xpi` to releases page
- [ ] Update documentation
- [ ] Announce release (if public)

## Version History

### Current Version: 1.0.0

- Initial stable release
- Context-aware translation with local LLM
- Native messaging architecture
- SQLite caching with TTL
- Dark mode support
- Firefox extension with toolbar UI

## Changelog Location

Detailed changes for each version are documented in [CHANGELOG.md](CHANGELOG.md).

## Backward Compatibility Policy

- **Extension → Backend:** MAJOR versions must match
- **Configuration:** Old configs must work with MINOR/PATCH updates
- **Cache:** Cache schema changes require MAJOR version bump
- **Native Messaging:** Protocol changes require MAJOR version bump

## Deprecation Policy

Features marked for deprecation:

1. Announce deprecation in MINOR version
2. Keep feature working with warnings
3. Remove in next MAJOR version (minimum 6 months later)

## Version Automation

Future improvement: Automate version bumps with:

```bash
# Install: npm install -g standard-version
standard-version --release-as minor
```

This will:
- Update version in all files
- Update CHANGELOG.md
- Create git tag
- Create git commit

---

**Note:** This document should be updated if versioning strategy changes.
