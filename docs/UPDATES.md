# Automatic Updates for Self-Hosted Firefox Extension

## Overview

This extension is configured for automatic updates when self-hosted on GitHub. Firefox checks for updates every 24 hours and automatically installs new versions.

## How It Works

1. **manifest.json** contains `update_url` pointing to your update manifest
2. **updates.json** (hosted on GitHub) lists available versions
3. Firefox checks the update URL periodically
4. When a new version is found, Firefox downloads and installs it automatically

## Setup Instructions

### 1. Update the Manifest

The `extension/manifest.json` already includes the update URL in the `browser_specific_settings` section:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "context-translator@bike-mazzell",
    "strict_min_version": "50.0",
    "update_url": "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/updates.json"
  }
}
```

**Action Required:** Replace `YOUR_USERNAME/YOUR_REPO` with your actual GitHub repository details.

### 2. Host the Update Manifest

The `updates.json` file must be hosted on GitHub using HTTPS.

**Option A: Host in your extension repository**
- Place `updates.json` at the root of your repository
- Update URL: `https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/updates.json`

**Option B: Host in GitHub Pages repository**
- Place `updates.json` in your GitHub Pages repo
- Update URL: `https://YOUR_USERNAME.github.io/updates.json`

### 3. Configure updates.json

The template `updates.json` file structure:

```json
{
  "addons": {
    "context-translator@bike-mazzell": {
      "updates": [
        {
          "version": "1.0.0",
          "update_link": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/context_translator-1.0.0.xpi",
          "update_hash": "sha256:HASH_OF_XPI_FILE"
        }
      ]
    }
  }
}
```

**Required fields:**
- `version`: Version number (must match manifest.json)
- `update_link`: Direct URL to the signed .xpi file (must be HTTPS)
- `update_hash`: SHA256 hash of the .xpi file (optional but recommended)

**Optional fields:**
- `applications`: Specify Firefox version requirements
  ```json
  "applications": {
    "gecko": {
      "strict_min_version": "50.0"
    }
  }
  ```

## Publishing a New Version

### Step 1: Update Version Number

Edit `extension/manifest.json`:
```json
{
  "version": "1.1.0",
  ...
}
```

### Step 2: Package the Extension

```bash
./scripts/package-extension.sh
```

This creates `dist/context-translator.xpi`.

### Step 3: Sign the Extension

1. Go to https://addons.mozilla.org/developers/
2. Submit the .xpi for self-distribution signing
3. Download the signed .xpi file
4. Rename it: `context-translator-1.1.0-signed.xpi`

### Step 4: Generate SHA256 Hash

```bash
sha256sum context-translator-1.1.0-signed.xpi
```

Copy the hash output.

### Step 5: Create GitHub Release

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.1.0`
4. Release title: `Version 1.1.0`
5. Description: List changes
6. Upload the signed .xpi file
7. Publish release

The download URL will be:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.1.0/context-translator-1.1.0-signed.xpi
```

### Step 6: Update updates.json

Add the new version to `updates.json`:

```json
{
  "addons": {
    "context-translator@bike-mazzell": {
      "updates": [
        {
          "version": "1.0.0",
          "update_link": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.0.0/context_translator-1.0.0-signed.xpi",
          "update_hash": "sha256:OLD_HASH"
        },
        {
          "version": "1.1.0",
          "update_link": "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/download/v1.1.0/context-translator-1.1.0-signed.xpi",
          "update_hash": "sha256:NEW_HASH"
        }
      ]
    }
  }
}
```

**Important:** Firefox uses the highest version number, so you can keep old versions for rollback capability.

### Step 7: Commit and Push updates.json

```bash
git add updates.json
git commit -m "Update to version 1.1.0"
git push origin main
```

### Step 8: Verify Update URL

Check that the raw URL is accessible:
```
https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/updates.json
```

Open this URL in a browser - you should see the JSON content.

## Update Check Timeline

- Firefox checks for updates every **86400 seconds (24 hours)**
- Users can manually check: `about:addons` → Extension menu (⋮) → "Check for Updates"
- Update installs automatically after download

