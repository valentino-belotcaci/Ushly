import { expect, it } from 'vitest';
import { homepageMetadata } from './metadata';
import { publicOrigin } from '../../config/public';

it('uses configured canonical/social URLs and accurate WebSite structured data', () => {
  const head = homepageMetadata('https://ushly.example');
  const document = new DOMParser().parseFromString(head, 'text/html');
  expect(document.title).toBe(
    'Free URL Shortener with QR Codes and Analytics | Ushly',
  );
  expect(
    document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  ).toBe('https://ushly.example/');
  expect(
    document.querySelector('meta[name="robots"]')?.getAttribute('content'),
  ).toBe('index, follow');
  expect(
    document.querySelector('meta[property="og:image:alt"]'),
  ).not.toBeNull();
  const structured: unknown = JSON.parse(
    document.querySelector('script')?.textContent ?? '{}',
  );
  expect(structured).toMatchObject({
    '@type': 'WebSite',
    name: 'Ushly',
    url: 'https://ushly.example/',
  });
});
it('omits canonical and absolute image URLs without deployment configuration', () => {
  const head = homepageMetadata();
  expect(head).not.toContain('rel="canonical"');
  expect(head).not.toContain('og:url');
  expect(head).not.toContain('og:image');
});
it.each([
  'javascript:alert(1)',
  'https://user:pass@example.com',
  'https://example.com/path',
  'https://example.com/?secret=1',
])('rejects unsafe configuration %s', (value) => {
  expect(() => publicOrigin(value, 'origin')).toThrow();
});
