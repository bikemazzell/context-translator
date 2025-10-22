/**
 * Tests for rate limiter module
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { RateLimiter } from '../shared/rate-limiter.js';

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should create with default values', () => {
      limiter = new RateLimiter();
      expect(limiter.maxRequests).toBe(10);
      expect(limiter.windowMs).toBe(60000);
      expect(limiter.requests).toEqual([]);
    });

    test('should create with custom values', () => {
      limiter = new RateLimiter(5, 30000);
      expect(limiter.maxRequests).toBe(5);
      expect(limiter.windowMs).toBe(30000);
      expect(limiter.requests).toEqual([]);
    });
  });

  describe('acquire', () => {
    test('should allow requests under limit', async () => {
      limiter = new RateLimiter(3, 1000);

      await expect(limiter.acquire()).resolves.not.toThrow();
      await expect(limiter.acquire()).resolves.not.toThrow();
      await expect(limiter.acquire()).resolves.not.toThrow();

      expect(limiter.getCount()).toBe(3);
    });

    test('should reject requests over limit', async () => {
      limiter = new RateLimiter(2, 1000);

      await limiter.acquire();
      await limiter.acquire();

      await expect(limiter.acquire()).rejects.toThrow('Rate limit exceeded');
      await expect(limiter.acquire()).rejects.toThrow('2 requests per 1s');
    });

    test('should include wait time in error message', async () => {
      limiter = new RateLimiter(1, 10000);

      await limiter.acquire();

      try {
        await limiter.acquire();
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toMatch(/Please wait \d+ seconds/);
      }
    });

    test('should clean up old requests', async () => {
      limiter = new RateLimiter(2, 100); // 100ms window

      await limiter.acquire();
      expect(limiter.getCount()).toBe(1);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      await limiter.acquire();
      expect(limiter.getCount()).toBe(1); // Old request cleaned up
    });

    test('should handle rapid successive calls', async () => {
      limiter = new RateLimiter(5, 1000);

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(limiter.acquire());
      }

      await Promise.all(promises);
      expect(limiter.getCount()).toBe(5);

      await expect(limiter.acquire()).rejects.toThrow();
    });

    test('should allow requests after window expires', async () => {
      limiter = new RateLimiter(2, 100);

      await limiter.acquire();
      await limiter.acquire();

      await expect(limiter.acquire()).rejects.toThrow();

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      await expect(limiter.acquire()).resolves.not.toThrow();
      expect(limiter.getCount()).toBe(1);
    });
  });

  describe('reset', () => {
    test('should clear all requests', async () => {
      limiter = new RateLimiter(3, 1000);

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.getCount()).toBe(3);

      limiter.reset();

      expect(limiter.getCount()).toBe(0);
      expect(limiter.requests).toEqual([]);
    });

    test('should allow new requests after reset', async () => {
      limiter = new RateLimiter(2, 1000);

      await limiter.acquire();
      await limiter.acquire();

      await expect(limiter.acquire()).rejects.toThrow();

      limiter.reset();

      await expect(limiter.acquire()).resolves.not.toThrow();
      await expect(limiter.acquire()).resolves.not.toThrow();
      expect(limiter.getCount()).toBe(2);
    });
  });

  describe('getCount', () => {
    test('should return 0 when no requests', () => {
      limiter = new RateLimiter(10, 1000);
      expect(limiter.getCount()).toBe(0);
    });

    test('should return correct count', async () => {
      limiter = new RateLimiter(10, 1000);

      await limiter.acquire();
      expect(limiter.getCount()).toBe(1);

      await limiter.acquire();
      expect(limiter.getCount()).toBe(2);

      await limiter.acquire();
      expect(limiter.getCount()).toBe(3);
    });

    test('should exclude expired requests', async () => {
      limiter = new RateLimiter(10, 100);

      await limiter.acquire();
      await limiter.acquire();
      expect(limiter.getCount()).toBe(2);

      // Wait for requests to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(limiter.getCount()).toBe(0);
    });

    test('should handle mixed expired and active requests', async () => {
      limiter = new RateLimiter(10, 100);

      await limiter.acquire();

      // Wait 75ms (request still active)
      await new Promise(resolve => setTimeout(resolve, 75));

      await limiter.acquire();
      expect(limiter.getCount()).toBe(2);

      // Wait another 50ms (first request expired, second still active)
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(limiter.getCount()).toBe(1);
    });
  });

  describe('edge cases', () => {
    test('should handle limit of 1', async () => {
      limiter = new RateLimiter(1, 1000);

      await limiter.acquire();
      await expect(limiter.acquire()).rejects.toThrow();
    });

    test('should handle very short window', async () => {
      limiter = new RateLimiter(3, 50);

      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      await expect(limiter.acquire()).rejects.toThrow();

      await new Promise(resolve => setTimeout(resolve, 75));

      await expect(limiter.acquire()).resolves.not.toThrow();
    });

    test('should handle very large window', async () => {
      limiter = new RateLimiter(100, 3600000); // 1 hour

      for (let i = 0; i < 100; i++) {
        await limiter.acquire();
      }

      expect(limiter.getCount()).toBe(100);
      await expect(limiter.acquire()).rejects.toThrow();
    });

    test('should maintain separate state per instance', async () => {
      const limiter1 = new RateLimiter(2, 1000);
      const limiter2 = new RateLimiter(2, 1000);

      await limiter1.acquire();
      await limiter1.acquire();

      // limiter1 is full
      await expect(limiter1.acquire()).rejects.toThrow();

      // limiter2 is independent
      await expect(limiter2.acquire()).resolves.not.toThrow();
      expect(limiter2.getCount()).toBe(1);
    });
  });

  describe('concurrent access', () => {
    test('should handle concurrent acquire attempts', async () => {
      limiter = new RateLimiter(10, 1000);

      const promises = Array(15).fill(null).map(() =>
        limiter.acquire().catch(e => e)
      );

      const results = await Promise.all(promises);

      const successes = results.filter(r => !(r instanceof Error));
      const failures = results.filter(r => r instanceof Error);

      expect(successes.length).toBe(10);
      expect(failures.length).toBe(5);
      expect(limiter.getCount()).toBe(10);
    });

    test('should properly filter old requests during concurrent access', async () => {
      limiter = new RateLimiter(5, 100);

      // Fill up the limiter
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.getCount()).toBe(5);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Try multiple concurrent requests
      const promises = Array(3).fill(null).map(() => limiter.acquire());
      await Promise.all(promises);

      expect(limiter.getCount()).toBe(3);
    });
  });
});
