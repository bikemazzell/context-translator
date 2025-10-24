/**
 * Tests for background/message-handler.js
 * Tests message routing, translation requests, cache operations, and health checks
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { handleMessage, configureDependencies } from '../background/message-handler.js';
import { TranslationCache } from '../lib/translation/translation-cache.js';
import { LLMClient } from '../lib/translation/llm-client.js';
import { LanguageManager } from '../shared/language-manager.js';
import { logger } from '../shared/logger.js';
import { RateLimiter } from '../shared/rate-limiter.js';

describe('message-handler', () => {
  let sendResponseMock;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleDebugSpy;
  let mockSender;
  let cacheManager;
  let llmClient;
  let languageManager;

  beforeEach(() => {
    sendResponseMock = jest.fn();
    jest.clearAllMocks();

    // Instantiate dependencies
    cacheManager = new TranslationCache(logger);
    const rateLimiter = new RateLimiter(10, 60000);
    llmClient = new LLMClient(logger, rateLimiter);
    languageManager = new LanguageManager();

    // Configure dependencies for message handler (DI pattern)
    configureDependencies(cacheManager, llmClient, languageManager);

    // Mock sender object with valid extension ID
    mockSender = {
      id: 'test-extension-id',
      tab: { id: 1, url: 'https://example.com' }
    };

    // Mock browser.runtime for sender validation
    global.browser = {
      runtime: {
        id: 'test-extension-id'
      }
    };

    // Suppress console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
    delete global.browser;
  });

  describe('handleMessage - routing', () => {
    test('should handle translate message type', () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English',
          target_lang: 'German',
          use_cache: true
        }
      };

      jest.spyOn(llmClient, 'translate').mockResolvedValue({ translation: 'Hallo', debugInfo: {} });
      jest.spyOn(cacheManager, 'generateKey').mockReturnValue('test-key');
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const result = handleMessage(message, mockSender, sendResponseMock);

      expect(result).toBe(true); // Async response
    });

    test('should handle getLanguages message type', () => {
      const message = { type: 'getLanguages' };

      const result = handleMessage(message, mockSender, sendResponseMock);

      expect(result).toBe(true);
    });

    test('should handle checkHealth message type', () => {
      const message = { type: 'checkHealth' };

      jest.spyOn(llmClient, 'testConnection').mockResolvedValue(true);

      const result = handleMessage(message, mockSender, sendResponseMock);

      expect(result).toBe(true);
    });

    test('should handle clearCache message type', () => {
      const message = { type: 'clearCache' };

      jest.spyOn(cacheManager, 'clear').mockResolvedValue(undefined);

      const result = handleMessage(message, mockSender, sendResponseMock);

      expect(result).toBe(true);
    });

    test('should handle cacheStats message type', () => {
      const message = { type: 'cacheStats' };

      jest.spyOn(cacheManager, 'getStats').mockResolvedValue({ count: 10, size: 1024 });

      const result = handleMessage(message, mockSender, sendResponseMock);

      expect(result).toBe(true);
    });

    test('should reject unknown message type', () => {
      const message = { type: 'unknownType' };

      const result = handleMessage(message, mockSender, sendResponseMock);

      expect(result).toBe(false);
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown message type: unknownType'
      });
    });

    test('should handle message with no data field', () => {
      const message = { type: 'getLanguages' };

      const result = handleMessage(message, mockSender, sendResponseMock);

      expect(result).toBe(true);
      // Should not throw, treats missing data as empty object
    });
  });

  describe('translate handler', () => {
    test('should return cached translation when available', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English',
          target_lang: 'German',
          use_cache: true
        }
      };

      jest.spyOn(cacheManager, 'generateKey').mockReturnValue('cache-key-123');
      jest.spyOn(cacheManager, 'get').mockResolvedValue('Hallo (cached)');
      const translateSpy = jest.spyOn(llmClient, 'translate');

      handleMessage(message, mockSender, sendResponseMock);

      // Wait for async handler
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cacheManager.get).toHaveBeenCalledWith('cache-key-123');
      expect(translateSpy).not.toHaveBeenCalled();
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          translation: 'Hallo (cached)',
          cached: true
        }
      });
    });

    test('should fetch translation when not cached', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English',
          target_lang: 'German',
          use_cache: true
        }
      };

      jest.spyOn(cacheManager, 'generateKey').mockReturnValue('cache-key-123');
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(llmClient, 'translate').mockResolvedValue({ translation: 'Hallo', debugInfo: {} });
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cacheManager.get).toHaveBeenCalledWith('cache-key-123');
      expect(llmClient.translate).toHaveBeenCalledWith('Hello', 'English', 'German', undefined);
      expect(cacheManager.set).toHaveBeenCalled();
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          translation: 'Hallo',
          cached: false
          , debugInfo: {}
        }
      });
    });

    test('should skip cache when use_cache is false', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English',
          target_lang: 'German',
          use_cache: false
        }
      };

      jest.spyOn(llmClient, 'translate').mockResolvedValue({ translation: 'Hallo', debugInfo: {} });
      const getSpy = jest.spyOn(cacheManager, 'get');
      const setSpy = jest.spyOn(cacheManager, 'set');

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(getSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
      expect(llmClient.translate).toHaveBeenCalled();
    });

    test('should include context in translation request', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'bank',
          source_lang: 'English',
          target_lang: 'German',
          context: 'I went to the bank to deposit money',
          use_cache: true
        }
      };

      jest.spyOn(cacheManager, 'generateKey').mockReturnValue('cache-key-with-context');
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(llmClient, 'translate').mockResolvedValue({ translation: 'Bank', debugInfo: {} });
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(llmClient.translate).toHaveBeenCalledWith(
        'bank',
        'English',
        'German',
        'I went to the bank to deposit money'
      );
      expect(cacheManager.set).toHaveBeenCalledWith(
        'cache-key-with-context',
        'bank',
        'English',
        'German',
        'Bank',
        'I went to the bank to deposit money'
      );
    });

    test('should reject missing text parameter', async () => {
      const message = {
        type: 'translate',
        data: {
          source_lang: 'English',
          target_lang: 'German'
        }
      };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameters'
      });
    });

    test('should reject missing source_lang parameter', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          target_lang: 'German'
        }
      };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameters'
      });
    });

    test('should reject missing target_lang parameter', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English'
        }
      };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameters'
      });
    });

    test('should reject text longer than 500 characters', async () => {
      const longText = 'a'.repeat(501);
      const message = {
        type: 'translate',
        data: {
          text: longText,
          source_lang: 'English',
          target_lang: 'German'
        }
      };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Text too long (max 500 characters)'
      });
    });

    test('should handle LLM translation errors', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English',
          target_lang: 'German',
          use_cache: true
        }
      };

      jest.spyOn(cacheManager, 'generateKey').mockReturnValue('cache-key');
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);
      jest.spyOn(llmClient, 'translate').mockRejectedValue(new Error('LLM service unavailable'));

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'LLM service unavailable'
      });
    });

    test('should handle cache errors gracefully', async () => {
      const message = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English',
          target_lang: 'German',
          use_cache: true
        }
      };

      jest.spyOn(cacheManager, 'generateKey').mockReturnValue('cache-key');
      jest.spyOn(cacheManager, 'get').mockRejectedValue(new Error('Cache read error'));
      jest.spyOn(llmClient, 'translate').mockResolvedValue({ translation: 'Hallo', debugInfo: {} });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should propagate cache errors
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cache read error'
      });
    });

    test('should handle text at exactly 500 characters', async () => {
      const maxText = 'a'.repeat(500);
      const message = {
        type: 'translate',
        data: {
          text: maxText,
          source_lang: 'English',
          target_lang: 'German',
          use_cache: false
        }
      };

      jest.spyOn(llmClient, 'translate').mockResolvedValue({ translation: 'Translation', debugInfo: {} });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(llmClient.translate).toHaveBeenCalled();
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          translation: 'Translation',
          cached: false
          , debugInfo: {}
        }
      });
    });
  });

  describe('getLanguages handler', () => {
    test('should return supported languages', async () => {
      const message = { type: 'getLanguages' };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          languages: expect.arrayContaining(['English', 'German', 'French', 'Spanish'])
        }
      });
    });
  });

  describe('checkHealth handler', () => {
    test('should return healthy status when LLM is available', async () => {
      const message = { type: 'checkHealth' };

      jest.spyOn(llmClient, 'testConnection').mockResolvedValue(true);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(llmClient.testConnection).toHaveBeenCalled();
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          status: 'healthy',
          llm_available: true
        }
      });
    });

    test('should return unhealthy status when LLM is unavailable', async () => {
      const message = { type: 'checkHealth' };

      jest.spyOn(llmClient, 'testConnection').mockResolvedValue(false);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          status: 'unhealthy',
          llm_available: false
        }
      });
    });

    test('should handle health check errors', async () => {
      const message = { type: 'checkHealth' };

      jest.spyOn(llmClient, 'testConnection').mockRejectedValue(new Error('Connection timeout'));

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          status: 'unhealthy',
          llm_available: false,
          error: 'Connection timeout'
        }
      });
    });
  });

  describe('clearCache handler', () => {
    test('should clear cache successfully', async () => {
      const message = { type: 'clearCache' };

      jest.spyOn(cacheManager, 'clear').mockResolvedValue(undefined);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cacheManager.clear).toHaveBeenCalled();
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          status: 'cleared'
        }
      });
    });

    test('should handle cache clear errors', async () => {
      const message = { type: 'clearCache' };

      jest.spyOn(cacheManager, 'clear').mockRejectedValue(new Error('Database error'));

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('cacheStats handler', () => {
    test('should return cache statistics', async () => {
      const message = { type: 'cacheStats' };

      const mockStats = {
        count: 42,
        size: 10240,
        oldestEntry: '2025-10-21T10:00:00Z',
        newestEntry: '2025-10-22T15:30:00Z'
      };

      jest.spyOn(cacheManager, 'getStats').mockResolvedValue(mockStats);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cacheManager.getStats).toHaveBeenCalled();
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    test('should handle cache stats errors', async () => {
      const message = { type: 'cacheStats' };

      jest.spyOn(cacheManager, 'getStats').mockRejectedValue(new Error('Stats retrieval failed'));

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Stats retrieval failed'
      });
    });

    test('should return empty stats when cache is empty', async () => {
      const message = { type: 'cacheStats' };

      const emptyStats = {
        count: 0,
        size: 0
      };

      jest.spyOn(cacheManager, 'getStats').mockResolvedValue(emptyStats);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: emptyStats
      });
    });
  });

  describe('addLanguage handler', () => {
    test('should add a new language successfully', async () => {
      const message = {
        type: 'addLanguage',
        data: { language: 'Spanish' }
      };

      jest.spyOn(languageManager, 'addLanguage').mockResolvedValue({ success: true });
      jest.spyOn(languageManager, 'getLanguages').mockResolvedValue(['English', 'German', 'Spanish']);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: { languages: ['English', 'German', 'Spanish'] }
      });
    });

    test('should reject duplicate language', async () => {
      const message = {
        type: 'addLanguage',
        data: { language: 'English' }
      };

      jest.spyOn(languageManager, 'addLanguage').mockResolvedValue({
        success: false,
        error: 'Language already exists'
      });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Language already exists'
      });
    });

    test('should reject empty language name', async () => {
      const message = {
        type: 'addLanguage',
        data: { language: '' }
      };

      jest.spyOn(languageManager, 'addLanguage').mockResolvedValue({
        success: false,
        error: 'Language name is required'
      });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Language name is required'
      });
    });

    test('should reject language name that is too long', async () => {
      const message = {
        type: 'addLanguage',
        data: { language: 'a'.repeat(51) }
      };

      jest.spyOn(languageManager, 'addLanguage').mockResolvedValue({
        success: false,
        error: 'Language name too long (max 50 characters)'
      });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Language name too long (max 50 characters)'
      });
    });

    test('should fail when language parameter is missing', async () => {
      const message = {
        type: 'addLanguage',
        data: {}
      };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Language name is required'
      });
    });
  });

  describe('removeLanguage handler', () => {
    test('should remove an existing language successfully', async () => {
      const message = {
        type: 'removeLanguage',
        data: { language: 'German' }
      };

      jest.spyOn(languageManager, 'removeLanguage').mockResolvedValue({ success: true });
      jest.spyOn(languageManager, 'getLanguages').mockResolvedValue(['English', 'French']);

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: { languages: ['English', 'French'] }
      });
    });

    test('should fail when language not found', async () => {
      const message = {
        type: 'removeLanguage',
        data: { language: 'Klingon' }
      };

      jest.spyOn(languageManager, 'removeLanguage').mockResolvedValue({
        success: false,
        error: 'Language not found'
      });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Language not found'
      });
    });

    test('should prevent removing the last language', async () => {
      const message = {
        type: 'removeLanguage',
        data: { language: 'English' }
      };

      jest.spyOn(languageManager, 'removeLanguage').mockResolvedValue({
        success: false,
        error: 'Cannot remove the last language'
      });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot remove the last language'
      });
    });

    test('should fail when language parameter is missing', async () => {
      const message = {
        type: 'removeLanguage',
        data: {}
      };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Language name is required'
      });
    });

    test('should handle removal errors gracefully', async () => {
      const message = {
        type: 'removeLanguage',
        data: { language: 'German' }
      };

      jest.spyOn(languageManager, 'removeLanguage').mockRejectedValue(
        new Error('Storage error')
      );

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: expect.stringContaining('Storage error')
      });
    });
  });

  describe('edge cases', () => {
    test('should handle concurrent translation requests', async () => {
      const message1 = {
        type: 'translate',
        data: {
          text: 'Hello',
          source_lang: 'English',
          target_lang: 'German',
          use_cache: false
        }
      };

      const message2 = {
        type: 'translate',
        data: {
          text: 'Goodbye',
          source_lang: 'English',
          target_lang: 'French',
          use_cache: false
        }
      };

      jest.spyOn(llmClient, 'translate')
        .mockResolvedValueOnce('Hallo')
        .mockResolvedValueOnce('Au revoir');

      const response1 = jest.fn();
      const response2 = jest.fn();

      handleMessage(message1, mockSender, response1);
      handleMessage(message2, mockSender, response2);

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(response1).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      expect(response2).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('should handle empty string text', async () => {
      const message = {
        type: 'translate',
        data: {
          text: '',
          source_lang: 'English',
          target_lang: 'German'
        }
      };

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameters'
      });
    });

    test('should handle special characters in text', async () => {
      const message = {
        type: 'translate',
        data: {
          text: '¡Hola! ¿Cómo estás? 你好',
          source_lang: 'Mixed',
          target_lang: 'English',
          use_cache: false
        }
      };

      jest.spyOn(llmClient, 'translate').mockResolvedValue({ translation: 'Hello! How are you? Hello', debugInfo: {} });

      handleMessage(message, mockSender, sendResponseMock);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sendResponseMock).toHaveBeenCalledWith({
        success: true,
        data: {
          translation: 'Hello! How are you? Hello',
          cached: false
          , debugInfo: {}
        }
      });
    });
  });

  describe('sender validation', () => {
    test('should reject messages without sender ID', () => {
      const message = { type: 'translate', data: { text: 'test', source_lang: 'en', target_lang: 'de' } };
      const invalidSender = { tab: { id: 1 } }; // Missing ID

      const result = handleMessage(message, invalidSender, sendResponseMock);

      expect(result).toBe(false);
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid sender'
      });
    });

    test('should reject messages from different extension', () => {
      const message = { type: 'translate', data: { text: 'test', source_lang: 'en', target_lang: 'de' } };
      const invalidSender = {
        id: 'different-extension-id',
        tab: { id: 1 }
      };

      const result = handleMessage(message, invalidSender, sendResponseMock);

      expect(result).toBe(false);
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid sender'
      });
    });

    test('should reject messages without tab or URL info', () => {
      const message = { type: 'translate', data: { text: 'test', source_lang: 'en', target_lang: 'de' } };
      const invalidSender = {
        id: 'test-extension-id'
        // Missing tab and url
      };

      const result = handleMessage(message, invalidSender, sendResponseMock);

      expect(result).toBe(false);
      expect(sendResponseMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid sender'
      });
    });

    test('should accept valid sender with tab info', () => {
      const message = { type: 'checkHealth', data: {} };
      const validSender = {
        id: 'test-extension-id',
        tab: { id: 1, url: 'https://example.com' }
      };

      jest.spyOn(llmClient, 'testConnection').mockResolvedValue(true);

      const result = handleMessage(message, validSender, sendResponseMock);

      expect(result).toBe(true);
      // Should not reject
      expect(sendResponseMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid sender' })
      );
    });

    test('should accept valid sender with URL info (popup/options)', () => {
      const message = { type: 'checkHealth', data: {} };
      const validSender = {
        id: 'test-extension-id',
        url: 'moz-extension://test-id/popup.html'
      };

      jest.spyOn(llmClient, 'testConnection').mockResolvedValue(true);

      const result = handleMessage(message, validSender, sendResponseMock);

      expect(result).toBe(true);
      expect(sendResponseMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid sender' })
      );
    });
  });
});
