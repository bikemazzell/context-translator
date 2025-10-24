/**
 * Tests for TranslationService
 */

import { jest } from '@jest/globals';
import { TranslationService } from '../services/translation-service.js';

describe('TranslationService', () => {
  let service;
  let mockMessenger;
  let mockSettingsManager;
  let mockLogger;

  beforeEach(() => {
    mockMessenger = {
      sendMessage: jest.fn()
    };

    mockSettingsManager = {
      get: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    service = new TranslationService(mockMessenger, mockSettingsManager, mockLogger);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with dependencies', () => {
      expect(service).toBeInstanceOf(TranslationService);
    });

    it('should throw if messenger is missing', () => {
      expect(() => new TranslationService(null, mockSettingsManager, mockLogger))
        .toThrow('Messenger is required');
    });

    it('should throw if settingsManager is missing', () => {
      expect(() => new TranslationService(mockMessenger, null, mockLogger))
        .toThrow('SettingsManager is required');
    });

    it('should throw if logger is missing', () => {
      expect(() => new TranslationService(mockMessenger, mockSettingsManager, null))
        .toThrow('Logger is required');
    });
  });

  describe('buildTranslationRequest', () => {
    it('should build request with context when contextMode is enabled', () => {
      mockSettingsManager.get.mockImplementation((key) => {
        const settings = {
          contextMode: true,
          sourceLang: 'en',
          targetLang: 'es',
          useCache: true
        };
        return settings[key];
      });

      const request = service.buildTranslationRequest('hello', 'hello world');

      expect(request).toEqual({
        type: 'translate',
        data: {
          text: 'hello',
          source_lang: 'en',
          target_lang: 'es',
          context: 'hello world',
          use_cache: true
        }
      });
    });

    it('should build request without context when contextMode is disabled', () => {
      mockSettingsManager.get.mockImplementation((key) => {
        const settings = {
          contextMode: false,
          sourceLang: 'German',
          targetLang: 'English',
          useCache: false
        };
        return settings[key];
      });

      const request = service.buildTranslationRequest('hallo', 'hallo welt');

      expect(request).toEqual({
        type: 'translate',
        data: {
          text: 'hallo',
          source_lang: 'German',
          target_lang: 'English',
          context: null,
          use_cache: false
        }
      });
    });

    it('should use null context when context string is empty', () => {
      mockSettingsManager.get.mockReturnValue(true);

      const request = service.buildTranslationRequest('hello', '');

      expect(request.data.context).toBeNull();
    });

    it('should use null context when context is undefined', () => {
      mockSettingsManager.get.mockReturnValue(true);

      const request = service.buildTranslationRequest('hello', undefined);

      expect(request.data.context).toBeNull();
    });

    it('should trim text before creating request', () => {
      mockSettingsManager.get.mockReturnValue('en');

      const request = service.buildTranslationRequest('  hello  ', 'context');

      expect(request.data.text).toBe('hello');
    });
  });

  describe('translate', () => {
    beforeEach(() => {
      mockSettingsManager.get.mockImplementation((key) => ({
        contextMode: true,
        sourceLang: 'en',
        targetLang: 'es',
        useCache: true
      }[key]));
    });

    it('should send translation request and return response', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { translation: 'hola' }
      });

      const result = await service.translate('hello', 'context');

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith({
        type: 'translate',
        data: {
          text: 'hello',
          source_lang: 'en',
          target_lang: 'es',
          context: 'context',
          use_cache: true
        }
      });
      expect(result).toEqual({
        success: true,
        data: { translation: 'hola' }
      });
    });

    it('should return error response on failure', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: false,
        error: 'API error'
      });

      const result = await service.translate('hello', 'context');

      expect(result).toEqual({
        success: false,
        error: 'API error'
      });
    });

    it('should handle messenger errors', async () => {
      const error = new Error('Network error');
      mockMessenger.sendMessage.mockRejectedValue(error);

      const result = await service.translate('hello', 'context');

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should log error when translation fails', async () => {
      mockMessenger.sendMessage.mockRejectedValue(new Error('Failed'));

      await service.translate('hello', 'context');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Translation request failed:',
        expect.any(Error)
      );
    });
  });

  describe('extractTranslation', () => {
    it('should extract translation from successful response', () => {
      const response = {
        success: true,
        data: { translation: 'hola' }
      };

      const result = service.extractTranslation(response);

      expect(result).toBe('hola');
    });

    it('should return null for failed response', () => {
      const response = {
        success: false,
        error: 'API error'
      };

      const result = service.extractTranslation(response);

      expect(result).toBeNull();
    });

    it('should return null when response has no data', () => {
      const response = {
        success: true
      };

      const result = service.extractTranslation(response);

      expect(result).toBeNull();
    });

    it('should return null when data has no translation', () => {
      const response = {
        success: true,
        data: {}
      };

      const result = service.extractTranslation(response);

      expect(result).toBeNull();
    });
  });

  describe('logResponseDebugInfo', () => {
    it('should log debug info for non-cached responses', () => {
      const response = {
        success: true,
        data: {
          translation: 'hola',
          debugInfo: {
            rawResponse: { content: 'hola' },
            rawContent: 'hola',
            cleanedTranslation: 'hola'
          }
        }
      };

      service.logResponseDebugInfo(response);

      expect(mockLogger.info).toHaveBeenCalledWith('LLM raw response:', expect.any(String));
      expect(mockLogger.info).toHaveBeenCalledWith('Raw LLM content:', 'hola');
      expect(mockLogger.info).toHaveBeenCalledWith('Cleaned translation:', 'hola');
    });

    it('should log cache hit for cached responses', () => {
      const response = {
        success: true,
        data: {
          translation: 'hola',
          cached: true
        }
      };

      service.logResponseDebugInfo(response);

      expect(mockLogger.info).toHaveBeenCalledWith('Cache hit - translation:', 'hola');
    });

    it('should not log anything for failed responses', () => {
      const response = {
        success: false,
        error: 'API error'
      };

      service.logResponseDebugInfo(response);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should handle response without debugInfo', () => {
      const response = {
        success: true,
        data: {
          translation: 'hola'
        }
      };

      service.logResponseDebugInfo(response);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should handle undefined rawResponse in debugInfo', () => {
      const response = {
        success: true,
        data: {
          translation: 'hola',
          debugInfo: {
            rawContent: 'hola',
            cleanedTranslation: 'hola'
          }
        }
      };

      expect(() => service.logResponseDebugInfo(response)).not.toThrow();
    });
  });

  describe('getErrorMessage', () => {
    it('should extract error message from response', () => {
      const response = {
        success: false,
        error: 'API error'
      };

      const message = service.getErrorMessage(response);

      expect(message).toBe('API error');
    });

    it('should return default message when error is missing', () => {
      const response = {
        success: false
      };

      const message = service.getErrorMessage(response);

      expect(message).toBe('Unknown error');
    });

    it('should handle Error objects', () => {
      const response = {
        success: false,
        error: new Error('Test error')
      };

      const message = service.getErrorMessage(response);

      expect(message).toBe('Test error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { translation: '' }
      });
      mockSettingsManager.get.mockReturnValue('en');

      const result = await service.translate('', 'context');

      expect(result.success).toBe(true);
    });

    it('should handle very long text', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { translation: 'translation' }
      });
      mockSettingsManager.get.mockReturnValue('en');

      const longText = 'a'.repeat(10000);
      await service.translate(longText, 'context');

      expect(mockMessenger.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            text: longText
          })
        })
      );
    });

    it('should handle special characters in text', async () => {
      mockMessenger.sendMessage.mockResolvedValue({
        success: true,
        data: { translation: '你好' }
      });
      mockSettingsManager.get.mockReturnValue('en');

      const result = await service.translate('hello 🌍 <>&"', 'context');

      expect(result.success).toBe(true);
    });

    it('should handle null response from messenger', async () => {
      mockMessenger.sendMessage.mockResolvedValue(null);
      mockSettingsManager.get.mockReturnValue('en');

      const result = await service.translate('hello', 'context');

      expect(result.success).toBe(false);
    });
  });
});
