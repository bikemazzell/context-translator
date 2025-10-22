# Automated Firefox Extension Releases

This project includes a GitHub Actions workflow that fully automates the release process for the Firefox extension.

## What Gets Automated

When you push a version tag (e.g., `v1.0.0`), the workflow automatically:

1. ✅ Verifies the tag matches manifest.json version
2. ✅ Packages the extension
3. ✅ Signs it with Mozilla (using AMO API)
4. ✅ Calculates SHA256 hash
5. ✅ Creates GitHub release
6. ✅ Uploads signed .xpi file
7. ✅ Updates updates.json with new version
8. ✅ Commits and pushes updates.json

**Result:** Users get automatic updates within 24 hours!

## Initial Setup (One-Time)

### Step 1: Get Mozilla API Credentials

1. **Go to Mozilla Add-ons Developer Hub:**
   https://addons.mozilla.org/developers/

2. **Navigate to API Credentials:**
   - Click your username (top right)
   - Select "Edit Profile"
   - Go to "API Credentials" section
   - Or direct link: https://addons.mozilla.org/developers/addon/api/key/

3. **Generate Credentials:**
   - Click "Generate new credentials" or "Create new credentials"
   - Accept the terms of service
   - You'll receive:
     - **JWT issuer** (looks like: `user:12345:67`)
     - **JWT secret** (long string of characters)

4. **Save These Securely:**
   - You'll need them for GitHub Secrets
   - Store them in a password manager
   - **Never commit them to your repository**

### Step 2: Add GitHub Secrets

1. **Go to Your Repository on GitHub:**
   https://github.com/bike-mazzell/context-translator

2. **Navigate to Secrets:**
   - Click "Settings" tab
   - In left sidebar: "Secrets and variables" → "Actions"
   - Click "New repository secret"

3. **Add AMO_API_KEY:**
   - Name: `AMO_API_KEY`
   - Value: Paste your JWT issuer (e.g., `user:12345:67`)
   - Click "Add secret"

4. **Add AMO_API_SECRET:**
   - Click "New repository secret" again
   - Name: `AMO_API_SECRET`
   - Value: Paste your JWT secret
   - Click "Add secret"

### Step 3: Verify Setup

Check that you have both secrets configured:
- Settings → Secrets and variables → Actions
- Should see: `AMO_API_KEY` and `AMO_API_SECRET`

## Creating a Release

### Step 1: Update Version

Edit `extension/manifest.json`:
```json
{
  "version": "1.1.0",
  ...
}
```

### Step 2: Commit Changes

```bash
git add extension/manifest.json
git commit -m "Bump version to 1.1.0"
git push origin main
```

### Step 3: Create and Push Tag

```bash
# Create tag matching the manifest version
git tag v1.1.0

# Push the tag to trigger the workflow
git push origin v1.1.0
```

**Important:** Tag must match manifest.json version (with 'v' prefix).

### Step 4: Watch the Workflow

1. Go to GitHub repository
2. Click "Actions" tab
3. You'll see "Release Firefox Extension" workflow running
4. Click on it to watch progress

The workflow takes **3-10 minutes** depending on Mozilla's signing speed.

### Step 5: Verify Release

Once complete, check:

1. **GitHub Release:**
   - Go to "Releases" tab
   - New release with signed .xpi file

2. **updates.json:**
   - Should be updated with new version
   - Includes correct SHA256 hash

3. **Download URL:**
   ```
   https://github.com/bike-mazzell/context-translator/releases/download/v1.1.0/context-translator-1.1.0.xpi
   ```

## Workflow Details

### Trigger

The workflow runs when you push a tag starting with `v`:

```yaml
on:
  push:
    tags:
      - 'v*'
```

### Version Verification

Ensures manifest.json version matches the tag:
- Tag: `v1.1.0` → Manifest must be `1.1.0`
- If mismatch, workflow fails with clear error

### Signing Process

Uses Mozilla's web-ext tool with API authentication:
```bash
web-ext sign \
  --source-dir=extension \
  --api-key=$AMO_API_KEY \
  --api-secret=$AMO_API_SECRET \
  --channel=unlisted
```

**Channel:** `unlisted` (self-distribution)
- No public listing on AMO
- Automatic signing (usually instant)
- Perfect for self-hosted updates

### Updates.json Management

The workflow automatically updates `updates.json`:
- Adds new version entry
- Includes correct download URL
- Calculates and adds SHA256 hash
- Preserves all previous versions

### Release Notes

GitHub release notes are auto-generated from commits since last tag.

You can customize by editing the release after creation.

## Usage Examples

### Patch Release (1.0.0 → 1.0.1)

```bash
# Update version in manifest.json
vim extension/manifest.json  # Change to "1.0.1"

git add extension/manifest.json
git commit -m "Fix translation caching bug"
git push origin main

git tag v1.0.1
git push origin v1.0.1
```

### Minor Release (1.0.1 → 1.1.0)

```bash
# Update version in manifest.json
vim extension/manifest.json  # Change to "1.1.0"

git add extension/manifest.json
git commit -m "Add new keyboard shortcuts"
git push origin main

git tag v1.1.0
git push origin v1.1.0
```

### Major Release (1.1.0 → 2.0.0)

```bash
# Update version in manifest.json
vim extension/manifest.json  # Change to "2.0.0"

git add extension/manifest.json
git commit -m "Complete UI redesign"
git push origin main

git tag v2.0.0
git push origin v2.0.0
```

## Troubleshooting

### Workflow Fails: Version Mismatch

**Error:**
```
Error: manifest.json version (1.0.0) doesn't match tag version (1.1.0)
```

