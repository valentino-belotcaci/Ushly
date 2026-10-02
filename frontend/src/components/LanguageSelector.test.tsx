import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it } from 'vitest';
import { LanguageSelector } from './LanguageSelector';

async function languageLinks(path: string) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageSelector />
    </MemoryRouter>,
  );
  await user.click(
    screen.getByRole('button', { name: 'Seleziona la lingua' }),
  );
  return {
    english: screen.getByRole('menuitem', { name: 'English (EN)' }),
    italian: screen.getByRole('menuitem', { name: 'Italiano (IT)' }),
  };
}

it('preserves dashboard path, query, and hash when changing language', async () => {
  const { english } = await languageLinks(
    '/it/dashboard/links?page=2#recent-links',
  );
  expect(english).toHaveAttribute(
    'href',
    '/en/dashboard/links?page=2#recent-links',
  );
});

it('preserves a localized authentication destination', async () => {
  const login = await languageLinks('/it/login?next=dashboard');
  expect(login.english).toHaveAttribute('href', '/en/login?next=dashboard');
});

it('preserves a localized legal destination and hash', async () => {
  const privacy = await languageLinks('/it/privacy-policy#requests');
  expect(privacy.english).toHaveAttribute(
    'href',
    '/en/privacy-policy#requests',
  );
});

it('keeps an unknown path as the safe localized fallback', async () => {
  const { english } = await languageLinks('/it/not-available');
  expect(english).toHaveAttribute('href', '/en/not-available');
});
