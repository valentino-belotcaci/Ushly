import { apiSession, ApiClientError } from '../../api/session';
import { apiOrigin } from '../../config/public';

export type LinkStatus = 'active' | 'disabled' | 'expired';
export type OwnedLink = {
  id: string;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  expiresAt: string | null;
  status: LinkStatus;
  createdAt: string;
};
export type LinkPage = {
  items: OwnedLink[];
  page: number;
  pageSize: number;
  total: number;
};
export type LinkStatistics = {
  linkId: string;
  from: string;
  to: string;
  timezone: 'UTC';
  granularity: 'hour' | 'day' | 'week';
  total: number;
  firstClickedAt: string | null;
  lastClickedAt: string | null;
  timeSeries: { bucket: string; clicks: number }[];
  breakdowns: {
    referrers: { value: string; clicks: number }[];
    userAgents: { value: string; clicks: number }[];
  };
};
export type LinkUpdate = {
  url?: string;
  title?: string | null;
  expiresAt?: string | null;
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isLinkStatus = (value: unknown): value is LinkStatus =>
  value === 'active' || value === 'disabled' || value === 'expired';
const isGranularity = (
  value: unknown,
): value is LinkStatistics['granularity'] =>
  value === 'hour' || value === 'day' || value === 'week';
function invalid(): never {
  throw new ApiClientError(
    'invalid_response',
    null,
    'invalid_response',
    'Ushly returned an invalid response. Please try again later.',
  );
}
function linkFrom(value: unknown): OwnedLink {
  if (!record(value)) invalid();
  const { id, shortCode, destinationUrl, title, expiresAt, status, createdAt } =
    value;
  if (
    typeof id !== 'string' ||
    !id ||
    typeof shortCode !== 'string' ||
    !shortCode ||
    typeof destinationUrl !== 'string' ||
    !destinationUrl ||
    (title !== null && typeof title !== 'string') ||
    (expiresAt !== null && !validDate(expiresAt)) ||
    !isLinkStatus(status) ||
    !validDate(createdAt)
  )
    invalid();
  return { id, shortCode, destinationUrl, title, expiresAt, status, createdAt };
}
function pageFrom(value: unknown): LinkPage {
  if (
    !record(value) ||
    !Array.isArray(value.items) ||
    !Number.isInteger(value.page) ||
    !Number.isInteger(value.pageSize) ||
    !Number.isInteger(value.total)
  )
    invalid();
  return {
    items: value.items.map(linkFrom),
    page: Number(value.page),
    pageSize: Number(value.pageSize),
    total: Number(value.total),
  };
}
function countRows(value: unknown): { value: string; clicks: number }[] {
  if (!Array.isArray(value)) invalid();
  return value.map((item) => {
    if (
      !record(item) ||
      typeof item.value !== 'string' ||
      !Number.isInteger(item.clicks)
    )
      invalid();
    return { value: item.value, clicks: Number(item.clicks) };
  });
}
function statisticsFrom(value: unknown): LinkStatistics {
  if (
    !record(value) ||
    typeof value.linkId !== 'string' ||
    !validDate(value.from) ||
    !validDate(value.to) ||
    value.timezone !== 'UTC' ||
    !isGranularity(value.granularity) ||
    !Number.isInteger(value.total) ||
    (value.firstClickedAt !== null && !validDate(value.firstClickedAt)) ||
    (value.lastClickedAt !== null && !validDate(value.lastClickedAt)) ||
    !Array.isArray(value.timeSeries) ||
    !record(value.breakdowns)
  )
    invalid();
  const timeSeries = value.timeSeries.map((item) => {
    if (
      !record(item) ||
      !validDate(item.bucket) ||
      !Number.isInteger(item.clicks)
    )
      invalid();
    return { bucket: item.bucket, clicks: Number(item.clicks) };
  });
  return {
    linkId: value.linkId,
    from: value.from,
    to: value.to,
    timezone: 'UTC',
    granularity: value.granularity,
    total: Number(value.total),
    firstClickedAt: value.firstClickedAt,
    lastClickedAt: value.lastClickedAt,
    timeSeries,
    breakdowns: {
      referrers: countRows(value.breakdowns.referrers),
      userAgents: countRows(value.breakdowns.userAgents),
    },
  };
}

export const listOwnedLinks = (page = 1, pageSize = 20) =>
  apiSession.requestProtected(
    `/links?page=${page}&pageSize=${pageSize}`,
    { method: 'GET' },
    pageFrom,
  );
export const createOwnedLink = (input: {
  url: string;
  title?: string;
  expiresAt?: string;
}) =>
  apiSession.requestProtected(
    '/links',
    { method: 'POST', body: input },
    linkFrom,
  );
export const updateOwnedLink = (id: string, update: LinkUpdate) =>
  apiSession.requestProtected(
    `/links/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: update },
    linkFrom,
  );
export const setOwnedLinkActive = (id: string, active: boolean) =>
  apiSession.requestProtected(
    `/links/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`,
    { method: 'POST' },
    linkFrom,
  );
export const deleteOwnedLink = (id: string) =>
  apiSession.requestProtected(
    `/links/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
    () => undefined,
  );
export const getOwnedStatistics = (id: string) =>
  apiSession.requestProtected(
    `/links/${encodeURIComponent(id)}/statistics`,
    { method: 'GET' },
    statisticsFrom,
  );
export async function getOwnedQr(id: string): Promise<Blob> {
  const blob = await apiSession.requestProtectedBlob(
    `/links/${encodeURIComponent(id)}/qr`,
  );
  if (
    blob.type.split(';')[0] !== 'image/svg+xml' ||
    blob.size === 0 ||
    blob.size > 64 * 1024
  )
    throw new ApiClientError(
      'invalid_response',
      null,
      'invalid_response',
      'The QR code could not be read. Please try again.',
    );
  return blob;
}

export function publicShortUrl(shortCode: string): string {
  const path = `/${encodeURIComponent(shortCode)}`;
  return apiOrigin ? `${apiOrigin}${path}` : path;
}