## Troubleshooting

### Updates Not Working

1. **Verify update_url is HTTPS:**
   - Must use `https://`, not `http://`
   - Check manifest.json has correct URL

2. **Check JSON syntax:**
   - Validate updates.json at https://jsonlint.com/
   - Ensure proper formatting

3. **Verify extension ID matches:**
   - ID in updates.json must match manifest.json
   - ID: `context-translator@bike-mazzell`

4. **Check file accessibility:**
   - Open update_url in browser
   - Ensure updates.json is publicly accessible
   - GitHub raw URLs should work: `https://raw.githubusercontent.com/...`

5. **Verify .xpi file is accessible:**
   - Click the update_link URL
   - Should download the .xpi file
   - Must be HTTPS

### Hash Verification Failures

If update fails with hash mismatch:

1. **Regenerate hash:**
   ```bash
   sha256sum your-extension.xpi
   ```

2. **Update updates.json with correct hash**

3. **Push changes to GitHub**

### Version Not Detected

Ensure version numbers follow proper format:
- Valid: `1.0.0`, `1.2.3`, `2.0.0beta1`
- Invalid: `v1.0.0`, `version-1.0`, `1.0`

### Extension Not Signed

Only signed extensions can use automatic updates. Self-distributed extensions must be:
1. Signed by Mozilla (see SIGNING.md)
2. Hosted with proper update_url

## Security Considerations

1. **Always use HTTPS:**
   - Both update manifest and .xpi files must be HTTPS
   - Firefox rejects HTTP URLs

2. **Include SHA256 hash:**
   - Prevents tampering
   - Ensures downloaded file integrity
   - Highly recommended

3. **Sign all versions:**
   - Never distribute unsigned .xpi files
   - Each version must be signed by Mozilla

## Testing Updates

### Test New Version Locally

Before publishing:

1. **Install current version** in Firefox
2. **Package new version** with updated version number
3. **Sign new version** through Mozilla
4. **Update updates.json** locally
5. **Host updates.json** temporarily (use local server or GitHub branch)
6. **Update manifest.json** to point to test URL
7. **Check for updates** in Firefox
8. **Verify installation** works correctly

### Manual Update Check

```
about:addons → Context Translator → ⋮ → Check for Updates
```

## Advanced Configuration

### Version-Specific Requirements

Require specific Firefox versions for certain updates:

```json
{
  "version": "2.0.0",
  "update_link": "https://github.com/.../v2.0.0/extension.xpi",
  "update_hash": "sha256:HASH",
  "applications": {
    "gecko": {
      "strict_min_version": "91.0"
    }
  }
}
```

Firefox versions below 91.0 will not install version 2.0.0.

### Multiple Update Channels

You can maintain separate update channels:

**Stable channel:**
```
"update_url": "https://raw.githubusercontent.com/USER/REPO/main/updates.json"
```

**Beta channel:**
```
"update_url": "https://raw.githubusercontent.com/USER/REPO/main/updates-beta.json"
```

Different manifest builds point to different update URLs.

## Resources

- **Mozilla Update Documentation:** https://extensionworkshop.com/documentation/manage/updating-your-extension/
- **Manifest browser_specific_settings:** https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings
- **Self-Distribution Guide:** https://extensionworkshop.com/documentation/publish/self-distribution/

## Quick Reference

```bash
# Release Checklist
□ Update version in manifest.json
□ Package: ./scripts/package-extension.sh
□ Sign at addons.mozilla.org
□ Generate SHA256 hash
□ Create GitHub release with .xpi
□ Update updates.json with new version
□ Commit and push updates.json
□ Verify raw URL is accessible
□ Test update check in Firefox
```

## Summary

**Initial Setup:**
1. Replace `YOUR_USERNAME/YOUR_REPO` in manifest.json
2. Host updates.json on GitHub (public, HTTPS)
3. Ensure extension is signed

**For Each Release:**
1. Update version → Package → Sign
2. Create GitHub release with signed .xpi
3. Update updates.json with new version entry
4. Push updates.json to GitHub
5. Users get automatic updates within 24 hours
