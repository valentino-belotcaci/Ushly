import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { PublicPage } from './PublicPage';
import { publicPages, type PublicPagePath } from './content';
import { publicPageMetadata } from './metadata';

const paths = Object.keys(publicPages) as PublicPagePath[];

it.each(paths)('renders accurate, distinct public content for %s', (path) => {
  const page = publicPages[path];
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
      publicPageMetadata(path, 'https://ushly.example'),
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
    ).toBe(`https://ushly.example${path}`);
    expect(
      document
        .querySelector('meta[property="og:url"]')
        ?.getAttribute('content'),
    ).toBe(`https://ushly.example${path}`);
    expect(
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute('content'),
    ).toBe(publicPages[path].description);
    expect(
      document.querySelector('meta[name="robots"]')?.getAttribute('content'),
    ).toBe('index, follow');
  }
  expect(titles.size).toBe(paths.length);
  expect(descriptions.size).toBe(paths.length);
});
