import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { BrowserRouter, StaticRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';

it('uses the routed Italian locale consistently during prerender and hydration', async () => {
  const serverHtml = renderToString(
    <StaticRouter location="/it/">
      <ToastProvider>
        <main>Contenuto</main>
      </ToastProvider>
    </StaticRouter>,
  );
  expect(serverHtml).toContain('aria-label="Notifiche"');

  window.history.replaceState(null, '', '/it/');
  const container = document.createElement('div');
  container.innerHTML = serverHtml;
  document.body.append(container);
  const recoverableError = vi.fn();

  const root = hydrateRoot(
    container,
    <BrowserRouter>
      <ToastProvider>
        <main>Contenuto</main>
      </ToastProvider>
    </BrowserRouter>,
    { onRecoverableError: recoverableError },
  );
  await act(async () => undefined);

  expect(recoverableError).not.toHaveBeenCalled();
  expect(container.querySelector('.toast-region')).toHaveAttribute(
    'aria-label',
    'Notifiche',
  );
  root.unmount();
  container.remove();
});
