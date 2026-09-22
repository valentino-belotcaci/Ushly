import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { siteOrigin } from '../config/public';
import { homepageMetadata } from '../features/home/metadata';
import { isPublicPagePath } from '../features/public-pages/content';
import { publicPageMetadata } from '../features/public-pages/metadata';
import { authMetadata, isAuthPath } from '../features/auth/metadata';

export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const pagePath = pathname === '/' ? pathname : pathname.replace(/\/$/, '');
    const start = document.getElementById('page-metadata-start');
    const end = document.getElementById('page-metadata-end');
    if (!start || !end) return;
    while (start.nextSibling && start.nextSibling !== end)
      start.nextSibling.remove();
    // Only build-time configuration and our own text enter this template, never request data.
    const template = document.createElement('template');
    template.innerHTML =
      pagePath === '/'
        ? homepageMetadata(siteOrigin)
        : isPublicPagePath(pagePath)
          ? publicPageMetadata(pagePath, siteOrigin)
          : isAuthPath(pagePath)
            ? authMetadata(pagePath)
            : pagePath === '/dashboard' || pagePath.startsWith('/dashboard/')
              ? '<title>Dashboard · Ushly</title><meta name="robots" content="noindex, nofollow">'
              : '<title>Ushly · Page unavailable</title><meta name="robots" content="noindex, follow">';
    end.before(template.content);
  }, [pathname]);
  return null;
}
