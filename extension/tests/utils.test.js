/**
 * Tests for utility functions
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  cleanWhitespace,
  sanitizeText,
  hashString,
  secureHash,
  generateHMACKey,
  generateHMAC,
  verifyHMAC,
  truncateText,
  isDarkMode,
  debounce
} from '../shared/utils.js';

describe('cleanWhitespace', () => {
  test('should return empty string for null', () => {
    expect(cleanWhitespace(null)).toBe('');
  });

  test('should return empty string for undefined', () => {
    expect(cleanWhitespace(undefined)).toBe('');
  });

  test('should return empty string for non-string', () => {
    expect(cleanWhitespace(123)).toBe('');
    expect(cleanWhitespace({})).toBe('');
    expect(cleanWhitespace([])).toBe('');
  });

  test('should trim whitespace', () => {
    expect(cleanWhitespace('  hello  ')).toBe('hello');
    expect(cleanWhitespace('\n\nhello\n\n')).toBe('hello');
  });

  test('should preserve internal newlines and tabs', () => {
    expect(cleanWhitespace('line1\nline2')).toBe('line1\nline2');
    expect(cleanWhitespace('hello\tworld')).toBe('hello\tworld');
  });

  test('should remove control characters', () => {
    const withControl = 'hello\x00\x01\x02world';
    expect(cleanWhitespace(withControl)).toBe('helloworld');
  });
});

describe('sanitizeText', () => {
  test('should return empty string for null', () => {
    expect(sanitizeText(null)).toBe('');
  });

  test('should return empty string for undefined', () => {
    expect(sanitizeText(undefined)).toBe('');
  });

  test('should return empty string for non-string', () => {
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText({})).toBe('');
    expect(sanitizeText([])).toBe('');
  });

  test('should return empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  test('should trim whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
    expect(sanitizeText('\n\nhello\n\n')).toBe('hello');
  });

  test('should preserve newlines', () => {
    const result = sanitizeText('line1\nline2');
    expect(result).toBe('line1\nline2');
  });

  test('should preserve tabs', () => {
    const result = sanitizeText('hello\tworld');
    expect(result).toBe('hello\tworld');
  });

  test('should remove control characters', () => {
    // ASCII control characters (0-31) except \n (10) and \t (9)
    const withControl = 'hello\x00\x01\x02world';
    const result = sanitizeText(withControl);
    expect(result).toBe('helloworld');
  });

  test('should preserve printable characters', () => {
    const text = 'Hello World! 123 @#$%';
    expect(sanitizeText(text)).toBe(text);
  });

  test('should handle mixed content', () => {
    const text = '  Hello\nWorld\t!\x00\x01  ';
    const result = sanitizeText(text);
    expect(result).toBe('Hello\nWorld\t!');
  });
});

describe('hashString', () => {
  test('should return a string', () => {
    const hash = hashString('hello');
    expect(typeof hash).toBe('string');
  });

  test('should return non-empty string', () => {
    const hash = hashString('hello');
    expect(hash.length).toBeGreaterThan(0);
  });

  test('should return same hash for same input', () => {
    const hash1 = hashString('hello');
    const hash2 = hashString('hello');
    expect(hash1).toBe(hash2);
  });

  test('should return different hashes for different inputs', () => {
    const hash1 = hashString('hello');
    const hash2 = hashString('world');
    expect(hash1).not.toBe(hash2);
  });

  test('should handle empty string', () => {
    const hash = hashString('');
    expect(typeof hash).toBe('string');
  });

  test('should handle long strings', () => {
    const longString = 'a'.repeat(10000);
    const hash = hashString(longString);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  test('should handle special characters', () => {
    const hash = hashString('!@#$%^&*()');
    expect(typeof hash).toBe('string');
  });

  test('should handle unicode', () => {
    const hash = hashString('你好世界');
    expect(typeof hash).toBe('string');
  });
});

describe('truncateText', () => {
  test('should return original if shorter than max', () => {
    expect(truncateText('hello', 10)).toBe('hello');
  });

  test('should return original if equal to max', () => {
    expect(truncateText('hello', 5)).toBe('hello');
  });

  test('should truncate if longer than max', () => {
    const result = truncateText('hello world', 5);
    expect(result).toBe('hello...');
    expect(result.length).toBe(8); // 5 + '...'
  });

  test('should add ellipsis to truncated text', () => {
    const result = truncateText('hello world', 5);
    expect(result).toContain('...');
  });

  test('should handle null input', () => {
    expect(truncateText(null, 10)).toBe(null);
  });

  test('should handle undefined input', () => {
    expect(truncateText(undefined, 10)).toBe(undefined);
  });

  test('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  test('should truncate at exact position', () => {
    const result = truncateText('abcdefghij', 5);
    expect(result).toBe('abcde...');
  });

  test('should handle very long text', () => {
    const longText = 'a'.repeat(1000);
    const result = truncateText(longText, 10);
    expect(result).toBe('aaaaaaaaaa...');
  });
});

describe('isDarkMode', () => {
  beforeEach(() => {
    // Reset global.window before each test
    delete global.window;
  });

  test('should return true for "dark" mode', () => {
    expect(isDarkMode('dark')).toBe(true);
  });

  test('should return false for "light" mode', () => {
    expect(isDarkMode('light')).toBe(false);
  });

  test('should return false for "auto" when window is undefined', () => {
    expect(isDarkMode('auto')).toBe(false);
  });

  test('should return false when window.matchMedia is undefined', () => {
    global.window = {};
    expect(isDarkMode('auto')).toBe(false);
  });

  test('should use matchMedia for "auto" mode when available', () => {
    const matchMediaMock = jest.fn((query) => ({
      matches: query === '(prefers-color-scheme: dark)'
    }));

    global.window = {
      matchMedia: matchMediaMock
    };

    const result = isDarkMode('auto');

    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(result).toBe(true);
  });

  test('should detect light preference in auto mode', () => {
    global.window = {
      matchMedia: (_query) => ({
        matches: false
      })
    };

    expect(isDarkMode('auto')).toBe(false);
  });

  test('should handle other mode values', () => {
    expect(isDarkMode('invalid')).toBe(false);
    expect(isDarkMode('')).toBe(false);
    expect(isDarkMode(null)).toBe(false);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should return a function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    expect(typeof debounced).toBe('function');
  });

  test('should delay function execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should reset timer on subsequent calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(50);

    debounced(); // Reset timer
    jest.advanceTimersByTime(50);

    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should pass arguments to function', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2');
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
  });

  test('should only call function once for multiple rapid calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should use latest arguments', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('first');
    debounced('second');
    debounced('third');

    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  test('should handle different wait times', () => {
    const fn = jest.fn();
    const debounced1 = debounce(fn, 50);
    const debounced2 = debounce(fn, 200);

    debounced1();
    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(1);

    debounced2();
    jest.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('secureHash', () => {
  test('should return a string hash', async () => {
    const hash = await secureHash('hello');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  test('should return same hash for same input', async () => {
    const hash1 = await secureHash('hello');
    const hash2 = await secureHash('hello');
    expect(hash1).toBe(hash2);
  });

  test('should return different hashes for different inputs', async () => {
    const hash1 = await secureHash('hello');
    const hash2 = await secureHash('world');
    expect(hash1).not.toBe(hash2);
  });

  test('should handle empty string', async () => {
    const hash = await secureHash('');
    expect(typeof hash).toBe('string');
  });

  test('should handle unicode', async () => {
    const hash = await secureHash('你好世界');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('generateHMACKey', () => {
  test('should return null in Node.js environment', async () => {
    const key = await generateHMACKey();
    expect(key).toBeNull();
  });
});

describe('generateHMAC', () => {
  test('should return null with null key', async () => {
    const signature = await generateHMAC(null, 'test data');
    expect(signature).toBeNull();
  });

  test('should return null in Node.js environment', async () => {
    const signature = await generateHMAC({}, 'test data');
    expect(signature).toBeNull();
  });
});

describe('verifyHMAC', () => {
  test('should return false with null key', async () => {
    const result = await verifyHMAC(null, 'test data', 'signature');
    expect(result).toBe(false);
  });

  test('should return false with null signature', async () => {
    const result = await verifyHMAC({}, 'test data', null);
    expect(result).toBe(false);
  });

  test('should return false in Node.js environment', async () => {
    const result = await verifyHMAC({}, 'test data', 'abc123');
    expect(result).toBe(false);
  });
});
