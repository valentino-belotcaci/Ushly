import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  adminLinks,
  adminStatistics,
  adminUsers,
  changeAdminRole,
  deleteAdminUserService,
  disableAdminLink,
  disableAdminUser,
} from './admin.service.js';
import type {
  AdminIdParams,
  AdminPageQuery,
  AdminRoleBody,
} from './admin.schemas.js';
function actor(request: FastifyRequest) {
  if (!request.authenticatedUser) throw new Error('Authenticated user missing');
  return request.authenticatedUser.id;
}
export async function users(
  request: FastifyRequest<{ Querystring: AdminPageQuery }>,
) {
  return adminUsers(request.server.prisma, request.query);
}
export async function links(
  request: FastifyRequest<{ Querystring: AdminPageQuery }>,
) {
  return adminLinks(request.server.prisma, request.query);
}
export async function statistics(
  request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>,
) {
  return adminStatistics(
    request.server.prisma,
    request.query.from,
    request.query.to,
  );
}
export async function disableUser(
  request: FastifyRequest<{ Params: AdminIdParams }>,
) {
  return disableAdminUser(
    request.server.prisma,
    actor(request),
    request.params.id,
    true,
  );
}
export async function enableUser(
  request: FastifyRequest<{ Params: AdminIdParams }>,
) {
  return disableAdminUser(
    request.server.prisma,
    actor(request),
    request.params.id,
    false,
  );
}
export async function setRole(
  request: FastifyRequest<{ Params: AdminIdParams; Body: AdminRoleBody }>,
) {
  return changeAdminRole(
    request.server.prisma,
    actor(request),
    request.params.id,
    request.body.role,
  );
}
export async function disableLink(
  request: FastifyRequest<{ Params: AdminIdParams }>,
) {
  return disableAdminLink(
    request.server.prisma,
    actor(request),
    request.params.id,
    true,
  );
}
export async function enableLink(
  request: FastifyRequest<{ Params: AdminIdParams }>,
) {
  return disableAdminLink(
    request.server.prisma,
    actor(request),
    request.params.id,
    false,
  );
}
export async function deleteUser(
  request: FastifyRequest<{ Params: AdminIdParams }>,
  reply: FastifyReply,
) {
  await deleteAdminUserService(
    request.server.prisma,
    actor(request),
    request.params.id,
  );
  return reply.code(204).send();
}
export async function noContent(_request: FastifyRequest, reply: FastifyReply) {
  return reply.code(204).send();
}
