// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { listSyntheticCases, type CaseSummary } from '../src/case-client.ts';
import { CasesPage } from '../src/cases-page.tsx';

vi.mock('../src/case-client.ts', () => ({ listSyntheticCases: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('shows a clear empty state when the case API returns no drafts', async () => {
  vi.mocked(listSyntheticCases).mockResolvedValueOnce([]);
  render(<CasesPage />);
  expect(await screen.findByRole('heading', { name: 'No saved cases yet' })).toBeVisible();
  expect(screen.getByText('The local workspace has no synthetic case drafts.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Prepare a case record' })).toHaveAttribute(
    'href',
    '/upload',
  );
  expect(screen.queryByRole('list', { name: 'Saved cases' })).not.toBeInTheDocument();
});

test('retries an unavailable case list and displays only returned case metadata', async () => {
  let rejectFirst!: (reason?: unknown) => void;
  vi.mocked(listSyntheticCases)
    .mockImplementationOnce(
      () =>
        new Promise<CaseSummary[]>((_, reject) => {
          rejectFirst = reject;
        }),
    )
    .mockResolvedValueOnce([
      {
        caseId: '00000000-0000-4000-8000-000000000001',
        label: 'Synthetic draft',
        recordRevision: 1,
      },
    ]);
  const user = userEvent.setup();
  render(<CasesPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading saved cases');
  rejectFirst(new Error('synthetic offline fixture'));
  const retry = await screen.findByRole('button', { name: 'Retry loading cases' });
  expect(
    screen.getByText('The local case service is unavailable. Retry after the service starts.'),
  ).toBeVisible();
  expect(listSyntheticCases).toHaveBeenCalledTimes(1);
  await user.click(retry);
  expect(await screen.findByText('Synthetic draft')).toBeVisible();
  expect(screen.getByRole('list', { name: 'Saved cases' })).toHaveTextContent('Record revision 1');
  expect(screen.getByText('These drafts do not include uploaded documents yet.')).toBeVisible();
  expect(listSyntheticCases).toHaveBeenCalledTimes(2);
});
