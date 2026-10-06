// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from '../src/app.tsx';
import {
  SyntheticOriginalInventory,
  SyntheticProcessingStatus,
  SyntheticSourceWorkspace,
  splitVerifiedSourceText,
} from '../src/case-detail-page.tsx';
import {
  getSyntheticDocumentProcessing,
  getSyntheticOriginal,
  getSyntheticTextSource,
  getSyntheticCase,
  listSyntheticOriginals,
  listSyntheticTextSources,
  verifySyntheticTextSpan,
  type CaseSummary,
  type SyntheticDocumentProcessing,
  type SyntheticOriginalReceipt,
  type SyntheticTextSource,
  type SyntheticTextSourceReference,
} from '../src/case-client.ts';

vi.mock('../src/case-client.ts', () => ({
  getSyntheticCase: vi.fn(),
  getSyntheticDocumentProcessing: vi.fn(),
  getSyntheticOriginal: vi.fn(),
  getSyntheticTextSource: vi.fn(),
  listSyntheticOriginals: vi.fn(),
  listSyntheticTextSources: vi.fn(),
  listSyntheticCases: vi.fn(),
  createSyntheticCase: vi.fn(),
  verifySyntheticTextSpan: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(listSyntheticOriginals).mockResolvedValue([]);
  vi.mocked(listSyntheticTextSources).mockResolvedValue([]);
  vi.mocked(getSyntheticDocumentProcessing).mockResolvedValue(undefined);
  vi.mocked(verifySyntheticTextSpan).mockImplementation(
    async (_caseId, _sourceUnitId, candidate) => ({
      caseId: _caseId,
      ...candidate,
    }),
  );
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
  expect(
    screen.getByText('Processing status comes from the case-scoped background queue.'),
  ).toBeVisible();
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
  const documentVersionIds = [21, 22, 23, 24, 25, 26].map(
    (suffix) => `00000000-0000-4000-8000-0000000000${suffix}`,
  );
  vi.mocked(getSyntheticCase).mockResolvedValueOnce({
    caseId,
    label: 'Synthetic saved draft',
    recordRevision: 1,
  });
  vi.mocked(listSyntheticOriginals).mockResolvedValueOnce(
    documentVersionIds.map((documentVersionId, index) => ({
      caseId,
      documentVersionId,
      sha256: 'a'.repeat(64),
      byteLength: 12 + index,
    })),
  );
  let resolveQueued!: (value: SyntheticDocumentProcessing) => void;
  vi.mocked(getSyntheticDocumentProcessing).mockImplementationOnce(
    () =>
      new Promise<SyntheticDocumentProcessing>((resolve) => {
        resolveQueued = resolve;
      }),
  );
  for (const [index, state] of ['processing', 'published', 'failed'].entries())
    vi.mocked(getSyntheticDocumentProcessing).mockResolvedValueOnce({
      documentVersionId: documentVersionIds[index + 1] as string,
      extractionVersion: 'pdfjs-native-v1',
      state: state as 'queued' | 'processing' | 'published' | 'failed',
      attemptCount: 1,
      failureCode: state === 'failed' ? 'extraction_failed' : null,
    });
  vi.mocked(getSyntheticDocumentProcessing)
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('synthetic status outage'));
  render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <App />
    </MemoryRouter>,
  );
  expect(await screen.findByRole('heading', { name: 'Registered originals' })).toBeVisible();
  expect(await screen.findByText(documentVersionIds[0] as string)).toBeVisible();
  expect(screen.getByText('12 bytes')).toBeVisible();
  expect(screen.getAllByText('Loading processing status…')[0]).toBeVisible();
  resolveQueued({
    documentVersionId: documentVersionIds[0] as string,
    extractionVersion: 'pdfjs-native-v1',
    state: 'queued',
    attemptCount: 0,
    failureCode: null,
  });
  expect(await screen.findByText('Waiting to process')).toBeVisible();
  expect(await screen.findByText('Extracting record text')).toBeVisible();
  expect(await screen.findByText('Source extraction complete')).toBeVisible();
  expect(await screen.findByText('Extraction could not complete')).toBeVisible();
  expect(await screen.findByText('No processing record found')).toBeVisible();
  expect(await screen.findByText('Processing status unavailable')).toBeVisible();
  expect(listSyntheticOriginals).toHaveBeenCalledExactlyOnceWith(caseId);
  for (const [index, documentVersionId] of documentVersionIds.entries())
    expect(getSyntheticDocumentProcessing).toHaveBeenNthCalledWith(
      index + 1,
      caseId,
      documentVersionId,
    );

  cleanup();
  vi.clearAllMocks();
  const nextCaseId = '00000000-0000-4000-8000-000000000003';
  const documentVersionId = documentVersionIds[0] as string;
  vi.mocked(getSyntheticDocumentProcessing).mockResolvedValueOnce({
    documentVersionId,
    extractionVersion: 'pdfjs-native-v1',
    state: 'published',
    attemptCount: 1,
    failureCode: null,
  });
  let resolveNextStatus!: (value: SyntheticDocumentProcessing) => void;
  vi.mocked(getSyntheticDocumentProcessing).mockImplementationOnce(
    () =>
      new Promise<SyntheticDocumentProcessing>((resolve) => {
        resolveNextStatus = resolve;
      }),
  );
  const status = render(
    <SyntheticProcessingStatus caseId={caseId} documentVersionId={documentVersionId} />,
  );
  expect(await screen.findByText('Source extraction complete')).toBeVisible();
  status.rerender(
    <SyntheticProcessingStatus caseId={nextCaseId} documentVersionId={documentVersionId} />,
  );
  expect(screen.getByText('Loading processing status…')).toBeVisible();
  resolveNextStatus({
    documentVersionId,
    extractionVersion: 'pdfjs-native-v1',
    state: 'queued',
    attemptCount: 0,
    failureCode: null,
  });
  expect(await screen.findByText('Waiting to process')).toBeVisible();
  expect(getSyntheticDocumentProcessing).toHaveBeenNthCalledWith(2, nextCaseId, documentVersionId);

  cleanup();
  vi.clearAllMocks();
  const original = {
    caseId,
    documentVersionId,
    sha256: 'a'.repeat(64),
    byteLength: 12,
  };
  let resolveStaleInventory!: (value: SyntheticOriginalReceipt[]) => void;
  let resolveNextInventory!: (value: SyntheticOriginalReceipt[]) => void;
  vi.mocked(listSyntheticOriginals)
    .mockImplementationOnce(
      () =>
        new Promise<SyntheticOriginalReceipt[]>((resolve) => {
          resolveStaleInventory = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<SyntheticOriginalReceipt[]>((resolve) => {
          resolveNextInventory = resolve;
        }),
    );
  const inventory = render(<SyntheticOriginalInventory caseId={caseId} />);
  inventory.rerender(<SyntheticOriginalInventory caseId={nextCaseId} />);
  await act(async () => resolveStaleInventory([original]));
  expect(screen.getByText('Loading registered originals…')).toBeVisible();
  expect(screen.queryByText(documentVersionId)).not.toBeInTheDocument();
  await act(async () => resolveNextInventory([]));
  expect(await screen.findByText('No registered originals yet.')).toBeVisible();
});

test('opens a registered original in a new document tab', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  vi.mocked(listSyntheticOriginals).mockResolvedValueOnce([
    { caseId, documentVersionId, sha256: 'a'.repeat(64), byteLength: 12 },
  ]);
  vi.mocked(getSyntheticOriginal).mockResolvedValueOnce(
    new Blob(['synthetic pdf bytes'], { type: 'application/pdf' }),
  );
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic');
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  const user = userEvent.setup();
  render(<SyntheticOriginalInventory caseId={caseId} />);

  await user.click(await screen.findByRole('button', { name: 'Open original document' }));
  expect(getSyntheticOriginal).toHaveBeenCalledExactlyOnceWith(caseId, documentVersionId);
  expect(createObjectURL).toHaveBeenCalledExactlyOnceWith(expect.any(Blob));
  expect(open).toHaveBeenCalledExactlyOnceWith('blob:synthetic', '_blank', 'noopener,noreferrer');
  createObjectURL.mockRestore();
  open.mockRestore();
});

