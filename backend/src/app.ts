import Fastify, { type FastifyError, type FastifyInstance, type FastifyLoggerOptions } from 'fastify';

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

type ErrorDetails = Record<string, unknown> | unknown[] | null;

type ErrorResponse = {
  error: string;
  message: string;
  details: ErrorDetails;
};

type BuildAppOptions = {
  env?: EnvironmentConfig;
  logger?: boolean | LoggerWithRedaction;
};

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: ErrorDetails;

  constructor(code: string, message: string, statusCode = 400, details: ErrorDetails = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

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

function toValidationDetails(error: FastifyError): unknown[] {
  if (!Array.isArray(error.validation) || error.validation.length === 0) {
    return [{ field: 'request', message: 'Request validation failed' }];
  }

  return error.validation.map((issue) => ({
    field: issue.instancePath || 'body',
    message: issue.message ?? 'Invalid value',
  }));
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? getEnvironmentConfig();
  const app = Fastify({
    logger: getLoggerOptions(env.nodeEnv, options.logger),
    trustProxy: env.nodeEnv === 'production',
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

  return app;
}

export type { BuildAppOptions, ErrorResponse };
