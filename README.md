# EasyCache

An easy-to-use Node.js library for comprehensive cache management, featuring TTL (Time To Live), LRU eviction, an event system, and cache statistics.

## ✨ Key Features

- **TTL (Time To Live)** - Cache with automatic expiration
- **LRU Eviction** - Automatically remove least recently used items
- **Event System** - Listen for cache events like set, get, expired, etc.
- **Statistics** - Track hit rate, miss rate, and other metrics
- **Multiple Operations** - Set/get multiple keys at once
- **Memory Management** - Control maximum cache size
- **Utility Functions** - Helpers for time parsing and formatting
- **Zero Dependencies** - No external libraries required
- **Cache Tags/Groups** - Organize cache items with tags for group operations
- **Sliding Expiration** - Extend TTL on access for frequently used items
- **Enhanced Loader Function** - More flexible data loading with `getOrSet`
- **Custom Serialization/Deserialization** - Define how data is transformed for storage
- **Conditional Caching** - Cache items based on custom conditions

## 📦 Installation

```bash
npm install eca.js
```

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

// Set with custom TTL
cache.set('temp:data', 'temporary data', 10000); // Expires in 10 seconds
```

## 📖 API Documentation

### Constructor Options

## 📖 API Documentation

### Constructor Options

### Constructor Options

```javascript
const cache = new EasyCache({
  maxSize: 1000,          // Maximum items in cache (default: 1000)
  defaultTTL: 0,          // Default TTL in ms, 0 = no expiration (default: 0)
  slidingTTL: false,      // Extend TTL on access (default: false)
  checkInterval: 60000,   // Interval for cleaning up expired items (default: 60000)
  enableStats: true,      // Enable statistics (default: true)
  serialize: JSON.stringify, // Custom serialization function (default: JSON.stringify)
  deserialize: JSON.parse  // Custom deserialization function (default: JSON.parse)
});
```

### Storage Adapters

EasyCache supports various storage backends. You can configure the storage type and its specific options via the `storage` and `storageOptions` properties in the constructor.

#### Memory Adapter (Default)
Stores cache data in memory. Ideal for fast, temporary caching.

```javascript
const cache = new EasyCache({
  storage: 'memory' // Default, no specific options needed
});
```

#### File Adapter (Raw)
Stores cache data in a single file as raw JSON. Useful for simple persistence.

```javascript
const cache = new EasyCache({
  storage: 'file',
  storageOptions: {
    filePath: './cache.dat', // Path to the cache file (default: './cache.dat')
    encoding: 'utf8'         // File encoding (default: 'utf8')
  }
});
```

#### JSON Adapter
Stores cache data in a single file as pretty-printed JSON. Good for human-readable persistence.

```javascript
const cache = new EasyCache({
  storage: 'json',
  storageOptions: {
    filePath: './cache.json', // Path to the JSON cache file (default: './cache.json')
    indent: 2                // Indentation level for JSON (default: 2)
  }
});
```

#### Redis Adapter
Connects to a Redis server for distributed and persistent caching. Requires `redis` package to be installed (`npm install redis`).

```javascript
const cache = new EasyCache({
  storage: 'redis',
  storageOptions: {
    host: 'localhost',   // Redis server host (default: 'localhost')
    port: 6379,          // Redis server port (default: 6379)
    password: null,      // Redis password (optional)
    db: 0,               // Redis database index (default: 0)
    keyPrefix: 'cache:'  // Prefix for all cache keys in Redis (default: 'cache:')
  }
});
```

#### PostgreSQL Adapter
Connects to a PostgreSQL database for robust and persistent caching. Requires `pg` package to be installed (`npm install pg`).

```javascript
const cache = new EasyCache({
  storage: 'postgresql',
  storageOptions: {
    host: 'localhost',   // PostgreSQL host (default: 'localhost')
    port: 5432,          // PostgreSQL port (default: 5432)
    user: 'postgres',    // PostgreSQL user (default: 'postgres')
    password: '',         // PostgreSQL password (default: '')
    database: 'cache_db',// PostgreSQL database name (default: 'cache_db')
    table: 'cache_store' // Table name for cache data (default: 'cache_store')
  }
});
```

#### Custom Adapter
You can also provide your own custom storage adapter. It must implement `get`, `set`, `delete`, `clear`, `keys`, `size`, and `has` methods, all of which should return Promises.

```javascript
class MyCustomAdapter {
  constructor(options) { /* ... */ }
  async get(key) { /* ... */ }
  async set(key, value) { /* ... */ }
  async delete(key) { /* ... */ }
  async clear() { /* ... */ }
  async keys() { /* ... */ }
  async size() { /* ... */ }
  async has(key) { /* ... */ }
}

