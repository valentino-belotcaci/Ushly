import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  createLinkService,
  deleteLinkService,
  getLinkService,
  listLinksService,
  setLinkStatusService,
  updateLinkService,
} from './link.service.js';
import type {
  CreateLinkBody,
  LinkParams,
  LinkQuery,
  UpdateLinkBody,
} from './link.schemas.js';

function userId(request: FastifyRequest): string {
  if (!request.authenticatedUser) throw new Error('Authenticated user missing');
  return request.authenticatedUser.id;
}

export async function createLinkController(
  request: FastifyRequest<{ Body: CreateLinkBody }>,
  reply: FastifyReply,
) {
  const userId = request.authenticatedUser?.id ?? null;
  const link = await createLinkService(request.server.prisma, userId, request.body);
  return reply.code(201).send(link);
}

export async function listLinksController(
  request: FastifyRequest<{ Querystring: LinkQuery }>,
) {
  return listLinksService(request.server.prisma, userId(request), request.query);
}

export async function getLinkController(
  request: FastifyRequest<{ Params: LinkParams }>,
) {
  return getLinkService(request.server.prisma, userId(request), request.params.id);
}

export async function updateLinkController(
  request: FastifyRequest<{ Params: LinkParams; Body: UpdateLinkBody }>,
) {
  return updateLinkService(
    request.server.prisma,
    request.server.redis,
    userId(request),
    request.params.id,
    request.body,
  );
}

export async function activateLinkController(
  request: FastifyRequest<{ Params: LinkParams }>,
) {
  return setLinkStatusService(
    request.server.prisma,
    request.server.redis,
    userId(request),
    request.params.id,
    'active',
  );
}

export async function deactivateLinkController(
  request: FastifyRequest<{ Params: LinkParams }>,
) {
  return setLinkStatusService(
    request.server.prisma,
    request.server.redis,
    userId(request),
    request.params.id,
    'disabled',
  );
}

export async function deleteLinkController(
  request: FastifyRequest<{ Params: LinkParams }>,
  reply: FastifyReply,
) {
  await deleteLinkService(
    request.server.prisma,
    request.server.redis,
    userId(request),
    request.params.id,
  );
  return reply.code(204).send();
}
