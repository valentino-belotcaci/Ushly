type Result = { current: number; ttl: number };
type Callback = (error: Error | null, result?: Result) => void;
type Entry = Result & { startedAt: number };

export function createTestRateLimitStore() {
  const entries = new Map<string, Entry>();

  return class TestRateLimitStore {
    private readonly prefix: string;

    constructor(_options: object, prefix = '') {
      this.prefix = prefix;
    }

    incr(key: string, callback: Callback, timeWindow: number): void {
      const storageKey = `${this.prefix}${key}`;
      const now = Date.now();
      const previous = entries.get(storageKey);
      const entry =
        !previous || previous.startedAt + timeWindow <= now
          ? { current: 1, ttl: timeWindow, startedAt: now }
          : {
              current: previous.current + 1,
              ttl: previous.startedAt + timeWindow - now,
              startedAt: previous.startedAt,
            };
      entries.set(storageKey, entry);
      callback(null, entry);
    }

    read(key: string, callback: Callback, timeWindow: number): void {
      const entry = entries.get(`${this.prefix}${key}`);
      const ttl = entry ? entry.startedAt + timeWindow - Date.now() : 0;
      callback(
        null,
        entry && ttl > 0 ? { current: entry.current, ttl } : { current: 0, ttl: 0 },
      );
    }

    child(routeOptions: object): TestRateLimitStore {
      const routeInfo =
        routeOptions !== null &&
        'routeInfo' in routeOptions &&
        routeOptions.routeInfo !== null &&
        typeof routeOptions.routeInfo === 'object'
          ? routeOptions.routeInfo
          : {};
      const method =
        'method' in routeInfo && typeof routeInfo.method === 'string'
          ? routeInfo.method
          : 'UNKNOWN';
      const url =
        'url' in routeInfo && typeof routeInfo.url === 'string'
          ? routeInfo.url
          : '/';
      return new TestRateLimitStore(routeOptions, `${this.prefix}${method}${url}-`);
    }
  };
}
