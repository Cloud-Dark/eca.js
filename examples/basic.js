// examples/basic.js - EasyCache Usage Examples

const EasyCache = require('../src/easycache');

// 1. Basic Usage
console.log('=== Basic Usage ===');
const cache = new EasyCache({
  maxSize: 100,
  defaultTTL: 5000 // 5 second default TTL
});

// Set value
cache.set('user:123', { name: 'John', email: 'john@example.com' });
cache.set('config', { theme: 'dark', lang: 'id' }, 10000); // TTL 10 second

// Get value
console.log('User:', cache.get('user:123'));
console.log('Config:', cache.get('config'));

// 2. Event Listeners
console.log('\n=== Event Listeners ===');
cache.on('set', (key, value) => {
  console.log(`✅ Set: ${key}`);
});

cache.on('get', (key, value) => {
  console.log(`📖 Get: ${key}`);
});

cache.on('expired', (key, value) => {
  console.log(`⏰ Expired: ${key}`);
});

cache.on('evicted', (key, value) => {
  console.log(`🗑️ Evicted: ${key}`);
});

// 3. Advanced Features
console.log('\n=== Advanced Features ===');

// Get or Set pattern
async function getUserData(userId) {
  return await cache.getOrSet(`user:${userId}`, async () => {
    // Simulate fetching from database
    console.log('📡 Fetching from database...');
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: userId, name: `User ${userId}`, active: true };
  }, 30000); // Cache for 30 seconds
}

async function testGetOrSet() {
  console.log('First call:', await getUserData(456));
  console.log('Second call (cached):', await getUserData(456));
}

testGetOrSet();

// 4. Multiple Operations
console.log('\n=== Multiple Operations ===');

// Set multiple
cache.setMultiple({
  'product:1': { name: 'Laptop', price: 15000000 },
  'product:2': { name: 'Mouse', price: 200000 },
  'product:3': { name: 'Keyboard', price: 500000 }
}, 60000); // 1 minute TTL

// Get multiple
const products = cache.getMultiple(['product:1', 'product:2', 'product:3']);
console.log('Products:', products);

// 5. Cache Information
console.log('\n=== Cache Information ===');

setTimeout(() => {
  console.log('Cache stats:', cache.getStats());
  console.log('Cache size:', cache.size());
  console.log('Cache keys:', cache.keys());
  
  // Info for a specific key
  const userInfo = cache.getInfo('user:123');
  console.log('User info:', userInfo);
}, 1000);

// 6. Time Utils
console.log('\n=== Time Utils ===');
try {
  console.log('1 hour in ms:', EasyCache.utils.parseTime('1h'));
  console.log('30 minutes in ms:', EasyCache.utils.parseTime('30m'));
  console.log('5 seconds in ms:', EasyCache.utils.parseTime('5s'));
} catch (error) {
  console.error('Time parse error:', error.message);
}

// 7. TTL Management
console.log('\n=== TTL Management ===');
cache.set('temp:data', 'This will expire soon', 3000); // 3 second

// Extend TTL
setTimeout(() => {
  cache.touch('temp:data', 5000); // Extend by another 5 seconds
  console.log('TTL extended for temp:data');
}, 2000);

// 8. Practical Example: API Response Caching
console.log('\n=== API Response Caching Example ===');

class ApiCache {
  constructor() {
    this.cache = new EasyCache({
      maxSize: 1000,
      defaultTTL: 300000, // 5 minutes default
      checkInterval: 60000 // Cleanup every 1 minute
    });
  }

  async fetchWithCache(endpoint, ttl = null) {
    const cacheKey = `api:${endpoint}`;
    
    return await this.cache.getOrSet(cacheKey, async () => {
      console.log(`🌐 Fetching ${endpoint}...`);
      // Simulasi API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        data: `Response from ${endpoint}`,
        timestamp: new Date().toISOString(),
        cached: false
      };
    }, ttl);
  }

  getStats() {
    return this.cache.getStats();
  }

  clear() {
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

async function testApiCache() {
  // First call - will fetch
  console.log('First API call:', await apiCache.fetchWithCache('/users'));
  
  // Second call - from cache
  console.log('Second API call:', await apiCache.fetchWithCache('/users'));
  
  // Different endpoint
  console.log('Different endpoint:', await apiCache.fetchWithCache('/products'));
  
  console.log('API Cache stats:', apiCache.getStats());
}

testApiCache();

// 9. Memory Management Example
console.log('\n=== Memory Management ===');

const memoryCache = new EasyCache({
  maxSize: 3, // Small for eviction demo
  defaultTTL: 0 // No expiration
});

// Fill cache beyond limit untuk trigger LRU eviction
memoryCache.set('item1', 'First item');
memoryCache.set('item2', 'Second item');
memoryCache.set('item3', 'Third item');
memoryCache.set('item4', 'Fourth item'); // This will evict item1

console.log('After adding 4 items to cache with maxSize=3:');
console.log('Keys:', memoryCache.keys());
console.log('item1 exists:', memoryCache.has('item1')); // false, already evicted
console.log('item4 exists:', memoryCache.has('item4')); // true

// 10. Error Handling
console.log('\n=== Error Handling ===');

const errorCache = new EasyCache();

errorCache.on('error', (error) => {
  console.error('Cache error:', error.message);
});

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('\n🧹 Cleaning up...');
  cache.destroy();
  apiCache.clear();
  memoryCache.destroy();
  errorCache.destroy();
  process.exit(0);
}, 10000);