const cache = new EasyCache({
  storage: new MyCustomAdapter({ /* options */ })
});
```

### Basic Methods

#### `set(key, value, ttl?)`
Sets a value to the cache with an optional TTL.

```javascript
cache.set('key', 'value');
cache.set('key', 'value', 5000); // Expires in 5 seconds
```

#### `get(key)`
Retrieves a value from the cache.

```javascript
const value = cache.get('key');
```

#### `has(key)`
Checks if a key exists in the cache.

```javascript
if (cache.has('key')) {
  console.log('Key exists');
}
```

#### `delete(key)`
Deletes a key from the cache.

```javascript
cache.delete('key');
```

#### `clear()`
Clears all items from the cache.

```javascript
cache.clear();
```

#### `size()`
Gets the number of items in the cache.

```javascript
console.log('Cache size:', cache.size());
```

#### `keys()`
Gets all keys in the cache.

```javascript
console.log('All keys:', cache.keys());
```



### Advanced Methods

#### `getOrSet(key, fn, ttl?)`
Gets a value or sets it with a function if it doesn't exist.

```javascript
const userData = await cache.getOrSet('user:123', async () => {
  // Fetch from database if not in cache
  return await fetchUserFromDB(123);
}, 300000); // Cache for 5 minutes
```

#### `setMultiple(items, ttl?)`
Sets multiple values at once.

```javascript
cache.setMultiple({
  'user:1': { name: 'Alice' },
  'user:2': { name: 'Bob' }
}, 60000);
```

#### `getMultiple(keys)`
Gets multiple values at once.

```javascript
const users = cache.getMultiple(['user:1', 'user:2']);
```

#### `deleteMultiple(keys)`
Deletes multiple keys at once.

```javascript
cache.deleteMultiple(['user:1', 'user:2']);
```

#### `touch(key, ttl)`
Updates the TTL for an existing key.

```javascript
cache.touch('user:123', 600000); // Extend TTL to 10 minutes
```

#### `getInfo(key)`
Gets detailed information for a key.

```javascript
const info = cache.getInfo('user:123');
console.log(info);
// {
//   key: 'user:123',
//   createdAt: 1640995200000,
//   expiresAt: 1640995500000,
//   accessCount: 5,
//   isExpired: false,
//   ttl: 300000
// }
```

### Statistics

#### `getStats()`
Gets cache statistics.

```javascript
const stats = cache.getStats();
console.log(stats);
// {
//   hits: 150,
//   misses: 10,
//   sets: 100,
//   deletes: 5,
//   evictions: 2,
//   size: 95,
//   hitRate: 0.9375
// }
```

#### `resetStats()`
Resets all statistics.

```javascript
cache.resetStats();
```

### Events

Cache emits various events that can be listened to:

In addition to global events, key-specific events are also emitted (e.g., `set:myKey`, `expired:anotherKey`).

```javascript
cache.on('set', (key, value) => {
  console.log(`Set: ${key}`);
});

cache.on('get', (key, value) => {
  console.log(`Get: ${key}`);
});

