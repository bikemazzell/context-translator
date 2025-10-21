import { readFileSync, writeFileSync } from 'fs';
import { minify } from 'terser';

async function buildBookmarklet() {
  try {
    const distPath = './dist/context-translator.iife.js';
    const outputPath = './dist/bookmarklet.txt';
    const htmlPath = './dist/bookmarklet.html';

    const code = readFileSync(distPath, 'utf-8');

    const minified = await minify(code, {
      compress: {
        drop_console: false,
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    });

    if (!minified.code) {
      throw new Error('Minification failed');
    }

    const bookmarkletCode = `javascript:(function(){${minified.code}})();`;

    writeFileSync(outputPath, bookmarkletCode, 'utf-8');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Context Translator Bookmarklet</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 {
      color: #333;
    }
    .bookmarklet {
      background: #f8f9fa;
      border: 2px dashed #ddd;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .bookmarklet a {
      display: inline-block;
      background: #2196F3;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
    }
    .bookmarklet a:hover {
      background: #1976D2;
    }
    .instructions {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .code {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      word-wrap: break-word;
      max-height: 200px;
      overflow-y: auto;
    }
    .warning {
      background: #f8d7da;
      border-left: 4px solid #dc3545;
      padding: 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>🌐 Context Translator Bookmarklet</h1>

  <div class="warning">
    <strong>⚠️ Before using:</strong> Make sure the backend server is running on <code>http://localhost:8080</code>
  </div>

  <h2>Installation</h2>
  <div class="instructions">
    <p><strong>Method 1 (Recommended):</strong> Drag this button to your bookmarks bar:</p>
  </div>

  <div class="bookmarklet">
    <a href="${bookmarkletCode.replace(/"/g, '&quot;')}">📖 Context Translator</a>
    <p style="margin-top: 15px; color: #666; font-size: 14px;">
      ↑ Drag this button to your bookmarks bar
    </p>
  </div>

  <div class="instructions">
    <p><strong>Method 2 (Manual):</strong></p>
    <ol>
      <li>Create a new bookmark in your browser</li>
      <li>Name it "Context Translator"</li>
      <li>Copy the code below and paste it as the URL</li>
    </ol>
  </div>

  <div class="code" id="bookmarklet-code">
    ${bookmarkletCode}
  </div>

  <button onclick="copyToClipboard()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">
    📋 Copy to Clipboard
  </button>

  <h2>Usage</h2>
  <ol>
    <li>Start the backend server: <code>cd backend && uvicorn app.main:app --host localhost --port 8080</code></li>
    <li>Navigate to any webpage</li>
    <li>Click the bookmarklet in your bookmarks bar</li>
    <li>A floating toolbar will appear in the top-right corner</li>
    <li>Click on any word to translate it</li>
    <li>Use the toolbar to configure source/target languages and context mode</li>
  </ol>

  <h2>Features</h2>
  <ul>
    <li>✅ Click any word to translate</li>
    <li>✅ Context-aware translations (enable in toolbar)</li>
    <li>✅ Caching for faster repeated lookups</li>
    <li>✅ Works on any webpage</li>
    <li>✅ Fully local - no external services</li>
  </ul>

  <h2>Configuration</h2>
  <p>Settings are saved in browser localStorage and persist across sessions.</p>
  <ul>
    <li><strong>Source Language:</strong> Language to translate from</li>
    <li><strong>Target Language:</strong> Language to translate to</li>
    <li><strong>Context Mode:</strong> Include surrounding text for better accuracy</li>
  </ul>

  <h2>Troubleshooting</h2>
  <ul>
    <li><strong>Backend not responding:</strong> Ensure the server is running on port 8080</li>
    <li><strong>No translation:</strong> Check browser console for errors</li>
    <li><strong>Context mode slow:</strong> Disable context mode for faster translations</li>
  </ul>

  <script>
    function copyToClipboard() {
      const code = document.getElementById('bookmarklet-code').textContent;
      navigator.clipboard.writeText(code).then(() => {
        alert('Copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy. Please select and copy manually.');
      });
    }
  </script>
</body>
</html>
`;

    writeFileSync(htmlPath, html, 'utf-8');

    console.log('✅ Bookmarklet built successfully!');
    console.log(`📝 Bookmarklet code: ${outputPath}`);
    console.log(`🌐 Installation page: ${htmlPath}`);
    console.log(`📏 Size: ${Math.round(bookmarkletCode.length / 1024)} KB`);
  } catch (error) {
    console.error('❌ Failed to build bookmarklet:', error);
    process.exit(1);
  }
}

buildBookmarklet();
