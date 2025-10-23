/**
 * Tests for LanguageService
 */

import { jest } from '@jest/globals';
import { LanguageService } from '../services/language-service.js';

describe('LanguageService', () => {
  let service;
  let mockMessenger;

  beforeEach(() => {
    mockMessenger = {
      sendMessage: jest.fn()
    };

    service = new LanguageService(mockMessenger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with messenger', () => {
      expect(service).toBeInstanceOf(LanguageService);
    });

    it('should throw if messenger is missing', () => {
      expect(() => new LanguageService(null))
        .toThrow('Messenger is required');
    });
  });

  describe('getLanguages', () => {
    it('should retrieve languages from background', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { languages: ['English', 'German', 'French'] }
      });

      const result = await service.getLanguages();

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith({ type: 'getLanguages' });
      expect(result).toEqual(['English', 'German', 'French']);
    });

    it('should return empty array on failure', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: false,
        error: 'Failed to load'
      });

      const result = await service.getLanguages();

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockMessenger.sendMessage.mockRejectedValue(new Error('Network error'));

      const result = await service.getLanguages();

      expect(result).toEqual([]);
    });

    it('should handle missing data in response', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true
      });

      const result = await service.getLanguages();

      expect(result).toEqual([]);
    });
  });

  describe('addLanguage', () => {
    it('should add new language', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { languages: ['English', 'German', 'Spanish'] }
      });

      const result = await service.addLanguage('Spanish');

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'addLanguage',
        data: { language: 'Spanish' }
      });
      expect(result).toEqual({
        success: true,
        languages: ['English', 'German', 'Spanish']
      });
    });

    it('should trim language name', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { languages: ['English', 'German', 'Spanish'] }
      });

      await service.addLanguage('  Spanish  ');

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'addLanguage',
        data: { language: 'Spanish' }
      });
    });

    it('should return error if language name is empty', async () => {
      const result = await service.addLanguage('');

      expect(mockMessenger.sendMessage).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Language name is required'
      });
    });

    it('should return error if language name is whitespace', async () => {
      const result = await service.addLanguage('   ');

      expect(mockMessenger.sendMessage).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Language name is required'
      });
    });

    it('should handle addition failure', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: false,
        error: 'Language already exists'
      });

      const result = await service.addLanguage('English');

      expect(result).toEqual({
        success: false,
        error: 'Language already exists'
      });
    });

    it('should handle messenger errors', async () => {
      mockMessenger.sendMessage.mockRejectedValue(new Error('Network error'));

      const result = await service.addLanguage('Spanish');

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });
  });

  describe('removeLanguage', () => {
    it('should remove language', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { languages: ['English', 'French'] }
      });

      const result = await service.removeLanguage('German');

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'removeLanguage',
        data: { language: 'German' }
      });
      expect(result).toEqual({
        success: true,
        languages: ['English', 'French']
      });
    });

    it('should handle removal failure', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: false,
        error: 'Cannot remove default language'
      });

      const result = await service.removeLanguage('English');

      expect(result).toEqual({
        success: false,
        error: 'Cannot remove default language'
      });
    });

    it('should handle messenger errors', async () => {
      mockMessenger.sendMessage.mockRejectedValue(new Error('Network error'));

      const result = await service.removeLanguage('German');

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should handle missing response data', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true
      });

      const result = await service.removeLanguage('German');

      expect(result).toEqual({
        success: true,
        languages: []
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in language names', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { languages: ['English', 'Español'] }
      });

      const result = await service.addLanguage('Español');

      expect(result.success).toBe(true);
    });

    it('should handle very long language names', async () => {
      const longName = 'A'.repeat(100);
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { languages: ['English', longName] }
      });

      const result = await service.addLanguage(longName);

      expect(result.success).toBe(true);
    });

    it('should handle unicode in language names', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { languages: ['English', '中文'] }
      });

      const result = await service.addLanguage('中文');

      expect(result.success).toBe(true);
    });
  });
});
