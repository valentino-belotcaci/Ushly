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

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterBody }>(
    '/auth/login',
    {
      bodyLimit: 4096,
      config: { rateLimit: { max: 5, timeWindow: 60_000 } },
      schema: loginSchema,
      preValidation: validateCredentials,
    },
    loginController,
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
