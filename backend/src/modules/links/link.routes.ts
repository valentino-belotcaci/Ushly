import type {
  FastifyPluginAsync,
  preHandlerAsyncHookHandler,
} from 'fastify';

import { AppError } from '../../errors/app-error.js';
import { createLinkController } from './link.controller.js';
import {
  createLinkSchema,
  type CreateLinkBody,
} from './link.schemas.js';

const ANONYMOUS_MAX = 5;
const AUTHENTICATED_MAX = 20;
const WINDOW_MS = 60_000;

type RateEntry = { count: number; startedAt: number };

const linksRoutes: FastifyPluginAsync = async (app) => {
  const requestsByIp = new Map<string, RateEntry>();

  const optionalAuthenticate: preHandlerAsyncHookHandler = async (request, reply) => {
    if (request.headers.authorization !== undefined) {
      await app.authenticate(request, reply);
    }
  };

  const limitLinkCreation: preHandlerAsyncHookHandler = async (request) => {
    const key = request.authenticatedUser?.id ?? `anonymous:${request.ip}`;
    const limit = request.authenticatedUser ? AUTHENTICATED_MAX : ANONYMOUS_MAX;
    const now = Date.now();
    const existing = requestsByIp.get(key);
    const entry = !existing || now - existing.startedAt >= WINDOW_MS
      ? { count: 1, startedAt: now }
      : { count: existing.count + 1, startedAt: existing.startedAt };

    requestsByIp.set(key, entry);
    if (entry.count > limit) {
      throw new AppError('rate_limit_exceeded', 'Too many link creation requests', 429);
    }
  };

  app.post<{ Body: CreateLinkBody }>(
    '/links',
    {
      bodyLimit: 8192,
      schema: createLinkSchema,
      preHandler: [optionalAuthenticate, limitLinkCreation],
    },
    createLinkController,
  );
};

export default linksRoutes;
