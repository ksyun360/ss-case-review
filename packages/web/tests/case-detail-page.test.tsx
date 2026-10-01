// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/app.tsx';
import { SyntheticOriginalInventory, SyntheticSourceWorkspace } from '../src/case-detail-page.tsx';
import {
  getSyntheticTextSource,
  getSyntheticCase,
  listSyntheticOriginals,
  listSyntheticTextSources,
  type CaseSummary,
  type SyntheticOriginalReceipt,
  type SyntheticTextSource,
  type SyntheticTextSourceReference,
} from '../src/case-client.ts';

vi.mock('../src/case-client.ts', () => ({
  getSyntheticCase: vi.fn(),
  getSyntheticTextSource: vi.fn(),
  listSyntheticOriginals: vi.fn(),
  listSyntheticTextSources: vi.fn(),
  listSyntheticCases: vi.fn(),
  createSyntheticCase: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(listSyntheticOriginals).mockResolvedValue([]);
  vi.mocked(listSyntheticTextSources).mockResolvedValue([]);
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
  expect(screen.getByText('Automatic source extraction is not connected yet.')).toBeVisible();
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
  expect(screen.getByText('Automatic source extraction is not connected yet.')).toBeVisible();
  expect(listSyntheticOriginals).toHaveBeenCalledExactlyOnceWith(caseId);
});

test('retries source discovery and opens exact page text with its provenance', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const sourceUnitId = '00000000-0000-4000-8000-000000000031';
  const reference: SyntheticTextSourceReference = {
    sourceUnitId,
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    recordRevision: 1,
    documentSha256: 'a'.repeat(64),
    extractionVersion: 'synthetic-native-v1',
    pageNumber: 7,
  };
  const source: SyntheticTextSource = {
    ...reference,
    rawText: 'Exact synthetic page text\nwith preserved spacing.',
  };
  let resolveInventory!: (value: SyntheticTextSourceReference[]) => void;
  let resolveSource!: (value: SyntheticTextSource) => void;
  vi.mocked(getSyntheticCase).mockResolvedValueOnce({
    caseId,
    label: 'Synthetic source review',
    recordRevision: 1,
  });
  vi.mocked(listSyntheticTextSources)
    .mockRejectedValueOnce(new Error('synthetic inventory outage'))
    .mockImplementationOnce(
      () =>
        new Promise<SyntheticTextSourceReference[]>((resolve) => {
          resolveInventory = resolve;
        }),
    );
  vi.mocked(getSyntheticTextSource)
    .mockRejectedValueOnce(new Error('synthetic source outage'))
    .mockImplementationOnce(
      () =>
        new Promise<SyntheticTextSource>((resolve) => {
          resolveSource = resolve;
        }),
    )
    .mockResolvedValueOnce(undefined);
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <App />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Source inventory unavailable.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Retry loading sources' }));
  expect(screen.getByRole('status')).toHaveTextContent('Loading record sources');
  resolveInventory([reference]);
  await user.click(await screen.findByRole('button', { name: 'Open document 0021, page 7' }));
  expect(await screen.findByText('Source text unavailable.')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Retry opening source' }));
  expect(screen.getByRole('status')).toHaveTextContent('Loading source page 7');
  resolveSource(source);

  expect(await screen.findByRole('heading', { name: 'Document 0021, page 7' })).toBeVisible();
  expect(
    screen.getByText(
      (_content, element) => element?.tagName === 'PRE' && element.textContent === source.rawText,
    ),
  ).toBeVisible();
  expect(screen.getByText('Extraction synthetic-native-v1')).toBeVisible();
  expect(screen.getByText(`SHA-256 ${source.documentSha256}`)).toBeVisible();
  expect(listSyntheticTextSources).toHaveBeenCalledTimes(2);
  expect(getSyntheticTextSource).toHaveBeenNthCalledWith(1, caseId, sourceUnitId);
  expect(getSyntheticTextSource).toHaveBeenNthCalledWith(2, caseId, sourceUnitId);
  await user.click(screen.getByRole('button', { name: 'Open document 0021, page 7' }));
  expect(await screen.findByText('The selected source is no longer available.')).toBeVisible();
  expect(getSyntheticTextSource).toHaveBeenNthCalledWith(3, caseId, sourceUnitId);

  cleanup();
  vi.clearAllMocks();
  const nextCaseId = '00000000-0000-4000-8000-000000000003';
  const emptyCaseId = '00000000-0000-4000-8000-000000000004';
  const nextReference: SyntheticTextSourceReference = {
    ...reference,
    caseId: nextCaseId,
    sourceUnitId: '00000000-0000-4000-8000-000000000032',
    pageNumber: 8,
  };
  vi.mocked(listSyntheticTextSources)
    .mockResolvedValueOnce([reference])
    .mockResolvedValueOnce([nextReference])
    .mockResolvedValueOnce([]);
  vi.mocked(getSyntheticTextSource)
    .mockResolvedValueOnce(source)
    .mockResolvedValueOnce({ ...nextReference, rawText: 'Next case source text.' });
  const workspace = render(<SyntheticSourceWorkspace caseId={caseId} />);
  await user.click(await screen.findByRole('button', { name: 'Open document 0021, page 7' }));
  expect(await screen.findByRole('heading', { name: 'Document 0021, page 7' })).toBeVisible();

  workspace.rerender(<SyntheticSourceWorkspace caseId={nextCaseId} />);
  expect(await screen.findByRole('button', { name: 'Open document 0021, page 8' })).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Document 0021, page 7' })).not.toBeInTheDocument();
  expect(screen.queryByText('Loading source page 7')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Open document 0021, page 8' }));
  expect(await screen.findByRole('heading', { name: 'Document 0021, page 8' })).toBeVisible();
  expect(getSyntheticTextSource).toHaveBeenLastCalledWith(nextCaseId, nextReference.sourceUnitId);

  workspace.rerender(<SyntheticSourceWorkspace caseId={emptyCaseId} />);
  expect(await screen.findByText('No extracted sources are available yet.')).toBeVisible();
  expect(listSyntheticTextSources).toHaveBeenNthCalledWith(3, emptyCaseId);
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
