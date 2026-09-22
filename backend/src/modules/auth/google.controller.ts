import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { EnvironmentConfig, GoogleOAuthConfig } from '../../config/env.js';
import { authorizationUrl, googleClient } from './google.provider.js';
import { confirmLink, completeGoogleAuthentication } from './google.service.js';
import {
  consumeTransaction,
  oauthFailure,
  saveTransaction,
  type LinkConfirmation,
} from './google.state.js';
import { sessionCookie } from './refresh.controller.js';
import { sendGooglePopupResult } from './google.popup.js';

export function googleControllers(
  app: FastifyInstance,
  env: EnvironmentConfig,
  config: GoogleOAuthConfig,
) {
  const client = googleClient(config);
  const cookieName = `${env.cookie.name}_google`;
  const cookieOptions = {
    httpOnly: true,
    secure: env.nodeEnv === 'production' || env.cookie.secure,
    sameSite: 'lax' as const,
    path: '/auth/google',
  };
  function checkUri(request: FastifyRequest) {
    const path = request.raw.url?.split('?')[0];
    if (`${request.protocol}://${request.host}${path}` !== config.redirectUri)
      throw oauthFailure();
  }

  async function start(
    request: FastifyRequest,
    reply: FastifyReply,
    link: LinkConfirmation | null,
  ) {
    // All starts must use the callback origin, so its host-only cookie returns to the callback.
    if (
      `${request.protocol}://${request.host}` !==
      new URL(config.redirectUri).origin
    )
      throw oauthFailure();
    if (request.raw.url?.includes('?')) throw oauthFailure();
    const { state, transaction } = await saveTransaction(
      app.redis,
      config.stateTtlSeconds,
      link,
    );
    reply.setCookie(cookieName, state, {
      ...cookieOptions,
      maxAge: config.stateTtlSeconds,
    });
    const url = authorizationUrl(client, state, transaction);
    // A linking fetch carries a bearer token; return the URL for explicit browser navigation.
    return link ? reply.send({ authorizationUrl: url }) : reply.redirect(url);
  }

  async function link(request: FastifyRequest, reply: FastifyReply) {
    const body: unknown = request.body;
    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !('password' in body) ||
      typeof body.password !== 'string' ||
      body.password.length < 1 ||
      body.password.length > 128 ||
      Object.keys(body).length !== 1 ||
      !request.authenticatedUser
    )
      throw oauthFailure();
    const link = await confirmLink(
      app.prisma,
      request.authenticatedUser.id,
      body.password,
    );
    return start(request, reply, link);
  }
  async function callback(request: FastifyRequest, reply: FastifyReply) {
    reply.clearCookie(cookieName, cookieOptions);
    checkUri(request);
    // Parse explicitly: repeated parameters and coercion must never change state/code semantics.
    const query = new URL(request.raw.url ?? '', config.redirectUri).searchParams;
    const transaction = await consumeTransaction(
      app.redis,
      request.cookies[cookieName],
      query.getAll('state').length === 1 ? query.get('state') : null,
    );
    if (query.has('error') || query.getAll('code').length !== 1)
      throw oauthFailure();
    const code = query.get('code');
    if (
      !code ||
      code.length > 2048 ||
      [...code].some(
        (character) =>
          character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
      )
    )
      throw oauthFailure();
    const session = await completeGoogleAuthentication(
      app.prisma,
      client,
      config,
      code,
      transaction,
      env.cookie.maxAgeMs,
    );
    reply.setCookie(env.cookie.name, session.token, {
      ...sessionCookie(env),
      expires: session.expiresAt,
    });
    // The browser obtains its Ushly JWT through POST /auth/refresh, just as after reload.
    return sendGooglePopupResult(reply, env.corsAllowedOrigins, { status: 'success' });
  }
  return {
    login: (request: FastifyRequest, reply: FastifyReply) =>
      start(request, reply, null),
    link,
    callback,
    reject: async (_request: FastifyRequest, reply: FastifyReply) => {
      reply.clearCookie(cookieName, cookieOptions);
      throw oauthFailure();
    },
  };
}
