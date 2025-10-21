# Getting Your Extension Signed by Mozilla

## Overview

To install extensions in regular Firefox (not Developer Edition), they must be signed by Mozilla. There are two ways to get your extension signed:

## Option 1: Self-Distribution (Recommended for Personal Use)

This allows you to distribute the signed .xpi file yourself without publishing to the Mozilla Add-ons store.

### Steps:

1. **Create Mozilla Add-ons Account:**
   - Go to: https://addons.mozilla.org/
   - Click "Log in" (top right)
   - Create account or log in with Firefox Account

2. **Submit for Self-Distribution:**
   - Go to: https://addons.mozilla.org/developers/
   - Click "Submit a New Add-on"
   - Select: **"On your own"** (self-distribution)
   - Upload your .xpi file: `dist/context-translator.xpi`

3. **Automated Review:**
   - Mozilla's automated system reviews the extension
   - Usually takes minutes to a few hours
   - Checks for:
     - Security issues
     - Malicious code
     - Policy violations
     - Code quality

4. **Download Signed Extension:**
   - Once approved, download the signed .xpi file
   - This signed version works in regular Firefox!
   - You can distribute it however you want (email, website, etc.)

5. **Install on Any Firefox:**
   - Users can install the signed .xpi via "Install Add-on From File"
   - No special configuration needed
   - Works on regular Firefox

### Pros:
- Works on all Firefox installations
- No listing on public store required
- Full control over distribution
- Free and relatively fast

