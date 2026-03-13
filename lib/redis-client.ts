/**
 * Redis Client Configuration Utility
 * 
 * Provides a singleton Redis client with proper error handling.
 * Gracefully falls back to in-memory storage if Redis is unavailable.
 * 
 * Usage:
 *   import { getRedisClient } from '@/lib/redis-client'
 *   const redis = await getRedisClient()
 *   if (redis) {
 *     await redis.set('key', 'value')
 *   }
 */

import { Redis, RedisOptions } from 'ioredis'

let redisClient: Redis | null = null
let redisInitAttempted = false
let redisConnected = false

/**
 * Redis connection options with safe defaults
 */
const DEFAULT_REDIS_OPTIONS: RedisOptions = {
  lazyConnect: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: 2,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  retryStrategy: (times) => (times < 3 ? 1000 : null), // Retry up to 3 times, then stop
}

/**
 * Initialize and return Redis client
 * Returns null if Redis is not configured or connection fails
 */
export async function getRedisClient(): Promise<Redis | null> {
  // Return existing client if already initialized
  if (redisInitAttempted) {
    return redisClient
  }

  redisInitAttempted = true

  const redisUrl = process.env.REDIS_URL
  const isRedisEnabled = process.env.USE_REDIS !== 'false'

  // Skip Redis if not configured or disabled
  if (!redisUrl || !isRedisEnabled) {
    console.log('[Redis] Redis not configured or disabled (USE_REDIS=false)')
    return null
  }

  try {
    const redis = new Redis(redisUrl, DEFAULT_REDIS_OPTIONS)

    // Setup error handlers before connecting
    redis.on('error', (error: Error) => {
      console.warn('[Redis] Connection error:', error.message)
      redisConnected = false
    })

    redis.on('connect', () => {
      console.log('[Redis] Connected successfully')
      redisConnected = true
    })

    redis.on('close', () => {
      console.log('[Redis] Connection closed')
      redisConnected = false
    })

    // Attempt connection with timeout
    try {
      await Promise.race([
        redis.connect(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 15000)
        ),
      ])

      redisClient = redis
      console.log('[Redis] Client initialized and connected')
      return redis
    } catch (connectError) {
      // Connection failed, but don't crash
      console.warn(
        '[Redis] Connection failed, falling back to in-memory storage:',
        connectError instanceof Error ? connectError.message : String(connectError)
      )

      // Clean up the unused client
      try {
        await redis.quit()
      } catch {
        // Ignore cleanup errors
      }

      return null
    }
  } catch (initError) {
    console.warn(
      '[Redis] Initialization failed, falling back to in-memory storage:',
      initError instanceof Error ? initError.message : String(initError)
    )
    return null
  }
}

/**
 * Check if Redis is currently connected
 */
export function isRedisConnected(): boolean {
  return redisConnected && redisClient !== null
}

/**
 * Get the Redis client without initializing (for internal use)
 */
export function getRedisClientSync(): Redis | null {
  return redisClient
}

/**
 * Disconnect Redis client (call on app shutdown)
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
      redisClient = null
      redisConnected = false
      redisInitAttempted = false
      console.log('[Redis] Disconnected cleanly')
    } catch (error) {
      console.warn('[Redis] Error during disconnect:', error)
    }
  }
}

/**
 * Reset Redis client (for testing or recovery)
 */
export function resetRedisClient(): void {
  redisClient = null
  redisConnected = false
  redisInitAttempted = false
}
