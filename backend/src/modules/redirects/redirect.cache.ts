import type { RedisClientType } from 'redis';

export const REDIRECT_CACHE_VERSION = 1;//usefull for cache invalidation when the structure of the cached data changes
export const REDIRECT_CACHE_TTL_SECONDS = 300;//5 minutes, the maximum time a redirect can be cached in Redis

type CachedRedirect = {//json structure stored in redis
  version: number;
  destinationUrl: string;
  status: 'active' | 'disabled' | 'expired';
  expiresAt: string | null;
};

let cacheHits = 0;//asked redis for a redirect and it was found in the cache
let cacheMisses = 0;//asked redis for a redirect and it was not found in the cache

export function redirectCacheKey(shortCode: string): string {
  return `ushly:v${REDIRECT_CACHE_VERSION}:redirect:${shortCode}`;
}//eg. ushly:v1:redirect:abc123

export function getRedirectCacheMetrics() {
  return { cacheHits, cacheMisses };
}

export function resetRedirectCacheMetrics(): void {//for testing
  cacheHits = 0;
  cacheMisses = 0;
}

//does the cached data have the correct structure?
//if this function returns true,typescript will treat the value as a CachedRedirect type
function isValidCachedRedirect(value: unknown): value is CachedRedirect {
  if (typeof value !== 'object' || value === null) return false;
  if (!('version' in value) || !('destinationUrl' in value)) return false;
  if (!('status' in value) || !('expiresAt' in value)) return false;

  //vaidate values and types of the cached data
  return (
    value.version === REDIRECT_CACHE_VERSION &&
    typeof value.destinationUrl === 'string' &&
    ['active', 'disabled', 'expired'].includes(value.status as string) &&
    (value.expiresAt === null || typeof value.expiresAt === 'string')
  );
}

//the cached data must be valid and the link must be active and not expired
function isUsableCachedRedirect(value: CachedRedirect): boolean {
  return (
    value.status === 'active' &&
    (value.expiresAt === null || Date.parse(value.expiresAt) > Date.now())
  );
}

export async function getCachedRedirect(//read cache
  redis: RedisClientType,
  shortCode: string,
): Promise<string | null> {
  if (!redis.isReady) {
    cacheMisses += 1;
    return null;
  }

  try {
    const raw = await redis.get(redirectCacheKey(shortCode));
    if (raw === null) {//bot found
      cacheMisses += 1;
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {//if doesn't contain a valid JSON string
      cacheMisses += 1;
      //if redis deletion fails, ignore the error and continue
      await redis.del(redirectCacheKey(shortCode)).catch(() => undefined);
      return null;
    }
    //is the cached data valid and usable?
    if (!isValidCachedRedirect(parsed) || !isUsableCachedRedirect(parsed)) {
      cacheMisses += 1;
      await redis.del(redirectCacheKey(shortCode)).catch(() => undefined);
      return null;
    }

    cacheHits += 1;
    return parsed.destinationUrl;
  } catch {
    cacheMisses += 1;
    return null;
  }
}

export async function setCachedRedirect(//put redirect into cache
  redis: RedisClientType,
  shortCode: string,
  destinationUrl: string,
  status: 'active' | 'disabled' | 'expired',
  expiresAt: Date | null,
): Promise<void> {
  //dont cache if redis is not ready or the link is not active
  if (!redis.isReady || status !== 'active') 
    return;

  //never let the cached redirect expire later than the actual link expiration date
  const remainingSeconds = expiresAt === null//if the link has no expiration date, use the default cache TTL
    ? REDIRECT_CACHE_TTL_SECONDS
    : Math.min(
        REDIRECT_CACHE_TTL_SECONDS,
        Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)),
      );

  if (expiresAt !== null && expiresAt.getTime() <= Date.now()) return;

  //build cached redirect object to store in redis
  const value: CachedRedirect = {
    version: REDIRECT_CACHE_VERSION,
    destinationUrl,
    status,
    expiresAt: expiresAt?.toISOString() ?? null,
  };

  //add the cached redirect to redis with an expiration time
  await redis
    .set(redirectCacheKey(shortCode), JSON.stringify(value), { EX: remainingSeconds }) //expire this key after the remaining seconds
    .catch(() => undefined);
}

//delete the cached redirect for this shortcode because the link has been updated or deleted
export async function invalidateRedirectCache(
  redis: RedisClientType,
  shortCode: string,
): Promise<void> {
  if (!redis.isReady) return;
  await redis.del(redirectCacheKey(shortCode)).catch(() => undefined);
}