cache.on('delete', (key, value) => {
  console.log(`Deleted: ${key}`);
});

cache.on('expired', (key, value) => {
  console.log(`Expired: ${key}`);
});

cache.on('evicted', (key, value) => {
  console.log(`Evicted: ${key}`);
});

cache.on('clear', () => {
  console.log('Cache cleared');
});

cache.on('cleanup', (count) => {
  console.log(`Cleaned up ${count} expired items`);
});

cache.on('error', (error) => {
  console.error('Cache error:', error);
});
```

### Utility Functions

### Utility Functions



## 💡 Examples

### 1. API Response Caching

```javascript
const cache = new EasyCache({ maxSize: 1000, defaultTTL: 300000 });

async function fetchUserWithCache(userId) {
  return await cache.getOrSet(`user:${userId}`, async () => {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
  }, 600000); // Cache for 10 minutes
}
```

### 2. Database Query Caching

```javascript
const cache = new EasyCache({ maxSize: 500 });

async function getProductsWithCache(category) {
  const cacheKey = `products:${category}`;
  
  return await cache.getOrSet(cacheKey, async () => {
    return await db.query('SELECT * FROM products WHERE category = ?', [category]);
  }, EasyCache.utils.parseTime('15m'));
}
```

### 3. Session Management

```javascript
const sessionCache = new EasyCache({
  maxSize: 10000,
  defaultTTL: EasyCache.utils.parseTime('1h') // 1 hour
});

function createSession(userId, userData) {
  const sessionId = generateSessionId();
  sessionCache.set(`session:${sessionId}`, {
    userId,
    ...userData,
    createdAt: Date.now()
  }, EasyCache.utils.parseTime('24h')); // Session for 24 hours
  
  return sessionId;
}

function getSession(sessionId) {
  return sessionCache.get(`session:${sessionId}`);
}

function extendSession(sessionId) {
  return sessionCache.touch(`session:${sessionId}`, EasyCache.utils.parseTime('24h'));
}
```

### 4. Rate Limiting

```javascript
const rateLimitCache = new EasyCache({
  maxSize: 100000,
  defaultTTL: EasyCache.utils.parseTime('1h')
});

function checkRateLimit(ip, maxRequests = 100) {
  const key = `ratelimit:${ip}`;
  const current = rateLimitCache.get(key) || 0;
  
  if (current >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  rateLimitCache.set(key, current + 1);
  return true;
}
```

### 5. Configuration Caching

```javascript
const configCache = new EasyCache({
  maxSize: 100,
  defaultTTL: EasyCache.utils.parseTime('10m')
});

async function getConfig(key) {
  return await configCache.getOrSet(`config:${key}`, async () => {
    // Fetch from database or file
    return await loadConfigFromSource(key);
  });
}

// Invalidate config when updated
function updateConfig(key, value) {
  configCache.delete(`config:${key}`);
  return saveConfigToSource(key, value);
}
```

### 6. Multi-layer Caching

```javascript
class MultiLayerCache {
  constructor() {
    // L1: Fast cache with short TTL
    this.l1Cache = new EasyCache({
      maxSize: 100,
      defaultTTL: EasyCache.utils.parseTime('1m')
    });
    
    // L2: Slower cache with longer TTL
    this.l2Cache = new EasyCache({
      maxSize: 1000,
      defaultTTL: EasyCache.utils.parseTime('10m')
    });
  }
  
  async get(key, fetchFn) {
    // Try L1 first
    let value = this.l1Cache.get(key);
    if (value !== undefined) {
      return value;
    }
    
    // Try L2
    value = this.l2Cache.get(key);
    if (value !== undefined) {
      // Promote to L1
      this.l1Cache.set(key, value);
      return value;
    }
    
    // Fetch from source
    value = await fetchFn();
    
    // Store in both layers
    this.l1Cache.set(key, value);
    this.l2Cache.set(key, value);
    
    return value;
  }
}
```

## 🔧 Best Practices

### 1. Naming Conventions
Gunakan namespace untuk keys:
```javascript
## 🔧 Best Practices

### 1. Naming Conventions
Use namespaces for keys:
```javascript
cache.set('user:123', userData);
cache.set('product:456', productData);
cache.set('session:abc123', sessionData);
```

### 2. TTL Strategy
- **Static data**: Long TTL (1-24 hours)
- **Dynamic data**: Short TTL (1-15 minutes)
- **Real-time data**: Very short TTL (10-60 seconds)

```javascript
// Static data
cache.set('config:app', appConfig, EasyCache.utils.parseTime('1h'));

// Dynamic data
cache.set('user:profile:123', userProfile, EasyCache.utils.parseTime('5m'));

// Real-time data
cache.set('stock:price:AAPL', stockPrice, EasyCache.utils.parseTime('30s'));
```

### 3. Memory Management
Monitor cache size and adjust maxSize:

```javascript
const cache = new EasyCache({ maxSize: 1000 });

// Monitor stats periodically
setInterval(() => {
  const stats = cache.getStats();
  console.log(`Cache: ${stats.size}/${cache.options.maxSize} items, Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
}, 60000);
```

### 4. Error Handling
Always handle errors for cache operations:

```javascript
cache.on('error', (error) => {
  console.error('Cache error:', error);
  // Log to monitoring system
});

