# Configuration

## ⚙️ Constructor Options

```javascript
const cache = new EasyCache({
  maxSize: 1000,          // Maximum items in cache (default: 1000)
  defaultTTL: 0,          // Default TTL in ms, 0 = no expiration (default: 0)
  slidingTTL: false,      // Extend TTL on access (default: false)
  staleWhileRevalidate: false, // Return stale value while revalidating (default: false)
  checkInterval: 60000,   // Interval for cleaning up expired items (default: 60000)
  enableStats: true,      // Enable statistics (default: true)
  serialize: JSON.stringify, // Custom serialization function
  deserialize: JSON.parse  // Custom deserialization function
});
```

## 💾 Storage Adapters

EasyCache supports various storage backends. You can configure the storage type and its options using the `storage` and `storageOptions` properties.

### Memory (Default)

Stores cache data in memory. Ideal for fast, temporary caching.

```javascript
const cache = new EasyCache({
  storage: 'memory'
});
```

### Raw File

Stores cache data in a single file.

```javascript
const cache = new EasyCache({
  storage: 'file',
  storageOptions: {
    filePath: './cache.dat', // Path to the cache file
    encoding: 'utf8'         // File encoding
  }
});
```

### JSON File

Stores cache data in a JSON file with pretty-printing.

```javascript
const cache = new EasyCache({
  storage: 'json',
  storageOptions: {
    filePath: './cache.json', // Path to the JSON cache file
    indent: 2                // Indentation level for JSON
  }
});
```

### Patch File

This adapter is designed for scenarios where you need to frequently update parts of a large JSON file without reading and writing the entire file every time.

```javascript
const cache = new EasyCache({
  storage: 'patch',
  storageOptions: {
    filePath: './cache.patch.json' // Path to the patch file
  }
});
```

### Redis

Connects to a Redis server for distributed caching. Requires the `redis` package.

```bash
npm install redis
```

```javascript
const cache = new EasyCache({
  storage: 'redis',
  storageOptions: {
    host: 'localhost',
    port: 6379,
    password: null,
    db: 0,
    keyPrefix: 'cache:'
  }
});
```

### PostgreSQL

Connects to a PostgreSQL database for persistent caching. Requires the `pg` package.

```bash
npm install pg
```

```javascript
const cache = new EasyCache({
  storage: 'postgresql',
  storageOptions: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'cache_db',
    table: 'cache_store'
  }
});
```
