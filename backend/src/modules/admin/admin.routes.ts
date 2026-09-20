import type { FastifyPluginAsync } from 'fastify';
import {
  deleteUser,
  disableLink,
  disableUser,
  enableLink,
  enableUser,
  links,
  setRole,
  statistics,
  users,
} from './admin.controller.js';
import {
  adminIdSchema,
  adminPageSchema,
  adminRoleSchema,
  type AdminIdParams,
  type AdminPageQuery,
  type AdminRoleBody,
} from './admin.schemas.js';
const adminRoutes: FastifyPluginAsync = async (app) => {
  const guard = { preHandler: [app.authenticate, app.requireAdmin] };
  app.get<{ Querystring: AdminPageQuery }>(
    '/admin/users',
    { ...guard, schema: adminPageSchema },
    users,
  );
  app.get<{ Querystring: AdminPageQuery }>(
    '/admin/links',
    { ...guard, schema: adminPageSchema },
    links,
  );
  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/admin/statistics',
    {
      ...guard,
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    statistics,
  );
  app.post<{ Params: AdminIdParams }>(
    '/admin/users/:id/disable',
    { ...guard, schema: adminIdSchema },
    disableUser,
  );
  app.post<{ Params: AdminIdParams }>(
    '/admin/users/:id/enable',
    { ...guard, schema: adminIdSchema },
    enableUser,
  );
  app.patch<{ Params: AdminIdParams; Body: AdminRoleBody }>(
    '/admin/users/:id/role',
    { ...guard, schema: adminRoleSchema },
    setRole,
  );
  app.delete<{ Params: AdminIdParams }>(
    '/admin/users/:id',
    { ...guard, schema: adminIdSchema },
    deleteUser,
  );
  app.post<{ Params: AdminIdParams }>(
    '/admin/links/:id/disable',
    { ...guard, schema: adminIdSchema },
    disableLink,
  );
  app.post<{ Params: AdminIdParams }>(
    '/admin/links/:id/enable',
    { ...guard, schema: adminIdSchema },
    enableLink,
  );
};
export default adminRoutes;
