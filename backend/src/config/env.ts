const NODE_ENV_VALUES = ['development', 'test', 'production'] as const;
const COOKIE_SAME_SITE_VALUES = ['lax', 'strict', 'none'] as const;

type NodeEnv = (typeof NODE_ENV_VALUES)[number];
type CookieSameSite = (typeof COOKIE_SAME_SITE_VALUES)[number];
type TrustProxyValue = boolean | string | string[];

type EnvironmentInput = Record<string, string | undefined>;

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  stateTtlSeconds: number;
};

function parseGoogle(
  input: EnvironmentInput,
  nodeEnv: NodeEnv,
): GoogleOAuthConfig | undefined {
  const keys = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_OAUTH_REDIRECT_URI',
    'GOOGLE_OAUTH_STATE_TTL_SECONDS',
  ];
  if (!keys.some((key) => input[key] !== undefined)) return undefined;
  const clientId = requireString(input, 'GOOGLE_CLIENT_ID');
  const clientSecret = requireString(input, 'GOOGLE_CLIENT_SECRET');
  const redirectUri = requireString(input, 'GOOGLE_OAUTH_REDIRECT_URI');
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new Error('Invalid GOOGLE_OAUTH_REDIRECT_URI');
  }
  if (
    input.GOOGLE_OAUTH_REDIRECT_URI !== redirectUri ||
    url.href !== redirectUri ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/auth/google/callback' ||
    (url.protocol !== 'https:' &&
      !(
        nodeEnv !== 'production' &&
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      ))
  ) {
    throw new Error('Invalid GOOGLE_OAUTH_REDIRECT_URI');
  }
  const stateTtlSeconds = parseRedisSetting(
    input.GOOGLE_OAUTH_STATE_TTL_SECONDS,
    'GOOGLE_OAUTH_STATE_TTL_SECONDS',
    300,
    30,
    300,
  );
  return { clientId, clientSecret, redirectUri, stateTtlSeconds };
}

export type EnvironmentConfig = {
  google?: GoogleOAuthConfig;
  nodeEnv: NodeEnv;
  host: string;
  port: number;
  databaseUrl: string;
  databaseReadyTimeoutMs: number;
  redisUrl: string;
  redisConnectTimeoutMs: number;
  redisMaxReconnectAttempts: number;
  redisReconnectBaseDelayMs: number;
  ipHashSecret: string;
  clickRetentionDays: number;
  loadTestMode: boolean;
  loadTestRateLimitMax: number;
  jwtSecret: string;
  accessTokenTtlSeconds: number;
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
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1000) {
    throw new Error(`Invalid COOKIE_MAX_AGE: ${raw}. Expected an integer of at least 1000 milliseconds.`);
  }

  return value;
}

function parseDatabaseReadyTimeout(raw: string | undefined): number {
  const value = raw === undefined ? 1000 : Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 5000) {
    throw new Error('Invalid DATABASE_READY_TIMEOUT_MS: expected an integer between 1 and 5000.');
  }
  return value;
}

function parseAccessTokenTtl(raw: string | undefined): number {
  const value = raw === undefined ? 900 : Number(raw);
  if (!Number.isInteger(value) || value < 60 || value > 3600) {
    throw new Error('Invalid ACCESS_TOKEN_TTL_SECONDS: expected an integer between 60 and 3600.');
  }
  return value;
}

