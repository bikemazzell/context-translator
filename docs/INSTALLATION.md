# Context Translator - Installation Guide

This guide will walk you through installing and configuring the Context Translator Firefox extension.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Extension Installation](#extension-installation)
4. [First Use](#first-use)
5. [Troubleshooting](#troubleshooting)
6. [Updating](#updating)

---

## Prerequisites

Before installing Context Translator, ensure you have:

### Required Software

1. **Firefox Developer Edition or Nightly**
   - Regular Firefox does not support unsigned extensions
   - Download from: https://www.mozilla.org/firefox/developer/
   - Alternative: Firefox Nightly from https://www.mozilla.org/firefox/nightly/

2. **Python 3.12+**
   - With conda/miniconda recommended
   - Environment should include: `aiosqlite`, `httpx`

3. **LLM Server**
   - LMStudio (recommended): https://lmstudio.ai/
   - OR llama.cpp server
   - OR any OpenAI-compatible API endpoint

### System Requirements

- Linux (tested on Ubuntu/Debian)
- 4GB+ RAM (for LLM)
- Disk space: ~2GB for LLM model, ~100MB for extension/backend

---

## Backend Setup

The Context Translator extension requires a local Python backend to communicate with your LLM.

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd context-translator
```

### Step 2: Setup Python Environment

If using conda (recommended):

```bash
# Activate your Python 3.12 environment
conda activate ai312  # or your environment name

# Install dependencies
pip install aiosqlite httpx
```

### Step 3: Configure Backend

The backend configuration is in `config.yaml` (in project root). The native host will use default settings, but you can customize if needed:

```yaml
llm:
  primary:
    provider: lmstudio
    endpoint: http://localhost:1234/v1/chat/completions
    timeout: 30
    model_name: gemma-2-27b-it

cache:
  path: ./cache/translations.db
  ttl_days: 30
  max_size_mb: 100
```

### Step 4: Start LLM Server

**Option A: LMStudio**
1. Download and install LMStudio
2. Download a model (recommended: Gemma 2 9B or 27B, Llama 3.1 8B)
3. Start the local server (default port: 1234)
4. Verify it's running at http://localhost:1234

**Option B: llama.cpp**
```bash
./llama-server -m <path-to-model.gguf> --port 1234 --ctx-size 4096
```

### Step 5: Verify Backend Setup

The native messaging host will be started automatically by the extension. You can test it manually:

```bash
cd extension/native-host
python3 context_translator_host.py
# Should start without errors (will wait for stdin messages)
# Press Ctrl+C to exit
```

---

## Extension Installation

### Step 1: Package the Extension

Run the packaging script from the project root:

```bash
./scripts/package-extension.sh
```

This will:
- Create `dist/context-translator.xpi` (the extension package)
- Install the native messaging host manifest to `~/.mozilla/native-messaging-hosts/`
- Display installation instructions

Expected output:
```
=========================================
 Packaging Complete!
=========================================

Package: dist/context-translator.xpi
Size: 20K
Version: 1.0.0
```

### Step 2: Configure Firefox

1. Open Firefox Developer Edition or Nightly
2. Navigate to `about:config`
3. Search for: `xpinstall.signatures.required`
4. Click the toggle to set it to `false`
5. Accept the warning (this allows unsigned extensions)

### Step 3: Install the Extension

1. Navigate to `about:addons`
2. Click the gear icon (⚙️) in the top-right
3. Select "Install Add-on From File..."
4. Navigate to `dist/context-translator.xpi`
5. Click "Open"
6. Accept the installation prompt
7. The extension icon should appear in your toolbar

### Step 4: Verify Installation

1. Click the Context Translator icon in the toolbar
2. A popup should appear with "Toggle Translator" button
3. Click the button or use keyboard shortcut `Ctrl+Alt+C`
4. A toolbar should appear on the page
5. The extension is now installed and will persist across browser restarts!

---

## First Use

### Step 1: Navigate to a Test Page

Open a webpage with text in your source language (e.g., https://www.tagesschau.de for German).

### Step 2: Activate Translator

Click the extension icon and press "Toggle Translator" or use `Ctrl+Alt+C`.

### Step 3: Configure Languages

In the translator toolbar that appears:
- **From:** Select your source language (e.g., German)
- **To:** Select your target language (e.g., English)
- Settings are saved automatically

### Step 4: Translate Your First Word

1. Click any word on the page
2. Wait 1-2 seconds for the LLM response
3. Translation appears inline above the word
4. Subsequent clicks on the same word will be instant (cached)

### Step 5: Explore Settings

The toolbar offers several options:

- **Context Window:** Number of characters around the word to include as context (default: 200)
- **Context Mode:** Enable to send surrounding text for better translations
- **Use Cache:** Enable to cache translations for faster repeated lookups
- **Clear Cache:** Remove all cached translations
- **Server Host/Port:** Configure backend connection (default: localhost:8080)
- **Display Mode:**
  - **Inline:** Shows translation above the clicked word
  - **Tooltip:** Shows translation in a floating box
- **Dark Mode:** Auto-detects from browser, or manually override

---

## Troubleshooting

### Extension Won't Install

**Problem:** Firefox rejects the .xpi file

**Solutions:**
1. Verify you're using Firefox Developer Edition or Nightly
2. Check `xpinstall.signatures.required` is set to `false` in `about:config`
3. Restart Firefox after changing the config
4. Try creating the package again: `./package-extension.sh`

### Native Messaging Fails

**Problem:** Console shows "Error connecting to native messaging host"

**Solutions:**
1. Check the native host manifest exists:
   ```bash
   ls ~/.mozilla/native-messaging-hosts/context_translator_host.json
   ```

2. Verify the Python script path is correct:
   ```bash
   cat ~/.mozilla/native-messaging-hosts/context_translator_host.json
   ```
   The `"path"` should point to your actual Python script location.

3. Ensure the Python script is executable:
   ```bash
   chmod +x extension/native-host/context_translator_host.py
   ```

4. Test the Python script manually:
   ```bash
   cd extension/native-host
   python3 context_translator_host.py
   # Should start without errors
   ```

5. Check the shebang line in the Python script matches your conda environment:
   ```bash
   head -1 extension/native-host/context_translator_host.py
   # Should show: #!/home/v/miniconda3/envs/ai312/bin/python3
   # Adjust the path if your conda environment is different
   ```

6. Reinstall the native host manifest:
   ```bash
   ./scripts/package-extension.sh
   ```

### Translations Don't Work

**Problem:** Clicking words shows errors or nothing happens

**Solutions:**
1. Verify LLM server is running:
   ```bash
   curl http://localhost:1234/v1/models
   # Should return list of available models
   ```

2. Check browser console for errors:
   - Press F12 to open Developer Tools
   - Click the "Console" tab
   - Look for red error messages
   - Share errors for debugging

3. Verify extension is active:
   - Toolbar should be visible on page
   - Extension icon should show as enabled
   - Try toggling off and on: `Ctrl+Alt+C`

4. Test with a simple word:
   - Try translating a single, common word
   - Check if cache is the issue by clearing it

5. Check server configuration in toolbar:
   - Server Host should be `localhost`
   - Server Port should match your LLM server (default: 1234)

### Settings Don't Persist

**Problem:** Extension forgets settings after browser restart

**Solutions:**
1. Verify the extension has a valid add-on ID:
   ```bash
   grep "id" extension/manifest.json
   # Should show: "id": "context-translator@bike-mazzell"
   ```

2. Reinstall the extension:
   ```bash
   ./scripts/package-extension.sh
   # Then install via about:addons again
   ```

3. Check browser storage permissions:
   - The extension should have "storage" permission in manifest.json
   - Reinstall if permission is missing

### Extension is Slow

**Problem:** Translations take >5 seconds

**Solutions:**
1. Check LLM server performance:
   - Some models are slower than others
   - Try a smaller/faster model (e.g., Gemma 2 9B instead of 27B)
   - Ensure your hardware meets model requirements

2. Enable caching:
   - Check "Use Cache" in the toolbar
   - Repeated translations will be instant

3. Reduce context window:
   - Lower the context window size in settings
   - Smaller context = faster translations

4. Check CPU/GPU usage:
   - LLM inference is compute-intensive
   - Ensure your system isn't overloaded

### Dark Mode Issues

**Problem:** Translations invisible on dark/light websites

**Solutions:**
1. Try changing dark mode setting in toolbar:
   - Set to "Auto" to detect from browser
   - Set to "Light" for light backgrounds
   - Set to "Dark" for dark backgrounds

2. Check browser theme:
   - Extension tries to match browser preference
   - May need manual override for specific sites

---

## Updating

### Updating the Extension

1. Pull latest changes from repository:
   ```bash
   git pull
   ```

2. Repackage the extension:
   ```bash
   ./scripts/package-extension.sh
   ```

3. Remove old version in Firefox:
   - Go to `about:addons`
   - Click "Remove" on Context Translator

4. Install new version:
   - Follow [Extension Installation](#extension-installation) steps

5. Your settings should be preserved (same add-on ID)

### Updating the Backend

The backend is embedded in the extension's native host. When you repackage the extension, the backend is automatically updated.

If you need to update just the backend configuration:
1. Edit `config.yaml` in the project root
2. No need to repackage - changes take effect on next translation

### Preserving Settings

Extension settings are stored in Firefox's browser storage. They will persist as long as:
- The extension ID remains the same (`context-translator@bike-mazzell`)
- You don't clear browser storage/data
- You don't uninstall and reinstall with a different ID

To manually backup settings:
1. Open browser console (F12)
2. Run: `browser.storage.local.get(null)`
3. Save the output JSON
4. To restore, run: `browser.storage.local.set(<saved-json>)`

---

## Advanced Configuration

### Custom LLM Server

If you're using a different LLM server:

1. Update server settings in the extension toolbar:
   - Server Host: your server hostname (e.g., `192.168.1.100`)
   - Server Port: your server port (e.g., `8000`)

2. Ensure your server is OpenAI-compatible and supports `/v1/chat/completions`

### Performance Tuning

For optimal performance:

1. **Cache Settings:**
   - Enable cache for faster repeated lookups
   - Set TTL appropriately (default: 30 days)
   - Clear cache periodically to save space

2. **Context Mode:**
   - Disable for faster translations
   - Enable only for ambiguous words
   - Adjust context window size based on needs

3. **Display Mode:**
   - Inline is faster (no repositioning)
   - Tooltip is less intrusive

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the browser console for error messages (F12 → Console)
2. Check the native host logs (if configured)
3. Open an issue on GitHub with:
   - Firefox version
   - Extension version
   - Error messages
   - Steps to reproduce
   - Screenshots if applicable

---

## Next Steps

Once installed and working:

1. **Customize Settings:** Adjust display mode, context window, and themes to your preference
2. **Keyboard Shortcuts:** Use `Ctrl+Alt+C` to quickly toggle the translator
3. **Test Different Sites:** Try news sites, Wikipedia, blogs, etc.
4. **Experiment with Context Mode:** See how context improves translation quality
5. **Provide Feedback:** Report bugs or suggest features

Enjoy using Context Translator!