// Graceful fallback
function getCachedData(key, fallbackFn) {
  try {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
  } catch (error) {
    console.warn('Cache get error:', error);
  }
  
  return fallbackFn();
}
```

### 5. Cleanup
Don't forget to clean up when the application shuts down:

```javascript
process.on('SIGINT', () => {
  console.log('Shutting down...');
  cache.destroy();
  process.exit(0);
});
```
```

### 2. TTL Strategy
- **Static data**: TTL panjang (1-24 jam)
- **Dynamic data**: TTL pendek (1-15 menit)
- **Real-time data**: TTL sangat pendek (10-60 second)

```javascript
// Static data
cache.set('config:app', appConfig, EasyCache.utils.parseTime('1h'));

// Dynamic data
cache.set('user:profile:123', userProfile, EasyCache.utils.parseTime('5m'));

// Real-time data
cache.set('stock:price:AAPL', stockPrice, EasyCache.utils.parseTime('30s'));
```

### 3. Memory Management
Monitor ukuran cache dan sesuaikan maxSize:

```javascript
const cache = new EasyCache({ maxSize: 1000 });

// Monitor stats secara berkala
setInterval(() => {
  const stats = cache.getStats();
  console.log(`Cache: ${stats.size}/${cache.options.maxSize} items, Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
}, 60000);
```

### 4. Error Handling
Selalu handle error untuk operasi cache:

```javascript
cache.on('error', (error) => {
  console.error('Cache error:', error);
  // Log to monitoring system
});

// Graceful fallback
function getCachedData(key, fallbackFn) {
  try {
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
  } catch (error) {
    console.warn('Cache get error:', error);
  }
  
  return fallbackFn();
}
```

### 5. Cleanup
Jangan lupa cleanup saat aplikasi shutdown:

```javascript
process.on('SIGINT', () => {
  console.log('Shutting down...');
  cache.destroy();
  process.exit(0);
});
```

## 📊 Performance Tips

1. **Optimal maxSize**: Set based on available memory
2. **TTL tuning**: Balance between hit rate and data freshness
3. **Key naming**: Use short but descriptive keys
4. **Batch operations**: Use `setMultiple`/`getMultiple` for efficiency
5. **Event listeners**: Avoid too many listeners for optimal performance

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Cloud-Dark/eca.js)
- [NPM Package](https://www.npmjs.com/package/eca.js)
- [Issues](https://github.com/Cloud-Dark/eca.js/issues)

---

Made with ❤️ for the Node.js community