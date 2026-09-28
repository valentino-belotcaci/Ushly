import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { LegalPage } from './LegalPage';
import { legalPagePaths, type LegalPagePath } from './routes';
import { en } from '../../i18n/en';
import { legalPageMetadata } from './metadata';

const paths: readonly LegalPagePath[] = legalPagePaths;

it.each(paths)(
  'renders accurate legal content and related navigation for %s',
  (path) => {
    render(
      <MemoryRouter>
        <LegalPage path={path} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      en.legal.pages[path].title,
    );
  expect(screen.getByLabelText('Production review notice')).toHaveTextContent(
    /project template/i,
  );
    expect(
      screen.getByRole('navigation', { name: /sections/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Related legal pages')).toBeInTheDocument();
  },
);

it('provides distinct metadata and configured canonical URLs', () => {
  const titles = new Set<string>();
  for (const path of paths) {
    const document = new DOMParser().parseFromString(
      legalPageMetadata(path, 'https://ushly.example'),
      'text/html',
    );
    titles.add(document.title);
    expect(
      document
        .querySelector('link[rel="canonical"]')
        ?.getAttribute('href'),
    ).toBe(`https://ushly.example${path}`);
    expect(
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute('content'),
    ).toBe(en.legal.pages[path].description);
  }
  expect(titles.size).toBe(paths.length);
});
