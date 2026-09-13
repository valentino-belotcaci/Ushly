import cookie from '@fastify/cookie';
import type { EnvironmentConfig } from '../../config/env.js';
import { refreshControllers } from './refresh.controller.js';
import type {
  FastifyPluginAsync,
  preValidationAsyncHookHandler,
} from 'fastify';

import { AppError } from '../../errors/app-error.js';
import { registerController, loginController } from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  type RegisterBody,
} from './auth.schemas.js';

const validateCredentials: preValidationAsyncHookHandler = async (request) => {
  // Fastify's default Ajv configuration coerces scalar types. Reject them
  // before validation so a numeric password cannot silently become a string.
  const body: unknown = request.body;
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !('email' in body) ||
    typeof body.email !== 'string' ||
    !('password' in body) ||
    typeof body.password !== 'string' ||
    Object.keys(body).some((key) => key !== 'email' && key !== 'password')
  ) {
    throw new AppError('validation_error', 'Request validation failed', 400);
  }
  body.email = body.email.trim();
};

const authRoutes: FastifyPluginAsync<{ env: EnvironmentConfig }> = async (
  app,
  { env },
) => {
  await app.register(cookie);
  // CORS alone does not prevent writes. Reject browser origins outside the
  // deployment allowlist before accepting or issuing a session cookie.
  app.addHook('onRequest', async (request) => {
    const origin = request.headers.origin;
    if (
      (origin && !env.corsAllowedOrigins.includes(origin)) ||
      (!origin && request.headers['sec-fetch-site'] === 'cross-site')
    ) {
      throw new AppError('forbidden', 'Request not allowed', 403);
    }
  });
  const controllers = refreshControllers(env);
  app.post(
    '/auth/refresh',
    {
      bodyLimit: 1024,
      config: { rateLimit: { max: 30, timeWindow: 60_000 } },
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['accessToken'],
            additionalProperties: false,
            properties: { accessToken: { type: 'string' } },
          },
        },
      },
    },
    controllers.refresh,
  );
  app.post('/auth/logout', { bodyLimit: 1024 }, controllers.logout);
  app.post<{ Body: RegisterBody }>(
    '/auth/login',
    {
      bodyLimit: 4096,
      config: { rateLimit: { max: 5, timeWindow: 60_000 } },
      schema: loginSchema,
      preValidation: validateCredentials,
    },
    loginController(env),
  );
  app.post<{ Body: RegisterBody }>(
    '/auth/register',
    {
      bodyLimit: 4096,
      config: { rateLimit: { max: 5, timeWindow: 60_000 } },
      schema: registerSchema,
      preValidation: validateCredentials,
    },
    registerController,
  );
};

export default authRoutes;
