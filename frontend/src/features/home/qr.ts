import { apiOrigin } from '../../config/public';

export const MAX_QR_INPUT_BYTES = 2048;
export const MAX_QR_SVG_BYTES = 64 * 1024;

export async function generatePublicQr(shortUrl: string): Promise<Blob> {
  // Accept only the exact public URL shape produced by our link client, never a destination or credential.
  if (new TextEncoder().encode(shortUrl).length > MAX_QR_INPUT_BYTES) {
    throw new Error('Invalid public short URL');
  }
  const url = new URL(shortUrl);
  if (
    !apiOrigin ||
    url.origin !== apiOrigin ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[A-Za-z0-9]{1,32}$/.test(url.pathname) ||
    url.href !== shortUrl
  )
    throw new Error('Invalid public short URL');

  // Keep the encoder out of the initial homepage bundle and perform no QR API request.
  const { default: QRCode } = await import('qrcode');
  const svg = await QRCode.toString(shortUrl, {
    type: 'svg',
    width: 512,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  if (blob.size === 0 || blob.size > MAX_QR_SVG_BYTES) {
    throw new Error('QR output exceeds the permitted size');
  }
  // Use only as an image/download. SVG markup is never inserted into the page.
  return blob;
}
