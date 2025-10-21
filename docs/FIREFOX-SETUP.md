# Firefox Setup for Unsigned Extensions

## The Issue

Firefox blocks unsigned extensions with the error: "could not be verified for use in Firefox"

## Solutions

### Option 1: Firefox Developer Edition (Recommended)

1. **Install Firefox Developer Edition:**
   - Download from: https://www.mozilla.org/firefox/developer/
   - Or Firefox Nightly: https://www.mozilla.org/firefox/nightly/

2. **Configure Firefox Developer Edition:**
   - Open Firefox Developer Edition
   - Navigate to `about:config`
   - Click "Accept the Risk and Continue"
   - Search for: `xpinstall.signatures.required`
   - Click the toggle to set it to `false`
   - Restart Firefox

3. **Install the Extension:**
   - Open `about:addons`
   - Click the gear icon (⚙️)
   - Select "Install Add-on From File..."
   - Navigate to `dist/context-translator.xpi`
   - Click "Open"
   - Extension will install and persist across restarts!

### Option 2: Temporary Installation (Current Firefox)

If you want to use regular Firefox (not Developer/Nightly):

1. **Load as Temporary Add-on:**
   - Navigate to `about:debugging`
   - Click "This Firefox" in the left sidebar
   - Click "Load Temporary Add-on..."
   - Navigate to `extension/manifest.json`
   - Select the file

2. **Limitations:**
   - Extension unloads when Firefox closes
   - Must reload every time you restart Firefox
   - Good for testing, not for daily use

### Option 3: Firefox ESR with Override

**Note:** This only works on some systems and is not recommended.

1. Open `about:config`
2. Search for `xpinstall.signatures.required`
3. Try to set it to `false` (may not be available in regular Firefox)

If the setting doesn't exist or can't be changed, you must use Option 1 or 2.

## Why This Happens

Mozilla requires all Firefox extensions to be signed by Mozilla to protect users from malicious add-ons. Our extension is:
- Not signed because it's a local development extension
- Not submitted to Mozilla Add-ons store
- Perfectly safe (you built it from source!)

## Verification Steps

After installing, verify it works:

1. **Check Extension is Active:**
   - Go to `about:addons`
   - Context Translator should be listed and enabled

2. **Check Native Messaging:**
   - Open browser console (F12)
   - Navigate to any webpage
   - Click the extension icon
   - Look for any errors

3. **Test Translation:**
   - Navigate to a German news site (e.g., tagesschau.de)
   - Toggle the translator on
   - Click any word
   - Translation should appear

## Troubleshooting

### "This add-on could not be installed because it appears to be corrupt"

- Rerun the packaging script: `./scripts/package-extension.sh`
- Verify the .xpi file exists: `ls -lh dist/context-translator.xpi`
- Check file size (should be ~20KB)

### "This add-on is not compatible with your version of Firefox"

- Check your Firefox version: `about:support`
- Extension requires Firefox 78+ (manifest v2)
- Update Firefox if needed

### Extension installs but doesn't work

1. Check native messaging host:
   ```bash
   ls ~/.mozilla/native-messaging-hosts/context_translator_host.json
   cat ~/.mozilla/native-messaging-hosts/context_translator_host.json
   ```

2. Verify Python script path is correct
3. Restart Firefox after installation

### Settings don't persist after restart

- This means Firefox is treating it as temporary
- Ensure you're using Firefox Developer/Nightly Edition
- Verify `xpinstall.signatures.required = false` in about:config
- Try uninstalling and reinstalling

## Summary

**For permanent installation:**
- Use Firefox Developer Edition or Nightly
- Set `xpinstall.signatures.required = false`
- Install via "Install Add-on From File"

**For testing only:**
- Use regular Firefox
- Load via `about:debugging` as temporary add-on
- Reload after each restart

---

**Recommended:** Firefox Developer Edition with `xpinstall.signatures.required = false` provides the best experience for local extension development.
