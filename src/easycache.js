
// src/easycache.js
const EventEmitter = require('events');
const { MemoryAdapter, FileAdapter, JsonAdapter, RedisAdapter, PostgreSQLAdapter } = require('./adapters');

class EasyCache extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 0, // 0 = no expiration
      slidingTTL: options.slidingTTL || false, // Extend TTL on access
      checkInterval: options.checkInterval || 60000, // 60 seconds
      enableStats: options.enableStats !== false,
      storage: options.storage || 'memory',
      storageOptions: options.storageOptions || {},
      serialize: options.serialize || JSON.stringify,
      deserialize: options.deserialize || JSON.parse,
      maxEntriesPerTag: options.maxEntriesPerTag || {},
      ...options
    };
    
    // Initialize storage adapter
    this._initializeStorage();
    
    this.cache = new Map(); // Memory layer for TTL and metadata
    this.timers = new Map();
    this.accessOrder = new Map(); // for LRU
    this.tagsMap = new Map(); // Map to store tags and their associated keys
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalAccesses: 0,
      totalExpired: 0
    };
    
    // Start cleanup interval
    if (this.options.checkInterval > 0) {
      this.cleanupInterval = setInterval(() => {
        this._cleanup();
      }, this.options.checkInterval);
    }
  }

  _initializeStorage() {
    const { storage, storageOptions } = this.options;
    
    switch (storage.toLowerCase()) {
      case 'memory':
        this.storage = new MemoryAdapter(storageOptions);
        break;
      case 'file':
        this.storage = new FileAdapter(storageOptions);
        break;
      case 'json':
        this.storage = new JsonAdapter(storageOptions);
        break;
      case 'redis':
        this.storage = new RedisAdapter(storageOptions);
        break;
      case 'postgresql':
      case 'postgres':
        this.storage = new PostgreSQLAdapter(storageOptions);
        break;
      default:
        if (typeof storage === 'object' && storage.get && storage.set) {
          // Custom adapter
          this.storage = storage;
        } else {
          throw new Error(`Unsupported storage type: ${storage}`);
        }
    }
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Cache value
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} Success status
   */
  async set(key, value, ttl = null, tags = [], condition = null) {
    try {
      // If a condition function is provided, evaluate it
      if (typeof condition === 'function' && !condition(key, value)) {
        return false; // Do not cache if condition is false
      }

      // If item already exists, remove its old tags from tagsMap
      const existingItem = this.cache.get(key);
      if (existingItem && existingItem.tags && existingItem.tags.length > 0) {
        for (const tag of existingItem.tags) {
          const keysForTag = this.tagsMap.get(tag);
          if (keysForTag) {
            keysForTag.delete(key);
            if (keysForTag.size === 0) {
              this.tagsMap.delete(tag);
            }
          }
        }
      }

      // Check if we need to evict items (LRU)
      if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
        await this._evictLRU();
      }

      // Clear existing timer if exists
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }

      // Calculate TTL
      const effectiveTTL = ttl !== null ? ttl : this.options.defaultTTL;
      const expiresAt = effectiveTTL > 0 ? Date.now() + effectiveTTL : null;

      // Store value in external storage
      await this.storage.set(key, this.options.serialize(value));

      // Store metadata in memory
      const cacheItem = {
        createdAt: Date.now(),
        expiresAt,
        accessCount: 0,
        tags: Array.isArray(tags) ? tags : [] // Ensure tags is an array
      };

      this.cache.set(key, cacheItem);
      this.accessOrder.set(key, Date.now());

      // Update tagsMap
      for (const tag of cacheItem.tags) {
        if (!this.tagsMap.has(tag)) {
          this.tagsMap.set(tag, new Set());
        }
        this.tagsMap.get(tag).add(key);

        // Enforce maxEntriesPerTag limit
        const maxEntries = this.options.maxEntriesPerTag[tag];
        if (maxEntries && this.tagsMap.get(tag).size > maxEntries) {
          // Evict LRU item within this tag
          let oldestTaggedKey = null;
          let oldestTaggedTime = Infinity;

          for (const taggedKey of this.tagsMap.get(tag)) {
            const item = this.cache.get(taggedKey);
            if (item && this.accessOrder.has(taggedKey) && this.accessOrder.get(taggedKey) < oldestTaggedTime) {
              oldestTaggedTime = this.accessOrder.get(taggedKey);
              oldestTaggedKey = taggedKey;
            }
          }

          if (oldestTaggedKey) {
            await this.delete(oldestTaggedKey);
            if (this.options.enableStats) {
              this.stats.evictions++;
            }
            this.emit('evicted', oldestTaggedKey, null); // Value is null as it's already deleted
          }
        }
      }

      // Set expiration timer if needed
      if (effectiveTTL > 0) {
        const timer = setTimeout(async () => {
          await this.delete(key);
          if (this.options.enableStats) {
            this.stats.totalExpired++;
          }
          this.emit('expired', key, value);
        }, effectiveTTL);
        this.timers.set(key, timer);
      }

      if (this.options.enableStats) {
        this.stats.sets++;
      }

      this.emit('set', key, value);
      return this;
    } catch (error) {
      this.emit('error', error);
      return this;
    }
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {*} Cache value or undefined
   */
  async get(key) {
    if (this.options.enableStats) {
      this.stats.totalAccesses++;
    }
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        if (this.options.enableStats) {
          this.stats.misses++;
        }
        return undefined;
      }

      // Check if expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        await this.delete(key);
        if (this.options.enableStats) {
          this.stats.misses++;
        }
        return undefined;
      }

      // Get value from storage
      let value = await this.storage.get(key);
      if (value !== undefined) {
        value = this.options.deserialize(value);
      }
      if (value === undefined) {
        // Storage inconsistency, remove from memory cache
        this.cache.delete(key);
        this.accessOrder.delete(key);
        if (this.options.enableStats) {
          this.stats.misses++;
        }
        return undefined;
      }

      // Update access info for LRU
      item.accessCount++;
      this.accessOrder.set(key, Date.now());

      // If sliding TTL is enabled, extend the TTL on access
      if (this.options.slidingTTL && item.expiresAt) {
        const currentTTL = item.expiresAt - item.createdAt;
        item.expiresAt = Date.now() + currentTTL;
        
        // Clear and reset the timer
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
        }
        const timer = setTimeout(async () => {
          await this.delete(key);
          this.emit('expired', key, value);
        }, currentTTL);
        this.timers.set(key, timer);
      }

      if (this.options.enableStats) {
        this.stats.hits++;
      }

      this.emit('get', key, value);
      return value;
    } catch (error) {
      this.emit('error', error);
      if (this.options.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  async has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      await this.delete(key);
      return false;
    }
    
    // Double check with storage
    try {
      const hasInStorage = await this.storage.has(key);
      if (!hasInStorage) {
        // Storage inconsistency, remove from memory
        this.cache.delete(key);
        this.accessOrder.delete(key);
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete cache item
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  async delete(key) {
    try {
      const existed = this.cache.has(key);
      let value = null;
      
      if (existed) {
        const item = this.cache.get(key); // Define item here
        // Get value before deleting for event
        try {
          value = await this.storage.get(key);
        } catch (error) {
          // Ignore error when getting value for event
        }
        
        // Remove from storage
        await this.storage.delete(key);
        
        // Remove from memory
        this.cache.delete(key);
        this.accessOrder.delete(key);
        
        // Remove from tagsMap
        if (item.tags && item.tags.length > 0) {
          for (const tag of item.tags) {
            const keysForTag = this.tagsMap.get(tag);
            if (keysForTag) {
              keysForTag.delete(key);
              if (keysForTag.size === 0) {
                this.tagsMap.delete(tag);
              }
            }
          }
        }
        
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }

        if (this.options.enableStats) {
          this.stats.deletes++;
        }

        this.emit('delete', key, value);
      }

      return this;
    } catch (error) {
      this.emit('error', error);
      return this;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      // Clear storage
      await this.storage.clear();
      
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      // Clear memory structures
      this.cache.clear();
      this.timers.clear();
      this.accessOrder.clear();
      
      this.emit('clear');
      return this;
    } catch (error) {
      this.emit('error', error);
      return this;
    }
  }

  /**
   * Get cache size
   * @returns {number}
   */
  async size() {
    try {
      return await this.storage.size();
    } catch (error) {
      return this.cache.size;
    }
  }

  /**
   * Get all cache keys
   * @returns {Array<string>}
   */
  async keys() {
    try {
      return await this.storage.keys();
    } catch (error) {
      return Array.from(this.cache.keys());
    }
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      totalAccesses: this.stats.totalAccesses,
      totalExpired: this.stats.totalExpired
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      totalAccesses: 0,
      totalExpired: 0
    };
    return this;
  }

  /**
   * Get or set with function
   * @param {string} key - Cache key
   * @param {function} fn - Function to generate value if not exists
   * @param {number} ttl - Time to live
   * @param {Object} loaderOptions - Options to pass to the loader function
   * @returns {*} Cache value
   */
  async getOrSet(key, fn, ttl = null, loaderOptions = {}) {
    try {
      let value = await this.get(key);
      
      if (value === undefined) {
        value = await fn(loaderOptions);
        await this.set(key, value, ttl);
      }
      
      return value;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Set multiple values
   * @param {Object} items - Key-value pairs
   * @param {number} ttl - Time to live
   */
  async setMultiple(items, ttl = null) {
    const promises = Object.entries(items).map(([key, value]) => 
      this.set(key, value, ttl)
    );
    await Promise.all(promises);
    return this;
  }

  /**
   * Get multiple values
   * @param {Array<string>} keys - Array of keys
   * @returns {Object} Key-value pairs
   */
  async getMultiple(keys) {
    const result = {};
    const promises = keys.map(async (key) => {
      const value = await this.get(key);
      if (value !== undefined) {
        result[key] = value;
      }
    });
    
    await Promise.all(promises);
    return result;
  }

  /**
   * Delete multiple keys
   * @param {Array<string>} keys - Array of keys
   */
  async deleteMultiple(keys) {
    const promises = keys.map(key => this.delete(key));
    await Promise.all(promises);
    return this;
  }

  /**
   * Set cache value with associated tags
   * @param {string} key - Cache key
   * @param {*} value - Cache value
   * @param {number} ttl - Time to live in milliseconds
   * @param {Array<string>} tags - Array of tags for the cache item
   * @returns {boolean} Success status
   */
  async setWithTags(key, value, ttl = null, tags = []) {
    await this.set(key, value, ttl, tags);
    return this;
  }

  /**
   * Get all cache items associated with a specific tag
   * @param {string} tag - The tag to retrieve items for
   * @returns {Object} An object containing key-value pairs for the tag
   */
  async getByTag(tag) {
    const keysForTag = this.tagsMap.get(tag);
    if (!keysForTag) {
      return {};
    }
    const result = {};
    for (const key of keysForTag) {
      const value = await this.get(key);
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Delete all cache items associated with a specific tag
   * @param {string} tag - The tag to delete items for
   * @returns {boolean} True if any items were deleted, false otherwise
   */
  async deleteByTag(tag) {
    const keysForTag = this.tagsMap.get(tag);
    if (!keysForTag) {
      return false;
    }
    const keysToDelete = Array.from(keysForTag);
    await this.deleteMultiple(keysToDelete);
    return keysToDelete.length > 0;
  }

  /**
   * Clear all cache items associated with a specific tag
   * @param {string} tag - The tag to clear items for
   * @returns {boolean} True if any items were cleared, false otherwise
   */
  async clearByTag(tag) {
    return this.deleteByTag(tag);
  }

  /**
   * Preload specific keys into the cache.
   * @param {Array<string>} keys - Array of keys to preload.
   * @param {function} loaderFn - Function to generate value if not exists (same as getOrSet's fn).
   * @param {number} ttl - Time to live for preloaded items.
   * @param {Object} loaderOptions - Options to pass to the loader function.
   * @returns {Promise<void>} A promise that resolves when all keys are preloaded.
   */
  async preload(keys, loaderFn, ttl = null, loaderOptions = {}) {
    const promises = keys.map(key => this.getOrSet(key, loaderFn, ttl, loaderOptions));
    await Promise.all(promises);
    return this;
  }

  /**
   * Get cache info for a specific key
   * @param {string} key - Cache key
   * @returns {Object|null} Cache item info
   */
  getInfo(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    return {
      key,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
      accessCount: item.accessCount,
      tags: item.tags || [],
      isExpired: item.expiresAt ? Date.now() > item.expiresAt : false,
      ttl: item.expiresAt ? Math.max(0, item.expiresAt - Date.now()) : null
    };
  }

  /**
   * Extend TTL for a key
   * @param {string} key - Cache key
   * @param {number} ttl - New TTL in milliseconds
   * @returns {boolean} Success status
   */
  touch(key, ttl) {
    const item = this.cache.get(key);
    if (!item) return false;

    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    // Set new expiration
    item.expiresAt = ttl > 0 ? Date.now() + ttl : null;

    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
        this.emit('expired', key, item.value);
      }, ttl);
      this.timers.set(key, timer);
    }

    return this;
  }

  /**
   * Private: Evict least recently used item
   */
  _evictLRU() {
    if (this.accessOrder.size === 0) return;

    // Find oldest accessed key
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const item = this.cache.get(oldestKey);
      this.delete(oldestKey);
      this.stats.evictions++;
      this.emit('evicted', oldestKey, item?.value);
    }
  }

  /**
   * Private: Cleanup expired items
   */
  _cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
      if (this.options.enableStats) {
        this.stats.totalExpired++;
      }
    }

    if (expiredKeys.length > 0) {
      this.emit('cleanup', expiredKeys.length);
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  async destroy() {
    await this.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Disconnect from persistent storage if applicable
    if (typeof this.storage.disconnect === 'function') {
      await this.storage.disconnect();
    }
    
    this.removeAllListeners();
  }
}

// Export utility functions
EasyCache.utils = {
  /**
   * Convert time string to milliseconds
   * @param {string} timeStr - Time string (e.g., '1h', '30m', '5s')
   * @returns {number} Milliseconds
   */
  parseTime(timeStr) {
    const units = {
      ms: 1,
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };

    const match = timeStr.match(/^(\d+)([a-z]+)$/i);
    if (!match) throw new Error('Invalid time format');

    const [, value, unit] = match;
    const multiplier = units[unit.toLowerCase()];
    if (!multiplier) throw new Error('Invalid time unit');

    return parseInt(value) * multiplier;
  },

  /**
   * Format bytes to human readable
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(2)} ${units[i]}`;
  }
};

module.exports = EasyCache;
