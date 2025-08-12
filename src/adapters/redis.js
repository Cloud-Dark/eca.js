
// src/adapters/redis.js
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

module.exports = RedisAdapter;
