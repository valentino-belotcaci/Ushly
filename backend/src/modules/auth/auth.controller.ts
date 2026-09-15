import type { EnvironmentConfig } from '../../config/env.js';
import { startSession } from './refresh.service.js';
import { sessionCookie } from './refresh.controller.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { RegisterBody } from './auth.schemas.js';
import { registerUser, loginUser } from './auth.service.js';


export async function registerController(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) {
  //service creates hash and sends a new user
  const user = await registerUser(request.server.prisma, request.body);
  //sends http 201 cfreated with the user data to the client, without the password hash
  return reply.code(201).send(user);
}

//login controller that handles the login request, creates a new session and returns the access token and user data
export function loginController(env: EnvironmentConfig) {
  return async function (
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply,
  ) {
    const user = await loginUser(request.server.prisma, request.body);

    //creates a new access token with the user id from the session
    const accessToken = await reply.jwtSign({ sub: user.id });

    const session = await startSession(
      request.server.prisma,
      user.id,
      env.cookie.maxAgeMs,
    );
    //inserts refresh token in the httpOnly cookie, with the same name as before, and sets the expiration date to the new session expiration date
    reply.setCookie(env.cookie.name, session.token, {
      ...sessionCookie(env),
      expires: session.expiresAt,
    });
    //no store is used to prevent caching of the response containing an access token, which is sensitive information
    return reply
      .header('Cache-Control', 'no-store')
      .send({ accessToken, user });
  };
}
