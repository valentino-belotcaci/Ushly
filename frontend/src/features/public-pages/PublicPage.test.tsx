import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { PublicPage } from './PublicPage';
import { publicPagePaths, type PublicPagePath } from './routes';
import { en } from '../../i18n/en';
import { publicPageMetadata } from './metadata';

const paths: readonly PublicPagePath[] = publicPagePaths;

it.each(paths)('renders accurate, distinct public content for %s', (path) => {
  const page = en.public.pages[path];
  render(
    <MemoryRouter>
      <PublicPage path={path} />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    page.title,
  );
  const faq = screen.getByRole('region', {
    name: 'Frequently asked questions',
  });
  expect(within(faq).getAllByText(/\?$/)).toHaveLength(page.faqs.length);
  expect(
    screen.getByRole('link', { name: page.heroActions[0].label }),
  ).toHaveAttribute('href', page.heroActions[0].to);
  expect(document.body).not.toHaveTextContent(
    /custom domains|A\/B testing|subscriptions|teams/i,
  );
});

it('gives each public page unique indexable metadata and a configured canonical URL', () => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const path of paths) {
    const document = new DOMParser().parseFromString(
      publicPageMetadata(path, 'https://ushly.example', 'en', `/en${path}`),
      'text/html',
    );
    titles.add(document.title);
    descriptions.add(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content') ?? '',
    );
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe(`https://ushly.example/en${path}`);
    expect(
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute('content'),
    ).toBe(`https://ushly.example/en${path}`);
    expect(
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute('content'),
    ).toBe(en.public.pages[path].description);
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('index, follow');
  }
  expect(titles.size).toBe(paths.length);
  expect(descriptions.size).toBe(paths.length);
});

it('keeps unlocalized public routes as non-indexable English aliases', () => {
  const document = new DOMParser().parseFromString(
    publicPageMetadata('/url-shortener', 'https://ushly.example'),
    'text/html',
  );
  expect(
    document.querySelector('meta[name="robots"]')?.getAttribute('content'),
  ).toBe('noindex, follow');
  expect(
    document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  ).toBe('https://ushly.example/en/url-shortener');
});

it('renders Italian content and localized SEO alternates without another page component', () => {
  render(
    <MemoryRouter initialEntries={['/it/url-shortener']}>
      <PublicPage path="/url-shortener" />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Abbrevia URL gratis e crea link brevi da condividere',
    }),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Abbrevia un URL' })).toHaveAttribute(
    'href',
    '/it/',
  );
  const head = publicPageMetadata(
    '/url-shortener',
    'https://ushly.example',
    'it',
    '/it/url-shortener',
  );
  expect(head).toContain('hreflang="en"');
  expect(head).toContain('hreflang="it"');
  expect(head).toContain('Abbrevia URL gratis | Ushly');
});
