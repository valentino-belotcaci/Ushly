import type { PrismaClient } from '@prisma/client';
import { AppError } from '../../errors/app-error.js';
import {
  countAdmins,
  countAdminClicks,
  deleteAdminUser,
  findAdminUser,
  listAdminLinks,
  listAdminUsers,
  setLinkStatus,
  setUserDisabled,
  setUserRole,
  type AdminLinkListQuery,
  type AdminUserListQuery,
} from './admin.repository.js';
import type { AdminPageQuery } from './admin.schemas.js';

const MAX_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;
function page(query: { page?: number; pageSize?: number }) {
  const size = Math.min(query.pageSize ?? 20, 100);
  const number = query.page ?? 1;
  return {
    skip: (number - 1) * size,
    take: size,
    page: number,
    pageSize: size,
  };
}
function range(fromValue?: string, toValue?: string) {
  const to = toValue ? new Date(toValue) : new Date();
  const from = fromValue
    ? new Date(fromValue)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to)
    throw new AppError(
      'invalid_statistics_range',
      'Invalid statistics time range',
      400,
    );
  if (to.getTime() - from.getTime() > MAX_PERIOD_MS)
    throw new AppError(
      'statistics_range_too_large',
      'Statistics range cannot exceed 90 days',
      422,
    );
  return { from, to };
}
async function audit(
  prisma: PrismaClient,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: object,
) {
  await prisma.adminAuditEvent.create({
    data: {
      actorId,
      action,
      targetType,
      targetId,
      ...(metadata === undefined ? {} : { metadata }),
    },
  });
}

export async function adminUsers(
  prisma: PrismaClient,
  query: AdminPageQuery,
) {
  const p = page(query);
  const repositoryQuery: AdminUserListQuery = {
    skip: p.skip,
    take: p.take,
    ...(query.search === undefined ? {} : { search: query.search }),
    ...(query.role === undefined ? {} : { role: query.role }),
    ...(query.disabled === undefined ? {} : { disabled: query.disabled }),
  };
  const result = await listAdminUsers(prisma, repositoryQuery);
  return { ...result, page: p.page, pageSize: p.pageSize };
}
export async function adminLinks(
  prisma: PrismaClient,
  query: AdminPageQuery,
) {
  const p = page(query);
  const repositoryQuery: AdminLinkListQuery = {
    skip: p.skip,
    take: p.take,
    ...(query.search === undefined ? {} : { search: query.search }),
    ...(query.status === undefined ? {} : { status: query.status }),
    ...(query.userId === undefined ? {} : { userId: query.userId }),
  };
  const result = await listAdminLinks(prisma, repositoryQuery);
  return { ...result, page: p.page, pageSize: p.pageSize };
}
export async function adminStatistics(
  prisma: PrismaClient,
  from?: string,
  to?: string,
) {
  const r = range(from, to);
  const result = await countAdminClicks(prisma, r.from, r.to);
  return {
    from: r.from.toISOString(),
    to: r.to.toISOString(),
    timezone: 'UTC',
    ...result,
    firstClickedAt: result.firstClickedAt?.toISOString() ?? null,
    lastClickedAt: result.lastClickedAt?.toISOString() ?? null,
    timeSeries: result.timeSeries.map((x) => ({
      bucket: x.bucket.toISOString(),
      clicks: x.clicks,
    })),
  };
}

export async function disableAdminUser(
  prisma: PrismaClient,
  actorId: string,
  id: string,
  disabled: boolean,
) {
  const target = await findAdminUser(prisma, id);
  if (!target) throw new AppError('user_not_found', 'User not found', 404);
  if (
    disabled &&
    target.role === 'ADMIN' &&
    target.disabledAt === null &&
    (await countAdmins(prisma)) <= 1
  )
    throw new AppError(
      'last_admin_protected',
      'The last effective administrator cannot be disabled',
      409,
    );
  await setUserDisabled(prisma, id, disabled);
  await audit(
    prisma,
    actorId,
    disabled ? 'user_disabled' : 'user_enabled',
    'user',
    id,
  );
  return { id, disabled };
}
export async function changeAdminRole(
  prisma: PrismaClient,
  actorId: string,
  id: string,
  role: 'USER' | 'ADMIN',
) {
  const target = await findAdminUser(prisma, id);
  if (!target) throw new AppError('user_not_found', 'User not found', 404);
  if (
    role === 'USER' &&
    target.role === 'ADMIN' &&
    target.disabledAt === null &&
    (await countAdmins(prisma)) <= 1
  )
    throw new AppError(
      'last_admin_protected',
      'The last effective administrator cannot be demoted',
      409,
    );
  await setUserRole(prisma, id, role);
  await audit(
    prisma,
    actorId,
    role === 'ADMIN' ? 'user_promoted' : 'user_demoted',
    'user',
    id,
  );
  return { id, role };
}
export async function disableAdminLink(
  prisma: PrismaClient,
  actorId: string,
  id: string,
  disabled: boolean,
) {
  const result = await setLinkStatus(
    prisma,
    id,
    disabled ? 'disabled' : 'active',
  );
  if (result.count === 0)
    throw new AppError('link_not_found', 'Link not found', 404);
  await audit(
    prisma,
    actorId,
    disabled ? 'link_disabled' : 'link_enabled',
    'link',
    id,
  );
  return { id, disabled };
}
export async function deleteAdminUserService(
  prisma: PrismaClient,
  actorId: string,
  id: string,
) {
  const target = await findAdminUser(prisma, id);
  if (!target) throw new AppError('user_not_found', 'User not found', 404);
  if (
    target.role === 'ADMIN' &&
    target.disabledAt === null &&
    (await countAdmins(prisma)) <= 1
  )
    throw new AppError(
      'last_admin_protected',
      'The last effective administrator cannot be deleted',
      409,
    );
  const result = await deleteAdminUser(prisma, id);
  if (result.count === 0)
    throw new AppError('user_not_found', 'User not found', 404);
  await audit(prisma, actorId, 'user_deleted', 'user', id);
  return undefined;
}
