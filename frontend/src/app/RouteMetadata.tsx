import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { siteOrigin } from '../config/public';
import { homepageMetadata } from '../features/home/metadata';
import { isPublicPagePath } from '../features/public-pages/routes';
import { publicPageMetadata } from '../features/public-pages/metadata';
import { authMetadata, isAuthPath } from '../features/auth/metadata';
import {
  isLegalPagePath,
  isLocalizedLegalPath,
  localizedLegalRoutes,
} from '../features/legal/routes';
import { legalPageMetadata } from '../features/legal/metadata';
import { localeFromPath, stripLocale } from '../i18n/locale';
import { translations } from '../i18n';

export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const locale = localeFromPath(pathname);
    const text = translations(locale);
    document.documentElement.lang = locale;
    const localizedPath = pathname === '/' ? pathname : pathname.replace(/\/$/, '');
    const pagePath = stripLocale(localizedPath);
    const start = document.getElementById('page-metadata-start');
    const end = document.getElementById('page-metadata-end');
    if (!start || !end) return;
    while (start.nextSibling && start.nextSibling !== end)
      start.nextSibling.remove();
    // Only build-time configuration and our own text enter this template, never request data.
    const template = document.createElement('template');
    template.innerHTML =
      pagePath === '/'
        ? homepageMetadata(siteOrigin, locale, pathname)
        : isPublicPagePath(pagePath)
          ? publicPageMetadata(pagePath, siteOrigin, locale, localizedPath)
          : isLocalizedLegalPath(pagePath)
            ? legalPageMetadata(
                localizedLegalRoutes[pagePath],
                siteOrigin,
                locale,
                localizedPath,
              )
          : isLegalPagePath(pagePath)
            ? legalPageMetadata(pagePath, siteOrigin, locale, localizedPath)
            : isAuthPath(pagePath)
              ? authMetadata(pagePath, locale)
              : pagePath === '/dashboard' || pagePath.startsWith('/dashboard/')
                ? `<title>${text.dashboard.label} · Ushly</title><meta name="robots" content="noindex, nofollow">`
                : `<title>Ushly · ${text.common.unavailable}</title><meta name="robots" content="noindex, follow">`;
    end.before(template.content);
  }, [pathname]);
  return null;
}
