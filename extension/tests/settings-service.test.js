/**
 * Tests for SettingsService
 */

import { jest } from '@jest/globals';
import { SettingsService } from '../services/settings-service.js';

describe('SettingsService', () => {
  let service;
  let mockStorageService;
  let mockMessenger;

  beforeEach(() => {
    mockStorageService = {
      getSettings: jest.fn(),
      setSettings: jest.fn(),
      set: jest.fn()
    };

    mockMessenger = {
      sendMessage: jest.fn()
    };

    service = new SettingsService(mockStorageService, mockMessenger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with dependencies', () => {
      expect(service).toBeInstanceOf(SettingsService);
    });

    it('should throw if storageService is missing', () => {
      expect(() => new SettingsService(null, mockMessenger))
        .toThrow('StorageService is required');
    });

    it('should throw if messenger is missing', () => {
      expect(() => new SettingsService(mockStorageService, null))
        .toThrow('Messenger is required');
    });

    it('should initialize with default settings', () => {
      const defaults = service.getDefaults();
      expect(defaults).toHaveProperty('sourceLang');
      expect(defaults).toHaveProperty('targetLang');
      expect(defaults).toHaveProperty('darkMode');
    });
  });

  describe('loadSettings', () => {
    it('should load settings from storage', async () => {
      const storedSettings = {
        sourceLang: 'English',
        targetLang: 'German',
        darkMode: 'dark'
      };
      mockStorageService.getSettings.mockResolvedValue(storedSettings);

      const result = await service.loadSettings();

      expect(mockStorageService.getSettings).toHaveBeenCalled();
      expect(result.sourceLang).toBe('English');
      expect(result.targetLang).toBe('German');
      expect(result.darkMode).toBe('dark');
      // Should also include defaults for non-specified settings
      expect(result).toHaveProperty('displayMode');
      expect(result).toHaveProperty('llmHost');
    });

    it('should return defaults if no settings in storage', async () => {
      mockStorageService.getSettings.mockResolvedValue(null);

      const result = await service.loadSettings();

      expect(result).toEqual(service.getDefaults());
    });

    it('should merge partial settings with defaults', async () => {
      const partial = { sourceLang: 'French' };
      mockStorageService.getSettings.mockResolvedValue(partial);

      const result = await service.loadSettings();

      expect(result.sourceLang).toBe('French');
      expect(result.targetLang).toBe(service.getDefaults().targetLang);
    });

    it('should handle storage errors', async () => {
      mockStorageService.getSettings.mockRejectedValue(new Error('Storage error'));

      await expect(service.loadSettings()).rejects.toThrow('Storage error');
    });
  });

  describe('saveSettings', () => {
    it('should save settings to storage', async () => {
      const settings = {
        sourceLang: 'English',
        targetLang: 'German'
      };
      mockStorageService.setSettings.mockResolvedValue(undefined);

      await service.saveSettings(settings);

      expect(mockStorageService.setSettings).toHaveBeenCalledWith(settings);
    });

    it('should handle storage errors', async () => {
      mockStorageService.setSettings.mockRejectedValue(new Error('Storage full'));

      await expect(service.saveSettings({ darkMode: true }))
        .rejects.toThrow('Storage full');
    });
  });

  describe('getSetting', () => {
    beforeEach(async () => {
      mockStorageService.getSettings.mockResolvedValue({
        sourceLang: 'English',
        targetLang: 'German',
        darkMode: 'auto'
      });
      await service.loadSettings();
    });

    it('should get specific setting value', () => {
      const value = service.getSetting('sourceLang');
      expect(value).toBe('English');
    });

    it('should return undefined for non-existent setting', () => {
      const value = service.getSetting('nonexistent');
      expect(value).toBeUndefined();
    });

    it('should return all settings when no key provided', () => {
      const all = service.getSetting();
      expect(all.sourceLang).toBe('English');
      expect(all.targetLang).toBe('German');
    });
  });

  describe('setSetting', () => {
    beforeEach(async () => {
      mockStorageService.getSettings.mockResolvedValue({
        sourceLang: 'English',
        targetLang: 'German'
      });
      await service.loadSettings();
      mockStorageService.setSettings.mockResolvedValue(undefined);
    });

    it('should update single setting', async () => {
      await service.setSetting('sourceLang', 'French');

      expect(mockStorageService.setSettings).toHaveBeenCalledWith(
        expect.objectContaining({ sourceLang: 'French' })
      );
    });

    it('should maintain other settings when updating one', async () => {
      await service.setSetting('sourceLang', 'French');

      const savedSettings = mockStorageService.setSettings.mock.calls[0][0];
      expect(savedSettings.targetLang).toBe('German');
    });

    it('should handle storage errors', async () => {
      mockStorageService.setSettings.mockRejectedValue(new Error('Storage error'));

      await expect(service.setSetting('sourceLang', 'French'))
        .rejects.toThrow('Storage error');
    });

    it('should initialize with defaults when setting without prior load', async () => {
      const freshService = new SettingsService(mockStorageService, mockMessenger);
      mockStorageService.setSettings.mockResolvedValue(undefined);

      await freshService.setSetting('sourceLang', 'French');

      const savedSettings = mockStorageService.setSettings.mock.calls[0][0];
      expect(savedSettings.sourceLang).toBe('French');
      expect(savedSettings).toHaveProperty('targetLang');
      expect(savedSettings).toHaveProperty('displayMode');
    });
  });

  describe('notifyContentScript', () => {
    it('should send message to active tab', async () => {
      mockMessenger.sendMessage.mockResolvedValue({ success: true });

      await service.notifyContentScript('darkMode', 'dark');

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith({
        action: 'settingChanged',
        key: 'darkMode',
        value: 'dark'
      });
    });

    it('should not throw on messaging errors', async () => {
      mockMessenger.sendMessage.mockRejectedValue(new Error('Tab not found'));

      await expect(service.notifyContentScript('darkMode', 'dark'))
        .resolves.toBeUndefined();
    });
  });

  describe('applyDarkMode', () => {
    it('should return true for dark mode setting', () => {
      const result = service.applyDarkMode('dark');
      expect(result).toBe(true);
    });

    it('should return false for light mode setting', () => {
      const result = service.applyDarkMode('light');
      expect(result).toBe(false);
    });

    it('should respect system preference for auto mode', () => {
      const originalMatchMedia = window.matchMedia;
      const mockMatchMedia = jest.fn((query) => ({
        matches: query === '(prefers-color-scheme: dark)'
      }));
      window.matchMedia = mockMatchMedia;

      const result = service.applyDarkMode('auto');

      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(result).toBe(true);

      window.matchMedia = originalMatchMedia;
    });

    it('should default to false if window is not available', () => {
      const result = service.applyDarkMode('auto');
      expect(result).toBe(false);
    });

    it('should handle invalid values', () => {
      const result = service.applyDarkMode('invalid');
      expect(result).toBe(false);
    });
  });

  describe('getDefaults', () => {
    it('should return complete default settings', () => {
      const defaults = service.getDefaults();

      expect(defaults).toHaveProperty('sourceLang');
      expect(defaults).toHaveProperty('targetLang');
      expect(defaults).toHaveProperty('darkMode');
      expect(defaults).toHaveProperty('displayMode');
      expect(defaults).toHaveProperty('enableLogging');
      expect(defaults).toHaveProperty('translationTextColor');
      expect(defaults).toHaveProperty('translationBgColor');
      expect(defaults).toHaveProperty('translationBgOpacity');
      expect(defaults).toHaveProperty('llmHost');
      expect(defaults).toHaveProperty('llmPort');
      expect(defaults).toHaveProperty('useRateLimit');
      expect(defaults).toHaveProperty('rateLimit');
      expect(defaults).toHaveProperty('useCache');
      expect(defaults).toHaveProperty('contextMode');
      expect(defaults).toHaveProperty('contextWindowChars');
    });

    it('should return immutable defaults', () => {
      const defaults1 = service.getDefaults();
      const defaults2 = service.getDefaults();

      defaults1.sourceLang = 'Modified';

      expect(defaults2.sourceLang).not.toBe('Modified');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null settings', async () => {
      mockStorageService.getSettings.mockResolvedValue(null);

      const result = await service.loadSettings();

      expect(result).toEqual(service.getDefaults());
    });

    it('should handle settings with extra unknown properties', async () => {
      const settings = {
        sourceLang: 'English',
        unknownProp: 'value'
      };
      mockStorageService.getSettings.mockResolvedValue(settings);

      const result = await service.loadSettings();

      expect(result.unknownProp).toBe('value');
    });

    it('should handle empty settings object', async () => {
      mockStorageService.getSettings.mockResolvedValue({});

      const result = await service.loadSettings();

      expect(result).toEqual(service.getDefaults());
    });
  });
});