**Solution:**
1. Update manifest.json to match the tag
2. Delete the tag: `git tag -d v1.1.0 && git push origin :refs/tags/v1.1.0`
3. Create new commit with correct version
4. Recreate tag: `git tag v1.1.0 && git push origin v1.1.0`

### Signing Fails: Authentication Error

**Error:**
```
Error: Authentication failed
```

**Solution:**
1. Verify secrets are set correctly in GitHub:
   - Settings → Secrets → Actions
   - Check `AMO_API_KEY` and `AMO_API_SECRET`
2. Regenerate credentials at addons.mozilla.org if needed
3. Update GitHub secrets with new credentials

### Signing Fails: Extension Already Exists

**Error:**
```
Version already exists
```

**Solution:**
1. You can't re-sign the same version
2. Increment version in manifest.json
3. Create new tag with new version

### Updates.json Not Updating

**Error:**
```
Error: failed to push
```

**Solution:**
1. Ensure workflow has write permissions
2. Check repository settings:
   - Settings → Actions → General
   - Workflow permissions: "Read and write permissions"

### Release Created but .xpi Missing

**Possible causes:**
1. Signing step failed (check logs)
2. File path incorrect (workflow should catch this)
3. Upload step timed out

**Solution:**
- Check workflow logs for errors
- Re-run the workflow from Actions tab

### Mozilla Signing Taking Too Long

**If signing times out after 10 minutes:**

1. Check Mozilla service status: https://status.mozilla.org/
2. Wait and retry later
3. Try manual signing at addons.mozilla.org

## Advanced Configuration

### Customize Release Notes

Add a release notes file before creating tag:

```bash
echo "## What's New
- Feature A
- Feature B
- Bug fix C" > .release-notes.md

git add .release-notes.md
git commit -m "Add release notes"
git push origin main

git tag v1.1.0
git push origin v1.1.0
```

Then edit `.github/workflows/release.yml`:

```yaml
- name: Create GitHub Release
  uses: softprops/action-gh-release@v1
  with:
    files: ${{ steps.sign.outputs.signed_xpi }}
    body_path: .release-notes.md  # Add this line
```

### Beta Releases

For beta versions, use prerelease tags:

```bash
# In manifest.json: "version": "1.1.0beta1"
git tag v1.1.0beta1
git push origin v1.1.0beta1
```

Modify workflow to mark as prerelease:

```yaml
- name: Create GitHub Release
  uses: softprops/action-gh-release@v1
  with:
    files: ${{ steps.sign.outputs.signed_xpi }}
    generate_release_notes: true
    prerelease: ${{ contains(steps.version.outputs.tag, 'beta') }}
```

### Separate Update Channels

Create separate update manifests for stable/beta:

**For beta channel:**
1. Create `updates-beta.json`
2. Create separate workflow triggered by `v*beta*` tags
3. Update beta workflow to modify `updates-beta.json`

Users opt into beta by using beta extension with:
```json
"update_url": "https://raw.githubusercontent.com/bike-mazzell/context-translator/main/updates-beta.json"
```

## Monitoring Releases

### Check Workflow Status

```bash
# List recent workflow runs
gh run list --workflow=release.yml

# View specific run logs
gh run view <run-id>
```

### Verify Update Distribution

After release, check:

1. **updates.json is updated:**
   ```bash
   curl https://raw.githubusercontent.com/bike-mazzell/context-translator/main/updates.json
   ```

2. **XPI is downloadable:**
   ```bash
   curl -I https://github.com/bike-mazzell/context-translator/releases/download/v1.1.0/context-translator-1.1.0.xpi
   ```

3. **SHA256 matches:**
   ```bash
   curl -L https://github.com/bike-mazzell/context-translator/releases/download/v1.1.0/context-translator-1.1.0.xpi | sha256sum
   ```

## Security Best Practices

### Protect API Credentials

- ✅ Store in GitHub Secrets (encrypted)
- ✅ Never commit to repository
- ✅ Rotate periodically (every 6-12 months)
- ✅ Use separate credentials for different projects

### Review Permissions

GitHub Actions needs:
- ✅ Read repository (to checkout code)
- ✅ Write contents (to push updates.json)
- ✅ Write releases (to create releases)

Verify in Settings → Actions → General → Workflow permissions

### Audit Releases

Regularly check:
- Which versions were released
- SHA256 hashes match
- No unauthorized releases

## Cost

**Free!**
- GitHub Actions: 2,000 minutes/month on free tier
- Mozilla signing: Free
- Typical release: ~5 minutes

You can create ~400 releases/month on free tier.

## Summary

### One-time setup:
1. Get Mozilla API credentials
2. Add to GitHub Secrets
3. Push the workflow file

### Every release:
1. Update manifest.json version
2. Commit and push
3. Create and push tag
4. Wait ~5 minutes
5. Users auto-update within 24 hours

**That's it!** No manual signing, no manual SHA256 calculation, no manual updates.json editing.

## Quick Reference

```bash
# Complete release process
vim extension/manifest.json          # Update version
git add extension/manifest.json
git commit -m "Release v1.1.0"
git push origin main
git tag v1.1.0
git push origin v1.1.0

# Watch progress
# GitHub → Actions → Release Firefox Extension

# Verify
curl https://raw.githubusercontent.com/bike-mazzell/context-translator/main/updates.json | jq
```

## Further Reading

- **GitHub Actions Documentation:** https://docs.github.com/actions
- **web-ext Sign Command:** https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-sign
- **Mozilla AMO API:** https://addons-server.readthedocs.io/en/latest/topics/api/signing.html
- **Semantic Versioning:** https://semver.org/

## Questions?

- Check workflow logs in GitHub Actions tab
- Review Mozilla signing documentation
- Verify secrets are configured correctly
- Ensure manifest version matches tag
