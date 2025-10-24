/**
 * Translation cache using IndexedDB
 * Stores translations with TTL and LRU eviction
 * Non-singleton version for dependency injection
 * Includes HMAC integrity verification
 *
 * @module lib/translation/translation-cache
 */

import { CONFIG } from '../../shared/config.js';
import { secureHash, generateHMACKey, generateHMAC, verifyHMAC } from '../../shared/utils.js';

export class TranslationCache {
  constructor(logger) {
    this.logger = logger || console;
    this.db = null;
    this.ready = false;
    this.evictionInProgress = false;
    this.pendingEviction = false;
    this.hmacKey = null;
  }

  /**
   * Initialize the IndexedDB database
   * @returns {Promise<void>}
   */
  async init() {
    if (this.ready) {
      return;
    }

    await new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.cache.dbName, CONFIG.cache.dbVersion);

      request.onerror = () => {
        this.logger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        this.logger.info('Cache database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(CONFIG.cache.storeName)) {
          const store = db.createObjectStore(CONFIG.cache.storeName, {
            keyPath: 'hash',
          });

          store.createIndex('timestamp', 'timestamp', { unique: false });

          this.logger.info('Cache schema created');
        }
      };
    });

    this.hmacKey = await generateHMACKey();
    if (this.hmacKey) {
      this.logger.info('HMAC key generated for cache integrity verification');
    } else {
      this.logger.warn('HMAC key generation failed - cache integrity verification disabled');
    }
  }

  /**
   * Generate cache key from translation parameters using secure hash
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {string|null} context - Optional context
   * @returns {Promise<string>} Cache key (SHA-256 hash)
   */
  async generateKey(text, sourceLang, targetLang, context) {
    const data = `${text}|${sourceLang}|${targetLang}|${context || ''}`;
    return await secureHash(data);
  }

  /**
   * Get translation from cache
   * @param {string} key - Cache key
   * @returns {Promise<string|null>} Translation or null if not found/expired
   */
  async get(key) {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readonly');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.get(key);

      request.onsuccess = async () => {
        const entry = request.result;

        if (!entry) {
          this.logger.debug('Cache miss:', key);
          resolve(null);
          return;
        }

        const age = Date.now() - entry.timestamp;
        const maxAge = CONFIG.cache.ttlDays * 24 * 60 * 60 * 1000;

        if (age > maxAge) {
          this.logger.debug('Cache entry expired:', key);
          this.delete(key).catch((e) => this.logger.error('Failed to delete expired entry:', e));
          resolve(null);
          return;
        }

        if (entry.hmac && this.hmacKey) {
          const data = `${entry.text}|${entry.sourceLang}|${entry.targetLang}|${entry.translation}|${entry.context || ''}`;
          const isValid = await verifyHMAC(this.hmacKey, data, entry.hmac);

          if (!isValid) {
            this.logger.warn('Cache entry integrity verification failed - possible tampering detected:', key);
            this.delete(key).catch((e) => this.logger.error('Failed to delete tampered entry:', e));
            resolve(null);
            return;
          }

          this.logger.debug('Cache hit with verified integrity:', key);
        } else {
          this.logger.debug('Cache hit (no integrity check):', key);
        }

        resolve(entry.translation);
      };

      request.onerror = () => {
        this.logger.error('Cache get error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store translation in cache
   * @param {string} key - Cache key
   * @param {string} text - Original text
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {string} translation - Translated text
   * @param {string|null} context - Optional context
   * @returns {Promise<void>}
   */
  async set(key, text, sourceLang, targetLang, translation, context = null) {
    if (!this.ready) {
      await this.init();
    }

    const entry = {
      hash: key,
      text,
      sourceLang,
      targetLang,
      translation,
      context,
      timestamp: Date.now(),
    };

    if (this.hmacKey) {
      const data = `${text}|${sourceLang}|${targetLang}|${translation}|${context || ''}`;
      const hmac = await generateHMAC(this.hmacKey, data);
      if (hmac) {
        entry.hmac = hmac;
        this.logger.debug('Cache entry signed with HMAC');
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readwrite');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.put(entry);

      request.onsuccess = () => {
        this.logger.debug('Cache set:', key);
        this.enforceLimit().catch((e) => this.logger.error('Failed to enforce cache limit:', e));
        resolve();
      };

      request.onerror = () => {
        this.logger.error('Cache set error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readwrite');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readwrite');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this.logger.info('Cache cleared');
        resolve();
      };

      request.onerror = () => {
        this.logger.error('Cache clear error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get number of entries in cache
   * @returns {Promise<number>} Entry count
   */
  async getSize() {
    if (!this.ready) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readonly');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Enforce maximum cache size using LRU eviction
   * @returns {Promise<void>}
   */
  async enforceLimit() {
    if (this.evictionInProgress) {
      this.pendingEviction = true;
      return;
    }

    const size = await this.getSize();

    if (size <= CONFIG.cache.maxEntries) {
      return;
    }

    this.evictionInProgress = true;

    try {
      const toDelete = size - CONFIG.cache.maxEntries;
      this.logger.info(`Evicting ${toDelete} old cache entries (LRU)`);

      await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([CONFIG.cache.storeName], 'readwrite');
        const store = transaction.objectStore(CONFIG.cache.storeName);
        const index = store.index('timestamp');
        const request = index.openCursor();

        let deleted = 0;

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            this.logger.debug(`Evicted ${deleted} entries`);
            resolve();
          }
        };

        request.onerror = () => {
          this.logger.error('Cache eviction error:', request.error);
          reject(request.error);
        };
      });
    } finally {
      this.evictionInProgress = false;

      if (this.pendingEviction) {
        this.pendingEviction = false;
        Promise.resolve().then(() => this.enforceLimit());
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    const size = await this.getSize();

    return {
      size,
      maxEntries: CONFIG.cache.maxEntries,
      utilization: ((size / CONFIG.cache.maxEntries) * 100).toFixed(1) + '%',
    };
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.ready = false;
      this.logger.info('Cache database closed');
    }
  }
}