### Cons:
- Manual re-submission for each update
- Users must manually install (can't auto-update from store)
- Less discoverable (not in public marketplace)

---

## Option 2: Public Listing (Recommended for Public Distribution)

Publish your extension on the Mozilla Add-ons store for maximum reach.

### Steps:

1. **Prepare Extension:**
   - Ensure all code follows [Mozilla policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
   - No obfuscated code
   - No hidden functionality
   - Privacy policy if collecting data
   - Clear description and screenshots

2. **Create Listing:**
   - Go to: https://addons.mozilla.org/developers/
   - Click "Submit a New Add-on"
   - Select: **"On this site"** (public listing)
   - Fill out:
     - Extension name
     - Summary (250 chars)
     - Description (detailed)
     - Categories
     - Screenshots (at least 1, recommended 3-5)
     - Support information

3. **Upload Extension:**
   - Upload your .xpi file
   - Provide source code if using build tools (we use npm/vite for frontend)
   - Explain build process

4. **Review Process:**
   - **Automated review:** Immediate (minutes)
   - **Manual review:** 1-7 days for first submission
   - Reviewers check for:
     - Code quality
     - User experience
     - Policy compliance
     - Security

5. **Once Approved:**
   - Extension appears on addons.mozilla.org
   - Users can install with one click
   - Automatic updates when you publish new versions
   - Better discoverability

### Pros:
- Maximum discoverability
- One-click installation for users
- Automatic updates
- Trusted by users (verified badge)
- Usage statistics

### Cons:
- Manual review process (1-7 days initially)
- Must follow strict policies
- Public listing (less privacy)
- Requires ongoing maintenance

---

## Option 3: Developer Edition/Nightly (No Signing)

As discussed earlier - requires special Firefox version.

---

## Recommended Approach for Context Translator

Given this is a personal/local LLM tool:

### **Phase 1: Self-Distribution (Now)**
1. Submit for self-distribution to get signed .xpi
2. Use signed version for your own use
3. Share with friends/colleagues if desired
4. No public listing required

### **Phase 2: Public Listing (Later, Optional)**
If you want to share with the community:
1. Polish the extension (add screenshots, better description)
2. Create comprehensive user guide
3. Submit for public listing
4. Maintain and update based on user feedback

---

## Important Notes

### Native Messaging Host
The **Python backend** (native messaging host) is NOT part of the signed extension. Users must:
1. Install the signed .xpi (extension)
2. Separately install the native messaging host (Python script)
3. This is normal for extensions that use native messaging

### Source Code Requirement
If your extension uses build tools (webpack, vite, npm, etc.), Mozilla requires:
- **Source code:** All original source files
- **Build instructions:** Clear steps to reproduce the .xpi
- **Dependencies:** package.json, requirements.txt, etc.

For Context Translator:
- Extension code: Already in `extension/` (no build step)
- Native host: Python script (user installs separately)

Since the extension itself (`extension/` folder) doesn't use build tools, you only need to upload the files in that directory.

---

## Step-by-Step: Self-Distribution Signing

### 1. Prepare for Submission

```bash
# Ensure extension is packaged
./scripts/package-extension.sh

# Verify the package
ls -lh dist/context-translator.xpi
unzip -l dist/context-translator.xpi
```

### 2. Create Submission Package

For Mozilla review, prepare:

```
context-translator-submission/
├── context-translator.xpi        # The extension package
├── README.md                      # Installation instructions
├── NATIVE-HOST-SETUP.md          # Native messaging setup
└── LICENSE                        # Open source license (recommended)
```

### 3. Submit to Mozilla

1. Go to: https://addons.mozilla.org/developers/addon/submit/upload-unlisted
2. Choose "Self-distribution"
3. Upload `context-translator.xpi`
4. Fill out basic info:
   - Name: Context Translator
   - Summary: "Context-aware translation using local LLM models"
   - Categories: Language Tools

### 4. Automated Review

- Usually completes in **minutes to hours**
- Check for validation errors
- Fix any issues and resubmit

### 5. Download Signed Extension

- Once approved, download the signed .xpi
- Rename to: `context-translator-signed.xpi`
- This version works on ALL Firefox installations!

### 6. Distribute

You can now:
- Install on your own Firefox (regular version)
- Share the signed .xpi with others
- Host on your own website
- Email to friends/colleagues

---

## Updating Your Extension

### Self-Distribution:
1. Make changes to code
2. Update version in `manifest.json`
3. Repackage: `./scripts/package-extension.sh`
4. Re-submit to Mozilla for signing
5. Download new signed version
6. Users must manually install update

### Public Listing:
1. Make changes to code
2. Update version in `manifest.json`
3. Submit update through developer dashboard
4. After approval, users get automatic update

---

## Troubleshooting Submission

### "Extension contains minified or obfuscated code"
- Ensure no minified libraries
- Use readable code
- Provide source if using build tools

### "Missing required metadata"
- Add clear description
- Include at least one screenshot
- Specify category

### "Native messaging host not included"
- This is EXPECTED - native hosts are installed separately
- Note this in description
- Provide installation instructions

### "Permissions seem excessive"
- `<all_urls>`: Required to translate on any website
- `nativeMessaging`: Required for Python backend
- `storage`: Required for settings
- All are justified - explain in description

---

## Cost

**Free!** Mozilla's signing service is completely free for all developers.

---

## Timeline

- **Self-Distribution:** Minutes to hours (automated)
- **Public Listing (First submission):** 1-7 days (manual review)
- **Public Listing (Updates):** Usually faster, 1-3 days

---

## Privacy Considerations

For public listing, you must:
- Disclose what data is collected (none in our case)
- Explain what permissions are used for
- Provide privacy policy URL (can be simple)

Example Privacy Policy for Context Translator:
```
Privacy Policy for Context Translator

Data Collection: None
- No user data is collected or transmitted
- All processing happens locally on your machine
- Translations are stored in local SQLite cache only

Permissions:
- Access all websites: Required to translate text on any webpage
- Native messaging: Required to communicate with local Python backend
- Storage: Required to save user preferences (languages, settings)

Third Parties: None
- No analytics, tracking, or external services
- No data leaves your computer
```

---

## Resources

- **Mozilla Extension Workshop:** https://extensionworkshop.com/
- **Developer Hub:** https://addons.mozilla.org/developers/
- **Submission Guide:** https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- **Policies:** https://extensionworkshop.com/documentation/publish/add-on-policies/
- **Review Guide:** https://extensionworkshop.com/documentation/publish/add-on-review-process/

---

## Recommendation

**For your use case (personal local LLM translation):**

1. **Best option:** Self-distribution signing
   - Submit to: https://addons.mozilla.org/developers/addon/submit/upload-unlisted
   - Get signed .xpi in minutes/hours
   - Works on regular Firefox
   - No public listing needed
   - Free and simple

2. **Alternative:** Keep using Developer Edition
   - Fastest (no submission)
   - Full control
   - No review process
   - But requires special Firefox version

3. **Future option:** Public listing
   - If you want to share with community
   - More effort (screenshots, description, reviews)
   - Better discoverability
   - Automatic updates for users

**My suggestion:** Try self-distribution signing first. It's free, fast, and gets you a signed extension that works on regular Firefox without the overhead of a public listing.
