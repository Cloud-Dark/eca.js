
// src/adapters/json.js
const fs = require('fs').promises;
const path = require('path');

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

module.exports = JsonAdapter;
