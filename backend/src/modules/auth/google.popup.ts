import { createHash } from 'node:crypto';
import type { FastifyReply } from 'fastify';

type PopupOutcome = { status: 'success' } | { status: 'error'; code: 'oauth_conflict' | 'oauth_failed' };

function validOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.origin === value;
  } catch {
    return false;
  }
}

export function sendGooglePopupResult(
  reply: FastifyReply,
  allowedOrigins: string[],
  outcome: PopupOutcome,
) {
  const origins = allowedOrigins.filter(validOrigin);
  // Only configured frontend origins receive the status. No OAuth or session material enters the page.
  const script = `const origins=${JSON.stringify(origins).replace(/</g, '\\u003c')};const message=${JSON.stringify({ type: 'ushly-google-oauth', ...outcome })};const opener=window.opener;window.addEventListener('message',event=>{if(event.source===opener&&origins.includes(event.origin)&&event.data?.type==='ushly-google-oauth-ack')window.close()});if(opener){for(const origin of origins)opener.postMessage(message,origin)}setTimeout(()=>window.close(),2000);`;
  const hash = createHash('sha256').update(script).digest('base64');
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ushly authentication</title></head><body><p>Authentication ${outcome.status === 'success' ? 'complete' : 'could not be completed'}. You can close this window.</p><script>${script}</script></body></html>`;
  return reply
    .header('Cache-Control', 'no-store')
    .header('Referrer-Policy', 'no-referrer')
    .header('Content-Security-Policy', `default-src 'none'; script-src 'sha256-${hash}'; base-uri 'none'; form-action 'none'`)
    .type('text/html; charset=utf-8')
    .send(body);
}