test('reports an unavailable original without opening a tab', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  vi.mocked(listSyntheticOriginals).mockResolvedValueOnce([
    { caseId, documentVersionId, sha256: 'a'.repeat(64), byteLength: 12 },
  ]);
  vi.mocked(getSyntheticOriginal).mockRejectedValueOnce(new Error('original_unavailable'));
  const open = vi.spyOn(window, 'open').mockReturnValue(null);
  const user = userEvent.setup();
  render(<SyntheticOriginalInventory caseId={caseId} />);

  await user.click(await screen.findByRole('button', { name: 'Open original document' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Original document unavailable.');
  expect(open).not.toHaveBeenCalled();
  open.mockRestore();
});

test('shows opening progress and clears a previous original error after retry', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  vi.mocked(listSyntheticOriginals).mockResolvedValueOnce([
    { caseId, documentVersionId, sha256: 'a'.repeat(64), byteLength: 12 },
  ]);
  let resolveDocument!: (value: Blob) => void;
  vi.mocked(getSyntheticOriginal)
    .mockRejectedValueOnce(new Error('original_unavailable'))
    .mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          resolveDocument = resolve;
        }),
    );
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic');
  vi.spyOn(window, 'open').mockReturnValue(null);
  const user = userEvent.setup();
  render(<SyntheticOriginalInventory caseId={caseId} />);

  const button = await screen.findByRole('button', { name: 'Open original document' });
  await user.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('Original document unavailable.');
  await user.click(screen.getByRole('button', { name: 'Open original document' }));
  expect(screen.getByRole('button', { name: 'Opening original…' })).toBeDisabled();
  resolveDocument(new Blob(['retry bytes'], { type: 'application/pdf' }));
  expect(await screen.findByRole('button', { name: 'Open original document' })).toBeEnabled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  createObjectURL.mockRestore();
});

