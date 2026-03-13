# Redis Configuration & Troubleshooting

## Overview

BuildSpaces uses Redis for optional caching and session management. Redis is **not required** for development - the app gracefully falls back to in-memory storage when Redis is unavailable.

## Current Status

**Redis Status in Development**: ❌ DISABLED  
**Reason**: No Redis server running at `localhost:6379`  
**Fallback**: In-memory storage (works fine for development)

## Enabling Redis

### Option 1: Docker (Recommended)

```bash
# Start Redis in Docker
docker run -d -p 6379:6379 --name redis-buildspaces redis:7-alpine

# Verify it's running
docker logs redis-buildspaces
```

### Option 2: Local Installation

**Windows (via WSL or Chocolatey)**:
```bash
# Via Chocolatey
choco install redis

# Start Redis
redis-server
```

**macOS**:
```bash
# Via Homebrew
brew install redis

# Start Redis
brew services start redis
```

**Linux**:
```bash
# Debian/Ubuntu
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
```

### Option 3: Cloud Redis

For production, use a managed Redis service:

1. **AWS ElastiCache**
2. **Redis Cloud** (https://redis.com/cloud/)
3. **Azure Cache for Redis**
4. **Heroku Redis** (if using Heroku)

Then update `.env.local`:
```bash
REDIS_URL=redis://:[password]@[host]:[port]
USE_REDIS=true
```

## Configuration

### Environment Variables

```bash
# Enable/disable Redis
USE_REDIS=true              # Set to 'false' to use in-memory fallback

# Redis connection string
REDIS_URL=redis://localhost:6379

# For password-protected Redis
REDIS_URL=redis://:password@localhost:6379
```

### Connection Options

The app uses these Redis connection settings:

```typescript
{
  lazyConnect: true,              // Don't connect on init
  connectTimeout: 3000,           // 3 second timeout
  maxRetriesPerRequest: 1,        // No retries
  enableReadyCheck: false,        // Skip ready check
  enableOfflineQueue: false,      // Don't queue commands when offline
  retryStrategy: () => null,      // Don't retry after failure
}
```

## Usage

### Option 1: Using the Redis Client Utility

```typescript
import { getRedisClient } from '@/lib/redis-client'

const redis = await getRedisClient()
if (redis) {
  // Redis is available
  await redis.set('key', 'value', 'EX', 3600)
  const value = await redis.get('key')
} else {
  // Redis not available, use alternative
  console.log('Redis unavailable, using in-memory fallback')
}
```

### Option 2: Check Connection Status

```typescript
import { isRedisConnected, getRedisClient } from '@/lib/redis-client'

async function checkRedis() {
  const redis = await getRedisClient()
  if (isRedisConnected()) {
    console.log('✓ Redis connected')
  } else {
    console.log('✗ Redis not available, using in-memory fallback')
  }
}
```

## Common Issues & Solutions

### Issue 1: ioredis Unhandled Error Events

**Error**:
```
[ioredis] Unhandled error event: AggregateError
    at internalConnectMultiple (node:net:1193:18)
```

**Causes**:
- Redis server not running
- Redis URL misconfigured
- Network connectivity issues

**Solutions**:

1. **Disable Redis** (simplest for development):
   ```bash
   # In .env.local
   REDIS_URL=
   USE_REDIS=false
   ```

2. **Start Redis server**:
   ```bash
   # Option A: Docker
   docker run -d -p 6379:6379 redis:7-alpine
   
   # Option B: Local
   redis-server
   
   # Verify
   redis-cli ping  # Should output: PONG
   ```

3. **Check connection string**:
   ```bash
   # Correct format
   redis://localhost:6379
   redis://:password@localhost:6379
   
   # For Redis Cloud, check exact URL format
   ```

### Issue 2: Connection Timeout

**Error**:
```
Redis connection timeout
```

**Solutions**:
```bash
# 1. Verify Redis is running
redis-cli ping

# 2. Check firewall (production)
telnet localhost 6379

# 3. Verify environment variable
echo $REDIS_URL

# 4. Try with reduced timeout
# Edit lib/redis-client.ts connectTimeout: 5000
```

### Issue 3: Permission Denied

**Error**:
```
Error: connect EACCES
```

**Solutions**:
```bash
# 1. Check Redis credentials
redis-cli -h localhost -p 6379 -a password

# 2. On Linux, check socket permissions
sudo chown your-user /var/run/redis/redis.sock

# 3. For Docker, ensure port is exposed
docker run -d -p 6379:6379 redis:7-alpine
```

## Monitoring

### Check Redis Status

```bash
# Via redis-cli
redis-cli PING              # Should return PONG
redis-cli INFO              # Full server info
redis-cli KEYS '*'          # List all keys
redis-cli FLUSHDB           # Clear database (development only!)

# Via Node app
npm run dev  # Check logs for "[Redis] Connected successfully"
```

### View Cache Keys

```bash
# Redis CLI
redis-cli

# In Redis CLI
> KEYS *                    # List all keys
> TTL key-name              # Check expiration
> GET key-name              # Get value
> DEL key-name              # Delete key
```

## Development Workflow

### Without Redis (Recommended for Dev)

```bash
# .env.local
USE_REDIS=false
REDIS_URL=

# Run app normally
pnpm dev
```

**Benefits**:
- ✓ No external dependencies
- ✓ Easier development
- ✓ Self-contained environment
- ✓ No unhandled errors

### With Redis (Optional for Testing Caching)

```bash
# .env.local
USE_REDIS=true
REDIS_URL=redis://localhost:6379

# Start Redis (in another terminal)
docker run -d -p 6379:6379 redis:7-alpine

# Run app
pnpm dev
```

## Code Locations

| Component | Path | Purpose |
|-----------|------|---------|
| **Redis Client** | `lib/redis-client.ts` | Singleton Redis client with error handling |
| **Middleware** | `middleware.ts` | Rate limiting with Redis fallback |
| **Theater Viewers** | `app/api/theater/viewers/route.ts` | Viewer tracking |
| **Theater Stream** | `app/api/theater/stream/route.ts` | Stream state management |

## Best Practices

1. **Always check if Redis is available**:
   ```typescript
   const redis = await getRedisClient()
   if (redis) {
     // Use Redis
   } else {
     // Use fallback
   }
   ```

2. **Set expiration times**:
   ```typescript
   // Expire after 1 hour
   await redis.set('key', 'value', 'EX', 3600)
   ```

3. **Handle errors gracefully**:
   ```typescript
   try {
     await redis.set('key', 'value')
   } catch (error) {
     console.warn('Redis error, using fallback', error)
     // Use in-memory fallback
   }
   ```

4. **Use appropriate data structures**:
   ```typescript
   // String
   await redis.set('key', 'value')
   
   // Hash
   await redis.hset('session:123', 'field', 'value')
   
   // Set
   await redis.sadd('online-users', 'user1', 'user2')
   
   // List
   await redis.lpush('queue', 'item1', 'item2')
   ```

## Troubleshooting Checklist

- [ ] Redis server is running (`redis-cli ping` returns PONG)
- [ ] Port 6379 is accessible (or correct port configured)
- [ ] REDIS_URL environment variable is correct
- [ ] USE_REDIS is not set to 'false' (or is 'true')
- [ ] Network/firewall allows connection
- [ ] Redis credentials are correct (if password-protected)
- [ ] Check app logs for "[Redis] Connected successfully"

## Performance Optimization

### Connection Pool

```typescript
// Edit lib/redis-client.ts for production
const DEFAULT_REDIS_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: 3,     // Increase retries for production
  connectTimeout: 10000,       // Longer timeout for slow networks
  // ... other options
}
```

### Key Expiration

```typescript
// Always set TTL for cache keys
await redis.set('cache-key', data, 'EX', 300)  // 5 minutes

// Or use expiration separately
await redis.set('cache-key', data)
await redis.expire('cache-key', 300)
```

## Testing

### Local Testing

```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run tests
pnpm test

# Check Redis connections
redis-cli CLIENT LIST
```

### Integration Tests

Tests automatically skip Redis if unavailable - they use in-memory fallback.

## Migration Guide

### Migrating from In-Memory to Redis

1. Update `.env.local`:
   ```bash
   REDIS_URL=redis://localhost:6379
   USE_REDIS=true
   ```

2. Start Redis:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

3. Restart app:
   ```bash
   pnpm dev
   ```

### Migrating from Redis to In-Memory

1. Update `.env.local`:
   ```bash
   REDIS_URL=
   USE_REDIS=false
   ```

2. Restart app:
   ```bash
   pnpm dev
   ```

## Support & Resources

- **Redis Documentation**: https://redis.io/documentation
- **ioredis Library**: https://github.com/luin/ioredis
- **Redis Commands**: https://redis.io/commands/
- **BuildSpaces Repo**: [Your repo link]

---

**Last Updated**: March 7, 2026  
**Redis Status**: Optional (graceful fallback)  
**Current Mode**: In-memory (production-ready fallback)
