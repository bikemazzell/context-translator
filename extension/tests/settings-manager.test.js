/**
 * Tests for settings manager module
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { SettingsManager } from '../shared/settings-manager.js';
import { CONFIG } from '../shared/config.js';

describe('SettingsManager', () => {
  let manager;
  let mockStorage;

  beforeEach(() => {
    // Reset browser.storage mock
    mockStorage = {
      settings: null
    };

    global.browser = {
      storage: {
        local: {
          get: jest.fn((key) => {
            if (key === 'settings' && mockStorage.settings) {
              return Promise.resolve({ settings: mockStorage.settings });
            }
            return Promise.resolve({});
          }),
          set: jest.fn((data) => {
            if (data.settings) {
              mockStorage.settings = data.settings;
            }
            return Promise.resolve();
          })
        }
      }
    };

    // Create new instance for each test
    manager = new SettingsManager();
  });

  describe('constructor', () => {
    test('should initialize with defaults', () => {
      expect(manager.settings).toEqual(CONFIG.defaults);
      expect(manager.loaded).toBe(false);
    });
  });

  describe('load', () => {
    test('should load settings from storage', async () => {
      const storedSettings = {
        sourceLang: 'French',
        targetLang: 'German',
        displayMode: 'tooltip'
      };
      mockStorage.settings = storedSettings;

      const result = await manager.load();

      expect(browser.storage.local.get).toHaveBeenCalledWith('settings');
      expect(result.sourceLang).toBe('French');
      expect(result.targetLang).toBe('German');
      expect(result.displayMode).toBe('tooltip');
      expect(manager.loaded).toBe(true);
    });

    test('should merge stored settings with defaults', async () => {
      const storedSettings = {
        sourceLang: 'French'
        // Missing other settings
      };
      mockStorage.settings = storedSettings;

      const result = await manager.load();

      // Should have stored value
      expect(result.sourceLang).toBe('French');
      // Should have defaults for missing values
      expect(result.targetLang).toBe(CONFIG.defaults.targetLang);
      expect(result.displayMode).toBe(CONFIG.defaults.displayMode);
    });

    test('should use defaults when no stored settings', async () => {
      mockStorage.settings = null;

      const result = await manager.load();

      expect(result).toEqual(CONFIG.defaults);
      expect(manager.loaded).toBe(true);
    });

    test('should handle storage errors gracefully', async () => {
      global.browser.storage.local.get = jest.fn(() =>
        Promise.reject(new Error('Storage error'))
      );

      const result = await manager.load();

      expect(result).toEqual(CONFIG.defaults);
      expect(manager.loaded).toBe(true);
    });

    test('should preserve new defaults when merging', async () => {
      const oldSettings = {
        sourceLang: 'French',
        targetLang: 'German'
        // Missing new settings added to defaults
      };
      mockStorage.settings = oldSettings;

      const result = await manager.load();

      // Should have old values
      expect(result.sourceLang).toBe('French');
      // Should have new defaults
      expect(result.enabled).toBe(CONFIG.defaults.enabled);
      expect(result.llmEndpoint).toBe(CONFIG.defaults.llmEndpoint);
    });
  });

  describe('save', () => {
    test('should save settings to storage', async () => {
      manager.settings = { sourceLang: 'French', targetLang: 'German' };

      await manager.save();

      expect(browser.storage.local.set).toHaveBeenCalledWith({
        settings: { sourceLang: 'French', targetLang: 'German' }
      });
    });

    test('should handle save errors gracefully', async () => {
      global.browser.storage.local.set = jest.fn(() =>
        Promise.reject(new Error('Storage error'))
      );

      await expect(manager.save()).resolves.not.toThrow();
    });
  });

  describe('get', () => {
    test('should return setting value', () => {
      manager.settings = { sourceLang: 'French' };

      expect(manager.get('sourceLang')).toBe('French');
    });

    test('should return undefined for unknown key', () => {
      expect(manager.get('unknownKey')).toBeUndefined();
    });
  });

  describe('set', () => {
    test('should update and save setting', async () => {
      await manager.set('sourceLang', 'French');

      expect(manager.settings.sourceLang).toBe('French');
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        settings: expect.objectContaining({ sourceLang: 'French' })
      });
    });

    test('should validate setting before saving', async () => {
      await expect(manager.set('llmPort', 70000)).rejects.toThrow();
      expect(browser.storage.local.set).not.toHaveBeenCalled();
    });

    test('should reject invalid setting key', async () => {
      await expect(manager.set('invalidKey', 'value')).rejects.toThrow('Unknown setting');
    });

    test('should reject invalid setting value', async () => {
      await expect(manager.set('displayMode', 'invalid')).rejects.toThrow('Invalid value');
    });

    test('should accept valid boolean setting', async () => {
      await manager.set('useCache', false);
      expect(manager.settings.useCache).toBe(false);
    });

    test('should accept valid string setting', async () => {
      await manager.set('sourceLang', 'Spanish');
      expect(manager.settings.sourceLang).toBe('Spanish');
    });
  });

  describe('update', () => {
    test('should update multiple settings at once', async () => {
      await manager.update({
        sourceLang: 'French',
        targetLang: 'German',
        displayMode: 'tooltip'
      });

      expect(manager.settings.sourceLang).toBe('French');
      expect(manager.settings.targetLang).toBe('German');
      expect(manager.settings.displayMode).toBe('tooltip');
      expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
    });

    test('should validate all settings before updating', async () => {
      await expect(manager.update({
        sourceLang: 'French',
        llmPort: 70000 // Invalid
      })).rejects.toThrow();

      // No settings should be updated
      expect(manager.settings.sourceLang).not.toBe('French');
      expect(browser.storage.local.set).not.toHaveBeenCalled();
    });

    test('should reject if any setting is invalid', async () => {
      const originalSettings = { ...manager.settings };

      await expect(manager.update({
        sourceLang: 'French', // Valid
        displayMode: 'invalid' // Invalid
      })).rejects.toThrow();

      // Settings should remain unchanged
      expect(manager.settings).toEqual(originalSettings);
    });

    test('should handle empty updates', async () => {
      const originalSettings = { ...manager.settings };

      await manager.update({});

      expect(manager.settings).toEqual(originalSettings);
      expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAll', () => {
    test('should return copy of all settings', () => {
      manager.settings = {
        sourceLang: 'French',
        targetLang: 'German'
      };

      const all = manager.getAll();

      expect(all).toEqual({
        sourceLang: 'French',
        targetLang: 'German'
      });

      // Should be a copy, not reference
      all.sourceLang = 'Spanish';
      expect(manager.settings.sourceLang).toBe('French');
    });
  });

  describe('reset', () => {
    test('should reset to defaults', async () => {
      manager.settings = {
        sourceLang: 'French',
        targetLang: 'German',
        displayMode: 'tooltip'
      };

      await manager.reset();

      expect(manager.settings).toEqual(CONFIG.defaults);
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        settings: CONFIG.defaults
      });
    });

    test('should save after reset', async () => {
      await manager.reset();
      expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration scenarios', () => {
    test('should handle full lifecycle: load, update, save', async () => {
      // Start with stored settings
      mockStorage.settings = {
        sourceLang: 'French',
        targetLang: 'German'
      };

      // Load
      await manager.load();
      expect(manager.settings.sourceLang).toBe('French');

      // Update
      await manager.set('displayMode', 'tooltip');
      expect(manager.settings.displayMode).toBe('tooltip');

      // Verify saved
      expect(mockStorage.settings.displayMode).toBe('tooltip');
    });

    test('should handle concurrent updates', async () => {
      const updates = [
        manager.set('sourceLang', 'French'),
        manager.set('targetLang', 'German'),
        manager.set('displayMode', 'tooltip')
      ];

      await Promise.all(updates);

      expect(manager.settings.sourceLang).toBe('French');
      expect(manager.settings.targetLang).toBe('German');
      expect(manager.settings.displayMode).toBe('tooltip');
    });

    test('should maintain consistency across load-save cycles', async () => {
      const testSettings = {
        sourceLang: 'French',
        targetLang: 'German',
        displayMode: 'tooltip',
        useCache: false
      };

      // Save settings
      await manager.update(testSettings);

      // Create new instance and load
      const manager2 = new SettingsManager();
      await manager2.load();

      // Should match
      expect(manager2.settings.sourceLang).toBe('French');
      expect(manager2.settings.targetLang).toBe('German');
      expect(manager2.settings.displayMode).toBe('tooltip');
      expect(manager2.settings.useCache).toBe(false);
    });
  });
});
