
// src/adapters/file.js
const fs = require('fs').promises;
const path = require('path');

class FileAdapter {
  constructor(options = {}) {
    this.filePath = options.filePath || './cache.dat';
    this.encoding = options.encoding || 'utf8';
    this.store = new Map();
    this._ready = this._loadFromFile();
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
    await this._ready;
    return this.store.get(key);
  }
  
  async set(key, value) {
    await this._ready;
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

module.exports = FileAdapter;
