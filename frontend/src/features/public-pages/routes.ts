export const publicPagePaths = [
  '/url-shortener',
  '/qr-codes',
  '/analytics',
  '/features',
] as const;

export type PublicPagePath = (typeof publicPagePaths)[number];

export function isPublicPagePath(path: string): path is PublicPagePath {
  return publicPagePaths.some((candidate) => candidate === path);
}
