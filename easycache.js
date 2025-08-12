// easycache.js
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

// Storage Adapters
class MemoryAdapter {
  constructor() {
    this.store = new Map();
  }
  
  async get(key) {
    return this.store.get(key);
  }
  
  async set(key, value) {
    this.store.set(key, value);
    return true;
  }
  
  async delete(key) {
    return this.store.delete(key);
  }
  
  async clear() {
    this.store.clear();
    return true;
  }
  
  async keys() {
    return Array.from(this.store.keys());
  }
  
  async size() {
    return this.store.size;
  }
  
  async has(key) {
    return this.store.has(key);
  }
}

class FileAdapter {
  constructor(options = {}) {
    this.filePath = options.filePath || './cache.dat';
    this.encoding = options.encoding || 'utf8';
    this.store = new Map();
    this._loadFromFile();
  }
  
  async _loadFromFile() {
    try {
      const data = await fs.readFile(this.filePath, this.encoding);
      const parsed = JSON.parse(data);
      this.store = new Map(Object.entries(parsed));
    } catch (error) {
      // File doesn't exist or is invalid, start with empty store
      this.store = new Map();
    }
  }
  
  async _saveToFile() {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      
      const data = JSON.stringify(Object.fromEntries(this.store));
      await fs.writeFile(this.filePath, data, this.encoding);
    } catch (error) {
      throw new Error(`Failed to save cache to file: ${error.message}`);
    }
  }
  
  async get(key) {
    return this.store.get(key);
  }
  
  async set(key, value) {
    this.store.set(key, value);
    await this._saveToFile();
    return true;
  }
  
  async delete(key) {
    const result = this.store.delete(key);
    if (result) {
      await this._saveToFile();
    }
    return result;
  }
  
  async clear() {
    this.store.clear();
    await this._saveToFile();
    return true;
  }
  
  async keys() {
    return Array.from(this.store.keys());
  }
  
  async size() {
    return this.store.size;
  }
  
  async has(key) {
    return this.store.has(key);
  }
}

class JsonAdapter {
  constructor(options = {}) {
    this.filePath = options.filePath || './cache.json';
    this.indent = options.indent || 2;
    this.store = new Map();
    this._loadFromFile();
  }
  
  async _loadFromFile() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      this.store = new Map(Object.entries(parsed));
    } catch (error) {
      this.store = new Map();
    }
  }
  
  async _saveToFile() {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      
      const data = JSON.stringify(Object.fromEntries(this.store), null, this.indent);
      await fs.writeFile(this.filePath, data, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save cache to JSON: ${error.message}`);
    }
  }
  
  async get(key) {
    return this.store.get(key);
  }
  
  async set(key, value) {
    this.store.set(key, value);
    await this._saveToFile();
    return true;
  }
  
  async delete(key) {
    const result = this.store.delete(key);
    if (result) {
      await this._saveToFile();
    }
    return result;
  }
  
  async clear() {
    this.store.clear();
    await this._saveToFile();
    return true;
  }
  
  async keys() {
    return Array.from(this.store.keys());
  }
  
  async size() {
    return this.store.size;
  }
  
  async has(key) {
    return this.store.has(key);
  }
}

class RedisAdapter {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 6379,
      password: options.password || null,
      db: options.db || 0,
      keyPrefix: options.keyPrefix || 'cache:',
      ...options
    };
    
    this.client = null;
    this._connected = false;
    this._connect();
  }
  
  async _connect() {
    try {
      // Lazy load redis (optional dependency)
      const Redis = require('redis');
      
      this.client = Redis.createClient({
        socket: {
          host: this.options.host,
          port: this.options.port
        },
        password: this.options.password,
        database: this.options.db
      });
      
      await this.client.connect();
      this._connected = true;
    } catch (error) {
      throw new Error(`Redis connection failed: ${error.message}. Make sure to install redis: npm install redis`);
    }
  }
  
  _getKey(key) {
    return `${this.options.keyPrefix}${key}`;
  }
  
  async get(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.get(this._getKey(key));
      return result ? JSON.parse(result) : undefined;
    } catch (error) {
      return undefined;
    }
  }
  
  async set(key, value) {
    if (!this._connected) await this._connect();
    
    try {
      await this.client.set(this._getKey(key), JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async delete(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.del(this._getKey(key));
      return result > 0;
    } catch (error) {
      return false;
    }
  }
  
  async clear() {
    if (!this._connected) await this._connect();
    
    try {
      const keys = await this.client.keys(`${this.options.keyPrefix}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async keys() {
    if (!this._connected) await this._connect();
    
    try {
      const redisKeys = await this.client.keys(`${this.options.keyPrefix}*`);
      return redisKeys.map(key => key.replace(this.options.keyPrefix, ''));
    } catch (error) {
      return [];
    }
  }
  
  async size() {
    const allKeys = await this.keys();
    return allKeys.length;
  }
  
  async has(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.exists(this._getKey(key));
      return result > 0;
    } catch (error) {
      return false;
    }
  }
  
  async disconnect() {
    if (this.client && this._connected) {
      await this.client.disconnect();
      this._connected = false;
    }
  }
}

