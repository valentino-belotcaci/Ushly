import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';
import { getOwnedStatistics } from './api';
import { useOwnedLinks } from './useOwnedLinks';

vi.mock('./api', () => ({ getOwnedStatistics: vi.fn() }));
vi.mock('./useOwnedLinks', () => ({ useOwnedLinks: vi.fn() }));

beforeEach(() => {
  vi.mocked(useOwnedLinks).mockReturnValue({
    data: {
      items: [
        {
          id: 'link-1',
          shortCode: 'abc',
          destinationUrl: 'https://example.test',
          title: 'Campaign',
          expiresAt: null,
          status: 'active',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 100,
      total: 1,
    },
    loading: false,
    error: '',
    reload: vi.fn(),
  });
  vi.mocked(getOwnedStatistics).mockResolvedValue({
    linkId: 'link-1',
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-03T00:00:00.000Z',
    timezone: 'UTC',
    granularity: 'day',
    total: 3,
    firstClickedAt: '2026-01-01T10:00:00.000Z',
    lastClickedAt: '2026-01-02T10:00:00.000Z',
    timeSeries: [{ bucket: '2026-01-01T00:00:00.000Z', clicks: 3 }],
    breakdowns: {
      referrers: [{ value: 'https://example.test', clicks: 2 }],
      userAgents: [{ value: 'Browser', clicks: 3 }],
    },
  });
});

it('renders all owner statistics sections with explicit UTC context', async () => {
  render(<AnalyticsPage />);
  const summary = await screen.findByRole('region', {
    name: 'Analytics summary',
  });
  expect(within(summary).getByText('3')).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Clicks over time' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Referrers' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'User agents' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('UTC');
});

it('rejects an invalid range before requesting statistics again', async () => {
  const user = userEvent.setup();
  render(<AnalyticsPage />);
  await screen.findByText('Clicks over time');
  await user.clear(screen.getByLabelText('From (UTC)'));
  await user.type(screen.getByLabelText('From (UTC)'), '2026-05-02T00:00');
  await user.clear(screen.getByLabelText('To (UTC)'));
  await user.type(screen.getByLabelText('To (UTC)'), '2026-05-01T00:00');
  await user.click(screen.getByRole('button', { name: 'Apply range' }));
  expect(screen.getByRole('alert')).toHaveTextContent('earlier than');
  expect(getOwnedStatistics).toHaveBeenCalledTimes(1);
});
