import type { RedisClientType } from 'redis';

type RateLimitResult = { current: number; ttl: number };
type RateLimitCallback = (
  error: Error | null,
  result?: RateLimitResult,
) => void;

type StoreOptions = {
  continueExceeding: boolean;
  exponentialBackoff: boolean;
  nameSpace: string;
};

const incrementScript = `
local key = KEYS[1]
local timeWindow = tonumber(ARGV[1])
local max = tonumber(ARGV[2])
local continueExceeding = ARGV[3] == 'true'
local exponentialBackoff = ARGV[4] == 'true'
local maxSafeInteger = (2^53) - 1
local current = redis.call('INCR', key)

if current == 1 or (continueExceeding and current > max) then
  redis.call('PEXPIRE', key, timeWindow)
elseif exponentialBackoff and current > max then
  local exponent = current - max - 1
  timeWindow = math.min(timeWindow * (2 ^ exponent), maxSafeInteger)
  redis.call('PEXPIRE', key, timeWindow)
else
  timeWindow = redis.call('PTTL', key)
end

return {current, timeWindow}
`;

const readScript = `
local current = redis.call('GET', KEYS[1])
if not current then return {0, 0} end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then ttl = 0 end
return {tonumber(current), ttl}
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function booleanOption(value: unknown, key: string): boolean {
  return isRecord(value) && typeof value[key] === 'boolean'
    ? value[key]
    : false;
}

function stringOption(value: unknown, key: string, fallback: string): string {
  return isRecord(value) && typeof value[key] === 'string'
    ? value[key]
    : fallback;
}

function decodeResult(value: unknown): RateLimitResult {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== 'number' ||
    typeof value[1] !== 'number'
  ) {
    throw new Error('Redis returned an invalid rate-limit result');
  }
  return { current: value[0], ttl: value[1] };
}

function safeError(): Error {
  return new Error('Redis rate-limit operation failed');
}

export function createRedisRateLimitStore(
  redis: RedisClientType,
  nameSpace = 'fastify-rate-limit-',
) {
  return class NodeRedisRateLimitStore {
    private readonly options: StoreOptions;

    constructor(options: object) {
      this.options = {
        continueExceeding: booleanOption(options, 'continueExceeding'),
        exponentialBackoff: booleanOption(options, 'exponentialBackoff'),
        nameSpace: stringOption(options, 'nameSpace', nameSpace),
      };
    }

    incr(
      key: string,
      callback: RateLimitCallback,
      timeWindow: number,
      max: number,
    ): void {
      void redis
        .eval(incrementScript, {
          keys: [`${this.options.nameSpace}${key}`],
          arguments: [
            String(timeWindow),
            String(max),
            String(this.options.continueExceeding),
            String(this.options.exponentialBackoff),
          ],
        })
        .then((value) => callback(null, decodeResult(value)))
        .catch(() => callback(safeError()));
    }

    read(
      key: string,
      callback: RateLimitCallback,
      timeWindow: number,
      max: number,
    ): void {
      void timeWindow;
      void max;
      void redis
        .eval(readScript, {
          keys: [`${this.options.nameSpace}${key}`],
          arguments: [],
        })
        .then((value) => callback(null, decodeResult(value)))
        .catch(() => callback(safeError()));
    }

    child(routeOptions: object): NodeRedisRateLimitStore {
      const routeInfo =
        isRecord(routeOptions) && isRecord(routeOptions.routeInfo)
          ? routeOptions.routeInfo
          : {};
      const method = stringOption(routeInfo, 'method', 'UNKNOWN');
      const url = stringOption(routeInfo, 'url', '/');
      return new NodeRedisRateLimitStore({
        continueExceeding: booleanOption(routeOptions, 'continueExceeding'),
        exponentialBackoff: booleanOption(routeOptions, 'exponentialBackoff'),
        nameSpace: `${this.options.nameSpace}${method}${url}-`,
      });
    }
  };
}
