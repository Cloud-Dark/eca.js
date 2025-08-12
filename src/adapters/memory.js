
// src/adapters/memory.js
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

module.exports = MemoryAdapter;
