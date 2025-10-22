/**
 * Tests for Background Service Worker
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('service-worker', () => {
  let mockBrowser;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleDebugSpy;
  let cacheManagerSpy;
  let llmClientSpy;

  // Storage listeners
  let storageChangeListeners = [];
  let messageListeners = [];
  let commandListeners = [];
  let installedListeners = [];
  let suspendListeners = [];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset listener arrays
    storageChangeListeners = [];
    messageListeners = [];
    commandListeners = [];
    installedListeners = [];
    suspendListeners = [];

    // Mock browser APIs
    mockBrowser = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({ settings: null })
        },
        onChanged: {
          addListener: jest.fn(listener => storageChangeListeners.push(listener))
        }
      },
      runtime: {
        onMessage: {
          addListener: jest.fn(listener => messageListeners.push(listener))
        },
        onInstalled: {
          addListener: jest.fn(listener => installedListeners.push(listener))
        },
        onSuspend: {
          addListener: jest.fn(listener => suspendListeners.push(listener))
        },
        getManifest: jest.fn().mockReturnValue({ version: '1.0.0' })
      },
      commands: {
        onCommand: {
          addListener: jest.fn(listener => commandListeners.push(listener))
        }
      },
      tabs: {
        query: jest.fn().mockResolvedValue([]),
        sendMessage: jest.fn().mockResolvedValue({})
      }
    };

    global.browser = mockBrowser;

    // Suppress console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    // Mock dependencies - import after mocking browser
    const cacheManagerModule = await import('../background/cache-manager.js');
    const llmClientModule = await import('../background/llm-client.js');

    cacheManagerSpy = {
      init: jest.spyOn(cacheManagerModule.cacheManager, 'init').mockResolvedValue(undefined),
      close: jest.spyOn(cacheManagerModule.cacheManager, 'close').mockImplementation()
    };

    llmClientSpy = {
      configure: jest.spyOn(llmClientModule.llmClient, 'configure').mockImplementation()
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    cacheManagerSpy.init.mockRestore();
    cacheManagerSpy.close.mockRestore();
    llmClientSpy.configure.mockRestore();

    // Clear module cache to allow re-importing
    jest.resetModules();
    delete global.browser;
  });

  describe('Initialization', () => {
    test('should initialize cache manager on startup', async () => {
      // Import the module which will trigger initialize()
      await import('../background/service-worker.js');

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cacheManagerSpy.init).toHaveBeenCalled();
    });

    test('should configure LLM client if settings exist', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        settings: {
          llmEndpoint: 'http://custom:8080/v1/chat',
          llmModel: 'custom-model',
          useRateLimit: false
        }
      });

      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(llmClientSpy.configure).toHaveBeenCalledWith(
        'http://custom:8080/v1/chat',
        'custom-model',
        false
      );
    });

    test('should not configure LLM client if no settings', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({ settings: null });

      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(llmClientSpy.configure).not.toHaveBeenCalled();
    });

    test('should not configure LLM client if no llmEndpoint in settings', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        settings: {
          sourceLang: 'German',
          targetLang: 'English'
        }
      });

      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(llmClientSpy.configure).not.toHaveBeenCalled();
    });

    test('should handle initialization errors gracefully', async () => {
      cacheManagerSpy.init.mockRejectedValue(new Error('Cache init failed'));

      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not throw, should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('Initialization error:'),
        expect.any(Error)
      );
    });
  });

  describe('Storage Change Listener', () => {
    test('should register storage change listener', async () => {
      await import('../background/service-worker.js');

      expect(mockBrowser.storage.onChanged.addListener).toHaveBeenCalled();
      // Expect 2 listeners: one from logger.js and one from service-worker.js
      expect(storageChangeListeners.length).toBe(2);
    });

    test('should reconfigure LLM client when settings change', async () => {
      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear previous calls from initialization
      llmClientSpy.configure.mockClear();

      // Simulate settings change - use the last listener (service-worker's)
      const listener = storageChangeListeners[storageChangeListeners.length - 1];
      const changes = {
        settings: {
          newValue: {
            llmEndpoint: 'http://new:9000/v1/chat',
            llmModel: 'new-model',
            useRateLimit: true
          }
        }
      };

      listener(changes, 'local');

      expect(llmClientSpy.configure).toHaveBeenCalledWith(
        'http://new:9000/v1/chat',
        'new-model',
        true
      );
    });

    test('should ignore non-local storage changes', async () => {
      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      llmClientSpy.configure.mockClear();

      // Use the last listener (service-worker's)
      const listener = storageChangeListeners[storageChangeListeners.length - 1];
      const changes = {
        settings: {
          newValue: {
            llmEndpoint: 'http://new:9000/v1/chat',
            llmModel: 'new-model'
          }
        }
      };

      listener(changes, 'sync'); // Not 'local'

      expect(llmClientSpy.configure).not.toHaveBeenCalled();
    });

    test('should ignore non-settings changes', async () => {
      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      llmClientSpy.configure.mockClear();

      const listener = storageChangeListeners[0];
      const changes = {
        otherKey: {
          newValue: { some: 'data' }
        }
      };

      listener(changes, 'local');

      expect(llmClientSpy.configure).not.toHaveBeenCalled();
    });

    test('should ignore settings changes without llmEndpoint', async () => {
      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      llmClientSpy.configure.mockClear();

      const listener = storageChangeListeners[0];
      const changes = {
        settings: {
          newValue: {
            sourceLang: 'German'
          }
        }
      };

      listener(changes, 'local');

      expect(llmClientSpy.configure).not.toHaveBeenCalled();
    });

    test('should ignore settings changes with null newValue', async () => {
      await import('../background/service-worker.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      llmClientSpy.configure.mockClear();

      const listener = storageChangeListeners[0];
      const changes = {
        settings: {
          newValue: null
        }
      };

      listener(changes, 'local');

      expect(llmClientSpy.configure).not.toHaveBeenCalled();
    });
  });

  describe('Message Listener', () => {
    test('should register message listener', async () => {
      await import('../background/service-worker.js');

      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(messageListeners.length).toBe(1);
      expect(typeof messageListeners[0]).toBe('function');
    });
  });

  describe('Command Listener', () => {
    test('should register command listener', async () => {
      await import('../background/service-worker.js');

      expect(mockBrowser.commands.onCommand.addListener).toHaveBeenCalled();
      expect(commandListeners.length).toBe(1);
    });

    test('should send toggle message to active tab on toggle-translator command', async () => {
      mockBrowser.tabs.query.mockResolvedValue([{ id: 123 }]);

      await import('../background/service-worker.js');

      const listener = commandListeners[0];
      await listener('toggle-translator');

      expect(mockBrowser.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
      expect(mockBrowser.tabs.sendMessage).toHaveBeenCalledWith(123, {
        action: 'toggle'
      });
    });

    test('should not send message if no active tab', async () => {
      mockBrowser.tabs.query.mockResolvedValue([]);

      await import('../background/service-worker.js');

      const listener = commandListeners[0];
      await listener('toggle-translator');

      expect(mockBrowser.tabs.sendMessage).not.toHaveBeenCalled();
    });

    test('should handle sendMessage errors gracefully', async () => {
      mockBrowser.tabs.query.mockResolvedValue([{ id: 123 }]);
      mockBrowser.tabs.sendMessage.mockRejectedValue(new Error('Tab not found'));

      await import('../background/service-worker.js');

      const listener = commandListeners[0];
      await listener('toggle-translator');

      // Should not throw, should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('Failed to send toggle command:'),
        expect.any(Error)
      );
    });

    test('should ignore unknown commands', async () => {
      await import('../background/service-worker.js');

      const listener = commandListeners[0];
      await listener('unknown-command');

      expect(mockBrowser.tabs.query).not.toHaveBeenCalled();
      expect(mockBrowser.tabs.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Installation Listener', () => {
    test('should register installation listener', async () => {
      await import('../background/service-worker.js');

      expect(mockBrowser.runtime.onInstalled.addListener).toHaveBeenCalled();
      expect(installedListeners.length).toBe(1);
    });

    test('should log on first installation', async () => {
      await import('../background/service-worker.js');

      const listener = installedListeners[0];
      listener({ reason: 'install' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('Extension installed/updated:'),
        'install'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('First installation')
      );
    });

    test('should log on extension update', async () => {
      await import('../background/service-worker.js');

      const listener = installedListeners[0];
      listener({ reason: 'update' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('Extension installed/updated:'),
        'update'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('Extension updated to version:'),
        '1.0.0'
      );
      expect(mockBrowser.runtime.getManifest).toHaveBeenCalled();
    });

    test('should handle other installation reasons', async () => {
      await import('../background/service-worker.js');

      const listener = installedListeners[0];
      listener({ reason: 'chrome_update' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('Extension installed/updated:'),
        'chrome_update'
      );
    });
  });

  describe('Suspend Listener (Firefox)', () => {
    test('should register suspend listener if available', async () => {
      await import('../background/service-worker.js');

      expect(mockBrowser.runtime.onSuspend.addListener).toHaveBeenCalled();
      expect(suspendListeners.length).toBe(1);
    });

    test('should close cache manager on suspend', async () => {
      await import('../background/service-worker.js');

      const listener = suspendListeners[0];
      listener();

      expect(cacheManagerSpy.close).toHaveBeenCalled();
    });

    test('should handle missing onSuspend gracefully', async () => {
      // Remove onSuspend to simulate Chrome (which doesn't have it)
      delete mockBrowser.runtime.onSuspend;

      await import('../background/service-worker.js');

      // Should not throw
      expect(cacheManagerSpy.close).not.toHaveBeenCalled();
    });
  });

  describe('Module Loading', () => {
    test('should log when service worker is loaded', async () => {
      await import('../background/service-worker.js');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ContextTranslator]',
        expect.stringContaining('Background service worker loaded')
      );
    });
  });
});
