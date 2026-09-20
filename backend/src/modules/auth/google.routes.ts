import type { FastifyPluginAsync } from 'fastify';
import type { EnvironmentConfig } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { googleControllers } from './google.controller.js';
import { oauthFailure } from './google.state.js';

const googleRoutes: FastifyPluginAsync<{ env: EnvironmentConfig }> = async (
  app,
  { env },
) => {
  if (!env.google) return;
  const controllers = googleControllers(app, env, env.google);
  const routeOptions = {
    exposeHeadRoute: false,
    config: { rateLimit: { max: 10, timeWindow: 60_000 } },
  };

  app.addHook('onRequest', async (_request, reply) => {
    reply
      .header('Cache-Control', 'no-store')
      .header('Referrer-Policy', 'no-referrer');
  });
  // Transport/Prisma diagnostics can contain codes, credentials, and provider payloads.
  app.setErrorHandler((error, request, reply) => {
    let safe = oauthFailure();
    if (error instanceof AppError) safe = error;
    else if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      error.statusCode === 429
    ) {
      safe = new AppError('rate_limited', 'Rate limit exceeded', 429);
    }
    request.log.warn(
      { oauthOutcome: safe.code },
      'Google authentication failed',
    );
    return reply
      .header('Cache-Control', 'no-store')
      .header('Referrer-Policy', 'no-referrer')
      .code(safe.statusCode)
      .send({ error: safe.code, message: safe.message, details: null });
  });

  app.get('/auth/google', routeOptions, controllers.login);
  app.post(
    '/auth/google/link',
    { ...routeOptions, bodyLimit: 1024, preHandler: app.authenticate },
    controllers.link,
  );
  app.get('/auth/google/callback', routeOptions, controllers.callback);
  // Do not let Fastify's default not-found response echo a malformed callback URL.
  app.all('/auth/google/*', routeOptions, controllers.reject);
};

export default googleRoutes;
