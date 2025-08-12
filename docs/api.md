# API Documentation

### Basic Methods

- `set(key, value, ttl?, tags?, condition?)`: Sets a value in the cache.
- `get(key)`: Retrieves a value from the cache.
- `has(key)`: Checks if a key exists in the cache.
- `delete(key)`: Deletes a key from the cache.
- `clear()`: Clears all items from the cache.
- `size()`: Gets the number of items in the cache.
- `keys()`: Gets all keys in the cache.

### Advanced Methods

- `getOrSet(key, fn, ttl?, loaderOptions?)`: Gets a value or sets it with a function if it doesn't exist.
- `setMultiple(items, ttl?)`: Sets multiple values at once.
- `getMultiple(keys)`: Gets multiple values at once.
- `deleteMultiple(keys)`: Deletes multiple keys at once.
- `setWithTags(key, value, ttl?, tags?)`: Sets a cache value with associated tags.
- `getByTag(tag)`: Gets all cache items associated with a specific tag.
- `deleteByTag(tag)`: Deletes all cache items associated with a specific tag.
- `touch(key, ttl)`: Updates the TTL for an existing key.
- `getInfo(key)`: Gets detailed information for a key.
- `preload(keys, loaderFn, ttl?, loaderOptions?)`: Preloads keys into the cache.

### Statistics

- `getStats()`: Gets cache statistics.
- `getStatsByTag(tag)`: Gets statistics for a specific tag.
- `resetStats()`: Resets all statistics.

### Events

Listen for events using `cache.on('eventName', callback)`.

- `set`: When an item is added to the cache.
- `get`: When an item is retrieved from the cache.
- `delete`: When an item is deleted from the cache.
- `expired`: When an item expires.
- `evicted`: When an item is evicted from the cache.
- `clear`: When the cache is cleared.
- `cleanup`: When the cleanup process for expired items runs.
- `revalidate`: When stale content is served while revalidating.
- `error`: When an error occurs.
