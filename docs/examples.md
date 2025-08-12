# Examples

Check the `examples/` directory in the root of the project for more detailed examples.

### API Response Caching

```javascript
const cache = new EasyCache({ maxSize: 1000, defaultTTL: 300000 });

async function fetchUserWithCache(userId) {
  return await cache.getOrSet(`user:${userId}`, async () => {
    const response = await fetch(`/api/users/${userId}`);
    return await response.json();
  }, 600000); // Cache for 10 minutes
}
```

### Database Query Caching

```javascript
const cache = new EasyCache({ maxSize: 500 });

async function getProductsWithCache(category) {
  const cacheKey = `products:${category}`;
  
  return await cache.getOrSet(cacheKey, async () => {
    return await db.query('SELECT * FROM products WHERE category = ?', [category]);
  }, EasyCache.utils.parseTime('15m'));
}
```
