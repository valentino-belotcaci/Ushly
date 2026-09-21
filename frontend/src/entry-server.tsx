import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { App } from './app/App';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './components/ToastProvider';
import { homepageMetadata } from './features/home/metadata';
import { siteOrigin } from './config/public';

export function renderHomepage() {
  return {
    head: homepageMetadata(siteOrigin),
    html: renderToString(
      <ThemeProvider>
        <ToastProvider>
          <StaticRouter location="/">
            <App />
          </StaticRouter>
        </ToastProvider>
      </ThemeProvider>,
    ),
  };
}
