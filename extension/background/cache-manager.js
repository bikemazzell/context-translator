/**
 * Translation cache using IndexedDB
 * Stores translations with TTL and LRU eviction
 *
 * @module background/cache-manager
 */

import { CONFIG } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import { hashString } from '../shared/utils.js';

export class CacheManager {
  constructor() {
    this.db = null;
    this.ready = false;
    this.evictionInProgress = false;
    this.pendingEviction = false;
  }

  /**
   * Initialize the IndexedDB database
   * @returns {Promise<void>}
   */
  async init() {
    if (this.ready) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.cache.dbName, CONFIG.cache.dbVersion);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        logger.info('Cache database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(CONFIG.cache.storeName)) {
          const store = db.createObjectStore(CONFIG.cache.storeName, {
            keyPath: 'hash'
          });

          // Create index on timestamp for TTL cleanup and LRU eviction
          store.createIndex('timestamp', 'timestamp', { unique: false });

          logger.info('Cache schema created');
        }
      };
    });
  }

  /**
   * Generate cache key from translation parameters
   * @param {string} text - Text to translate
   * @param {string} sourceLang - Source language
   * @param {string} targetLang - Target language
   * @param {string|null} context - Optional context
   * @returns {string} Cache key
   */
  generateKey(text, sourceLang, targetLang, context) {
    const data = `${text}|${sourceLang}|${targetLang}|${context || ''}`;
    return hashString(data);
  }

  /**
   * Get translation from cache
   * @param {string} key - Cache key
   * @returns {Promise<string|null>} Translation or null if not found/expired
   */
  async get(key) {
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readonly');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;

        if (!entry) {
          logger.debug('Cache miss:', key);
          resolve(null);
          return;
        }

        // Check TTL
        const age = Date.now() - entry.timestamp;
        const maxAge = CONFIG.cache.ttlDays * 24 * 60 * 60 * 1000;

        if (age > maxAge) {
          logger.debug('Cache entry expired:', key);
          // Don't wait for deletion
          this.delete(key).catch(e => logger.error('Failed to delete expired entry:', e));
          resolve(null);
        } else {
          logger.debug('Cache hit:', key);
          resolve(entry.translation);
        }
      };

      request.onerror = () => {
        logger.error('Cache get error:', request.error);
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
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const entry = {
        hash: key,
        text,
        sourceLang,
        targetLang,
        translation,
        context,
        timestamp: Date.now()
      };

      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readwrite');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.put(entry);

      request.onsuccess = () => {
        logger.debug('Cache set:', key);
        // Enforce size limit asynchronously
        this.enforceLimit().catch(e => logger.error('Failed to enforce cache limit:', e));
        resolve();
      };

      request.onerror = () => {
        logger.error('Cache set error:', request.error);
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
    if (!this.ready) await this.init();

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
    if (!this.ready) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([CONFIG.cache.storeName], 'readwrite');
      const store = transaction.objectStore(CONFIG.cache.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        logger.info('Cache cleared');
        resolve();
      };

      request.onerror = () => {
        logger.error('Cache clear error:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get number of entries in cache
   * @returns {Promise<number>} Entry count
   */
  async getSize() {
    if (!this.ready) await this.init();

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
      logger.info(`Evicting ${toDelete} old cache entries (LRU)`);

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
            logger.debug(`Evicted ${deleted} entries`);
            resolve();
          }
        };

        request.onerror = () => {
          logger.error('Cache eviction error:', request.error);
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
      utilization: (size / CONFIG.cache.maxEntries * 100).toFixed(1) + '%'
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
      logger.info('Cache database closed');
    }
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();
