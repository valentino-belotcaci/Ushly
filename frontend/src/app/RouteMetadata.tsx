import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { siteOrigin } from '../config/public';
import { homepageMetadata } from '../features/home/metadata';

export function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const start = document.getElementById('page-metadata-start');
    const end = document.getElementById('page-metadata-end');
    if (!start || !end) return;
    while (start.nextSibling && start.nextSibling !== end)
      start.nextSibling.remove();
    // Only build-time configuration and our own text enter this template, never request data.
    const template = document.createElement('template');
    template.innerHTML =
      pathname === '/'
        ? homepageMetadata(siteOrigin)
        : '<title>Ushly · Page unavailable</title><meta name="robots" content="noindex, follow">';
    end.before(template.content);
  }, [pathname]);
  return null;
}
