export const legalPagePaths = ['/privacy', '/cookies', '/terms'] as const;
export type LegalPagePath = (typeof legalPagePaths)[number];

export function isLegalPagePath(path: string): path is LegalPagePath {
  return legalPagePaths.some((candidate) => candidate === path);
}

export const localizedLegalRoutes = {
  '/privacy-policy': '/privacy',
  '/cookie-policy': '/cookies',
  '/terms-of-service': '/terms',
} as const satisfies Record<string, LegalPagePath>;

export type LocalizedLegalPath = keyof typeof localizedLegalRoutes;

export function isLocalizedLegalPath(path: string): path is LocalizedLegalPath {
  return path in localizedLegalRoutes;
}

export function localizedLegalPath(path: LegalPagePath): LocalizedLegalPath {
  const match = Object.entries(localizedLegalRoutes).find(
    ([, value]) => value === path,
  );
  if (!match) throw new Error('Unknown legal page path');
  return match[0] as LocalizedLegalPath;
}