function parseRedisSetting(
  raw: string | undefined,
  key: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const value = raw === undefined ? defaultValue : Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Invalid ${key}: expected an integer between ${min} and ${max}.`);
  }
  return value;
}

function parseLoadTestMode(raw: string | undefined, nodeEnv: NodeEnv): boolean {
  const enabled = raw === undefined ? false : parseBoolean(raw, 'LOAD_TEST_MODE');
  if (enabled && nodeEnv === 'production') {
    throw new Error('Invalid LOAD_TEST_MODE: benchmark mode is not allowed in production.');
  }
  return enabled;
}

export function getEnvironmentConfig(input: EnvironmentInput = process.env): EnvironmentConfig {
  const nodeEnv = parseNodeEnv(requireString(input, 'NODE_ENV'));
  const host = requireString(input, 'HOST');
  const port = parsePort(requireString(input, 'PORT'));
  const databaseUrl = requireString(input, 'DATABASE_URL');
  const redisUrl = requireString(input, 'REDIS_URL');
  const jwtSecret = requireString(input, 'JWT_SECRET');
  const ipHashSecret = requireString(input, 'IP_HASH_SECRET');
  const loadTestMode = parseLoadTestMode(input.LOAD_TEST_MODE, nodeEnv);

  if (jwtSecret.length < 32) {
    throw new Error('Invalid JWT_SECRET: expected a value with at least 32 characters.');
  }
  if (ipHashSecret.length < 32) {
    throw new Error('Invalid IP_HASH_SECRET: expected a value with at least 32 characters.');
  }

  const cookieName = requireString(input, 'COOKIE_NAME');
  if (!/^[A-Za-z0-9_-]+$/.test(cookieName) || cookieName.startsWith('__Host-')) {
    throw new Error('Invalid COOKIE_NAME for an /auth scoped cookie.');
  }
  const cookieSecure = parseBoolean(requireString(input, 'COOKIE_SECURE'), 'COOKIE_SECURE');
  const cookieSameSite = parseSameSite(requireString(input, 'COOKIE_SAME_SITE'));
  if ((cookieSameSite === 'none' || cookieName.startsWith('__Secure-')) && !cookieSecure) {
    throw new Error('Cookie configuration requires COOKIE_SECURE=true.');
  }
  const cookieMaxAgeMs = parseMaxAge(requireString(input, 'COOKIE_MAX_AGE'));
  const corsAllowedOrigins = parseStringList(input.CORS_ALLOWED_ORIGINS, 'CORS_ALLOWED_ORIGINS');
  const trustProxy = parseTrustProxy(input.TRUST_PROXY);

  const isSecureCookieAllowed = nodeEnv === 'production' ? cookieSecure : true;
  if (!isSecureCookieAllowed && nodeEnv === 'production') {
    throw new Error('Invalid COOKIE_SECURE: production requires secure cookies.');
  }

  const google = parseGoogle(input, nodeEnv);
  return {
    ...(google ? { google } : {}),
    nodeEnv,
    host,
    port,
    databaseUrl,
    databaseReadyTimeoutMs: parseDatabaseReadyTimeout(input.DATABASE_READY_TIMEOUT_MS),
    redisUrl,
    redisConnectTimeoutMs: parseRedisSetting(input.REDIS_CONNECT_TIMEOUT_MS, 'REDIS_CONNECT_TIMEOUT_MS', 1000, 1, 5000),
    redisMaxReconnectAttempts: parseRedisSetting(input.REDIS_MAX_RECONNECT_ATTEMPTS, 'REDIS_MAX_RECONNECT_ATTEMPTS', 5, 0, 10),
    redisReconnectBaseDelayMs: parseRedisSetting(input.REDIS_RECONNECT_BASE_DELAY_MS, 'REDIS_RECONNECT_BASE_DELAY_MS', 100, 1, 1000),
    loadTestMode,
    loadTestRateLimitMax: parseRedisSetting(input.LOAD_TEST_RATE_LIMIT_MAX, 'LOAD_TEST_RATE_LIMIT_MAX', 100000, 101, 1000000),
    ipHashSecret,
    clickRetentionDays: parseRedisSetting(input.CLICK_RETENTION_DAYS, 'CLICK_RETENTION_DAYS', 90, 1, 3650),
    jwtSecret,
    accessTokenTtlSeconds: parseAccessTokenTtl(input.ACCESS_TOKEN_TTL_SECONDS),
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
