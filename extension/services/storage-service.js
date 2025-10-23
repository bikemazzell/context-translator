/**
 * Storage Service
 * Wraps browser.storage API with injectable interface
 */

export class StorageService {
  /**
   * @param {Object} browserStorage - Browser storage API (browser.storage)
   */
  constructor(browserStorage) {
    if (!browserStorage || !browserStorage.local) {
      throw new Error('Browser storage is required');
    }

    this.storage = browserStorage.local;
  }

  /**
   * Get value(s) from storage
   * @param {string|string[]|null} keys - Key(s) to retrieve
   * @returns {Promise<any>} Stored value(s)
   */
  async get(keys) {
    const result = await this.storage.get(keys);

    // If single key, return just that value
    if (typeof keys === 'string') {
      return result[keys];
    }

    // If multiple keys or null, return entire result object
    return result;
  }

  /**
   * Set value(s) in storage
   * @param {string|Object} keyOrObject - Key or object with key-value pairs
   * @param {any} value - Value to store (if key is string)
   * @returns {Promise<void>}
   */
  async set(keyOrObject, value) {
    let items;

    if (typeof keyOrObject === 'string') {
      items = { [keyOrObject]: value };
    } else {
      items = keyOrObject;
    }

    await this.storage.set(items);
  }

  /**
   * Get settings object
   * @returns {Promise<Object|null>} Settings object or null
   */
  async getSettings() {
    const result = await this.get('settings');
    return result || null;
  }

  /**
   * Set settings object
   * @param {Object} settings - Settings object
   * @returns {Promise<void>}
   */
  async setSettings(settings) {
    await this.set('settings', settings);
  }
}