test('polls active document processing until a terminal status arrives', async () => {
  vi.useFakeTimers();
  try {
    const caseId = '00000000-0000-4000-8000-000000000002';
    const documentVersionId = '00000000-0000-4000-8000-000000000021';
    vi.mocked(getSyntheticDocumentProcessing)
      .mockResolvedValueOnce({
        documentVersionId,
        extractionVersion: 'pdfjs-native-v1',
        state: 'queued',
        attemptCount: 0,
        failureCode: null,
      })
      .mockResolvedValueOnce({
        documentVersionId,
        extractionVersion: 'pdfjs-native-v1',
        state: 'processing',
        attemptCount: 1,
        failureCode: null,
      })
      .mockResolvedValueOnce({
        documentVersionId,
        extractionVersion: 'pdfjs-native-v1',
        state: 'published',
        attemptCount: 1,
        failureCode: null,
      });

    render(<SyntheticProcessingStatus caseId={caseId} documentVersionId={documentVersionId} />);
    await act(async () => undefined);
    expect(screen.getByText('Waiting to process')).toBeVisible();

    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(screen.getByText('Extracting record text')).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(screen.getByText('Source extraction complete')).toBeVisible();

    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(getSyntheticDocumentProcessing).toHaveBeenCalledTimes(3);
    expect(getSyntheticDocumentProcessing).toHaveBeenCalledWith(caseId, documentVersionId);

    cleanup();
    vi.mocked(getSyntheticDocumentProcessing).mockReset().mockResolvedValueOnce({
      documentVersionId,
      extractionVersion: 'pdfjs-native-v1',
      state: 'queued',
      attemptCount: 0,
      failureCode: null,
    });
    const queued = render(
      <SyntheticProcessingStatus caseId={caseId} documentVersionId={documentVersionId} />,
    );
    await act(async () => undefined);
    queued.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(getSyntheticDocumentProcessing).toHaveBeenCalledTimes(1);

    vi.mocked(getSyntheticDocumentProcessing).mockReset();
    let resolveStale!: (value: SyntheticDocumentProcessing) => void;
    vi.mocked(getSyntheticDocumentProcessing)
      .mockImplementationOnce(
        () =>
          new Promise<SyntheticDocumentProcessing>((resolve) => {
            resolveStale = resolve;
          }),
      )
      .mockResolvedValueOnce({
        documentVersionId,
        extractionVersion: 'pdfjs-native-v1',
        state: 'published',
        attemptCount: 1,
        failureCode: null,
      });
    const status = render(
      <SyntheticProcessingStatus caseId={caseId} documentVersionId={documentVersionId} />,
    );
    const nextCaseId = '00000000-0000-4000-8000-000000000003';
    status.rerender(
      <SyntheticProcessingStatus caseId={nextCaseId} documentVersionId={documentVersionId} />,
    );
    await act(async () => undefined);
    expect(screen.getByText('Source extraction complete')).toBeVisible();
    await act(async () =>
      resolveStale({
        documentVersionId,
        extractionVersion: 'pdfjs-native-v1',
        state: 'queued',
        attemptCount: 0,
        failureCode: null,
      }),
    );
    expect(screen.getByText('Source extraction complete')).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(getSyntheticDocumentProcessing).toHaveBeenCalledTimes(2);

    status.unmount();
    vi.mocked(getSyntheticDocumentProcessing).mockReset();
    let rejectStale!: (reason: Error) => void;
    vi.mocked(getSyntheticDocumentProcessing)
      .mockImplementationOnce(
        () =>
          new Promise<SyntheticDocumentProcessing>((_resolve, reject) => {
            rejectStale = reject;
          }),
      )
      .mockResolvedValueOnce({
        documentVersionId,
        extractionVersion: 'pdfjs-native-v1',
        state: 'published',
        attemptCount: 1,
        failureCode: null,
      });
    const rejected = render(
      <SyntheticProcessingStatus caseId={caseId} documentVersionId={documentVersionId} />,
    );
    rejected.rerender(
      <SyntheticProcessingStatus caseId={nextCaseId} documentVersionId={documentVersionId} />,
    );
    await act(async () => undefined);
    await act(async () => rejectStale(new Error('stale request failed')));
    expect(screen.getByText('Source extraction complete')).toBeVisible();
  } finally {
    vi.useRealTimers();
  }
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
  expect(screen.getByRole('button', { name: 'Verify and highlight' })).toBeDisabled();
  expect(screen.getByText('Extraction synthetic-native-v1')).toBeVisible();
  expect(screen.getByText(`SHA-256 ${source.documentSha256}`)).toBeVisible();
  await user.type(screen.getByLabelText('Verify a quotation against this page'), 'synthetic page');
  await user.click(screen.getByRole('button', { name: 'Verify and highlight' }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Citation verified against the persisted source text',
  );
  expect(screen.getByText('synthetic page', { selector: 'mark' })).toBeVisible();
  expect(
    screen.getByText('synthetic page', { selector: 'mark' }).previousSibling,
  ).toHaveTextContent('Exact');
  expect(screen.getByText('synthetic page', { selector: 'mark' }).nextSibling).toHaveTextContent(
    'text with preserved spacing.',
  );
  expect(verifySyntheticTextSpan).toHaveBeenCalledWith(caseId, sourceUnitId, {
    recordRevision: source.recordRevision,
    documentVersionId: source.documentVersionId,
    documentSha256: source.documentSha256,
    extractionVersion: source.extractionVersion,
    sourceUnitId,
    start: source.rawText.indexOf('synthetic page'),
    end: source.rawText.indexOf('synthetic page') + 'synthetic page'.length,
    quote: 'synthetic page',
  });
  await user.clear(screen.getByLabelText('Verify a quotation against this page'));
  expect(screen.queryByText('synthetic page', { selector: 'mark' })).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Verify a quotation against this page'), 'Exact');
  await user.click(screen.getByRole('button', { name: 'Verify and highlight' }));
  expect(screen.getByText('Exact', { selector: 'mark' })).toBeVisible();
  await user.clear(screen.getByLabelText('Verify a quotation against this page'));
  await user.type(screen.getByLabelText('Verify a quotation against this page'), 'not present');
  await user.click(screen.getByRole('button', { name: 'Verify and highlight' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The citation could not be verified against this page',
  );
  vi.mocked(verifySyntheticTextSpan).mockRejectedValueOnce(new Error('source unavailable'));
  await user.clear(screen.getByLabelText('Verify a quotation against this page'));
  await user.type(screen.getByLabelText('Verify a quotation against this page'), 'Exact');
  await user.click(screen.getByRole('button', { name: 'Verify and highlight' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The citation could not be verified against this page',
  );
  expect(
    screen.getByText(
      (_content, element) => element?.tagName === 'PRE' && element.textContent === source.rawText,
    ),
  ).toBeVisible();
  expect(listSyntheticTextSources).toHaveBeenCalledTimes(2);
  expect(getSyntheticTextSource).toHaveBeenNthCalledWith(1, caseId, sourceUnitId);
  expect(getSyntheticTextSource).toHaveBeenNthCalledWith(2, caseId, sourceUnitId);
  await user.click(screen.getByRole('button', { name: 'Open document 0021, page 7' }));
  expect(await screen.findByText('The selected source is no longer available.')).toBeVisible();
  expect(screen.queryByText('synthetic page', { selector: 'mark' })).not.toBeInTheDocument();
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

test('splits only the verified source range for highlighting', () => {
  expect(splitVerifiedSourceText('before verified after', { start: 7, end: 15 })).toEqual([
    'before ',
    'verified',
    ' after',
  ]);
});

test('clears a prior highlight when reopening the same source', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const sourceUnitId = '00000000-0000-4000-8000-000000000031';
  const reference: SyntheticTextSourceReference = {
    sourceUnitId,
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    recordRevision: 1,
    documentSha256: 'a'.repeat(64),
    extractionVersion: 'synthetic-native-v1',
    pageNumber: 1,
  };
  const source: SyntheticTextSource = { ...reference, rawText: 'Exact source text.' };
  vi.mocked(listSyntheticTextSources).mockResolvedValue([reference]);
  vi.mocked(getSyntheticTextSource).mockResolvedValue(source);
  const user = userEvent.setup();
  render(<SyntheticSourceWorkspace caseId={caseId} />);
  await user.click(await screen.findByRole('button', { name: 'Open document 0021, page 1' }));
  await user.type(await screen.findByLabelText('Verify a quotation against this page'), 'Exact');
  await user.click(screen.getByRole('button', { name: 'Verify and highlight' }));
  expect(await screen.findByText('Exact', { selector: 'mark' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Open document 0021, page 1' }));
  expect(await screen.findByRole('heading', { name: 'Document 0021, page 1' })).toBeVisible();
  expect(screen.queryByText('Exact', { selector: 'mark' })).not.toBeInTheDocument();
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
