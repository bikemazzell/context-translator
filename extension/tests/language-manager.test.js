/**
 * Tests for LanguageManager
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { LanguageManager } from '../shared/language-manager.js';

describe('LanguageManager', () => {
  let manager;
  let mockStorage;

  beforeEach(() => {
    manager = new LanguageManager();

    // Mock browser.storage.local
    mockStorage = {
      data: {},
      get: jest.fn((key) => {
        if (typeof key === 'string') {
          return Promise.resolve({ [key]: mockStorage.data[key] });
        }
        return Promise.resolve(mockStorage.data);
      }),
      set: jest.fn((items) => {
        Object.assign(mockStorage.data, items);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        mockStorage.data = {};
        return Promise.resolve();
      })
    };

    global.browser = {
      storage: {
        local: mockStorage
      }
    };
  });

  afterEach(() => {
    delete global.browser;
  });

  describe('init', () => {
    test('should initialize with default languages on first run', async () => {
      const result = await manager.init();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('English');
      expect(result).toContain('German');
      expect(mockStorage.set).toHaveBeenCalledWith({
        customLanguages: expect.arrayContaining(['English', 'German'])
      });
    });

    test('should load languages from storage if they exist', async () => {
      const storedLanguages = ['Spanish', 'French', 'Italian'];
      mockStorage.data['customLanguages'] = storedLanguages;

      const result = await manager.init();

      expect(result).toEqual(storedLanguages);
      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    test('should handle storage errors gracefully', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await manager.init();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should return default languages if stored value is not an array', async () => {
      mockStorage.data['customLanguages'] = 'not an array';

      const result = await manager.init();

      expect(result).toBeInstanceOf(Array);
      expect(result).toContain('English');
    });
  });

  describe('getLanguages', () => {
    test('should return stored languages', async () => {
      const storedLanguages = ['Spanish', 'French'];
      mockStorage.data['customLanguages'] = storedLanguages;

      const result = await manager.getLanguages();

      expect(result).toEqual(storedLanguages);
    });

    test('should return default languages if none stored', async () => {
      const result = await manager.getLanguages();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('English');
    });

    test('should handle storage errors', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await manager.getLanguages();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('addLanguage', () => {
    beforeEach(async () => {
      mockStorage.data['customLanguages'] = ['English', 'German'];
    });

    test('should add a new valid language', async () => {
      const result = await manager.addLanguage('Spanish');

      expect(result.success).toBe(true);
      expect(mockStorage.data['customLanguages']).toContain('Spanish');
    });

    test('should sort languages alphabetically after adding', async () => {
      await manager.addLanguage('Zebra Language');
      await manager.addLanguage('Arabic');

      const languages = mockStorage.data['customLanguages'];
      const sorted = [...languages].sort();
      expect(languages).toEqual(sorted);
    });

    test('should trim whitespace from language name', async () => {
      const result = await manager.addLanguage('  French  ');

      expect(result.success).toBe(true);
      expect(mockStorage.data['customLanguages']).toContain('French');
      expect(mockStorage.data['customLanguages']).not.toContain('  French  ');
    });

    test('should reject empty language name', async () => {
      const result = await manager.addLanguage('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    test('should reject whitespace-only language name', async () => {
      const result = await manager.addLanguage('   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    test('should reject language name that is too long', async () => {
      const longName = 'a'.repeat(51);
      const result = await manager.addLanguage(longName);

      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });

    test('should accept language name at max length', async () => {
      const maxName = 'a'.repeat(50);
      const result = await manager.addLanguage(maxName);

      expect(result.success).toBe(true);
    });

    test('should reject duplicate language (exact match)', async () => {
      const result = await manager.addLanguage('English');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should reject duplicate language (case-insensitive)', async () => {
      const result = await manager.addLanguage('ENGLISH');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should reject duplicate with different casing', async () => {
      const result = await manager.addLanguage('english');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    test('should handle storage errors', async () => {
      mockStorage.set.mockRejectedValue(new Error('Storage error'));

      const result = await manager.addLanguage('French');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should add multiple unique languages', async () => {
      await manager.addLanguage('Spanish');
      await manager.addLanguage('French');
      await manager.addLanguage('Italian');

      const languages = mockStorage.data['customLanguages'];
      expect(languages).toContain('Spanish');
      expect(languages).toContain('French');
      expect(languages).toContain('Italian');
    });
  });

  describe('removeLanguage', () => {
    beforeEach(async () => {
      mockStorage.data['customLanguages'] = ['English', 'German', 'French'];
    });

    test('should remove an existing language', async () => {
      const result = await manager.removeLanguage('German');

      expect(result.success).toBe(true);
      expect(mockStorage.data['customLanguages']).not.toContain('German');
      expect(mockStorage.data['customLanguages']).toContain('English');
      expect(mockStorage.data['customLanguages']).toContain('French');
    });

    test('should fail when language not found', async () => {
      const result = await manager.removeLanguage('Spanish');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should prevent removing the last language', async () => {
      mockStorage.data['customLanguages'] = ['English'];

      const result = await manager.removeLanguage('English');

      expect(result.success).toBe(false);
      expect(result.error).toContain('last language');
      expect(mockStorage.data['customLanguages']).toContain('English');
    });

    test('should allow removing when two languages remain', async () => {
      mockStorage.data['customLanguages'] = ['English', 'German'];

      const result = await manager.removeLanguage('German');

      expect(result.success).toBe(true);
      expect(mockStorage.data['customLanguages']).toEqual(['English']);
    });

    test('should be case-sensitive for removal', async () => {
      const result = await manager.removeLanguage('english');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should handle storage errors', async () => {
      mockStorage.set.mockRejectedValue(new Error('Storage error'));

      const result = await manager.removeLanguage('German');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should remove first language in list', async () => {
      const result = await manager.removeLanguage('English');

      expect(result.success).toBe(true);
      expect(mockStorage.data['customLanguages']).not.toContain('English');
    });

    test('should remove last language in list', async () => {
      const result = await manager.removeLanguage('French');

      expect(result.success).toBe(true);
      expect(mockStorage.data['customLanguages']).not.toContain('French');
    });

    test('should remove middle language in list', async () => {
      const result = await manager.removeLanguage('German');

      expect(result.success).toBe(true);
      expect(mockStorage.data['customLanguages']).toEqual(['English', 'French']);
    });
  });

  describe('setLanguages', () => {
    test('should store language array in storage', async () => {
      const newLanguages = ['Spanish', 'French', 'Italian'];

      await manager.setLanguages(newLanguages);

      expect(mockStorage.set).toHaveBeenCalledWith({
        customLanguages: newLanguages
      });
      expect(mockStorage.data['customLanguages']).toEqual(newLanguages);
    });

    test('should overwrite existing languages', async () => {
      mockStorage.data['customLanguages'] = ['English', 'German'];

      await manager.setLanguages(['Spanish']);

      expect(mockStorage.data['customLanguages']).toEqual(['Spanish']);
    });

    test('should handle empty array', async () => {
      await manager.setLanguages([]);

      expect(mockStorage.data['customLanguages']).toEqual([]);
    });
  });

  describe('resetToDefaults', () => {
    test('should reset to default languages', async () => {
      mockStorage.data['customLanguages'] = ['Custom1', 'Custom2'];

      await manager.resetToDefaults();

      const languages = mockStorage.data['customLanguages'];
      expect(languages).toContain('English');
      expect(languages).toContain('German');
      expect(languages).not.toContain('Custom1');
    });

    test('should persist default languages to storage', async () => {
      await manager.resetToDefaults();

      expect(mockStorage.set).toHaveBeenCalledWith({
        customLanguages: expect.arrayContaining(['English', 'German'])
      });
    });
  });

  describe('integration tests', () => {
    test('should handle complete add/remove cycle', async () => {
      await manager.init();

      await manager.addLanguage('Spanish');
      let languages = await manager.getLanguages();
      expect(languages).toContain('Spanish');

      await manager.removeLanguage('Spanish');
      languages = await manager.getLanguages();
      expect(languages).not.toContain('Spanish');
    });

    test('should maintain language list integrity across operations', async () => {
      await manager.init();
      const initial = await manager.getLanguages();
      const initialCount = initial.length;

      await manager.addLanguage('Klingon');
      let languages = await manager.getLanguages();
      expect(languages.length).toBe(initialCount + 1);

      await manager.removeLanguage('Klingon');
      languages = await manager.getLanguages();
      expect(languages.length).toBe(initialCount);
      expect(languages).toEqual(initial);
    });

    test('should handle rapid successive operations', async () => {
      await manager.init();

      await manager.addLanguage('Lang1');
      await manager.addLanguage('Lang2');
      await manager.addLanguage('Lang3');
      await manager.removeLanguage('Lang2');

      const languages = await manager.getLanguages();
      expect(languages).toContain('Lang1');
      expect(languages).not.toContain('Lang2');
      expect(languages).toContain('Lang3');
    });
  });

  describe('edge cases', () => {
    test('should handle special characters in language names', async () => {
      await manager.init();
      const result = await manager.addLanguage('Français');

      expect(result.success).toBe(true);
    });

    test('should handle numeric language names', async () => {
      await manager.init();
      const result = await manager.addLanguage('L33t');

      expect(result.success).toBe(true);
    });

    test('should handle language names with spaces', async () => {
      await manager.init();
      const result = await manager.addLanguage('Sign Language');

      expect(result.success).toBe(true);
    });

    test('should handle very short language names', async () => {
      await manager.init();
      const result = await manager.addLanguage('X');

      expect(result.success).toBe(true);
    });
  });
});
