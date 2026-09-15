import type { PrismaClient } from '@prisma/client';

import { createWithUniqueShortCode } from './short-code.js';

type CreateLinkInput = {
  userId: string | null;
  destinationUrl: string;
  title?: string | undefined;
  expiresAt?: Date | undefined;
};

//control the fields that are returned to the client
const linkSelect = {
  id: true, shortCode: true, destinationUrl: true, title: true,
  expiresAt: true, status: true, createdAt: true,
} as const;

export async function createLink(
  prisma: PrismaClient,
  input: CreateLinkInput,
) {
  return createWithUniqueShortCode((shortCode) =>
    prisma.link.create({
      data: {
        userId: input.userId,
        shortCode,
        destinationUrl: input.destinationUrl,
        title: input.title ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    }),
  );
}

export async function listOwnedLinks(
  prisma: PrismaClient,
  userId: string,
  skip: number, //number of links to skip for pagination
  take: number, //maximum number of links to return
) {
  const [items, total] = await Promise.all([
    prisma.link.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: linkSelect,
    }),
    prisma.link.count({ where: { userId } }),
  ]);

  return [items, total] as const;
}

export async function findOwnedLink(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const link = await prisma.link.findFirst({
    where: { id, userId }, //only return the link if id and userId match
    select: linkSelect,
  });

  return link;
}

export async function updateOwnedLink(
  prisma: PrismaClient,
  userId: string,
  id: string,
  data: {
    destinationUrl?: string | undefined;
    title?: string | null | undefined;
    expiresAt?: Date | null | undefined;
  },
) {
  //remove properties that are undefined, so we don't overwrite them in the database
  const updateData = {
    ...(data.destinationUrl === undefined
      ? {}
      : { destinationUrl: data.destinationUrl }),
    ...(data.title === undefined ? {} : { title: data.title }),
    ...(data.expiresAt === undefined ? {} : { expiresAt: data.expiresAt }),
  };

  const result = await prisma.link.updateMany({
    //updateMany is used instead of update to avoid throwing an error if the link does not exist or does not belong to the user
    where: { id, userId },
    data: updateData,
  });

  if (result.count === 0) return null;
  //if the link was updated, return the updated link
  return findOwnedLink(prisma, userId, id);//did we just update the link? if so, return the updated link, otherwise return null
}

export async function updateOwnedStatus(
  prisma: PrismaClient,
  userId: string,
  id: string,
  status: 'active' | 'disabled',
) {
  const result = await prisma.link.updateMany({
    where: { id, userId },
    data: { status },
  });

  return result.count > 0;//did we update the link?
}

export async function deleteOwnedLink(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const result = await prisma.link.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
