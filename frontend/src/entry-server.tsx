import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App } from './app/App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ToastProvider';
import { homepageMetadata } from './features/home/metadata';
import { isPublicPagePath, publicPages } from './features/public-pages/content';
import { publicPageMetadata } from './features/public-pages/metadata';
import { siteOrigin } from './config/public';
import { authMetadata, isAuthPath } from './features/auth/metadata';

export const publicPagePaths =
  Object.keys(publicPages).filter(isPublicPagePath);
export const authPagePaths = ['/login', '/register'] as const;

export function renderPage(path: string) {
  if (path !== '/' && !isPublicPagePath(path) && !isAuthPath(path))
    throw new Error('Unknown public page');
  return {
    head:
      path === '/'
        ? homepageMetadata(siteOrigin)
        : isPublicPagePath(path)
          ? publicPageMetadata(path, siteOrigin)
          : authMetadata(path),
    html: renderToString(
      <ThemeProvider>
        <ToastProvider>
          <StaticRouter location={path}>
            <App />
          </StaticRouter>
        </ToastProvider>
      </ThemeProvider>,
    ),
  };
}
