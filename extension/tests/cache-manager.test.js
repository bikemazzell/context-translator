/**
 * Tests for cache manager module
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TranslationCache as CacheManager } from '../lib/translation/translation-cache.js';
import { logger } from '../shared/logger.js';
import { CONFIG } from '../shared/config.js';

describe('CacheManager', () => {
  let manager;
  let mockDb;
  let mockStore;
  let mockTransaction;
  let mockObjectStores;

  beforeEach(() => {
    // Create a fresh mock IndexedDB for each test
    mockObjectStores = new Map();

    mockStore = {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      count: jest.fn(),
      createIndex: jest.fn(),
      index: jest.fn(),
      openCursor: jest.fn()
    };

    mockTransaction = {
      objectStore: jest.fn(() => mockStore)
    };

    mockDb = {
      transaction: jest.fn(() => mockTransaction),
      createObjectStore: jest.fn((name) => {
        mockObjectStores.set(name, mockStore);
        return mockStore;
      }),
      objectStoreNames: {
        contains: jest.fn(() => false)
      },
      close: jest.fn()
    };

    global.indexedDB = {
      open: jest.fn(() => {
        const request = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: mockDb,
          error: null
        };

        // Simulate async behavior
        Promise.resolve().then(() => {
          if (request.onupgradeneeded) {
            request.onupgradeneeded({ target: { result: mockDb } });
          }
          if (request.onsuccess) {
            request.onsuccess();
          }
        });

        return request;
      })
    };

    manager = new CacheManager(logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(manager.db).toBeNull();
      expect(manager.ready).toBe(false);
      expect(manager.evictionInProgress).toBe(false);
      expect(manager.pendingEviction).toBe(false);
    });
  });

  describe('init', () => {
    test('should initialize IndexedDB', async () => {
      await manager.init();

      expect(global.indexedDB.open).toHaveBeenCalledWith(
        CONFIG.cache.dbName,
        CONFIG.cache.dbVersion
      );
      expect(manager.ready).toBe(true);
      expect(manager.db).toBe(mockDb);
    });

    test('should not reinitialize if already ready', async () => {
      await manager.init();
      const firstDb = manager.db;

      global.indexedDB.open.mockClear();
      await manager.init();

      expect(global.indexedDB.open).not.toHaveBeenCalled();
      expect(manager.db).toBe(firstDb);
    });

    test('should create object store on upgrade', async () => {
      await manager.init();

      expect(mockDb.createObjectStore).toHaveBeenCalledWith(
        CONFIG.cache.storeName,
        { keyPath: 'hash' }
      );
      expect(mockStore.createIndex).toHaveBeenCalledWith(
        'timestamp',
        'timestamp',
        { unique: false }
      );
    });

    test('should handle initialization errors', async () => {
      global.indexedDB.open = jest.fn(() => {
        const request = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: null,
          error: new Error('DB init failed')
        };

        Promise.resolve().then(() => {
          if (request.onerror) {
            request.onerror();
          }
        });

        return request;
      });

      await expect(manager.init()).rejects.toThrow('DB init failed');
      expect(manager.ready).toBe(false);
    });
  });

  describe('generateKey', () => {
    test('should generate key from parameters', async () => {
      const key = await manager.generateKey('hello', 'en', 'es', 'greeting');

      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);

      // Verify same inputs produce same key
      const key2 = await manager.generateKey('hello', 'en', 'es', 'greeting');
      expect(key).toBe(key2);
    });

    test('should handle null context', async () => {
      const key = await manager.generateKey('hello', 'en', 'es', null);

      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    test('should generate same key for same inputs', async () => {
      const key1 = await manager.generateKey('hello', 'en', 'es', 'greeting');
      const key2 = await manager.generateKey('hello', 'en', 'es', 'greeting');

      expect(key1).toBe(key2);
    });

    test('should generate different keys for different inputs', async () => {
      const key1 = await manager.generateKey('hello', 'en', 'es', null);
      const key2 = await manager.generateKey('goodbye', 'en', 'es', null);

      expect(key1).not.toBe(key2);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should return cached translation', async () => {
      const entry = {
        hash: 'test-key',
        translation: 'hola',
        timestamp: Date.now()
      };

      mockStore.get.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.result = entry;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      const result = await manager.get('test-key');

      expect(result).toBe('hola');
      expect(mockStore.get).toHaveBeenCalledWith('test-key');
    });

    test('should return null for cache miss', async () => {
      mockStore.get.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.result = null;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      const result = await manager.get('missing-key');

      expect(result).toBeNull();
    });

    test('should return null for expired entries', async () => {
      const oldTimestamp = Date.now() - (CONFIG.cache.ttlDays + 1) * 24 * 60 * 60 * 1000;
      const entry = {
        hash: 'test-key',
        translation: 'hola',
        timestamp: oldTimestamp
      };

      mockStore.get.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.result = entry;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      // Mock delete to not throw
      jest.spyOn(manager, 'delete').mockResolvedValue();

      const result = await manager.get('test-key');

      expect(result).toBeNull();
      expect(manager.delete).toHaveBeenCalledWith('test-key');
    });

    test('should not expire fresh entries', async () => {
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      const entry = {
        hash: 'test-key',
        translation: 'hola',
        timestamp: recentTimestamp
      };

      mockStore.get.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.result = entry;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      const result = await manager.get('test-key');

      expect(result).toBe('hola');
    });

    test('should handle get errors', async () => {
      mockStore.get.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.error = new Error('Get failed');
          if (request.onerror) {request.onerror();}
        });
        return request;
      });

      await expect(manager.get('test-key')).rejects.toThrow('Get failed');
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should store translation in cache', async () => {
      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      jest.spyOn(manager, 'enforceLimit').mockResolvedValue();

      await manager.set('test-key', 'hello', 'en', 'es', 'hola', 'greeting');

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          hash: 'test-key',
          text: 'hello',
          sourceLang: 'en',
          targetLang: 'es',
          translation: 'hola',
          context: 'greeting',
          timestamp: expect.any(Number)
        })
      );
    });

    test('should enforce limit after set', async () => {
      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      jest.spyOn(manager, 'enforceLimit').mockResolvedValue();

      await manager.set('test-key', 'hello', 'en', 'es', 'hola');

      expect(manager.enforceLimit).toHaveBeenCalled();
    });

    test('should handle set errors', async () => {
      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null, error: null };
        Promise.resolve().then(() => {
          request.error = new Error('Put failed');
          if (request.onerror) {request.onerror();}
        });
        return request;
      });

      await expect(
        manager.set('test-key', 'hello', 'en', 'es', 'hola')
      ).rejects.toThrow('Put failed');
    });

    test('should handle null context', async () => {
      mockStore.put.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      jest.spyOn(manager, 'enforceLimit').mockResolvedValue();

      await manager.set('test-key', 'hello', 'en', 'es', 'hola', null);

      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          context: null
        })
      );
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should delete entry from cache', async () => {
      mockStore.delete.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      await manager.delete('test-key');

      expect(mockStore.delete).toHaveBeenCalledWith('test-key');
    });

    test('should handle delete errors', async () => {
      mockStore.delete.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null, error: null };
        Promise.resolve().then(() => {
          request.error = new Error('Delete failed');
          if (request.onerror) {request.onerror();}
        });
        return request;
      });

      await expect(manager.delete('test-key')).rejects.toThrow('Delete failed');
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should clear all entries', async () => {
      mockStore.clear.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      await manager.clear();

      expect(mockStore.clear).toHaveBeenCalled();
    });

    test('should handle clear errors', async () => {
      mockStore.clear.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null, error: null };
        Promise.resolve().then(() => {
          request.error = new Error('Clear failed');
          if (request.onerror) {request.onerror();}
        });
        return request;
      });

      await expect(manager.clear()).rejects.toThrow('Clear failed');
    });
  });

  describe('getSize', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should return cache size', async () => {
      mockStore.count.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.result = 42;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      const size = await manager.getSize();

      expect(size).toBe(42);
      expect(mockStore.count).toHaveBeenCalled();
    });

    test('should handle count errors', async () => {
      mockStore.count.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.error = new Error('Count failed');
          if (request.onerror) {request.onerror();}
        });
        return request;
      });

      await expect(manager.getSize()).rejects.toThrow('Count failed');
    });
  });

  describe('enforceLimit', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should not evict when under limit', async () => {
      jest.spyOn(manager, 'getSize').mockResolvedValue(100);

      await manager.enforceLimit();

      expect(mockStore.index).not.toHaveBeenCalled();
    });

    test('should initiate eviction when over limit', async () => {
      jest.spyOn(manager, 'getSize').mockResolvedValue(CONFIG.cache.maxEntries + 10);

      let resolved = false;
      mockStore.index.mockReturnValue({
        openCursor: jest.fn(() => {
          const request = { onsuccess: null, onerror: null };

          Promise.resolve().then(() => {
            if (request.onsuccess && !resolved) {
              resolved = true;
              request.onsuccess({ target: { result: null } });
            }
          });

          return request;
        })
      });

      await manager.enforceLimit();

      expect(mockStore.index).toHaveBeenCalledWith('timestamp');
      expect(mockStore.index().openCursor).toHaveBeenCalled();
    });

    test('should prevent concurrent eviction', async () => {
      jest.spyOn(manager, 'getSize').mockResolvedValue(CONFIG.cache.maxEntries + 10);

      manager.evictionInProgress = true;

      await manager.enforceLimit();

      expect(manager.pendingEviction).toBe(true);
      expect(mockStore.index).not.toHaveBeenCalled();
    });

    test('should handle eviction errors', async () => {
      jest.spyOn(manager, 'getSize').mockResolvedValue(CONFIG.cache.maxEntries + 10);

      mockStore.index.mockReturnValue({
        openCursor: jest.fn(() => {
          const request = { onsuccess: null, onerror: null, error: null };
          Promise.resolve().then(() => {
            request.error = new Error('Eviction failed');
            if (request.onerror) {request.onerror();}
          });
          return request;
        })
      });

      await expect(manager.enforceLimit()).rejects.toThrow('Eviction failed');
      expect(manager.evictionInProgress).toBe(false);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should return cache statistics', async () => {
      jest.spyOn(manager, 'getSize').mockResolvedValue(5000);

      const stats = await manager.getStats();

      expect(stats).toEqual({
        size: 5000,
        maxEntries: CONFIG.cache.maxEntries,
        utilization: '50.0%'
      });
    });

    test('should calculate utilization correctly', async () => {
      jest.spyOn(manager, 'getSize').mockResolvedValue(7500);

      const stats = await manager.getStats();

      expect(stats.utilization).toBe('75.0%');
    });
  });

  describe('close', () => {
    test('should close database connection', async () => {
      await manager.init();

      await manager.close();

      expect(mockDb.close).toHaveBeenCalled();
      expect(manager.db).toBeNull();
      expect(manager.ready).toBe(false);
    });

    test('should handle close when not initialized', async () => {
      await manager.close();

      expect(manager.db).toBeNull();
      expect(manager.ready).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(async () => {
      await manager.init();
    });

    test('should handle full lifecycle: set, get, delete', async () => {
      // Setup mocks
      let storedEntry = null;

      mockStore.put.mockImplementation((entry) => {
        const request = { onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          storedEntry = entry;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      mockStore.get.mockImplementation(() => {
        const request = { result: null, error: null, onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          request.result = storedEntry;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      mockStore.delete.mockImplementation(() => {
        const request = { onsuccess: null, onerror: null };
        Promise.resolve().then(() => {
          storedEntry = null;
          if (request.onsuccess) {request.onsuccess();}
        });
        return request;
      });

      jest.spyOn(manager, 'enforceLimit').mockResolvedValue();

      // Set
      await manager.set('key1', 'hello', 'en', 'es', 'hola');
      expect(storedEntry).not.toBeNull();

      // Get
      const result = await manager.get('key1');
      expect(result).toBe('hola');

      // Delete
      await manager.delete('key1');
      expect(storedEntry).toBeNull();
    });
  });
});
