// test/easycache.test.js - Simple tests for EasyCache
const EasyCache = require('../src/easycache');

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
  const cache1 = new EasyCache();
  
  await cache1.set('test1', 'value1');
  assert(await cache1.get('test1') === 'value1', 'Basic set/get works');
  assert(await cache1.has('test1') === true, 'has() returns true for existing key');
  assert(await cache1.has('nonexistent') === false, 'has() returns false for non-existing key');
  
  await cache1.delete('test1');
  assert(await cache1.get('test1') === undefined, 'delete() removes key');
  cache1.destroy();
  
  // Test 2: TTL
  console.log('\nTest 2: TTL Functionality');
  const cache2 = new EasyCache();
  await cache2.set('ttl_test', 'expires_soon', 100); // 100ms TTL
  assert(await cache2.get('ttl_test') === 'expires_soon', 'TTL key initially available');
  
  await new Promise(resolve => setTimeout(resolve, 150));
  assert(await cache2.get('ttl_test') === undefined, 'TTL key expires correctly');
  cache2.destroy();
  
  // Test 3: Multiple operations
  console.log('\nTest 3: Multiple Operations');
  const cache3 = new EasyCache();
  await cache3.setMultiple({
    'multi1': 'value1',
    'multi2': 'value2',
    'multi3': 'value3'
  });
  
  const multiResults = await cache3.getMultiple(['multi1', 'multi2', 'multi3']);
  assert(Object.keys(multiResults).length === 3, 'getMultiple returns all keys');
  assert(multiResults.multi1 === 'value1', 'getMultiple returns correct values');
  
  await cache3.deleteMultiple(['multi1', 'multi2']);
  assert(await cache3.get('multi1') === undefined, 'deleteMultiple removes keys');
  assert(await cache3.get('multi3') === 'value3', 'deleteMultiple preserves other keys');
  cache3.destroy();
  
  // Test 4: LRU Eviction
  console.log('\nTest 4: LRU Eviction');
  const lruCache = new EasyCache({ maxSize: 2 });
  
  await lruCache.set('lru1', 'value1');
  await lruCache.set('lru2', 'value2');
  await lruCache.set('lru3', 'value3'); // Should evict lru1
  
  assert(await lruCache.has('lru1') === false, 'LRU eviction removes oldest item');
  assert(await lruCache.has('lru2') === true, 'LRU preserves recent items');
  assert(await lruCache.has('lru3') === true, 'LRU preserves newest items');
  lruCache.destroy();
  
  // Test 5: getOrSet
  console.log('\nTest 5: getOrSet Pattern');
  const cache5 = new EasyCache();
  let callCount = 0;
  
  async function expensiveOperation() {
    callCount++;
    return `result_${callCount}`;
  }
  
  const result1 = await cache5.getOrSet('expensive', expensiveOperation);
  const result2 = await cache5.getOrSet('expensive', expensiveOperation);
  
  assert(result1 === result2, 'getOrSet returns same cached value');
  assert(callCount === 1, 'getOrSet only calls function once');
  cache5.destroy();
  
  // Test 6: Statistics
  console.log('\nTest 6: Statistics');
  const cache6 = new EasyCache();
  cache6.resetStats();
  
  await cache6.set('stats_test', 'value');
  await cache6.get('stats_test'); // hit
  await cache6.get('nonexistent'); // miss
  
  const stats = cache6.getStats();
  assert(stats.hits === 1, 'Stats track hits correctly');
  assert(stats.misses === 1, 'Stats track misses correctly');
  assert(stats.sets === 1, 'Stats track sets correctly');
  cache6.destroy();
  
  // Test 7: Touch (TTL extension)
  console.log('\nTest 7: Touch TTL Extension');
  const cache7 = new EasyCache();
  await cache7.set('touch_test', 'value', 200); // 200ms TTL
  
  setTimeout(async () => {
    await cache7.touch('touch_test', 300); // Extend to 300ms from now
  }, 100);
  
  await new Promise(resolve => setTimeout(resolve, 250));
  assert(await cache7.get('touch_test') === 'value', 'Touch extends TTL correctly');
  cache7.destroy();
  
  // Test 8: Cache Info
  console.log('\nTest 8: Cache Info');
  const cache8 = new EasyCache();
  await cache8.set('info_test', 'value', 5000);
  const info = cache8.getInfo('info_test');
  
  assert(info !== null, 'getInfo returns info for existing key');
  assert(info.key === 'info_test', 'Info contains correct key');
  assert(typeof info.createdAt === 'number', 'Info contains createdAt timestamp');
  assert(typeof info.ttl === 'number', 'Info contains TTL');
  cache8.destroy();
  
  // Test 9: Events
  console.log('\nTest 9: Event System');
  const cache9 = new EasyCache();
  let eventFired = false;
  
  cache9.on('set', (key, value) => {
    if (key === 'event_test') {
      eventFired = true;
    }
  });
  
  await cache9.set('event_test', 'value');
  assert(eventFired === true, 'Events are fired correctly');
  cache9.destroy();
  
  // Test 10: Utility Functions
  console.log('\nTest 10: Utility Functions');
  // Utility functions don't need a cache instance, but we'll create one for consistency
  const cache10 = new EasyCache();
  assert(EasyCache.utils.parseTime('1h') === 3600000, 'parseTime converts hours correctly');
  assert(EasyCache.utils.parseTime('30m') === 1800000, 'parseTime converts minutes correctly');
  assert(EasyCache.utils.parseTime('5s') === 5000, 'parseTime converts seconds correctly');
  
  const formatted = EasyCache.utils.formatBytes(1024);
  assert(formatted.includes('KB'), 'formatBytes formats correctly');
  cache10.destroy();
  
  // Test 11: Clear
  console.log('\nTest 11: Clear Operation');
  const cache11 = new EasyCache();
  await cache11.set('clear_test1', 'value1');
  await cache11.set('clear_test2', 'value2');
  assert(await cache11.size() === 2, 'Cache has expected size before clear');
  
  await cache11.clear();
  assert(await cache11.size() === 0, 'Clear removes all items');
  assert(await cache11.get('clear_test1') === undefined, 'Clear removes specific items');
  cache11.destroy();
  
  console.log('\n🎉 All tests passed!');
}

// Handle errors
runTests().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});

// Export for other testing frameworks
module.exports = { runTests };

// Run if executed directly
if (require.main === module) {
  // No operation
}
