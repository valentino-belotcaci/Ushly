export type GooglePopupResult =
  | { status: 'success' }
  | { status: 'error'; code: 'oauth_conflict' | 'oauth_failed' }
  | { status: 'closed' | 'timeout' };

export function watchGooglePopup(
  popup: Window,
  apiOrigin: string,
  onResult: (result: GooglePopupResult) => void,
): () => void {
  let finished = false;
  function cleanup() {
    window.removeEventListener('message', onMessage);
    window.clearTimeout(timeoutTimer);
  }
  function finish(result: GooglePopupResult, closePopup = true) {
    if (finished) return;
    finished = true;
    cleanup();
    if (closePopup) popup.close();
    onResult(result);
  }
  function onMessage(event: MessageEvent) {
    if (event.origin !== apiOrigin || event.source !== popup) return;
    const data: unknown = event.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    if (!('type' in data) || data.type !== 'ushly-google-oauth') return;
    if ('status' in data && data.status === 'success') {
      popup.postMessage({ type: 'ushly-google-oauth-ack' }, apiOrigin);
      finish({ status: 'success' }, false);
    } else if (
      'status' in data && data.status === 'error' &&
      'code' in data &&
      (data.code === 'oauth_conflict' || data.code === 'oauth_failed')
    ) {
      popup.postMessage({ type: 'ushly-google-oauth-ack' }, apiOrigin);
      finish({ status: 'error', code: data.code }, false);
    }
  }
  window.addEventListener('message', onMessage);
  const timeoutTimer = window.setTimeout(() => finish({ status: 'timeout' }), 300_000);
  return () => {
    if (finished) return;
    finished = true;
    cleanup();
    popup.close();
  };
}
