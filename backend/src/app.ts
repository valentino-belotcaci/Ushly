import Fastify, { type FastifyInstance, type FastifyLoggerOptions } from 'fastify';

import { getEnvironmentConfig, type EnvironmentConfig } from './config/env.js';

type LoggerWithRedaction = FastifyLoggerOptions & {
  redact?: string[];
};

const REDACTED_VALUE = '[REDACTED]';
const SENSITIVE_KEY_TOKENS = [
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'secret',
  'token',
  'jwt',
  'api-key',
  'apikey',
  'access-token',
  'refresh-token',
];

type BuildAppOptions = {
  env?: EnvironmentConfig;
  logger?: boolean | LoggerWithRedaction;
};

export function redactSensitiveValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveValue(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
        if (SENSITIVE_KEY_TOKENS.some((token) => key.toLowerCase().includes(token))) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactSensitiveValue(nestedValue)];
      })
    ) as T;
  }

  return value;
}

function getLoggerOptions(
  nodeEnv: EnvironmentConfig['nodeEnv'],
  loggerOverride?: boolean | LoggerWithRedaction
): boolean | LoggerWithRedaction {
  if (loggerOverride === false) {
    return false;
  }

  if (loggerOverride && typeof loggerOverride !== 'boolean') {
    return loggerOverride;
  }

  if (nodeEnv === 'test') {
    return false;
  }

  const level = nodeEnv === 'production' ? 'info' : 'debug';

  return {
    level,
    redact: [
      'authorization',
      'cookie',
      'set-cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers.x-api-key',
      'req.body.password',
      'req.body.token',
      'req.body.authorization',
      'password',
      'token',
      'secret',
      'jwtSecret',
      'accessToken',
      'refreshToken',
    ],
  };
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnvironmentConfig();
  const app = Fastify({
    logger: getLoggerOptions(env.nodeEnv, options.logger),
    trustProxy: env.nodeEnv === 'production',
  });

  app.get('/health/live', async () => ({
    ok: true,
    env: env.nodeEnv,
  }));

  return app;
}

export type { BuildAppOptions };