class PostgreSQLAdapter {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 5432,
      user: options.user || 'postgres',
      password: options.password || '',
      database: options.database || 'cache_db',
      table: options.table || 'cache_store',
      ...options
    };
    
    this.client = null;
    this._connected = false;
    this._connect();
  }
  
  async _connect() {
    try {
      // Lazy load pg (optional dependency)
      const { Client } = require('pg');
      
      this.client = new Client({
        host: this.options.host,
        port: this.options.port,
        user: this.options.user,
        password: this.options.password,
        database: this.options.database
      });
      
      await this.client.connect();
      await this._createTable();
      this._connected = true;
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}. Make sure to install pg: npm install pg`);
    }
  }
  
  async _createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.options.table} (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.client.query(query);
  }
  
  async get(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(
        `SELECT value FROM ${this.options.table} WHERE key = $1`,
        [key]
      );
      
      return result.rows.length > 0 ? result.rows[0].value : undefined;
    } catch (error) {
      return undefined;
    }
  }
  
  async set(key, value) {
    if (!this._connected) await this._connect();
    
    try {
      await this.client.query(
        `INSERT INTO ${this.options.table} (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value)]
      );
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async delete(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(
        `DELETE FROM ${this.options.table} WHERE key = $1`,
        [key]
      );
      return result.rowCount > 0;
    } catch (error) {
      return false;
    }
  }
  
  async clear() {
    if (!this._connected) await this._connect();
    
    try {
      await this.client.query(`DELETE FROM ${this.options.table}`);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async keys() {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(`SELECT key FROM ${this.options.table}`);
      return result.rows.map(row => row.key);
    } catch (error) {
      return [];
    }
  }
  
  async size() {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(`SELECT COUNT(*) as count FROM ${this.options.table}`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }
  
  async has(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(
        `SELECT 1 FROM ${this.options.table} WHERE key = $1`,
        [key]
      );
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }
  
  async disconnect() {
    if (this.client && this._connected) {
      await this.client.end();
      this._connected = false;
    }
  }
}

class EasyCache extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 0, // 0 = no expiration
      checkInterval: options.checkInterval || 60000, // 60 seconds
      enableStats: options.enableStats !== false,
      storage: options.storage || 'memory',
      storageOptions: options.storageOptions || {},
      ...options
    };
    
    // Initialize storage adapter
    this._initializeStorage();
    
    this.cache = new Map(); // Memory layer for TTL and metadata
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
  async set(key, value, ttl = null) {
    try {
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
      await this.storage.set(key, value);

      // Store metadata in memory
      const cacheItem = {
        createdAt: Date.now(),
        expiresAt,
        accessCount: 0
      };

      this.cache.set(key, cacheItem);
      this.accessOrder.set(key, Date.now());

      // Set expiration timer if needed
      if (effectiveTTL > 0) {
        const timer = setTimeout(async () => {
          await this.delete(key);
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
  async get(key) {
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
      const value = await this.storage.get(key);
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
        
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }

        if (this.options.enableStats) {
          this.stats.deletes++;
        }

        this.emit('delete', key, value);
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
    } catch (error) {
      this.emit('error', error);
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
      let value = await this.get(key);
      
      if (value === undefined) {
        value = await fn();
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
  } = {};
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