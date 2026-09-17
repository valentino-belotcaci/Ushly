import type {
  FastifyPluginAsync,
  preHandlerAsyncHookHandler,
} from 'fastify';

import { AppError } from '../../errors/app-error.js';
import {
  activateLinkController,
  createLinkController,
  deactivateLinkController,
  deleteLinkController,
  getLinkController,
  getLinkQrController,
  listLinksController,
  updateLinkController,
} from './link.controller.js';
import {
  createLinkSchema,
  ownerLinkListSchema,
  ownerLinkResponseSchema,
  qrSchema,
  updateLinkSchema,
  type CreateLinkBody,
  type LinkParams,
  type LinkQuery,
  type UpdateLinkBody,
} from './link.schemas.js';
import { getLinkStatisticsController } from '../clicks/click.controller.js';
import { statisticsSchema, type StatisticsParams, type StatisticsQuery } from '../clicks/click.schemas.js';

const ANONYMOUS_MAX = 5;
const AUTHENTICATED_MAX = 20;
const WINDOW_MS = 60_000;

type RateEntry = { count: number; startedAt: number };

const linksRoutes: FastifyPluginAsync = async (app) => {
  const requestsByIp = new Map<string, RateEntry>();

  const optionalAuthenticate: preHandlerAsyncHookHandler = async (
    request,
    reply,
  ) => {
    if (request.headers.authorization !== undefined) {
      await app.authenticate(request, reply);
    }
  };

  const limitLinkCreation: preHandlerAsyncHookHandler = async (request) => {
    const key = request.authenticatedUser?.id ?? `anonymous:${request.ip}`;
    const limit = request.authenticatedUser ? AUTHENTICATED_MAX : ANONYMOUS_MAX;
    const now = Date.now();
    const existing = requestsByIp.get(key);
    const entry =
      !existing || now - existing.startedAt >= WINDOW_MS
        ? { count: 1, startedAt: now }
        : { count: existing.count + 1, startedAt: existing.startedAt };

    requestsByIp.set(key, entry);
    if (entry.count > limit) {
      throw new AppError(
        'rate_limit_exceeded',
        'Too many link creation requests',
        429,
      );
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

  const ownerPreHandler = { preHandler: app.authenticate };
  app.get<{ Params: StatisticsParams; Querystring: StatisticsQuery }>(
    '/links/:id/statistics',
    { ...ownerPreHandler, schema: statisticsSchema },
    getLinkStatisticsController,
  );
  app.get<{ Params: LinkParams }>(
    '/links/:id/qr',
    { ...ownerPreHandler, schema: qrSchema },
    getLinkQrController,
  );
  app.get<{ Querystring: LinkQuery }>(
    '/links',
    { ...ownerPreHandler, schema: ownerLinkListSchema },
    listLinksController,
  );
  app.get<{ Params: LinkParams }>(
    '/links/:id',
    { ...ownerPreHandler, schema: ownerLinkResponseSchema },
    getLinkController,
  );
  app.patch<{ Params: LinkParams; Body: UpdateLinkBody }>(
    '/links/:id',
    { ...ownerPreHandler, schema: updateLinkSchema },
    updateLinkController,
  );
  app.post<{ Params: LinkParams }>(
    '/links/:id/activate',
    { ...ownerPreHandler, schema: ownerLinkResponseSchema },
    activateLinkController,
  );
  app.post<{ Params: LinkParams }>(
    '/links/:id/deactivate',
    { ...ownerPreHandler, schema: ownerLinkResponseSchema },
    deactivateLinkController,
  );
  app.delete<{ Params: LinkParams }>(
    '/links/:id',
    { ...ownerPreHandler, schema: ownerLinkResponseSchema },
    deleteLinkController,
  );
};

export default linksRoutes;
