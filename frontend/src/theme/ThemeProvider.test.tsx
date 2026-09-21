import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeProvider';
import { ThemeToggle } from '../components/ThemeToggle';
import { BrandLogo } from '../components/BrandLogo';
import { themeStorageKey } from './theme';
import darkLogo from '../assets/brand/ushly-logo-dark.svg';
import lightLogo from '../assets/brand/ushly-logo-light.svg';

describe('theme preference', () => {
  it('defaults to dark and persists an explicit light preference across mounts', async () => {
    const user = userEvent.setup();
    const first = render(
      <ThemeProvider>
        <ThemeToggle />
        <BrandLogo />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(first.container.querySelector('img')).toHaveAttribute(
      'src',
      darkLogo,
    );
    await user.click(screen.getByRole('button', { name: /use light theme/i }));
    expect(localStorage.getItem(themeStorageKey)).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(first.container.querySelector('img')).toHaveAttribute(
      'src',
      lightLogo,
    );
    first.unmount();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(
      screen.getByRole('button', { name: /use dark theme/i }),
    ).toBeInTheDocument();
  });
  it('uses dark for an unrecognized preference', () => {
    localStorage.setItem(themeStorageKey, 'invalid');
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
  it('switches even when storage is blocked', async () => {
    localStorage.setItem(themeStorageKey, 'unexpected');
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: /use light theme/i }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
  it('synchronizes another tab and resets safely when its preference is removed', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: themeStorageKey,
          newValue: 'light',
        }),
      ),
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: themeStorageKey,
          newValue: 'invalid',
        }),
      ),
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
