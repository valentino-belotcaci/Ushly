// VITE_* values are public build configuration, never secrets.
export function publicOrigin(value: unknown, name: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw new Error(`Invalid ${name}`);
  const url = new URL(value);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must be an HTTP(S) origin without credentials, path, query or fragment`,
    );
  }
  return url.origin;
}
export const apiOrigin = publicOrigin(
  import.meta.env.VITE_API_ORIGIN,
  'VITE_API_ORIGIN',
);
export const siteOrigin = publicOrigin(
  import.meta.env.VITE_SITE_ORIGIN,
  'VITE_SITE_ORIGIN',
);
