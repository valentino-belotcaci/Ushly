import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

type CloudFrontRequest = { uri: string };
type ViewerRequestHandler = (event: {
  request: CloudFrontRequest;
}) => CloudFrontRequest;

const source = readFileSync(
  resolve(process.cwd(), 'cloudfront/localized-public-routes.js'),
  'utf8',
);
const handler = vm.runInNewContext(
  `${source}\nhandler;`,
) as ViewerRequestHandler;

function rewrite(uri: string): string {
  return handler({ request: { uri } }).uri;
}

describe('CloudFront localized public route rewrite', () => {
  it.each([
    ['/en/', '/en/index.html'],
    ['/it/', '/it/index.html'],
    ['/en', '/en/index.html'],
    ['/it', '/it/index.html'],
    ['/en/url-shortener/', '/en/url-shortener/index.html'],
    ['/it/qr-codes/', '/it/qr-codes/index.html'],
    ['/en/analytics', '/en/analytics/index.html'],
    ['/it/features', '/it/features/index.html'],
    ['/en/privacy-policy/', '/en/privacy-policy/index.html'],
    ['/it/cookie-policy/', '/it/cookie-policy/index.html'],
    ['/en/terms-of-service/', '/en/terms-of-service/index.html'],
  ])('rewrites %s to its prerendered object', (uri, expected) => {
    expect(rewrite(uri)).toBe(expected);
  });

  it.each([
    '/assets/index.js',
    '/en/assets/app.js',
    '/robots.txt',
    '/sitemap.xml',
    '/api/links',
    '/en/login',
    '/it/register/',
    '/en/dashboard/',
    '/it/admin/users',
    '/en/dev/components',
    '/en/unknown/',
    '/fr/',
    '/en/url-shortener/image.svg',
  ])('leaves excluded or unknown URI %s unchanged', (uri) => {
    expect(rewrite(uri)).toBe(uri);
  });
});
