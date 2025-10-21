// Popup script - handles the browser action popup

document.getElementById('toggle').addEventListener('click', async () => {
  // Get active tab
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });

  if (tabs.length === 0) return;

  // Send toggle message to content script
  browser.tabs.sendMessage(tabs[0].id, { action: 'toggle' });

  // Update status
  document.getElementById('status').textContent = 'Translator toggled on current page';

  // Close popup after short delay
  setTimeout(() => window.close(), 500);
});
