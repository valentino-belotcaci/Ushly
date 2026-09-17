import { Prisma, type PrismaClient } from '@prisma/client';

const userSelect = {
  id: true,
  email: true,
  name: true,
  provider: true,
  role: true,
  disabledAt: true,
  createdAt: true,
} as const;
const linkSelect = {
  id: true,
  userId: true,
  shortCode: true,
  destinationUrl: true,
  title: true,
  status: true,
  expiresAt: true,
  createdAt: true,
} as const;

export type AdminUserListQuery = {
  skip: number;
  take: number;
  search?: string;
  role?: 'USER' | 'ADMIN';
  disabled?: boolean;
};

export type AdminLinkListQuery = {
  skip: number;
  take: number;
  search?: string;
  status?: 'active' | 'disabled' | 'expired';
  userId?: string;
};

export async function listAdminUsers(
  prisma: PrismaClient,
  query: AdminUserListQuery,
) {
  const where: Prisma.UserWhereInput = {
    ...(query.search
      ? { email: { contains: query.search, mode: 'insensitive' } }
      : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.disabled === undefined
      ? {}
      : { disabledAt: query.disabled ? { not: null } : null }),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: userSelect,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export async function listAdminLinks(
  prisma: PrismaClient,
  query: AdminLinkListQuery,
) {
  const where: Prisma.LinkWhereInput = {
    ...(query.search
      ? {
          OR: [
            { shortCode: { contains: query.search } },
            { destinationUrl: { contains: query.search } },
          ],
        }
      : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.link.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: linkSelect,
    }),
    prisma.link.count({ where }),
  ]);
  return { items, total };
}

export async function countAdminClicks(
  prisma: PrismaClient,
  from: Date,
  to: Date,
) {
  const [summary, byDay] = await Promise.all([
    prisma.click.aggregate({
      where: { clickedAt: { gte: from, lt: to } },
      _count: { _all: true },
      _min: { clickedAt: true },
      _max: { clickedAt: true },
    }),
    prisma.$queryRaw<Array<{ bucket: Date; clicks: bigint }>>(
      Prisma.sql`SELECT date_trunc('day', "clickedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS bucket, COUNT(*)::bigint AS clicks FROM "Click" WHERE "clickedAt" >= ${from} AND "clickedAt" < ${to} GROUP BY 1 ORDER BY 1`,
    ),
  ]);
  return {
    total: summary._count._all,
    firstClickedAt: summary._min.clickedAt,
    lastClickedAt: summary._max.clickedAt,
    timeSeries: byDay.map((x) => ({
      bucket: x.bucket,
      clicks: Number(x.clicks),
    })),
  };
}

export async function countAdmins(prisma: PrismaClient) {
  return prisma.user.count({ where: { role: 'ADMIN', disabledAt: null } });
}
export async function findAdminUser(prisma: PrismaClient, id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, disabledAt: true },
  });
}
export async function setUserDisabled(
  prisma: PrismaClient,
  id: string,
  disabled: boolean,
) {
  return prisma.user.updateMany({
    where: { id },
    data: { disabledAt: disabled ? new Date() : null },
  });
}
export async function setUserRole(
  prisma: PrismaClient,
  id: string,
  role: 'USER' | 'ADMIN',
) {
  return prisma.user.updateMany({ where: { id }, data: { role } });
}
export async function setLinkStatus(
  prisma: PrismaClient,
  id: string,
  status: 'active' | 'disabled',
) {
  return prisma.link.updateMany({ where: { id }, data: { status } });
}
export async function deleteAdminUser(prisma: PrismaClient, id: string) {
  return prisma.user.deleteMany({ where: { id } });
}
