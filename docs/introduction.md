# Introduction

`eca.js` is a simple yet powerful Node.js library for caching, featuring Time-to-Live (TTL), LRU eviction, an event system, and cache statistics.

## 🚀 Quick Start

```javascript
const EasyCache = require('eca.js');

// Create a cache instance
const cache = new EasyCache({
  maxSize: 1000,        // Maximum 1000 items
  defaultTTL: 300000    // Default 5 minutes TTL
});

// Set a value
cache.set('user:123', { name: 'John', email: 'john@example.com' });

// Get a value
const user = cache.get('user:123');
console.log(user); // { name: 'John', email: 'john@example.com' }

// Set with a custom TTL
cache.set('temp:data', 'temporary data', 10000); // Expires in 10 seconds
```
