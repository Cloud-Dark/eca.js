// test.js - Simple test untuk EasyCache
const EasyCache = require('./easycache');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ ${message}`);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log('🧪 Starting EasyCache Tests...\n');

  // Test 1: Basic set/get
  console.log('Test 1: Basic Operations');
  const cache = new EasyCache();
  
  cache.set('test1', 'value1');
  assert(cache.get('test1') === 'value1', 'Basic set/get works');
  assert(cache.has('test1') === true, 'has() returns true for existing key');
  assert(cache.has('nonexistent') === false, 'has() returns false for non-existing key');
  
  cache.delete('test1');
  assert(cache.get('test1') === undefined, 'delete() removes key');
  
  // Test 2: TTL
  console.log('\nTest 2: TTL Functionality');
  cache.set('ttl_test', 'expires_soon', 100); // 100ms TTL
  assert(cache.get('ttl_test') === 'expires_soon', 'TTL key initially available');
  
  await new Promise(resolve => setTimeout(resolve, 150));
  assert(cache.get('ttl_test') === undefined, 'TTL key expires correctly');
  
  // Test 3: Multiple operations
  console.log('\nTest 3: Multiple Operations');
  cache.setMultiple({
    'multi1': 'value1',
    'multi2': 'value2',
    'multi3': 'value3'
  });
  
  const multiResults = cache.getMultiple(['multi1', 'multi2', 'multi3']);
  assert(Object.keys(multiResults).length === 3, 'getMultiple returns all keys');
  assert(multiResults.multi1 === 'value1', 'getMultiple returns correct values');
  
  cache.deleteMultiple(['multi1', 'multi2']);
  assert(cache.get('multi1') === undefined, 'deleteMultiple removes keys');
  assert(cache.get('multi3') === 'value3', 'deleteMultiple preserves other keys');
  
  // Test 4: LRU Eviction
  console.log('\nTest 4: LRU Eviction');
  const lruCache = new EasyCache({ maxSize: 2 });
  
  lruCache.set('lru1', 'value1');
  lruCache.set('lru2', 'value2');
  lruCache.set('lru3', 'value3'); // Should evict lru1
  
  assert(lruCache.has('lru1') === false, 'LRU eviction removes oldest item');
  assert(lruCache.has('lru2') === true, 'LRU preserves recent items');
  assert(lruCache.has('lru3') === true, 'LRU preserves newest items');
  
  // Test 5: getOrSet
  console.log('\nTest 5: getOrSet Pattern');
  let callCount = 0;
  
  async function expensiveOperation() {
    callCount++;
    return `result_${callCount}`;
  }
  
  const result1 = await cache.getOrSet('expensive', expensiveOperation);
  const result2 = await cache.getOrSet('expensive', expensiveOperation);
  
  assert(result1 === result2, 'getOrSet returns same cached value');
  assert(callCount === 1, 'getOrSet only calls function once');
  
  // Test 6: Statistics
  console.log('\nTest 6: Statistics');
  cache.resetStats();
  
  cache.set('stats_test', 'value');
  cache.get('stats_test'); // hit
  cache.get('nonexistent'); // miss
  
  const stats = cache.getStats();
  assert(stats.hits === 1, 'Stats track hits correctly');
  assert(stats.misses === 1, 'Stats track misses correctly');
  assert(stats.sets === 1, 'Stats track sets correctly');
  
  // Test 7: Touch (TTL extension)
  console.log('\nTest 7: Touch TTL Extension');
  cache.set('touch_test', 'value', 200); // 200ms TTL
  
  setTimeout(() => {
    cache.touch('touch_test', 300); // Extend to 300ms from now
  }, 100);
  
  await new Promise(resolve => setTimeout(resolve, 250));
  assert(cache.get('touch_test') === 'value', 'Touch extends TTL correctly');
  
  // Test 8: Cache Info
  console.log('\nTest 8: Cache Info');
  cache.set('info_test', 'value', 5000);
  const info = cache.getInfo('info_test');
  
  assert(info !== null, 'getInfo returns info for existing key');
  assert(info.key === 'info_test', 'Info contains correct key');
  assert(typeof info.createdAt === 'number', 'Info contains createdAt timestamp');
  assert(typeof info.ttl === 'number', 'Info contains TTL');
  
  // Test 9: Events
  console.log('\nTest 9: Event System');
  let eventFired = false;
  
  cache.on('set', (key, value) => {
    if (key === 'event_test') {
      eventFired = true;
    }
  });
  
  cache.set('event_test', 'value');
  assert(eventFired === true, 'Events are fired correctly');
  
  // Test 10: Utility Functions
  console.log('\nTest 10: Utility Functions');
  assert(EasyCache.utils.parseTime('1h') === 3600000, 'parseTime converts hours correctly');
  assert(EasyCache.utils.parseTime('30m') === 1800000, 'parseTime converts minutes correctly');
  assert(EasyCache.utils.parseTime('5s') === 5000, 'parseTime converts seconds correctly');
  
  const formatted = EasyCache.utils.formatBytes(1024);
  assert(formatted.includes('KB'), 'formatBytes formats correctly');
  
  // Test 11: Clear
  console.log('\nTest 11: Clear Operation');
  cache.set('clear_test1', 'value1');
  cache.set('clear_test2', 'value2');
  assert(cache.size() === 2, 'Cache has expected size before clear');
  
  cache.clear();
  assert(cache.size() === 0, 'Clear removes all items');
  assert(cache.get('clear_test1') === undefined, 'Clear removes specific items');
  
  // Cleanup
  cache.destroy();
  lruCache.destroy();
  
  console.log('\n🎉 All tests passed!');
}

// Handle errors
runTests().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});

// Export untuk testing framework lain
module.exports = { runTests };