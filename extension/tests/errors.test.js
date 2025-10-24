/**
 * Tests for custom error classes
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  TranslationError,
  ValidationError,
  NetworkError,
  CacheError
} from '../shared/errors.js';

describe('Custom Error Classes', () => {
  describe('TranslationError', () => {
    it('should create error with message only', () => {
      const error = new TranslationError('Translation failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(TranslationError);
      expect(error.name).toBe('TranslationError');
      expect(error.message).toBe('Translation failed');
      expect(error.context).toEqual({});
      expect(error.timestamp).toBeGreaterThan(0);
    });

    it('should create error with context', () => {
      const context = { sourceLang: 'en', targetLang: 'es', text: 'hello' };
      const error = new TranslationError('Translation failed', context);

      expect(error.message).toBe('Translation failed');
      expect(error.context).toEqual(context);
    });

    it('should serialize to JSON', () => {
      const context = { key: 'value' };
      const error = new TranslationError('Test error', context);
      const json = error.toJSON();

      expect(json.name).toBe('TranslationError');
      expect(json.message).toBe('Test error');
      expect(json.context).toEqual(context);
      expect(json.timestamp).toBe(error.timestamp);
      expect(json.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should create error with message only', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBeNull();
      expect(error.value).toBeNull();
      expect(error.timestamp).toBeGreaterThan(0);
    });

    it('should create error with field and value', () => {
      const error = new ValidationError('Invalid email', 'email', 'not-an-email');

      expect(error.message).toBe('Invalid email');
      expect(error.field).toBe('email');
      expect(error.value).toBe('not-an-email');
    });

    it('should serialize to JSON', () => {
      const error = new ValidationError('Invalid field', 'username', 'abc');
      const json = error.toJSON();

      expect(json.name).toBe('ValidationError');
      expect(json.message).toBe('Invalid field');
      expect(json.field).toBe('username');
      expect(json.value).toBe('abc');
      expect(json.timestamp).toBe(error.timestamp);
    });

    it('should handle null field in JSON', () => {
      const error = new ValidationError('Error message');
      const json = error.toJSON();

      expect(json.field).toBeNull();
      expect(json.value).toBeNull();
    });
  });

  describe('NetworkError', () => {
    it('should create error with message only', () => {
      const error = new NetworkError('Connection failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(NetworkError);
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Connection failed');
      expect(error.endpoint).toBeNull();
      expect(error.statusCode).toBeNull();
      expect(error.timestamp).toBeGreaterThan(0);
    });

    it('should create error with endpoint and status code', () => {
      const error = new NetworkError(
        'Request failed',
        'http://localhost:1234',
        500
      );

      expect(error.message).toBe('Request failed');
      expect(error.endpoint).toBe('http://localhost:1234');
      expect(error.statusCode).toBe(500);
    });

    it('should serialize to JSON', () => {
      const error = new NetworkError('Timeout', 'http://api.test', 408);
      const json = error.toJSON();

      expect(json.name).toBe('NetworkError');
      expect(json.message).toBe('Timeout');
      expect(json.endpoint).toBe('http://api.test');
      expect(json.statusCode).toBe(408);
      expect(json.timestamp).toBe(error.timestamp);
    });

    it('should handle null endpoint and status in JSON', () => {
      const error = new NetworkError('Generic error');
      const json = error.toJSON();

      expect(json.endpoint).toBeNull();
      expect(json.statusCode).toBeNull();
    });
  });

  describe('CacheError', () => {
    it('should create error with message only', () => {
      const error = new CacheError('Cache operation failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CacheError);
      expect(error.name).toBe('CacheError');
      expect(error.message).toBe('Cache operation failed');
      expect(error.operation).toBeNull();
      expect(error.timestamp).toBeGreaterThan(0);
    });

    it('should create error with operation', () => {
      const error = new CacheError('Failed to write', 'set');

      expect(error.message).toBe('Failed to write');
      expect(error.operation).toBe('set');
    });

    it('should serialize to JSON', () => {
      const error = new CacheError('Database locked', 'get');
      const json = error.toJSON();

      expect(json.name).toBe('CacheError');
      expect(json.message).toBe('Database locked');
      expect(json.operation).toBe('get');
      expect(json.timestamp).toBe(error.timestamp);
    });

    it('should handle null operation in JSON', () => {
      const error = new CacheError('Unknown error');
      const json = error.toJSON();

      expect(json.operation).toBeNull();
    });
  });

  describe('Error inheritance', () => {
    it('should be catchable as Error', () => {
      const errors = [
        new TranslationError('test'),
        new ValidationError('test'),
        new NetworkError('test'),
        new CacheError('test')
      ];

      errors.forEach(error => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('test');
        expect(error.stack).toBeDefined();
      });
    });

    it('should have distinct names', () => {
      const errors = [
        new TranslationError('test'),
        new ValidationError('test'),
        new NetworkError('test'),
        new CacheError('test')
      ];

      const names = errors.map(e => e.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(4);
      expect(names).toContain('TranslationError');
      expect(names).toContain('ValidationError');
      expect(names).toContain('NetworkError');
      expect(names).toContain('CacheError');
    });
  });
});
