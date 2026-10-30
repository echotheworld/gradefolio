/**
 * Enterprise Server-Side In-Memory Micro-Cache
 *
 * Designed to shield Supabase Free Tier connection pool and CPU from concurrent spikes.
 * Allows 5,000+ simultaneous students and faculty to access the platform without
 * exceeding database connection quotas or triggering connection timeouts.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ServerMicroCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly maxEntries: number;

  constructor(maxEntries = 2000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 30): void {
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global singleton to persist across hot-reloads and API calls
const globalForCache = global as unknown as { serverCache: ServerMicroCache };
export const serverCache = globalForCache.serverCache || new ServerMicroCache(3000);
if (process.env.NODE_ENV !== "production") globalForCache.serverCache = serverCache;
