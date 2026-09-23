// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../src/app.tsx';
import { getSyntheticCase, type CaseSummary } from '../src/case-client.ts';

vi.mock('../src/case-client.ts', () => ({
  getSyntheticCase: vi.fn(),
  listSyntheticCases: vi.fn(),
  createSyntheticCase: vi.fn(),
}));
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
  expect(
    screen.getByText('No documents have been uploaded for this synthetic draft.'),
  ).toBeVisible();
  expect(getSyntheticCase).toHaveBeenCalledExactlyOnceWith(caseId);
  await user.click(screen.getByRole('link', { name: 'Next synthetic draft' }));
  expect(await screen.findByRole('heading', { name: 'Second synthetic draft' })).toBeVisible();
  expect(getSyntheticCase).toHaveBeenNthCalledWith(2, nextCaseId);
});
