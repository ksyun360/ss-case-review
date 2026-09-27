// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/app.tsx';
import { SyntheticOriginalInventory } from '../src/case-detail-page.tsx';
import {
  getSyntheticCase,
  listSyntheticOriginals,
  type CaseSummary,
  type SyntheticOriginalReceipt,
} from '../src/case-client.ts';

vi.mock('../src/case-client.ts', () => ({
  getSyntheticCase: vi.fn(),
  listSyntheticOriginals: vi.fn(),
  listSyntheticCases: vi.fn(),
  createSyntheticCase: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(listSyntheticOriginals).mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('opens saved synthetic case metadata and refreshes after case navigation', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const nextCaseId = '00000000-0000-4000-8000-000000000003';
  let resolveCase!: (value: CaseSummary) => void;
  vi.mocked(getSyntheticCase)
    .mockImplementationOnce(
      () =>
        new Promise<CaseSummary>((resolve) => {
          resolveCase = resolve;
        }),
    )
    .mockResolvedValueOnce({
      caseId: nextCaseId,
      label: 'Second synthetic draft',
      recordRevision: 1,
    });
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <Link to={`/cases/${nextCaseId}`}>Next synthetic draft</Link>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Loading case');
  expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  resolveCase({ caseId, label: 'Synthetic saved draft', recordRevision: 1 });
  expect(await screen.findByRole('heading', { name: 'Synthetic saved draft' })).toBeVisible();
  expect(screen.getByText('Record revision 1')).toBeVisible();
  expect(await screen.findByText('No registered originals yet.')).toBeVisible();
  expect(screen.getByText('Sources have not been extracted yet.')).toBeVisible();
  expect(getSyntheticCase).toHaveBeenCalledExactlyOnceWith(caseId);
  await user.click(screen.getByRole('link', { name: 'Next synthetic draft' }));
  expect(await screen.findByRole('heading', { name: 'Second synthetic draft' })).toBeVisible();
  expect(await screen.findByText('No registered originals yet.')).toBeVisible();
  expect(getSyntheticCase).toHaveBeenNthCalledWith(2, nextCaseId);
  expect(listSyntheticOriginals).toHaveBeenNthCalledWith(2, nextCaseId);
  cleanup();
  const inventory = render(<SyntheticOriginalInventory caseId={caseId} />);
  expect(await screen.findByText('No registered originals yet.')).toBeVisible();
  inventory.rerender(<SyntheticOriginalInventory caseId={nextCaseId} />);
  expect(listSyntheticOriginals).toHaveBeenNthCalledWith(4, nextCaseId);
});

test('explains when a saved synthetic case is not available to this reviewer', async () => {
  const caseId = '00000000-0000-4000-8000-000000000099';
  vi.mocked(getSyntheticCase).mockResolvedValueOnce(undefined);
  render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Case unavailable' })).toBeVisible();
  expect(screen.getByText('This case is not available in your synthetic workspace.')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Back to saved cases' })).toHaveAttribute(
    'href',
    '/cases',
  );
  expect(getSyntheticCase).toHaveBeenCalledExactlyOnceWith(caseId);
});

test('lists registered synthetic originals on the saved case page', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  vi.mocked(getSyntheticCase).mockResolvedValueOnce({
    caseId,
    label: 'Synthetic saved draft',
    recordRevision: 1,
  });
  vi.mocked(listSyntheticOriginals).mockResolvedValueOnce([
    { caseId, documentVersionId, sha256: 'a'.repeat(64), byteLength: 12 },
  ]);
  render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Registered originals' })).toBeVisible();
  expect(await screen.findByText(documentVersionId)).toBeVisible();
  expect(screen.getByText('12 bytes')).toBeVisible();
  expect(screen.getByText('Sources have not been extracted yet.')).toBeVisible();
  expect(listSyntheticOriginals).toHaveBeenCalledExactlyOnceWith(caseId);
});

test('retries a temporary case-detail failure without inventing case metadata', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  let resolveRetry!: (value: CaseSummary) => void;
  let resolveOriginals!: (value: SyntheticOriginalReceipt[]) => void;
  vi.mocked(getSyntheticCase)
    .mockRejectedValueOnce(new Error('synthetic service outage'))
    .mockImplementationOnce(
      () =>
        new Promise<CaseSummary>((resolve) => {
          resolveRetry = resolve;
        }),
    );
  const user = userEvent.setup();
  vi.mocked(listSyntheticOriginals)
    .mockRejectedValueOnce(new Error('inventory outage'))
    .mockImplementationOnce(
      () =>
        new Promise<SyntheticOriginalReceipt[]>((resolve) => {
          resolveOriginals = resolve;
        }),
    );
  render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Case service unavailable' })).toBeVisible();
  expect(screen.queryByText('Synthetic saved draft')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Retry loading case' }));
  expect(screen.getByRole('status')).toHaveTextContent('Loading case');
  resolveRetry({ caseId, label: 'Synthetic saved draft', recordRevision: 1 });
  expect(await screen.findByRole('heading', { name: 'Synthetic saved draft' })).toBeVisible();
  expect(getSyntheticCase).toHaveBeenCalledTimes(2);
  expect(await screen.findByText(/Original inventory unavailable/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Retry loading originals' }));
  expect(screen.getByRole('status')).toHaveTextContent('Loading registered originals');
  resolveOriginals([]);
  expect(await screen.findByText('No registered originals yet.')).toBeVisible();
  expect(listSyntheticOriginals).toHaveBeenCalledTimes(2);
});
