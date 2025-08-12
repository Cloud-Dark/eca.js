# EasyCache

Library Node.js yang mudah digunakan untuk manajemen cache dengan fitur lengkap seperti TTL (Time To Live), LRU eviction, event system, dan statistik cache.

## ✨ Fitur Utama

- **TTL (Time To Live)** - Cache dengan waktu expired otomatis
- **LRU Eviction** - Otomatis hapus item yang paling jarang digunakan
- **Event System** - Listen untuk event cache seperti set, get, expired, dll
- **Statistik** - Track hit rate, miss rate, dan metrics lainnya
- **Multiple Operations** - Set/get multiple keys sekaligus
- **Memory Management** - Kontrol maksimal ukuran cache
- **Utility Functions** - Helper untuk parsing time dan formatting
- **Zero Dependencies** - Tidak memerlukan library eksternal

## 📦 Instalasi

```bash
npm install easy-cache-js
```

## 🚀 Quick Start

```javascript
const EasyCache = require('easy-cache-js');

// Buat instance cache
const cache = new EasyCache({
  maxSize: 1000,        // Maksimal 1000 items
  defaultTTL: 300000    // Default 5 menit TTL
});

// Set nilai
cache.set('user:123', { name: 'John', email: 'john@example.com' });

// Get nilai
const user = cache.get('user:123');
console.log(user); // { name: 'John', email: 'john@example.com' }

// Set dengan TTL custom
cache.set('temp:data', 'temporary data', 10000); // Expired dalam 10 second
```

## 📖 API Documentation

### Constructor Options

```javascript
const cache = new EasyCache({
  maxSize: 1000,          // Maksimal items di cache (default: 1000)
  defaultTTL: 0,          // Default TTL dalam ms, 0 = tidak expired (default: 0)
  checkInterval: 60000,   // Interval cleanup expired items (default: 60000)
  enableStats: true       // Enable statistik (default: true)
});
```

### Basic Methods

#### `set(key, value, ttl?)`
Set nilai ke cache dengan optional TTL.

```javascript
cache.set('key', 'value');
cache.set('key', 'value', 5000); // Expired dalam 5 second
```

#### `get(key)`
Ambil nilai dari cache.

```javascript
const value = cache.get('key');
```

#### `has(key)`
Cek apakah key exists di cache.

```javascript
if (cache.has('key')) {
  console.log('Key exists');
}
```

#### `delete(key)`
Hapus key dari cache.

```javascript
cache.delete('key');
```

#### `clear()`
Hapus semua items dari cache.

```javascript
cache.clear();
```

#### `size()`
Dapatkan jumlah items di cache.

```javascript
console.log('Cache size:', cache.size());
```

#### `keys()`
Dapatkan semua keys di cache.

```javascript
console.log('All keys:', cache.keys());
```

### Advanced Methods

#### `getOrSet(key, fn, ttl?)`
Get value atau set dengan function jika tidak ada.

```javascript
const userData = await cache.getOrSet('user:123', async () => {
  // Fetch dari database jika tidak ada di cache
  return await fetchUserFromDB(123);
}, 300000); // Cache selama 5 menit
```

#### `setMultiple(items, ttl?)`
Set multiple values sekaligus.

```javascript
cache.setMultiple({
  'user:1': { name: 'Alice' },
  'user:2': { name: 'Bob' }
}, 60000);
```

#### `getMultiple(keys)`
Get multiple values sekaligus.

```javascript
const users = cache.getMultiple(['user:1', 'user:2']);
```

#### `deleteMultiple(keys)`
Delete multiple keys sekaligus.

```javascript
cache.deleteMultiple(['user:1', 'user:2']);
```

#### `touch(key, ttl)`
Update TTL untuk key yang sudah ada.

```javascript
cache.touch('user:123', 600000); // Extend TTL to 10 menit
```

#### `getInfo(key)`
Dapatkan informasi detail untuk key.

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
Dapatkan statistik cache.

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
Reset semua statistik.

```javascript
cache.resetStats();
```

### Events

Cache emit berbagai events yang bisa di-listen:

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

#### `EasyCache.utils.parseTime(timeStr)`
Parse time string ke milliseconds.

```javascript
const oneHour = EasyCache.utils.parseTime('1h');     // 3600000
const thirtyMin = EasyCache.utils.parseTime('30m');  // 1800000
const fiveSeconds = EasyCache.utils.parseTime('5s'); // 5000
```

Supported units: `ms`, `s`, `m`, `h`, `d`

#### `EasyCache.utils.formatBytes(bytes)`
Format bytes ke human readable string.

```javascript
const formatted = EasyCache.utils.formatBytes(1024); // "1.00 KB"
```

## 💡 Contoh Penggunaan

### 1. API Response Caching

```javascript
const cache = new EasyCache({ maxSize: 1000, defaultTTL: 300000 });

async function fetchUserWithCache(userId) {
  return await cache.getOrSet(`user:${userId}`, async () => {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
  }, 600000); // Cache 10 menit
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
  defaultTTL: EasyCache.utils.parseTime('1h') // 1 jam
});

function createSession(userId, userData) {
  const sessionId = generateSessionId();
  sessionCache.set(`session:${sessionId}`, {
    userId,
    ...userData,
    createdAt: Date.now()
  }, EasyCache.utils.parseTime('24h')); // Session 24 jam
  
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
    // Fetch dari database atau file
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
    // L1: Fast cache dengan TTL pendek
    this.l1Cache = new EasyCache({
      maxSize: 100,
      defaultTTL: EasyCache.utils.parseTime('1m')
    });
    
    // L2: Slower cache dengan TTL lebih panjang
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
cache.set('user:123', userData);
cache.set('product:456', productData);
cache.set('session:abc123', sessionData);
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

1. **Optimal maxSize**: Set berdasarkan available memory
2. **TTL tuning**: Balance antara hit rate dan data freshness
3. **Key naming**: Gunakan key yang pendek tapi descriptive
4. **Batch operations**: Gunakan `setMultiple`/`getMultiple` untuk efisiensi
5. **Event listeners**: Jangan terlalu banyak listeners untuk performa optimal

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Buat Pull Request

## 📝 License

MIT License - lihat file [LICENSE](LICENSE) untuk details.

## 🔗 Links

- [GitHub Repository](https://github.com/yourusername/easy-cache-js)
- [NPM Package](https://www.npmjs.com/package/easy-cache-js)
- [Issues](https://github.com/yourusername/easy-cache-js/issues)

---

Dibuat dengan ❤️ untuk komunitas Node.js Indonesia