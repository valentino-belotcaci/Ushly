import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App } from './app/App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ToastProvider';
import { homepageMetadata } from './features/home/metadata';
import {
  isPublicPagePath,
  publicPagePaths as marketingPagePaths,
} from './features/public-pages/routes';
import { publicPageMetadata } from './features/public-pages/metadata';
import { siteOrigin } from './config/public';
import { authMetadata, isAuthPath } from './features/auth/metadata';
import {
  isLegalPagePath,
  isLocalizedLegalPath,
  legalPagePaths,
  localizedLegalRoutes,
} from './features/legal/routes';
import { legalPageMetadata } from './features/legal/metadata';
import { localeFromPath, localizedPath, stripLocale } from './i18n/locale';

export const publicPagePaths = [
  ...marketingPagePaths,
  ...legalPagePaths,
];
export const authPagePaths = ['/login', '/register'] as const;
export const localizedPublicPagePaths = (['en', 'it'] as const).flatMap(
  (locale) => [
    localizedPath('/', locale),
    ...marketingPagePaths.map((path) => localizedPath(path, locale)),
    ...Object.keys(localizedLegalRoutes).map((path) =>
      localizedPath(path, locale),
    ),
  ],
);
export const localizedAuthPagePaths = (['en', 'it'] as const).flatMap(
  (locale) => authPagePaths.map((path) => localizedPath(path, locale)),
);
export const prerenderSiteOrigin = siteOrigin;

export function renderPage(path: string) {
  const locale = localeFromPath(path);
  const basePath = stripLocale(path.replace(/\/$/, '') || '/');
  if (
    basePath !== '/' &&
    !isPublicPagePath(basePath) &&
    !isLocalizedLegalPath(basePath) &&
    !isLegalPagePath(basePath) &&
    !isAuthPath(basePath)
  )
    throw new Error('Unknown public page');
  let head: string;
  if (basePath === '/') head = homepageMetadata(siteOrigin, locale, path);
  else if (isPublicPagePath(basePath))
    head = publicPageMetadata(basePath, siteOrigin, locale, path);
  else if (isLocalizedLegalPath(basePath))
    head = legalPageMetadata(
      localizedLegalRoutes[basePath],
      siteOrigin,
      locale,
      path,
    );
  else if (isLegalPagePath(basePath))
    head = legalPageMetadata(basePath, siteOrigin, locale, path);
  else if (isAuthPath(basePath)) head = authMetadata(basePath, locale);
  else throw new Error('Unknown public page');
  return {
    head,
    html: renderToString(
      <ThemeProvider>
        <StaticRouter location={path}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </StaticRouter>
      </ThemeProvider>,
    ),
  };
}
