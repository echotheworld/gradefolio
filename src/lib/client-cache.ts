/**
 * High-performance Stale-While-Revalidate memory cache for client components.
 * Eliminates loading flashes on tab switching and delivers 0ms instant UI rendering.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Hydration gate.
 * During SSR and the first client hydration pass, cache reads MUST return null so the
 * client renders exactly what the server rendered (prevents hydration mismatches).
 * <HydrationMarker /> in the root layout flips this flag after the first commit, so
 * every subsequent client-side navigation gets 0ms instant paint from cache.
 */
let hydrationComplete = false;

export function markHydrationComplete(): void {
  hydrationComplete = true;
}

export function getCachedData<T>(key: string, maxAgeMs = 60000): T | null {
  if (typeof window === "undefined" || !hydrationComplete) return null;

  const entry = memoryCache.get(key);
  if (entry) {
    if (Date.now() - entry.timestamp < maxAgeMs) {
      return entry.data as T;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`gv_cache_${key}`);
      if (stored) {
        const parsed: CacheEntry<T> = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < maxAgeMs) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}
  }
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`gv_cache_${key}`, JSON.stringify(entry));
    } catch {}
  }
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { maxAgeMs?: number; forceFresh?: boolean }
): Promise<T> {
  const maxAgeMs = options?.maxAgeMs ?? 60000;

  if (!options?.forceFresh) {
    const cached = getCachedData<T>(key, maxAgeMs);
    if (cached !== null) {
      // Trigger background revalidation if older than 5 seconds
      const entry = memoryCache.get(key);
      if (entry && Date.now() - entry.timestamp > 5000) {
        fetcher()
          .then((fresh) => setCachedData(key, fresh))
          .catch(() => {});
      }
      return cached;
    }
  }

  // Deduplicate inflight requests to prevent redundant network calls
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key) as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      setCachedData(key, data);
      inFlightRequests.delete(key);
      return data;
    })
    .catch((err) => {
      inFlightRequests.delete(key);
      throw err;
    });

  inFlightRequests.set(key, promise);
  return promise;
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith("gv_cache_")) sessionStorage.removeItem(k);
        });
      } catch {}
    }
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(`gv_cache_${key}`);
        } catch {}
      }
    }
  }
}
