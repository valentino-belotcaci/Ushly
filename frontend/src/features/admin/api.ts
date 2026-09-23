import { ApiClientError, apiSession } from '../../api/session';

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  provider: 'local' | 'google';
  role: 'USER' | 'ADMIN';
  disabledAt: string | null;
  createdAt: string;
};
export type AdminLink = {
  id: string;
  userId: string | null;
  ownerEmail: string | null;
  shortCode: string;
  destinationUrl: string;
  title: string | null;
  status: 'active' | 'disabled' | 'expired';
  expiresAt: string | null;
  createdAt: string;
};
export type AdminPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type AdminStatistics = {
  from: string;
  to: string;
  timezone: 'UTC';
  total: number;
  firstClickedAt: string | null;
  lastClickedAt: string | null;
  timeSeries: { bucket: string; clicks: number }[];
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const dateOrNull = (value: unknown): value is string | null =>
  value === null ||
  (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value));
function invalid(): never {
  throw new ApiClientError(
    'invalid_response',
    null,
    'invalid_response',
    'Ushly returned an invalid response. Please try again later.',
  );
}

function userFrom(value: unknown): AdminUser {
  if (!record(value)) invalid();
  const { id, email, name, provider, role, disabledAt, createdAt } = value;
  if (
    typeof id !== 'string' ||
    typeof email !== 'string' ||
    (name !== null && typeof name !== 'string') ||
    (provider !== 'local' && provider !== 'google') ||
    (role !== 'USER' && role !== 'ADMIN') ||
    !dateOrNull(disabledAt) ||
    !validDate(createdAt)
  )
    invalid();
  return { id, email, name, provider, role, disabledAt, createdAt };
}
function linkFrom(value: unknown): AdminLink {
  if (!record(value)) invalid();
  const {
    id,
    userId,
    shortCode,
    destinationUrl,
    title,
    status,
    expiresAt,
    createdAt,
    user,
  } = value;
  const ownerEmail = user === null ? null : record(user) ? user.email : undefined;
  if (
    typeof id !== 'string' ||
    (userId !== null && typeof userId !== 'string') ||
    (ownerEmail !== null && typeof ownerEmail !== 'string') ||
    typeof shortCode !== 'string' ||
    typeof destinationUrl !== 'string' ||
    (title !== null && typeof title !== 'string') ||
    (status !== 'active' && status !== 'disabled' && status !== 'expired') ||
    !dateOrNull(expiresAt) ||
    !validDate(createdAt)
  )
    invalid();
  return {
    id,
    userId,
    ownerEmail,
    shortCode,
    destinationUrl,
    title,
    status,
    expiresAt,
    createdAt,
  };
}
function pageFrom<T>(
  value: unknown,
  itemFrom: (item: unknown) => T,
): AdminPage<T> {
  if (
    !record(value) ||
    !Array.isArray(value.items) ||
    !Number.isInteger(value.total) ||
    !Number.isInteger(value.page) ||
    !Number.isInteger(value.pageSize)
  )
    invalid();
  return {
    items: value.items.map(itemFrom),
    total: Number(value.total),
    page: Number(value.page),
    pageSize: Number(value.pageSize),
  };
}
function actionFrom(value: unknown) {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    typeof value.disabled !== 'boolean'
  )
    invalid();
  return { id: value.id, disabled: value.disabled };
}
function statisticsFrom(value: unknown): AdminStatistics {
  if (
    !record(value) ||
    !validDate(value.from) ||
    !validDate(value.to) ||
    value.timezone !== 'UTC' ||
    !Number.isInteger(value.total) ||
    !dateOrNull(value.firstClickedAt) ||
    !dateOrNull(value.lastClickedAt) ||
    !Array.isArray(value.timeSeries)
  )
    invalid();
  const timeSeries = value.timeSeries.map((point) => {
    if (
      !record(point) ||
      !validDate(point.bucket) ||
      !Number.isInteger(point.clicks)
    )
      invalid();
    return { bucket: point.bucket, clicks: Number(point.clicks) };
  });
  return {
    from: value.from,
    to: value.to,
    timezone: 'UTC',
    total: Number(value.total),
    firstClickedAt: value.firstClickedAt,
    lastClickedAt: value.lastClickedAt,
    timeSeries,
  };
}
function queryPath(
  path: string,
  values: Record<string, string | number | boolean | undefined>,
) {
  const search = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  return search.size ? `${path}?${search.toString()}` : path;
}

export const listAdminUsers = (query: {
  page: number;
  pageSize: number;
  search?: string;
  role?: AdminUser['role'];
  disabled?: boolean;
}) =>
  apiSession.requestProtected(
    queryPath('/admin/users', query),
    { method: 'GET' },
    (value) => pageFrom(value, userFrom),
  );
export const listAdminLinks = (query: {
  page: number;
  pageSize: number;
  search?: string;
  status?: AdminLink['status'];
  userId?: string;
}) =>
  apiSession.requestProtected(
    queryPath('/admin/links', query),
    { method: 'GET' },
    (value) => pageFrom(value, linkFrom),
  );
export const getAdminStatistics = (from?: string, to?: string) =>
  apiSession.requestProtected(
    queryPath('/admin/statistics', { from, to }),
    { method: 'GET' },
    statisticsFrom,
  );
export const setAdminUserDisabled = (id: string, disabled: boolean) =>
  apiSession.requestProtected(
    `/admin/users/${encodeURIComponent(id)}/${disabled ? 'disable' : 'enable'}`,
    { method: 'POST' },
    actionFrom,
  );
export const setAdminLinkDisabled = (id: string, disabled: boolean) =>
  apiSession.requestProtected(
    `/admin/links/${encodeURIComponent(id)}/${disabled ? 'disable' : 'enable'}`,
    { method: 'POST' },
    actionFrom,
  );
export async function checkAdminAccess() {
  await listAdminUsers({ page: 1, pageSize: 1 });
  return true;
}
