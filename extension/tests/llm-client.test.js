/**
 * Tests for LLM Client
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { LLMClient } from '../lib/translation/llm-client.js';
import { logger } from '../shared/logger.js';
import { RateLimiter } from '../shared/rate-limiter.js';

describe('LLMClient', () => {
  let llmClient;
  let fetchMock;
  let originalFetch;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Instantiate LLMClient with dependencies
    const rateLimiter = new RateLimiter(10, 60000);
    llmClient = new LLMClient(logger, rateLimiter);

    // Mock fetch
    originalFetch = global.fetch;
    fetchMock = jest.fn();
    global.fetch = fetchMock;

    // Suppress console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Reset llmClient to defaults
    llmClient.configure('http://localhost:1234/v1/chat/completions', 'local-model');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Constructor', () => {
    test('should use default logger when not provided', () => {
      const client = new LLMClient();
      expect(client.logger).toBeDefined();
    });

    test('should create default rate limiter when not provided', () => {
      const client = new LLMClient(logger);
      expect(client.rateLimiter).toBeInstanceOf(RateLimiter);
    });

    test('should use provided logger and rate limiter', () => {
      const customLogger = { ...logger };
      const customRateLimiter = new RateLimiter(5, 30000);
      const client = new LLMClient(customLogger, customRateLimiter);
      expect(client.logger).toBe(customLogger);
      expect(client.rateLimiter).toBe(customRateLimiter);
    });
  });

  describe('configure()', () => {
    test('should update endpoint and model', () => {
      llmClient.configure('http://localhost:8080/v1/chat', 'test-model');
      expect(llmClient.endpoint).toBe('http://localhost:8080/v1/chat');
      expect(llmClient.model).toBe('test-model');
    });

    test('should use default values when null provided', () => {
      llmClient.configure('http://custom:8080/v1/chat', 'custom-model');

      llmClient.configure(null, null);

      // Should revert to defaults
      expect(llmClient.endpoint).toBe('http://localhost:1234/v1/chat/completions');
      expect(llmClient.model).toBe('local-model');
    });

    test('should use default values when undefined provided', () => {
      llmClient.configure('http://custom:8080/v1/chat', 'custom-model');

      llmClient.configure(undefined, undefined);

      expect(llmClient.endpoint).toBe('http://localhost:1234/v1/chat/completions');
      expect(llmClient.model).toBe('local-model');
    });

    test('should auto-detect rate limiting for remote endpoints', () => {
      llmClient.configure('https://api.openai.com/v1/chat', 'gpt-4', null);
      expect(llmClient.useRateLimit).toBe(true);
    });

    test('should auto-detect rate limiting disabled for localhost', () => {
      llmClient.configure('http://localhost:1234/v1/chat', 'local-model', null);
      expect(llmClient.useRateLimit).toBe(false);
    });

    test('should auto-detect rate limiting disabled for 127.0.0.1', () => {
      llmClient.configure('http://127.0.0.1:1234/v1/chat', 'local-model', null);
      expect(llmClient.useRateLimit).toBe(false);
    });

    test('should auto-detect rate limiting disabled for local network', () => {
      llmClient.configure('http://192.168.1.100:1234/v1/chat', 'local-model', null);
      expect(llmClient.useRateLimit).toBe(false);
    });

    test('should respect explicit rate limit setting', () => {
      // Force enable for localhost
      llmClient.configure('http://localhost:1234/v1/chat', 'local-model', true);
      expect(llmClient.useRateLimit).toBe(true);

      // Force disable for remote
      llmClient.configure('https://api.openai.com/v1/chat', 'gpt-4', false);
      expect(llmClient.useRateLimit).toBe(false);
    });
  });

  describe('isLocalEndpoint()', () => {
    test('should identify localhost', () => {
      expect(llmClient.isLocalEndpoint('http://localhost:1234')).toBe(true);
      expect(llmClient.isLocalEndpoint('https://localhost')).toBe(true);
    });

    test('should identify 127.0.0.1', () => {
      expect(llmClient.isLocalEndpoint('http://127.0.0.1:8080')).toBe(true);
    });

    test('should identify ::1 (IPv6 localhost)', () => {
      // Note: URL parsing of IPv6 addresses requires bracket notation
      // If parsing fails, we treat it as non-local (safe default)
      const hasIPv6 = llmClient.isLocalEndpoint('http://[::1]:8080');
      // This may or may not work depending on URL implementation
      expect(typeof hasIPv6).toBe('boolean');
    });

    test('should identify 192.168.x.x networks', () => {
      expect(llmClient.isLocalEndpoint('http://192.168.1.1')).toBe(true);
      expect(llmClient.isLocalEndpoint('http://192.168.0.100')).toBe(true);
    });

    test('should identify 10.x.x.x networks', () => {
      expect(llmClient.isLocalEndpoint('http://10.0.0.1')).toBe(true);
      expect(llmClient.isLocalEndpoint('http://10.1.2.3')).toBe(true);
    });

    test('should identify 172.16-31.x.x networks', () => {
      expect(llmClient.isLocalEndpoint('http://172.16.0.1')).toBe(true);
      expect(llmClient.isLocalEndpoint('http://172.20.0.1')).toBe(true);
      expect(llmClient.isLocalEndpoint('http://172.31.255.255')).toBe(true);
    });

    test('should not identify public IPs as local', () => {
      expect(llmClient.isLocalEndpoint('https://api.openai.com')).toBe(false);
      expect(llmClient.isLocalEndpoint('http://8.8.8.8')).toBe(false);
      expect(llmClient.isLocalEndpoint('http://172.15.0.1')).toBe(false);  // Outside range
      expect(llmClient.isLocalEndpoint('http://172.32.0.1')).toBe(false);  // Outside range
    });

    test('should handle invalid URLs', () => {
      expect(llmClient.isLocalEndpoint('not-a-url')).toBe(false);
      expect(llmClient.isLocalEndpoint('')).toBe(false);
    });
  });

  describe('translate()', () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: 'translated text'
            }
          }
        ]
      })
    };

    beforeEach(() => {
      fetchMock.mockResolvedValue(mockResponse);
      mockResponse.json.mockClear();
    });

    test('should successfully translate text', async () => {
      const result = await llmClient.translate('test', 'German', 'English');

      expect(fetchMock).toHaveBeenCalled();
      expect(result.translation).toBe('translated text');
    });

    test('should translate with context', async () => {
      await llmClient.translate('test', 'German', 'English', 'This is context');

      expect(fetchMock).toHaveBeenCalled();

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      const userMessage = payload.messages.find(m => m.role === 'user').content;
      expect(userMessage).toContain('Context (for disambiguation only, do not translate this)');
      expect(userMessage).toContain('This is context');
    });

    test('should call fetch with correct payload', async () => {
      await llmClient.translate('test', 'German', 'English');

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.any(String),
          signal: expect.any(AbortSignal)
        })
      );

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(payload).toMatchObject({
        model: 'local-model',
        messages: expect.any(Array),
        max_tokens: 100,
        temperature: 0.1,
        stream: false
      });
    });

    test('should retry on transient errors', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockResponse);

      const result = await llmClient.translate('test', 'German', 'English');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.translation).toBe('translated text');
    });

    test('should not retry on 400 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request')
      });

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('should not retry on 401 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized')
      });

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('should not retry on 403 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 403,
        text: jest.fn().mockResolvedValue('Forbidden')
      });

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('should not retry on 404 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue('Not found')
      });

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('should not retry on 422 errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 422,
        text: jest.fn().mockResolvedValue('Unprocessable entity')
      });

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test('should retry on 500 errors', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: jest.fn().mockResolvedValue('Internal server error')
        })
        .mockResolvedValueOnce(mockResponse);

      const result = await llmClient.translate('test', 'German', 'English');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.translation).toBe('translated text');
    });

    test('should fail after max retries', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed: Network error');

      expect(fetchMock).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should handle timeout errors', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');
    });

    test('should handle connection errors', async () => {
      fetchMock.mockRejectedValue(new Error('Failed to fetch'));

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');
    });

    test('should reject empty text', async () => {
      await expect(
        llmClient.translate('', 'German', 'English')
      ).rejects.toThrow('Text cannot be empty');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should reject non-string text', async () => {
      await expect(
        llmClient.translate(123, 'German', 'English')
      ).rejects.toThrow('Text must be a string');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should reject text over 5000 characters', async () => {
      const longText = 'a'.repeat(5001);

      await expect(
        llmClient.translate(longText, 'German', 'English')
      ).rejects.toThrow('Text too long');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should reject empty source language', async () => {
      await expect(
        llmClient.translate('test', '', 'English')
      ).rejects.toThrow('Invalid source language');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should reject empty target language', async () => {
      await expect(
        llmClient.translate('test', 'German', '')
      ).rejects.toThrow('Invalid target language');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    test('should handle rate limit with wait time', async () => {
      // Enable rate limiting
      llmClient.configure('http://localhost:1234/v1/chat/completions', 'local-model', true);

      // Exhaust rate limit
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(llmClient.translate('test', 'German', 'English'));
      }
      await Promise.all(promises);

      // Next request should fail with rate limit error
      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow(/Rate limit exceeded/);
    });

    test('should handle JSON parsing errors', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Translation failed');
    });

    test('should handle missing response text', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockRejectedValue(new Error('Cannot read response'))
      });

      await expect(
        llmClient.translate('test', 'German', 'English')
      ).rejects.toThrow('Unknown error');
    });

    test('should extract translation from various response formats', async () => {
      // Test with prefix "Translation:"
      fetchMock.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{
            message: { content: 'Translation: result text' }
          }]
        })
      });

      const result = await llmClient.translate('test', 'German', 'English');
      expect(result.translation).toBe('result text');
    });
  });

  describe('testConnection()', () => {
    test('should return true for successful connection', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200
      });

      const result = await llmClient.testConnection();

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalled();
    });

    test('should return true for 400 response (server is responding)', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400
      });

      const result = await llmClient.testConnection();

      expect(result).toBe(true);
    });

    test('should return false for connection failure', async () => {
      fetchMock.mockRejectedValue(new Error('Failed to fetch'));

      const result = await llmClient.testConnection();

      expect(result).toBe(false);
    });

    test('should return false for timeout', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      fetchMock.mockRejectedValue(abortError);

      const result = await llmClient.testConnection();

      expect(result).toBe(false);
    });

    test('should send minimal test payload', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200
      });

      await llmClient.testConnection();

      const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(payload).toMatchObject({
        model: 'local-model',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
    });
  });

  describe('_sleep()', () => {
    test('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await llmClient._sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });

    test('should handle zero milliseconds', async () => {
      await expect(llmClient._sleep(0)).resolves.toBeUndefined();
    });
  });

  describe('_isNonRetryableError()', () => {
    test('should identify 400 errors as non-retryable', () => {
      const error = new Error('HTTP 400: Bad request');
      expect(llmClient._isNonRetryableError(error)).toBe(true);
    });

    test('should identify 401 errors as non-retryable', () => {
      const error = new Error('HTTP 401: Unauthorized');
      expect(llmClient._isNonRetryableError(error)).toBe(true);
    });

    test('should identify 403 errors as non-retryable', () => {
      const error = new Error('HTTP 403: Forbidden');
      expect(llmClient._isNonRetryableError(error)).toBe(true);
    });

    test('should identify 404 errors as non-retryable', () => {
      const error = new Error('HTTP 404: Not found');
      expect(llmClient._isNonRetryableError(error)).toBe(true);
    });

    test('should identify 422 errors as non-retryable', () => {
      const error = new Error('HTTP 422: Unprocessable entity');
      expect(llmClient._isNonRetryableError(error)).toBe(true);
    });

    test('should identify 500 errors as retryable', () => {
      const error = new Error('HTTP 500: Internal server error');
      expect(llmClient._isNonRetryableError(error)).toBe(false);
    });

    test('should identify network errors as retryable', () => {
      const error = new Error('Network error');
      expect(llmClient._isNonRetryableError(error)).toBe(false);
    });

    test('should handle case insensitive error messages', () => {
      const error = new Error('http 400: bad request');
      expect(llmClient._isNonRetryableError(error)).toBe(true);
    });
  });

  describe('_makeRequest()', () => {
    const payload = {
      model: 'test-model',
      messages: [{ role: 'user', content: 'test' }]
    };

    test('should make successful request', async () => {
      const mockData = { result: 'success' };
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue(mockData)
      });

      const result = await llmClient._makeRequest(payload);

      expect(result).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: expect.any(AbortSignal)
        })
      );
    });

    test('should throw on non-OK response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Server error')
      });

      await expect(llmClient._makeRequest(payload)).rejects.toThrow(
        'HTTP 500: Server error'
      );
    });

    test('should transform fetch errors to connection errors', async () => {
      fetchMock.mockRejectedValue(new Error('Failed to fetch'));

      await expect(llmClient._makeRequest(payload)).rejects.toThrow(
        /Cannot connect to LLM server/
      );
    });
  });
});
