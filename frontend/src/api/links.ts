import { apiOrigin } from '../config/public';

export type CreatedLink = { id: string; shortCode: string; shortUrl: string };
export class ApiError extends Error {}
export function validateUrl(value: string): string | undefined {
  if (!value.trim()) return 'Enter a URL to shorten.';
  try {
    const url = new URL(value);
    if (value.length <= 2048 && ['http:', 'https:'].includes(url.protocol))
      return undefined;
  } catch {
    /* The same message covers malformed and unsupported destinations. */
  }
  return 'Enter a complete http:// or https:// URL, up to 2,048 characters.';
}
function origin() {
  if (!apiOrigin)
    throw new ApiError(
      'URL shortening is not configured yet. Please try again later.',
    );
  return apiOrigin;
}
function headers(accessToken?: string): Headers {
  const result = new Headers();
  if (accessToken) result.set('Authorization', `Bearer ${accessToken}`);
  return result;
}
async function request(path: string, options: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${origin()}${path}`, {
      ...options,
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'Could not reach Ushly. Check your connection and try again.',
    );
  }
  // Never display an arbitrary server body, which may contain diagnostic details.
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Check your URL and try again.',
      422: 'This URL could not be processed. Check it and try again.',
      401: 'Please log in again to continue. Your request was not retried anonymously.',
      403: 'You do not have permission to use this link.',
      404: 'This link is not available.',
      429: 'Too many requests. Please wait a minute before trying again.',
    };
    throw new ApiError(
      messages[response.status] ??
        'Ushly is temporarily unavailable. Please try again later.',
    );
  }
  return response;
}
export async function createLink(
  url: string,
  accessToken?: string,
): Promise<CreatedLink> {
  const requestHeaders = headers(accessToken);
  requestHeaders.set('Content-Type', 'application/json');
  const response = await request('/links', {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify({ url }),
  });
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      'Ushly returned an invalid response. Please try again later.',
    );
  }
  if (
    !data ||
    typeof data !== 'object' ||
    !('id' in data) ||
    typeof data.id !== 'string' ||
    !data.id ||
    !('shortCode' in data) ||
    typeof data.shortCode !== 'string' ||
    !/^[A-Za-z0-9]{1,32}$/.test(data.shortCode) ||
    !('status' in data) ||
    data.status !== 'active'
  ) {
    throw new ApiError(
      'Ushly returned an invalid response. Please try again later.',
    );
  }
  return {
    id: data.id,
    shortCode: data.shortCode,
    shortUrl: new URL(`/${data.shortCode}`, origin()).href,
  };
}
export async function getLinkQr(
  id: string,
  accessToken: string,
): Promise<Blob> {
  const response = await request(`/links/${encodeURIComponent(id)}/qr`, {
    headers: headers(accessToken),
  });
  const blob = await response.blob();
  if (
    blob.type.split(';')[0] !== 'image/svg+xml' ||
    blob.size === 0 ||
    blob.size > 64 * 1024
  ) {
    throw new ApiError('The QR code could not be read. Please try again.');
  }
  // Use this only as an image/download; never inject a provider SVG into the document.
  return blob;
}
