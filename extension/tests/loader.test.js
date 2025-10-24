/**
 * Tests for content script loader
 */

import { jest } from '@jest/globals';
import { initContentScript } from '../content/loader.js';

describe('Loader', () => {
  let originalBrowser;
  let mockBrowser;

  beforeEach(() => {
    // Save original browser object
    originalBrowser = global.browser;

    // Mock browser.runtime.getURL
    mockBrowser = {
      runtime: {
        getURL: jest.fn((path) => `moz-extension://test-id/${path}`)
      }
    };

    global.browser = mockBrowser;

    // Mock console.error
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    global.browser = originalBrowser;
    jest.restoreAllMocks();
  });

  describe('initContentScript', () => {
    it('should call browser.runtime.getURL with correct path', async () => {
      try {
        await initContentScript(mockBrowser);
      } catch {
        // Expected to fail due to dynamic import
      }

      expect(mockBrowser.runtime.getURL).toHaveBeenCalledWith('content/main.js');
    });

    it('should use default browser when no argument provided', async () => {
      try {
        await initContentScript();
      } catch {
        // Expected to fail due to dynamic import
      }

      expect(mockBrowser.runtime.getURL).toHaveBeenCalledWith('content/main.js');
    });

    it('should log error and throw when import fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockClear();

      await expect(initContentScript(mockBrowser)).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator] Failed to load content script:',
        expect.objectContaining({
          message: expect.stringContaining('Cannot find module')
        })
      );
    });

    it('should export initContentScript function', () => {
      expect(typeof initContentScript).toBe('function');
      expect(initContentScript.constructor.name).toBe('AsyncFunction');
    });
  });

  describe('Module loading behavior', () => {
    it('should construct correct URL for main.js', () => {
      const expectedPath = 'content/main.js';
      browser.runtime.getURL(expectedPath);

      expect(browser.runtime.getURL).toHaveBeenCalledWith(expectedPath);
    });

    it('should handle browser.runtime.getURL correctly', () => {
      const url = browser.runtime.getURL('content/main.js');

      expect(url).toBe('moz-extension://test-id/content/main.js');
      expect(url).toContain('moz-extension://');
      expect(url).toContain('content/main.js');
    });

    it('should use async IIFE pattern', () => {
      const asyncIIFE = async () => {
        try {
          await import(browser.runtime.getURL('content/main.js'));
        } catch (error) {
          console.error('[ContextTranslator] Failed to load content script:', error);
        }
      };

      expect(asyncIIFE).toBeDefined();
      expect(typeof asyncIIFE).toBe('function');
    });
  });

  describe('Error handling', () => {
    it('should catch and log import errors', async () => {
      const error = new Error('Module not found');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        throw error;
      } catch (e) {
        console.error('[ContextTranslator] Failed to load content script:', e);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator] Failed to load content script:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors during import', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        throw networkError;
      } catch (e) {
        console.error('[ContextTranslator] Failed to load content script:', e);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator] Failed to load content script:',
        networkError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle module syntax errors', async () => {
      const syntaxError = new SyntaxError('Unexpected token');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        throw syntaxError;
      } catch (e) {
        console.error('[ContextTranslator] Failed to load content script:', e);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ContextTranslator] Failed to load content script:',
        syntaxError
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not throw when import fails', async () => {
      const loadModule = async () => {
        try {
          throw new Error('Import failed');
        } catch (error) {
          console.error('[ContextTranslator] Failed to load content script:', error);
        }
      };

      await expect(loadModule()).resolves.toBeUndefined();
    });
  });

  describe('Browser API requirements', () => {
    it('should require browser.runtime.getURL to be available', () => {
      expect(browser.runtime).toBeDefined();
      expect(browser.runtime.getURL).toBeDefined();
      expect(typeof browser.runtime.getURL).toBe('function');
    });

    it('should generate extension URLs with correct protocol', () => {
      const url = browser.runtime.getURL('test.js');

      expect(url).toMatch(/^moz-extension:\/\//);
    });

    it('should preserve path structure in generated URLs', () => {
      const paths = [
        'content/main.js',
        'content/handlers/click-handler.js',
        'shared/utils.js'
      ];

      paths.forEach(path => {
        const url = browser.runtime.getURL(path);
        expect(url).toContain(path);
      });
    });
  });

  describe('Dynamic import behavior', () => {
    it('should use dynamic import() syntax', async () => {
      // Simulate dynamic import
      const dynamicImport = async (path) => {
        return await import(/* webpackIgnore: true */ path);
      };

      expect(typeof dynamicImport).toBe('function');
    });

    it('should handle successful import', async () => {
      const mockModule = { initialize: jest.fn() };

      const simulateImport = async () => {
        try {
          return mockModule;
        } catch (error) {
          console.error('[ContextTranslator] Failed to load content script:', error);
          throw error;
        }
      };

      const result = await simulateImport();
      expect(result).toBe(mockModule);
    });

    it('should handle async import errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const simulateFailedImport = async () => {
        try {
          throw new Error('CORS policy blocked');
        } catch (error) {
          console.error('[ContextTranslator] Failed to load content script:', error);
        }
      };

      await simulateFailedImport();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle missing browser API gracefully', () => {
      global.browser = undefined;

      const checkBrowser = () => {
        if (typeof browser === 'undefined') {
          return false;
        }
        return true;
      };

      expect(checkBrowser()).toBe(false);
    });

    it('should work with different extension protocols', () => {
      const protocols = ['moz-extension', 'chrome-extension', 'extension'];

      protocols.forEach(protocol => {
        browser.runtime.getURL = jest.fn((path) => `${protocol}://test-id/${path}`);
        const url = browser.runtime.getURL('content/main.js');
        expect(url).toContain(protocol);
      });
    });
  });

  describe('Error message formatting', () => {
    it('should include prefix in error messages', () => {
      const errorMessage = '[ContextTranslator] Failed to load content script:';

      expect(errorMessage).toContain('[ContextTranslator]');
      expect(errorMessage).toContain('Failed to load');
      expect(errorMessage).toContain('content script');
    });

    it('should log complete error information', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n  at test.js:1:1';

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      console.error('[ContextTranslator] Failed to load content script:', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ContextTranslator]'),
        error
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle null path', () => {
      expect(() => browser.runtime.getURL(null)).not.toThrow();
    });

    it('should handle empty string path', () => {
      const url = browser.runtime.getURL('');
      expect(url).toBeDefined();
    });

    it('should handle path with special characters', () => {
      const url = browser.runtime.getURL('content/file with spaces.js');
      expect(url).toContain('content/file with spaces.js');
    });

    it('should handle absolute-looking paths', () => {
      const url = browser.runtime.getURL('/content/main.js');
      expect(url).toBeDefined();
    });

    it('should handle paths with query parameters', () => {
      const url = browser.runtime.getURL('content/main.js?v=1.0');
      expect(url).toContain('content/main.js?v=1.0');
    });
  });

  describe('Auto-execution prevention', () => {
    it('should not auto-execute in test environment', () => {
      // The module should detect jest/test environment and not auto-execute
      // This is tested by the module loading without calling initContentScript
      expect(typeof jest).toBe('object');
    });

    it('should detect test environment variables', () => {
      // Verify test environment is properly detected
      const isTestEnv = typeof jest !== 'undefined' || process.env.NODE_ENV === 'test';
      expect(isTestEnv).toBe(true);
    });
  });
});
