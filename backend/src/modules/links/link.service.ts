import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../errors/app-error.js';
import { validateDestinationUrl } from './link.validation.js';
import {
  createLink,
  deleteOwnedLink,
  findOwnedLink,
  listOwnedLinks,
  updateOwnedLink,
  updateOwnedStatus,
} from './link.repository.js';
import type {
  CreateLinkBody,
  CreateLinkResponse,
  LinkQuery,
  UpdateLinkBody,
} from './link.schemas.js';

//Take CreateLinkResponse, remove its old status, 
// then add a new status that can be active, disabled, or expired.
//i decided to do this the status is active only at creation,
// after it can be active, disabled, or expired
type LinkResponse = Omit<CreateLinkResponse, 'status'> & { status: 'active' | 'disabled' | 'expired' };

//return the link with the correct status, and convert the dates to ISO strings
function projectLink(link: { id: string; shortCode: string; destinationUrl: string; title: string | null; expiresAt: Date | null; status: 'active' | 'disabled' | 'expired'; createdAt: Date }): LinkResponse {
  //copy the link, but convert the dates to ISO strings.
  return { ...link, expiresAt: link.expiresAt?.toISOString() ?? null, createdAt: link.createdAt.toISOString() };
}

function notFound(): never {
  throw new AppError('link_not_found', 'Link not found', 404);
}

//undefined, date stays the same
//null, remove the date,
//string, parse the date and validate it is in the future
function parseExpiration(value: string | null | undefined): Date | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }

  const date = new Date(value);
  //is it a valid date and is it in the future?
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    throw new AppError(
      'invalid_expiration',
      'The expiration must be in the future',
      422,
    );
  }
  return date;
}

export async function createLinkService(
  prisma: PrismaClient,
  userId: string | null,//authenticated user id or null for anonymous users
  input: CreateLinkBody,
): Promise<LinkResponse> {
  const destinationUrl = validateDestinationUrl(input.url);

  const expiresAt =
    input.expiresAt === undefined ? undefined : new Date(input.expiresAt);

  if (//if the expiration is provided, it must be a valid date in the future
    expiresAt !== undefined &&
    (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())
  ) {
    throw new AppError(
      'invalid_expiration',
      'The expiration must be in the future',
      422,
    );
  }

  try {
    const link = await createLink(prisma, {
      userId,
      destinationUrl,
      title: input.title,
      expiresAt,
    });
    return projectLink({ ...link, status: 'active' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      'internal_server_error',
      'An unexpected error occurred',
      500,
    );
  }
}

export async function listLinksService(prisma: PrismaClient, userId: string, query: LinkQuery) {
  const page = query.page ?? 1;//get page 1 as default
  const pageSize = Math.min(query.pageSize ?? 20, 100);//20 links per page as default, max 100
  const [items, total] = await listOwnedLinks(
    prisma,
    userId,
    (page - 1) * pageSize,//skip 0,10,20,30,...
    pageSize,
  );
  return { items: items.map(projectLink), page, pageSize, total };
}

export async function getLinkService(prisma: PrismaClient, userId: string, id: string) {
  const link = await findOwnedLink(prisma, userId, id);
  return link ? projectLink(link) : notFound();
}

export async function updateLinkService(prisma: PrismaClient, userId: string, id: string, input: UpdateLinkBody) {
  // '...' spreads the properties of an object into a new object.
  const data = {
    ...(input.url === undefined ? {} : { destinationUrl: validateDestinationUrl(input.url) }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.expiresAt === undefined ? {} : { expiresAt: parseExpiration(input.expiresAt) }),
  };
  const link = await updateOwnedLink(prisma, userId, id, data);
  return link ? projectLink(link) : notFound();
}

export async function setLinkStatusService(prisma: PrismaClient, userId: string, id: string, status: 'active' | 'disabled') {
  if (!(await updateOwnedStatus(prisma, userId, id, status))) notFound();
  return getLinkService(prisma, userId, id);
}

export async function deleteLinkService(prisma: PrismaClient, userId: string, id: string) {
  if (!(await deleteOwnedLink(prisma, userId, id))) notFound();
}
