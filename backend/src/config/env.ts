const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;
const COOKIE_SAME_SITE_VALUES = ['lax', 'strict', 'none'] as const;

type NodeEnv = (typeof NODE_ENV_VALUES)[number];
type CookieSameSite = (typeof COOKIE_SAME_SITE_VALUES)[number];
type TrustProxyValue = boolean | string | string[];

type EnvironmentInput = Record<string, string | undefined>;

export type EnvironmentConfig = {
  nodeEnv: NodeEnv;
  host: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  cookie: {
    name: string;
    secure: boolean;
    sameSite: CookieSameSite;
    maxAgeMs: number;
  };
  corsAllowedOrigins: string[];
  trustProxy: TrustProxyValue;
};

function requireString(input: EnvironmentInput, key: string): string {
  const value = input[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing or invalid environment variable: ${key}`);
  }

  return value.trim();
}

function parseStringList(raw: string | undefined, key: string): string[] {
  if (!raw || raw.trim() === '') {
    throw new Error(`Missing or invalid environment variable: ${key}`);
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function parseTrustProxy(raw: string | undefined): TrustProxyValue {
  if (!raw || raw.trim() === '') {
    return false;
  }

  const value = raw.trim();
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value.includes(',') ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : value;
}

function parseNodeEnv(raw: string): NodeEnv {
  if (!NODE_ENV_VALUES.includes(raw as NodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${raw}. Expected one of: ${NODE_ENV_VALUES.join(', ')}`);
  }

  return raw as NodeEnv;
}

function parsePort(raw: string): number {
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}. Expected an integer between 1 and 65535.`);
  }

  return port;
}

function parseBoolean(raw: string, key: string): boolean {
  if (raw === 'true') {
    return true;
  }

  if (raw === 'false') {
    return false;
  }

  throw new Error(`Invalid ${key}: ${raw}. Expected 'true' or 'false'.`);
}

function parseSameSite(raw: string): CookieSameSite {
  if (!COOKIE_SAME_SITE_VALUES.includes(raw as CookieSameSite)) {
    throw new Error(`Invalid COOKIE_SAME_SITE: ${raw}. Expected one of: ${COOKIE_SAME_SITE_VALUES.join(', ')}`);
  }

  return raw as CookieSameSite;
}

function parseMaxAge(raw: string): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid COOKIE_MAX_AGE: ${raw}. Expected a non-negative integer.`);
  }

  return value;
}

export function getEnvironmentConfig(input: EnvironmentInput = process.env): EnvironmentConfig {
  const nodeEnv = parseNodeEnv(requireString(input, 'NODE_ENV'));
  const host = requireString(input, 'HOST');
  const port = parsePort(requireString(input, 'PORT'));
  const databaseUrl = requireString(input, 'DATABASE_URL');
  const redisUrl = requireString(input, 'REDIS_URL');
  const jwtSecret = requireString(input, 'JWT_SECRET');

  if (jwtSecret.length < 32) {
    throw new Error('Invalid JWT_SECRET: expected a value with at least 32 characters.');
  }

  const cookieName = requireString(input, 'COOKIE_NAME');
  const cookieSecure = parseBoolean(requireString(input, 'COOKIE_SECURE'), 'COOKIE_SECURE');
  const cookieSameSite = parseSameSite(requireString(input, 'COOKIE_SAME_SITE'));
  const cookieMaxAgeMs = parseMaxAge(requireString(input, 'COOKIE_MAX_AGE'));
  const corsAllowedOrigins = parseStringList(input.CORS_ALLOWED_ORIGINS, 'CORS_ALLOWED_ORIGINS');
  const trustProxy = parseTrustProxy(input.TRUST_PROXY);

  const isSecureCookieAllowed = nodeEnv === 'production' ? cookieSecure : true;
  if (!isSecureCookieAllowed && nodeEnv === 'production') {
    throw new Error('Invalid COOKIE_SECURE: production requires secure cookies.');
  }

  return {
    nodeEnv,
    host,
    port,
    databaseUrl,
    redisUrl,
    jwtSecret,
    cookie: {
      name: cookieName,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAgeMs: cookieMaxAgeMs,
    },
    corsAllowedOrigins,
    trustProxy,
  };
}
