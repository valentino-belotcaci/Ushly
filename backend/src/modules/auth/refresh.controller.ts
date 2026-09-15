import type { FastifyReply, FastifyRequest } from 'fastify';
import type { EnvironmentConfig } from '../../config/env.js';
import { endSession, refreshSession } from './refresh.service.js';

export function sessionCookie(env: EnvironmentConfig) {
  return {
    httpOnly: true,
    secure: env.nodeEnv === 'production' || env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: '/auth', //browser will only send the cookie to /auth endpoints
  };
}

export function refreshControllers(env: EnvironmentConfig) {

  const clear = (reply: FastifyReply) =>//function to clear the cookie from the browser
    reply.clearCookie(env.cookie.name, sessionCookie(env));

  return {
    //refresh endpoint to refresh the access token using the refresh token stored in the cookie
    refresh: async (request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Cache-Control', 'no-store');//do not cache the response in the browser or any intermediate caches

      try {//reads the refresh token from the cookie, validates it, and issues a new access token and refresh token
        const session = await refreshSession(
          request.server.prisma,
          request.cookies[env.cookie.name],
        );
        //createsa new access token with the user id from the session 
        const accessToken = await reply.jwtSign({ sub: session.userId });
        //writes on browser the new refresh token in the cookie with the same name as before, and sets the expiration date to the new session expiration date
        reply.setCookie(env.cookie.name, session.token, {
          ...sessionCookie(env),
          expires: session.expiresAt,
        });
        //sends the new access token to the client, refresh token stays in httpOnly cookie and is not accessible from javascript
        return reply.send({ accessToken });
      } catch (error) {
        clear(reply);
        throw error;
      }
    },
    logout: async (request: FastifyRequest, reply: FastifyReply) => {
      reply.header('Cache-Control', 'no-store');
      clear(reply);//clears the cookie from the browser
      await endSession(request.server.prisma, request.cookies[env.cookie.name]);//invalidates token in the database
      return reply.code(204).send();
    },
  };
}
