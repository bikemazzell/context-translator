/**
 * Tests for StorageService
 */

import { jest } from '@jest/globals';
import { StorageService } from '../services/storage-service.js';

describe('StorageService', () => {
  let service;
  let mockBrowserStorage;

  beforeEach(() => {
    mockBrowserStorage = {
      local: {
        get: jest.fn(),
        set: jest.fn()
      }
    };

    service = new StorageService(mockBrowserStorage);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with browser storage', () => {
      expect(service).toBeInstanceOf(StorageService);
    });

    it('should throw if browser storage is missing', () => {
      expect(() => new StorageService(null))
        .toThrow('Browser storage is required');
    });

    it('should throw if browser.storage.local is missing', () => {
      expect(() => new StorageService({}))
        .toThrow('Browser storage is required');
    });
  });

  describe('get', () => {
    it('should retrieve value for single key', async () => {
      mockBrowserStorage.local.get.mockResolvedValue({ settings: { darkMode: true } });

      const result = await service.get('settings');

      expect(mockBrowserStorage.local.get).toHaveBeenCalledWith('settings');
      expect(result).toEqual({ darkMode: true });
    });

    it('should return undefined if key does not exist', async () => {
      mockBrowserStorage.local.get.mockResolvedValue({});

      const result = await service.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should handle storage errors', async () => {
      mockBrowserStorage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(service.get('settings')).rejects.toThrow('Storage error');
    });

    it('should retrieve multiple keys', async () => {
      mockBrowserStorage.local.get.mockResolvedValue({
        settings: { darkMode: true },
        languages: ['English', 'German']
      });

      const result = await service.get(['settings', 'languages']);

      expect(mockBrowserStorage.local.get).toHaveBeenCalledWith(['settings', 'languages']);
      expect(result).toEqual({
        settings: { darkMode: true },
        languages: ['English', 'German']
      });
    });

    it('should handle null key', async () => {
      mockBrowserStorage.local.get.mockResolvedValue({
        allData: 'value'
      });

      const result = await service.get(null);

      expect(mockBrowserStorage.local.get).toHaveBeenCalledWith(null);
      expect(result).toEqual({ allData: 'value' });
    });
  });

  describe('set', () => {
    it('should store value for key', async () => {
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.set('settings', { darkMode: true });

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({
        settings: { darkMode: true }
      });
    });

    it('should handle storage errors', async () => {
      mockBrowserStorage.local.set.mockRejectedValue(new Error('Storage full'));

      await expect(service.set('settings', { darkMode: true }))
        .rejects.toThrow('Storage full');
    });

    it('should store multiple key-value pairs', async () => {
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.set({
        settings: { darkMode: true },
        languages: ['English']
      });

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({
        settings: { darkMode: true },
        languages: ['English']
      });
    });

    it('should handle null values', async () => {
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.set('key', null);

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({ key: null });
    });

    it('should handle undefined values', async () => {
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.set('key', undefined);

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({ key: undefined });
    });
  });

  describe('getSettings', () => {
    it('should retrieve settings object', async () => {
      const settings = { darkMode: true, sourceLang: 'en' };
      mockBrowserStorage.local.get.mockResolvedValue({ settings });

      const result = await service.getSettings();

      expect(mockBrowserStorage.local.get).toHaveBeenCalledWith('settings');
      expect(result).toEqual(settings);
    });

    it('should return null if settings do not exist', async () => {
      mockBrowserStorage.local.get.mockResolvedValue({});

      const result = await service.getSettings();

      expect(result).toBeNull();
    });

    it('should handle storage errors', async () => {
      mockBrowserStorage.local.get.mockRejectedValue(new Error('Storage error'));

      await expect(service.getSettings()).rejects.toThrow('Storage error');
    });
  });

  describe('setSettings', () => {
    it('should store settings object', async () => {
      const settings = { darkMode: true, sourceLang: 'en' };
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.setSettings(settings);

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({ settings });
    });

    it('should handle storage errors', async () => {
      mockBrowserStorage.local.set.mockRejectedValue(new Error('Storage full'));

      await expect(service.setSettings({ darkMode: true }))
        .rejects.toThrow('Storage full');
    });

    it('should handle empty settings object', async () => {
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.setSettings({});

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({ settings: {} });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large objects', async () => {
      const largeObject = { data: 'x'.repeat(10000) };
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.set('large', largeObject);

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({ large: largeObject });
    });

    it('should handle special characters in keys', async () => {
      mockBrowserStorage.local.get.mockResolvedValue({ 'key-with-dashes': 'value' });

      const result = await service.get('key-with-dashes');

      expect(result).toBe('value');
    });

    it('should handle nested objects', async () => {
      const nested = {
        level1: {
          level2: {
            level3: 'deep value'
          }
        }
      };
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.set('nested', nested);

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({ nested });
    });

    it('should handle arrays', async () => {
      const array = [1, 2, 3, { nested: true }];
      mockBrowserStorage.local.set.mockResolvedValue(undefined);

      await service.set('array', array);

      expect(mockBrowserStorage.local.set).toHaveBeenCalledWith({ array });
    });
  });
});
