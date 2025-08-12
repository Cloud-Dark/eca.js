// easycache.js
const EventEmitter = require('events');

class EasyCache extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 0, // 0 = no expiration
      checkInterval: options.checkInterval || 60000, // 60 seconds
      enableStats: options.enableStats !== false,
      ...options
    };
    
    this.cache = new Map();
    this.timers = new Map();
    this.accessOrder = new Map(); // untuk LRU
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Start cleanup interval
    if (this.options.checkInterval > 0) {
      this.cleanupInterval = setInterval(() => {
        this._cleanup();
      }, this.options.checkInterval);
    }
  }

  /**
   * Set cache value
   * @param {string} key - Cache key
   * @param {*} value - Cache value
   * @param {number} ttl - Time to live in milliseconds
   * @returns {boolean} Success status
   */
  set(key, value, ttl = null) {
    try {
      // Check if we need to evict items (LRU)
      if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
        this._evictLRU();
      }

      // Clear existing timer if exists
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }

      // Calculate TTL
      const effectiveTTL = ttl !== null ? ttl : this.options.defaultTTL;
      const expiresAt = effectiveTTL > 0 ? Date.now() + effectiveTTL : null;

      // Store value
      const cacheItem = {
        value,
        createdAt: Date.now(),
        expiresAt,
        accessCount: 0
      };

      this.cache.set(key, cacheItem);
      this.accessOrder.set(key, Date.now());

      // Set expiration timer if needed
      if (effectiveTTL > 0) {
        const timer = setTimeout(() => {
          this.delete(key);
          this.emit('expired', key, value);
        }, effectiveTTL);
        this.timers.set(key, timer);
      }

      if (this.options.enableStats) {
        this.stats.sets++;
      }

      this.emit('set', key, value);
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Get cache value
   * @param {string} key - Cache key
   * @returns {*} Cache value or undefined
   */
  get(key) {
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
        this.delete(key);
        if (this.options.enableStats) {
          this.stats.misses++;
        }
        return undefined;
      }

      // Update access info for LRU
      item.accessCount++;
      this.accessOrder.set(key, Date.now());

      if (this.options.enableStats) {
        this.stats.hits++;
      }

      this.emit('get', key, item.value);
      return item.value;
    } catch (error) {
      this.emit('error', error);
      return undefined;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cache item
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      const existed = this.cache.has(key);
      
      if (existed) {
        const item = this.cache.get(key);
        this.cache.delete(key);
        this.accessOrder.delete(key);
        
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }

        if (this.options.enableStats) {
          this.stats.deletes++;
        }

        this.emit('delete', key, item.value);
      }

      return existed;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      this.cache.clear();
      this.timers.clear();
      this.accessOrder.clear();
      
      this.emit('clear');
    } catch (error) {
      this.emit('error', error);
    }
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   * @returns {Array<string>}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
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
      evictions: 0
    };
  }

  /**
   * Get or set with function
   * @param {string} key - Cache key
   * @param {function} fn - Function to generate value if not exists
   * @param {number} ttl - Time to live
   * @returns {*} Cache value
   */
  async getOrSet(key, fn, ttl = null) {
    try {
      let value = this.get(key);
      
      if (value === undefined) {
        value = await fn();
        this.set(key, value, ttl);
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
  setMultiple(items, ttl = null) {
    for (const [key, value] of Object.entries(items)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Get multiple values
   * @param {Array<string>} keys - Array of keys
   * @returns {Object} Key-value pairs
   */
  getMultiple(keys) {
    const result = {};
    for (const key of keys) {
      const value = this.get(key);
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Delete multiple keys
   * @param {Array<string>} keys - Array of keys
   */
  deleteMultiple(keys) {
    for (const key of keys) {
      this.delete(key);
    }
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

    return true;
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
    }

    if (expiredKeys.length > 0) {
      this.emit('cleanup', expiredKeys.length);
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy() {
    this.clear();
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
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