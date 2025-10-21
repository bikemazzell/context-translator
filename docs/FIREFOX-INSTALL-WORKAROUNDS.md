# Firefox Unsigned Extension Installation - Complete Guide (2025)

## The Problem

If `xpinstall.signatures.required = false` is **NOT working**, you're likely using **Firefox Release** (regular version).

**Critical Fact:** As of 2025, Mozilla has **completely disabled** the ability to install unsigned extensions in Firefox Release and Beta versions. The `xpinstall.signatures.required` preference **does not exist** or **does not work** in these versions.

## Check Your Firefox Version

1. Open Firefox
2. Go to: `about:support`
3. Look for "Application Basics" → "Version"
4. Check the version string:
   - `xxx.x` or `xxx.x (64-bit)` = **Release** (won't work)
   - `xxx.xb1` or `xxx beta` = **Beta** (won't work)
   - `xxx.xa1` or includes "Nightly" = **Nightly** (will work)
   - `xxx.x esr` = **ESR** (will work)
   - Includes "Developer Edition" = **Developer Edition** (will work)

## Solutions (Ranked by Ease)

### Solution 1: Load as Temporary Add-on (Easiest - Works Right Now)

This works on **ANY Firefox version** including regular Release.

**Steps:**

1. Open Firefox (your current version)
2. Navigate to: `about:debugging`
3. Click **"This Firefox"** in the left sidebar
4. Click **"Load Temporary Add-on..."**
5. Navigate to your extension folder
6. Select the file: `extension/manifest.json` (NOT the .xpi file!)
7. Extension loads immediately

**Pros:**
- ✅ Works on any Firefox version (including Release)
- ✅ No special configuration needed
- ✅ Immediate installation
- ✅ Perfect for testing

**Cons:**
- ❌ Extension unloads when Firefox closes
- ❌ Must reload every time you restart Firefox
- ❌ Not suitable for daily use

**When to use:** Testing, development, or if you're willing to reload on each Firefox restart

---

### Solution 2: Firefox Developer Edition (Best for Daily Use)

Download a separate Firefox installation that allows unsigned extensions.

**Steps:**

1. **Download Firefox Developer Edition:**
   - https://www.mozilla.org/firefox/developer/
   - Installs alongside regular Firefox (doesn't replace it)
   - Different icon, can run simultaneously

2. **Configure Developer Edition:**
   - Open Firefox Developer Edition
   - Go to: `about:config`
   - Click "Accept the Risk and Continue"
   - Search for: `xpinstall.signatures.required`
   - Click toggle to set it to: `false`
   - Restart Firefox Developer Edition

3. **Install Extension:**
   - Open: `about:addons`
   - Click gear icon (⚙️)
   - Select "Install Add-on From File..."
   - Navigate to: `dist/context-translator.xpi`
   - Click "Open"

4. **Done!** Extension persists across restarts

**Pros:**
- ✅ Extension persists across restarts
- ✅ Can run alongside regular Firefox
- ✅ Same as regular Firefox but for developers
- ✅ Free and official from Mozilla
- ✅ Permanent installation

**Cons:**
- ❌ Requires separate Firefox installation
- ❌ ~200MB download
- ❌ Need to use different Firefox version

**When to use:** Daily use of unsigned extensions

---

### Solution 3: Firefox ESR (Enterprise Support Release)

Long-term support version that allows unsigned extensions.

**Steps:**

1. **Download Firefox ESR:**
   - https://www.mozilla.org/firefox/enterprise/
   - Can install alongside regular Firefox
   - Slower update cycle (suited for enterprises)

2. **Configure Firefox ESR:**
   - Open Firefox ESR
   - Go to: `about:config`
   - Search for: `xpinstall.signatures.required`
   - Set to: `false`
   - Restart Firefox ESR

3. **Install Extension:**
   - Same as Developer Edition (above)

**Pros:**
- ✅ Extension persists across restarts
- ✅ Slower update cycle (more stable)
- ✅ Can run alongside regular Firefox
- ✅ Permanent installation

**Cons:**
- ❌ Requires separate Firefox installation
- ❌ Older feature set (slower updates)
- ❌ Not recommended unless you need ESR for other reasons

**When to use:** If you specifically need ESR for enterprise/stability reasons

---

### Solution 4: Firefox Nightly (Bleeding Edge)

The experimental nightly builds of Firefox.

**Steps:**

1. **Download Firefox Nightly:**
   - https://www.mozilla.org/firefox/nightly/
   - Cutting-edge features, updated daily
   - Can run alongside regular Firefox

2. **Configure and Install:**
   - Same steps as Developer Edition

**Pros:**
- ✅ Extension persists across restarts
- ✅ Latest Firefox features
- ✅ Can run alongside regular Firefox
- ✅ Permanent installation

**Cons:**
- ❌ Requires separate Firefox installation
- ❌ Less stable (nightly builds)
- ❌ Updates daily (can break things)
- ❌ Not recommended for daily browsing

**When to use:** If you want bleeding-edge Firefox features

---

### Solution 5: Get Extension Signed by Mozilla (Most Proper)

Submit your extension to Mozilla for signing (works on ALL Firefox versions).

**Quick Process:**

1. Create account: https://addons.mozilla.org/
2. Submit extension: https://addons.mozilla.org/developers/addon/submit/upload-unlisted
3. Choose **"Self-distribution"** (not public listing)
4. Upload: `dist/context-translator.xpi`
5. Wait: Minutes to hours (automated review)
6. Download: Signed .xpi file
7. Install on **any Firefox** (even Release version!)

**Pros:**
- ✅ Works on ALL Firefox versions (including Release)
- ✅ No special Firefox version needed
- ✅ Permanent installation
- ✅ Extension persists across restarts
- ✅ Proper/official solution
- ✅ Free and relatively fast

**Cons:**
- ❌ Requires Mozilla account
- ❌ Submission process (though simple)
- ❌ Must re-submit for each update
- ❌ Automated review (rarely rejects, but possible)

**When to use:** If you want to use regular Firefox Release and don't want temporary loading

See [SIGNING.md](SIGNING.md) for detailed signing guide.

---

## Recommended Workflow

### For Testing/Development:
```bash
# Quick testing
1. about:debugging → Load Temporary Add-on
2. Select: extension/manifest.json
3. Test your changes
4. Reload when needed
```

### For Daily Use:
```bash
# Option A: Developer Edition (easiest)
1. Download Firefox Developer Edition
2. Set xpinstall.signatures.required = false
3. Install: dist/context-translator.xpi
4. Use daily

# Option B: Get signed (most proper)
1. Submit to Mozilla for self-distribution
2. Download signed .xpi
3. Install on regular Firefox
4. Use daily
```

---

## Why xpinstall.signatures.required Doesn't Work

**Historical Context:**

- **Pre-2016:** Firefox allowed unsigned extensions
- **Firefox 43 (2015):** Signature requirement introduced
- **Firefox 48 (2016):** Enforcement became mandatory for Release/Beta
- **2020-2025:** Preference removed entirely from Release/Beta

**Current Status (2025):**

| Firefox Version | `xpinstall.signatures.required` | Install Unsigned? |
|-----------------|----------------------------------|-------------------|
| **Release** | ❌ Doesn't exist/work | ❌ No |
| **Beta** | ❌ Doesn't exist/work | ❌ No |
| **Developer Edition** | ✅ Works | ✅ Yes |
| **Nightly** | ✅ Works | ✅ Yes |
| **ESR** | ✅ Works | ✅ Yes |

**Mozilla's Reasoning:**
- Security: Prevent malicious unsigned extensions
- User protection: All extensions reviewed/scanned
- Trust: Users can trust installed extensions
- Privacy: Prevent data theft from malicious code

**Impact:**
- Developer Edition/Nightly: Keeps override for developers
- Release/Beta: No override (forces signing for end users)
- ESR: Keeps override for enterprise deployments

---

## Troubleshooting

### "The add-on could not be verified"
- You're using Firefox Release/Beta
- Solution: Use Developer Edition, Nightly, ESR, or get signed

### "The add-on appears to be corrupt"
- Your .xpi file might actually be corrupt
- Try repackaging: `./scripts/package-extension.sh`
- Verify: `unzip -t dist/context-translator.xpi`

### xpinstall.signatures.required preference doesn't exist
- You're using Firefox Release/Beta
- This is expected - the preference was removed
- Solution: Use different Firefox version or get signed

### Temporary add-on disappears after restart
- This is expected behavior for temporary add-ons
- Solution: Use Developer Edition or get signed

### Extension works in Developer Edition but not Release
- Release requires signed extensions
- Developer Edition allows unsigned
- Solution: Get extension signed for Release

---

## Quick Decision Tree

```
Do you want to use regular Firefox Release?
│
├─ YES → Get extension signed by Mozilla (Solution 5)
│        OR use temporary loading (Solution 1)
│
└─ NO → Are you okay with separate Firefox installation?
         │
         ├─ YES → Use Firefox Developer Edition (Solution 2)
         │
         └─ NO → Use temporary loading every restart (Solution 1)
```

---

## Automation: Auto-load Temporary Add-on

If you choose temporary loading, you can automate it:

**Using web-ext (command-line tool):**

```bash
# Install web-ext
npm install -g web-ext

# Run Firefox with auto-reload
cd extension
web-ext run --verbose
```

This:
- Opens Firefox with extension loaded
- Auto-reloads on code changes
- Closes when you stop the command

**Pros:**
- ✅ Automatic reload on changes
- ✅ Good for development

**Cons:**
- ❌ Still temporary (closes with command)
- ❌ Requires Node.js/npm

---

## Comparison Matrix

| Solution | Persistence | Firefox Version | Setup Time | Best For |
|----------|-------------|-----------------|------------|----------|
| Temporary Load | ❌ Session only | Any | 1 min | Testing |
| Developer Edition | ✅ Permanent | Separate | 10 min | Daily use |
| Firefox ESR | ✅ Permanent | Separate | 10 min | Enterprise |
| Firefox Nightly | ✅ Permanent | Separate | 10 min | Bleeding edge |
| Mozilla Signing | ✅ Permanent | Any (Release!) | 1-2 hours | Production |

---

## Our Recommendation

**For Context Translator:**

1. **Right now (immediate testing):**
   - Use `about:debugging` → Load Temporary Add-on
   - Test the merged translation feature
   - Quick and works immediately

2. **For daily use (next step):**
   - **Option A:** Download Firefox Developer Edition (~10 min setup)
   - **Option B:** Submit for Mozilla signing (~1-2 hours, works on Release)

3. **Choose based on:**
   - Want to keep using Firefox Release? → Get signed
   - Okay with Developer Edition? → Use Developer Edition
   - Just testing? → Temporary loading

**My suggestion:** Try temporary loading now to test, then decide if you want Developer Edition (easier) or Mozilla signing (more proper).

---

## Additional Resources

- **Mozilla Extension Workshop:** https://extensionworkshop.com/
- **about:debugging Guide:** https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/
- **Signing Guide:** See [SIGNING.md](SIGNING.md)
- **Developer Edition:** https://www.mozilla.org/firefox/developer/
- **web-ext tool:** https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/

---

## Summary

**The Hard Truth:**
- `xpinstall.signatures.required = false` **ONLY works** in Developer Edition, Nightly, and ESR
- It **DOES NOT work** in Firefox Release or Beta (by design since 2016)
- Mozilla removed this capability to protect users

**Your Options:**
1. ✅ Load as temporary add-on (works everywhere, but session-only)
2. ✅ Use Firefox Developer Edition (separate browser, permanent)
3. ✅ Get extension signed by Mozilla (works on Release, permanent)

**Bottom Line:**
If you want to keep using Firefox Release with a **permanent** unsigned extension installation, it's **impossible** as of 2025. You must either use a different Firefox variant or get your extension signed.
