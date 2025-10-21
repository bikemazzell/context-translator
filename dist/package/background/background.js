// Background script - handles native messaging with Python backend

const NATIVE_APP_NAME = "context_translator_host";

// Listen for messages from content scripts
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "translate") {
    handleTranslateRequest(message.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "getLanguages") {
    handleGetLanguagesRequest()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "checkHealth") {
    handleHealthCheckRequest()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === "clearCache") {
    handleClearCacheRequest()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Send translation request to native app
async function handleTranslateRequest(data) {
  const request = {
    action: "translate",
    payload: data
  };

  console.log("[Background] Sending to native app:", request);
  const response = await sendNativeMessage(request);
  console.log("[Background] Received from native app:", response);

  if (response.error) {
    throw new Error(response.error);
  }

  return response.result;
}

// Get supported languages
async function handleGetLanguagesRequest() {
  const request = {
    action: "getLanguages",
    payload: {}
  };

  const response = await sendNativeMessage(request);

  if (response.error) {
    throw new Error(response.error);
  }

  return response.result;
}

// Health check
async function handleHealthCheckRequest() {
  const request = {
    action: "health",
    payload: {}
  };

  try {
    const response = await sendNativeMessage(request);
    return response.result || { status: "healthy" };
  } catch (error) {
    return { status: "unhealthy", error: error.message };
  }
}

// Clear cache
async function handleClearCacheRequest() {
  const request = {
    action: "clearCache",
    payload: {}
  };

  const response = await sendNativeMessage(request);

  if (response.error) {
    throw new Error(response.error);
  }

  return response.result;
}

// Send message to native application
function sendNativeMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      const port = browser.runtime.connectNative(NATIVE_APP_NAME);

      port.onMessage.addListener((response) => {
        console.log("[Background] Native app response:", response);
        port.disconnect();
        resolve(response);
      });

      port.onDisconnect.addListener(() => {
        const error = browser.runtime.lastError;
        if (error) {
          console.error("[Background] Native app disconnect error:", error);
          reject(new Error(`Native messaging error: ${error.message}`));
        }
      });

      console.log("[Background] Sending to native app:", message);
      port.postMessage(message);
    } catch (error) {
      console.error("[Background] Failed to connect to native app:", error);
      reject(error);
    }
  });
}

// Listen for keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-translator") {
    // Send toggle message to active tab
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs.length > 0) {
        browser.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
      }
    });
  }
});

console.log("[Background] Context Translator background script loaded");
