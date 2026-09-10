import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { authenticate } from './modules/auth/authenticate.js';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError, type FastifyLoggerOptions } from 'fastify';

import { getEnvironmentConfig, type EnvironmentConfig } from './config/env.js';
import { AppError, type ErrorDetails } from './errors/app-error.js';
import prismaPlugin from './plugins/prisma.plugin.js';
import authRoutes from './modules/auth/auth.routes.js';

export { AppError } from './errors/app-error.js';

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

const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;
const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;

type ErrorResponse = {
  error: string;
  message: string;
  details: ErrorDetails;
};

type BuildAppOptions = {
  env?: EnvironmentConfig;
  logger?: boolean | LoggerWithRedaction;
  rateLimitConfig?: {
    max?: number;
    timeWindow?: number | string;
  };
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

  if (nodeEnv === 'test' && !loggerOverride) {
    return false;
  }

  const level = nodeEnv === 'production' ? 'info' : 'debug';

  const overrides = typeof loggerOverride === 'object' ? loggerOverride : {};
  return {
    ...overrides,
    level: overrides.level ?? level,
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
      'passwordHash',
      'req.body.passwordHash',
      ...overrides.redact ?? [],
    ],
  };
}

function toValidationDetails(error: FastifyError): unknown[] {
  if (!Array.isArray(error.validation) || error.validation.length === 0) {
    return [{ field: 'request', message: 'Request validation failed' }];
  }

  return error.validation.map((issue) => ({
    field: issue.instancePath || 'body',
    message: issue.message ?? 'Invalid value',
  }));
}

export async function buildApp(options: BuildAppOptions = {}) {
  const env = options.env ?? getEnvironmentConfig();
  const app = Fastify({
    logger: getLoggerOptions(env.nodeEnv, options.logger),
    trustProxy: env.trustProxy,
    bodyLimit: DEFAULT_BODY_LIMIT_BYTES,
  });

  await app.register(prismaPlugin, {
    databaseUrl: env.databaseUrl,
    timeoutMs: env.databaseReadyTimeoutMs,
  });

  await app.register(jwt, {
    secret: env.jwtSecret,
    sign: { algorithm: 'HS256', expiresIn: env.accessTokenTtlSeconds },
    verify: { algorithms: ['HS256'], requiredClaims: ['sub', 'iat', 'exp'] },
  });
  app.decorateRequest('authenticatedUser', null);
  app.decorate('authenticate', authenticate);

  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  });

  const allowedOrigins = env.corsAllowedOrigins;
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  });

  await app.register(rateLimit, {
    global: true,
    max: options.rateLimitConfig?.max ?? DEFAULT_RATE_LIMIT_MAX,
    timeWindow: options.rateLimitConfig?.timeWindow ?? DEFAULT_RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => request.ip ?? 'unknown',
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

  app.setErrorHandler((error, request, reply) => {
    const logger = request.log ?? app.log;

    if (error instanceof AppError) {
      logger.warn({ err: error, statusCode: error.statusCode }, 'Application error');
      const response: ErrorResponse = {
        error: error.code,
        message: error.message,
        details: error.details,
      };
      return reply.code(error.statusCode).send(response);
    }

    if ((error as FastifyError).validation) {
      const validationError = error as FastifyError;
      const response: ErrorResponse = {
        error: 'validation_error',
        message: 'Request validation failed',
        details: toValidationDetails(validationError),
      };
      return reply.code(400).send(response);
    }

    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : undefined;

    if (statusCode === 429) {
      return reply.code(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      });
    }

    if (statusCode === 413 || statusCode === 415 || (error as FastifyError).code === 'FST_ERR_CTP_INVALID_JSON_BODY') {
      return reply.code(statusCode === 413 ? 413 : statusCode === 415 ? 415 : 400).send({
        error: 'validation_error',
        message: 'Request body is invalid or unsupported',
        details: null,
      });
    }

    logger.error({ err: error }, 'Unhandled request error');
    const response: ErrorResponse = {
      error: 'internal_server_error',
      message: 'An unexpected error occurred',
      details: null,
    };
    return reply.code(500).send(response);
  });

  app.get('/health/live', async () => ({
    ok: true,
    service: 'ushly-backend',
    environment: env.nodeEnv,
  }));

  app.get('/health/ready', async () => {
    await app.checkDatabaseConnection();
    return { ok: true };
  });

  await app.register(authRoutes);

  return app;
}

export type { BuildAppOptions, ErrorResponse };
