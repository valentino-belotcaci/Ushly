import { expect, it, vi } from 'vitest';
import { watchGooglePopup } from './googlePopup';

it('accepts a validated OAuth result without posting a redundant reply', () => {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const popup = frame.contentWindow;
  if (!popup) throw new Error('Missing test popup window');
  const close = vi.spyOn(popup, 'close').mockImplementation(() => undefined);
  const postMessage = vi.spyOn(popup, 'postMessage');
  const onResult = vi.fn();
  const stop = watchGooglePopup(popup, 'https://api.example.test', onResult);

  window.dispatchEvent(
    new MessageEvent('message', {
      origin: 'https://api.example.test',
      source: popup,
      data: { type: 'ushly-google-oauth', status: 'success' },
    }),
  );

  expect(onResult).toHaveBeenCalledWith({ status: 'success' });
  expect(postMessage).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
  stop();
});
