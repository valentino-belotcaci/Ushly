import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App } from './app/App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ToastProvider';
import { homepageMetadata } from './features/home/metadata';
import { isPublicPagePath, publicPages } from './features/public-pages/content';
import { publicPageMetadata } from './features/public-pages/metadata';
import { siteOrigin } from './config/public';

export const publicPagePaths =
  Object.keys(publicPages).filter(isPublicPagePath);

export function renderPage(path: string) {
  if (path !== '/' && !isPublicPagePath(path))
    throw new Error('Unknown public page');
  return {
    head:
      path === '/'
        ? homepageMetadata(siteOrigin)
        : publicPageMetadata(path, siteOrigin),
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
