import { afterEach, expect, test, vi } from 'vitest';
import {
  createSyntheticCase,
  getSyntheticDocumentProcessing,
  getSyntheticOriginal,
  getSyntheticUploadCapability,
  getSyntheticCase,
  getSyntheticTextSource,
  verifySyntheticTextSpan,
  listSyntheticCases,
  listSyntheticOriginals,
  listSyntheticTextSources,
  uploadSyntheticOriginal,
} from '../src/case-client.ts';

afterEach(() => vi.unstubAllGlobals());

test('loads and validates one document processing status without trusting malformed responses', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  const processing = {
    documentVersionId,
    extractionVersion: 'pdfjs-native-v1',
    state: 'queued',
    attemptCount: 0,
    failureCode: null,
  } as const;
  const validStatuses = [
    processing,
    { ...processing, extractionVersion: 'x'.repeat(128), state: 'processing', attemptCount: 1 },
    { ...processing, state: 'published', attemptCount: 1 },
    ...[
      'original_unavailable',
      'unsupported_document_format',
      'byte_budget_exceeded',
      'page_budget_exceeded',
      'extraction_failed',
      'publication_rejected',
    ].map((failureCode) => ({ ...processing, state: 'failed', attemptCount: 1, failureCode })),
  ];
  const invalidPayloads = [
    null,
    {},
    { processing: null },
    { processing: { ...processing, documentVersionId: 'not-a-uuid' } },
    {
      processing: {
        ...processing,
        documentVersionId: '00000000-0000-4000-8000-000000000022',
      },
    },
    { processing: { ...processing, extractionVersion: '' } },
    { processing: { ...processing, extractionVersion: null } },
    { processing: { ...processing, extractionVersion: 'x'.repeat(129) } },
    { processing: { ...processing, state: 'unknown' } },
    { processing: { ...processing, attemptCount: -1 } },
    { processing: { ...processing, attemptCount: 1.5 } },
    { processing: { ...processing, failureCode: 'unknown_failure' } },
  ];
  const errorJson = vi.fn();
  const fetch = vi.fn();
  for (const validStatus of validStatuses)
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ processing: validStatus }),
    });
  fetch
    .mockResolvedValueOnce({ ok: false, status: 404, json: errorJson })
    .mockResolvedValueOnce({ ok: false, status: 503, json: errorJson });
  for (const payload of invalidPayloads)
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload });
  vi.stubGlobal('fetch', fetch);

  for (const validStatus of validStatuses)
    await expect(getSyntheticDocumentProcessing(caseId, documentVersionId)).resolves.toEqual(
      validStatus,
    );
  await expect(getSyntheticDocumentProcessing(caseId, documentVersionId)).resolves.toBeUndefined();
  await expect(getSyntheticDocumentProcessing(caseId, documentVersionId)).rejects.toThrow(
    'document_processing_unavailable',
  );
  expect(errorJson).not.toHaveBeenCalled();
  for (let index = 0; index < invalidPayloads.length; index += 1)
    await expect(getSyntheticDocumentProcessing(caseId, documentVersionId)).rejects.toThrow(
      'document_processing_unavailable',
    );
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    `/api/v1/cases/${caseId}/document-processing/${documentVersionId}`,
    {
      headers: { 'x-record-review-client': 'synthetic-workspace' },
      cache: 'no-store',
      redirect: 'error',
    },
  );
  expect(fetch).toHaveBeenCalledTimes(validStatuses.length + 2 + invalidPayloads.length);
});

test('requests one reviewer-scoped draft through the same-origin API', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const saved = { caseId, label: 'Synthetic saved draft', recordRevision: 1 };
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ case: saved }) });
  vi.stubGlobal('fetch', fetch);
  expect(await getSyntheticCase(caseId)).toEqual(saved);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/v1/cases/${caseId}`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
});

test('loads and validates one case-scoped text source before browser display', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const sourceUnitId = '00000000-0000-4000-8000-000000000031';
  const source = {
    sourceUnitId,
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    recordRevision: 1,
    documentSha256: 'a'.repeat(64),
    extractionVersion: 'x'.repeat(128),
    pageNumber: 1,
    rawText: 'Synthetic source A😀B\nLiteral quotation',
  };
  const shortVersionSource = { ...source, extractionVersion: 'x' };
  const errorJson = vi.fn();
  const invalidPayloads = [
    null,
    {},
    { source: null },
    { source: { ...source, sourceUnitId: 'not-a-uuid' } },
    {
      source: { ...source, sourceUnitId: '00000000-0000-4000-8000-000000000032' },
    },
    { source: { ...source, sourceUnitId: `x${source.sourceUnitId}` } },
    { source: { ...source, sourceUnitId: `${source.sourceUnitId}x` } },
    { source: { ...source, caseId: '00000000-0000-4000-8000-000000000099' } },
    { source: { ...source, documentVersionId: 'not-a-uuid' } },
    { source: { ...source, documentVersionId: `x${source.documentVersionId}` } },
    { source: { ...source, documentVersionId: `${source.documentVersionId}x` } },
    { source: { ...source, recordRevision: 0 } },
    { source: { ...source, recordRevision: 1.5 } },
    { source: { ...source, recordRevision: Number.MAX_SAFE_INTEGER + 1 } },
    { source: { ...source, documentSha256: 'not-a-hash' } },
    { source: { ...source, documentSha256: `x${source.documentSha256}` } },
    { source: { ...source, documentSha256: `${source.documentSha256}x` } },
    { source: { ...source, extractionVersion: '' } },
    { source: { ...source, extractionVersion: '   ' } },
    { source: { ...source, extractionVersion: null } },
    { source: { ...source, extractionVersion: 'x'.repeat(129) } },
    { source: { ...source, pageNumber: 0 } },
    { source: { ...source, pageNumber: 1.5 } },
    { source: { ...source, pageNumber: Number.MAX_SAFE_INTEGER + 1 } },
    { source: { ...source, rawText: null } },
  ];
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ source }) })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ source: shortVersionSource }),
    })
    .mockResolvedValueOnce({ ok: false, status: 404, json: errorJson })
    .mockResolvedValueOnce({ ok: false, status: 503, json: errorJson });
  for (const payload of invalidPayloads)
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload });
  vi.stubGlobal('fetch', fetch);

  expect(await getSyntheticTextSource(caseId, sourceUnitId)).toEqual(source);
  expect(await getSyntheticTextSource(caseId, sourceUnitId)).toEqual(shortVersionSource);
  await expect(
    getSyntheticTextSource(caseId, '00000000-0000-4000-8000-000000000032'),
  ).resolves.toBeUndefined();
  await expect(getSyntheticTextSource(caseId, sourceUnitId)).rejects.toThrow(
    'text_source_unavailable',
  );
  expect(errorJson).not.toHaveBeenCalled();
  for (let index = 0; index < invalidPayloads.length; index += 1)
    await expect(getSyntheticTextSource(caseId, sourceUnitId)).rejects.toThrow(
      'text_source_unavailable',
    );
  expect(fetch).toHaveBeenNthCalledWith(1, `/api/v1/cases/${caseId}/text-sources/${sourceUnitId}`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  expect(fetch).toHaveBeenCalledTimes(4 + invalidPayloads.length);
});

test('verifies a source span through the guarded citation endpoint', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const sourceUnitId = '00000000-0000-4000-8000-000000000031';
  const candidate = {
    recordRevision: 1,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    documentSha256: 'a'.repeat(64),
    extractionVersion: 'pdfjs-native-v1',
    sourceUnitId,
    start: 4,
    end: 18,
    quote: 'verified quotation',
  };
  const span = { caseId, ...candidate };
  const invalidSpans = [
    null,
    'invalid',
    { ...span, caseId: '00000000-0000-4000-8000-000000000099' },
    { ...span, sourceUnitId: '00000000-0000-4000-8000-000000000032' },
    { ...span, documentVersionId: 'not-a-uuid' },
    { ...span, recordRevision: 0 },
    { ...span, documentSha256: 'not-a-hash' },
    { ...span, extractionVersion: '' },
    { ...span, extractionVersion: ' '.repeat(129) },
    { ...span, start: -1 },
    { ...span, start: 1.5 },
    { ...span, end: 4 },
    { ...span, end: 18.5 },
    { ...span, quote: '' },
  ];
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ span }) })
    .mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ code: 'source_span_not_located', reason: 'quote_mismatch' }),
    })
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ span: null }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ span: {} }) })
    .mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ code: 'source_span_not_located', reason: 42 }),
    })
    .mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({}),
    });
  for (const invalidSpan of invalidSpans)
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ span: invalidSpan }),
    });
  vi.stubGlobal('fetch', fetch);
  await expect(verifySyntheticTextSpan(caseId, sourceUnitId, candidate)).resolves.toEqual(span);
  await expect(verifySyntheticTextSpan(caseId, sourceUnitId, candidate)).rejects.toThrow(
    'source_span_not_located:quote_mismatch',
  );
  await expect(verifySyntheticTextSpan(caseId, sourceUnitId, candidate)).rejects.toThrow(
    'source_span_unavailable',
  );
  await expect(verifySyntheticTextSpan(caseId, sourceUnitId, candidate)).rejects.toThrow(
    'source_span_unavailable',
  );
  await expect(verifySyntheticTextSpan(caseId, sourceUnitId, candidate)).rejects.toThrow(
    'source_span_unavailable',
  );
  await expect(verifySyntheticTextSpan(caseId, sourceUnitId, candidate)).rejects.toThrow(
    'source_span_unavailable',
  );
  for (let index = 0; index < invalidSpans.length; index += 1)
    await expect(verifySyntheticTextSpan(caseId, sourceUnitId, candidate)).rejects.toThrow(
      'source_span_unavailable',
    );
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    `/api/v1/cases/${caseId}/text-sources/${sourceUnitId}/spans`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-record-review-client': 'synthetic-workspace',
      },
      body: JSON.stringify(candidate),
      cache: 'no-store',
      redirect: 'error',
    },
  );
});

test('lists validated case-scoped text source metadata without accepting page text', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const source = {
    sourceUnitId: '00000000-0000-4000-8000-000000000031',
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    recordRevision: 1,
    documentSha256: 'a'.repeat(64),
    extractionVersion: 'x',
    pageNumber: 1,
  };
  const boundarySource = {
    ...source,
    sourceUnitId: '00000000-0000-4000-8000-000000000032',
    extractionVersion: 'x'.repeat(128),
    pageNumber: 2,
  };
  const invalidPayloads = [
    null,
    {},
    { sources: null },
    { sources: [null] },
    { sources: [source, { ...source, sourceUnitId: 'not-a-uuid' }] },
    { sources: [{ ...source, sourceUnitId: 'not-a-uuid' }] },
    { sources: [{ ...source, sourceUnitId: `x${source.sourceUnitId}` }] },
    { sources: [{ ...source, sourceUnitId: `${source.sourceUnitId}x` }] },
    { sources: [{ ...source, caseId: '00000000-0000-4000-8000-000000000099' }] },
    { sources: [{ ...source, documentVersionId: 'not-a-uuid' }] },
    { sources: [{ ...source, documentVersionId: `x${source.documentVersionId}` }] },
    { sources: [{ ...source, documentVersionId: `${source.documentVersionId}x` }] },
    { sources: [{ ...source, recordRevision: 0 }] },
    { sources: [{ ...source, recordRevision: 1.5 }] },
    { sources: [{ ...source, recordRevision: Number.MAX_SAFE_INTEGER + 1 }] },
    { sources: [{ ...source, documentSha256: 'not-a-hash' }] },
    { sources: [{ ...source, documentSha256: `x${source.documentSha256}` }] },
    { sources: [{ ...source, documentSha256: `${source.documentSha256}x` }] },
    { sources: [{ ...source, extractionVersion: '' }] },
    { sources: [{ ...source, extractionVersion: '   ' }] },
    { sources: [{ ...source, extractionVersion: null }] },
    { sources: [{ ...source, extractionVersion: 'x'.repeat(129) }] },
    { sources: [{ ...source, pageNumber: 0 }] },
    { sources: [{ ...source, pageNumber: 1.5 }] },
    { sources: [{ ...source, pageNumber: Number.MAX_SAFE_INTEGER + 1 }] },
    { sources: [{ ...source, rawText: 'Unexpected page text' }] },
  ];
  const errorJson = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sources: [source, boundarySource] }),
    })
    .mockResolvedValueOnce({ ok: false, status: 404, json: errorJson });
  for (const payload of invalidPayloads)
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => payload });
  vi.stubGlobal('fetch', fetch);

  expect(await listSyntheticTextSources(caseId)).toEqual([source, boundarySource]);
  await expect(listSyntheticTextSources(caseId)).rejects.toThrow('source_inventory_unavailable');
  expect(errorJson).not.toHaveBeenCalled();
  for (let index = 0; index < invalidPayloads.length; index += 1)
    await expect(listSyntheticTextSources(caseId)).rejects.toThrow('source_inventory_unavailable');
  expect(fetch).toHaveBeenNthCalledWith(1, `/api/v1/cases/${caseId}/text-sources`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  expect(fetch).toHaveBeenCalledTimes(2 + invalidPayloads.length);
});

test('opens one member-scoped synthetic original as a Blob', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const documentVersionId = '00000000-0000-4000-8000-000000000021';
  const document = new Blob(['synthetic pdf bytes'], { type: 'application/pdf' });
  const fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => document });
  vi.stubGlobal('fetch', fetch);

  await expect(getSyntheticOriginal(caseId, documentVersionId)).resolves.toBe(document);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    `/api/v1/cases/${caseId}/synthetic-originals/${documentVersionId}`,
    {
      headers: { 'x-record-review-client': 'synthetic-workspace' },
      cache: 'no-store',
      redirect: 'error',
    },
  );
});

test('rejects an unavailable synthetic original without reading its error body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json }));
  await expect(
    getSyntheticOriginal(
      '00000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8000-000000000021',
    ),
  ).rejects.toThrow('original_unavailable');
  expect(json).not.toHaveBeenCalled();
});

test('reads the guarded synthetic upload capability from the same-origin API', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ syntheticOriginalUpload: false }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ syntheticOriginalUpload: true }) });
  vi.stubGlobal('fetch', fetch);
  expect(await getSyntheticUploadCapability()).toBe(false);
  expect(await getSyntheticUploadCapability()).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenNthCalledWith(1, '/api/v1/capabilities', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  expect(fetch).toHaveBeenNthCalledWith(2, '/api/v1/capabilities', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
});

test('rejects an unavailable synthetic upload capability without reading its error body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json }));
  await expect(getSyntheticUploadCapability()).rejects.toThrow('upload_capability_unavailable');
  expect(json).not.toHaveBeenCalled();
});

test('rejects a synthetic upload capability without a Boolean value', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => null })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ syntheticOriginalUpload: 'true' }) });
  vi.stubGlobal('fetch', fetch);
  await expect(getSyntheticUploadCapability()).rejects.toThrow('upload_capability_unavailable');
  await expect(getSyntheticUploadCapability()).rejects.toThrow('upload_capability_unavailable');
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('treats an inaccessible case as unavailable without reading its body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false, json }));
  await expect(getSyntheticCase('00000000-0000-4000-8000-000000000099')).resolves.toBeUndefined();
  expect(json).not.toHaveBeenCalled();
});

test('rejects a failed case-detail response without displaying its error body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503, ok: false, json }));
  await expect(getSyntheticCase('00000000-0000-4000-8000-000000000002')).rejects.toThrow(
    'case_detail_unavailable',
  );
  expect(json).not.toHaveBeenCalled();
});

test('rejects a case-detail response without case metadata', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }));
  await expect(getSyntheticCase('00000000-0000-4000-8000-000000000002')).rejects.toThrow(
    'case_detail_unavailable',
  );
});

test('creates a synthetic draft through the guarded same-origin API', async () => {
  const created = {
    caseId: '00000000-0000-4000-8000-000000000002',
    label: 'Synthetic new draft',
    recordRevision: 1,
  };
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ case: created }) });
  vi.stubGlobal('fetch', fetch);
  expect(await createSyntheticCase('Synthetic new draft')).toEqual(created);
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/v1/cases', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: JSON.stringify({ label: 'Synthetic new draft' }),
    cache: 'no-store',
    redirect: 'error',
  });
});

test('rejects a failed draft creation without trusting an error body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json }));
  await expect(createSyntheticCase('Synthetic failed draft')).rejects.toThrow(
    'case_creation_unavailable',
  );
  expect(json).not.toHaveBeenCalled();
});

test('rejects a successful draft response without case metadata', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }));
  await expect(createSyntheticCase('Synthetic missing draft')).rejects.toThrow(
    'case_creation_unavailable',
  );
});

test('rejects a case row with a zero record revision', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [
          {
            caseId: '00000000-0000-4000-8000-000000000001',
            label: 'Synthetic draft',
            recordRevision: 0,
          },
        ],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects a case row with a nonnumeric record revision', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [
          {
            caseId: '00000000-0000-4000-8000-000000000001',
            label: 'Synthetic draft',
            recordRevision: 'unknown',
          },
        ],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects a case row without a usable case identity', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [{ caseId: null, label: 'Synthetic draft', recordRevision: 1 }],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects malformed case rows before the browser displays a list', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [
          {
            caseId: '00000000-0000-4000-8000-000000000001',
            label: 'Synthetic draft',
            recordRevision: 1,
          },
          null,
        ],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects a missing case list instead of treating it as an empty list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }));
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects an unsuccessful case response without reading its body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json }));
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
  expect(json).not.toHaveBeenCalled();
});

test('requests reviewer-scoped cases through the same-origin development route', async () => {
  const cases = [
    {
      caseId: '00000000-0000-4000-8000-000000000001',
      label: 'Synthetic draft',
      recordRevision: 1,
    },
  ];
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cases }) });
  vi.stubGlobal('fetch', fetch);
  expect(await listSyntheticCases()).toEqual(cases);
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/v1/cases', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
});

test('requests a case-scoped synthetic original inventory and rejects failed responses', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const original = {
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    sha256: 'a'.repeat(64),
    byteLength: 0,
  };
  const json = vi.fn();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ originals: [original] }) })
    .mockResolvedValueOnce({ ok: false, status: 503, json });
  vi.stubGlobal('fetch', fetch);
  expect(await listSyntheticOriginals(caseId)).toEqual([original]);
  await expect(listSyntheticOriginals(caseId)).rejects.toThrow('original_list_unavailable');
  expect(json).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch).toHaveBeenNthCalledWith(1, `/api/v1/cases/${caseId}/synthetic-originals`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
});

test('rejects malformed synthetic original inventory rows before display', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const original = {
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000021',
    sha256: 'a'.repeat(64),
    byteLength: 12,
  };
  const invalidPayloads = [
    null,
    {},
    { originals: null },
    { originals: {} },
    { originals: [null] },
    { originals: [{ ...original, caseId: '00000000-0000-4000-8000-000000000099' }] },
    { originals: [{ ...original, documentVersionId: 'not-a-uuid' }] },
    { originals: [{ ...original, documentVersionId: `x${original.documentVersionId}` }] },
    { originals: [{ ...original, documentVersionId: `${original.documentVersionId}x` }] },
    { originals: [{ ...original, sha256: 'not-a-hash' }] },
    { originals: [{ ...original, sha256: `x${original.sha256}` }] },
    { originals: [{ ...original, sha256: `${original.sha256}x` }] },
    { originals: [{ ...original, byteLength: -1 }] },
    { originals: [{ ...original, byteLength: 1.5 }] },
    { originals: [{ ...original, byteLength: Number.MAX_SAFE_INTEGER + 1 }] },
    { originals: [original, { ...original, sha256: 'b'.repeat(63) }] },
  ];
  const fetch = vi.fn();
  for (const payload of invalidPayloads)
    fetch.mockResolvedValueOnce({ ok: true, json: async () => payload });
  vi.stubGlobal('fetch', fetch);
  for (let index = 0; index < invalidPayloads.length; index += 1)
    await expect(listSyntheticOriginals(caseId)).rejects.toThrow('original_list_unavailable');
  expect(fetch).toHaveBeenCalledTimes(invalidPayloads.length);
});

test('streams one selected synthetic file to its saved case through the same-origin route', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const file = new File(['synthetic bytes'], 'synthetic.pdf', { type: 'application/pdf' });
  const original = {
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000003',
    sha256: '0123456789abcdef'.repeat(4),
    byteLength: 15,
  };
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ original }) });
  vi.stubGlobal('fetch', fetch);
  expect(await uploadSyntheticOriginal(caseId, file)).toEqual(original);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/v1/cases/${caseId}/synthetic-originals`, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: file,
    cache: 'no-store',
    redirect: 'error',
  });
});

test('reports an oversized synthetic original without reading the server error body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 413, json }));
  await expect(
    uploadSyntheticOriginal(
      '00000000-0000-4000-8000-000000000002',
      new File(['synthetic bytes'], 'synthetic.pdf'),
    ),
  ).rejects.toThrow('original_upload_too_large');
  expect(json).not.toHaveBeenCalled();
});

test('rejects a failed synthetic original transfer without reading the error body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json }));
  await expect(
    uploadSyntheticOriginal(
      '00000000-0000-4000-8000-000000000002',
      new File(['synthetic bytes'], 'synthetic.pdf'),
    ),
  ).rejects.toThrow('original_upload_unavailable');
  expect(json).not.toHaveBeenCalled();
});

test('rejects a synthetic transfer receipt that cannot identify the saved bytes', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const file = new File(['synthetic bytes'], 'synthetic.pdf');
  const valid = {
    caseId,
    documentVersionId: '00000000-0000-4000-8000-000000000003',
    sha256: '0123456789abcdef'.repeat(4),
    byteLength: file.size,
  };
  const invalidPayloads = [
    null,
    { original: null },
    { original: { ...valid, caseId: '00000000-0000-4000-8000-000000000099' } },
    { original: { ...valid, documentVersionId: 'not-a-version' } },
    { original: { ...valid, documentVersionId: `x${valid.documentVersionId}` } },
    { original: { ...valid, documentVersionId: `${valid.documentVersionId}x` } },
    { original: { ...valid, sha256: 'not-a-digest' } },
    { original: { ...valid, sha256: `x${valid.sha256}` } },
    { original: { ...valid, sha256: `${valid.sha256}x` } },
    { original: { ...valid, byteLength: file.size + 1 } },
  ];
  const fetch = vi.fn();
  for (const payload of invalidPayloads) {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => payload });
  }
  vi.stubGlobal('fetch', fetch);
  for (let index = 0; index < invalidPayloads.length; index += 1) {
    await expect(uploadSyntheticOriginal(caseId, file)).rejects.toThrow(
      'original_upload_unavailable',
    );
  }
  expect(fetch).toHaveBeenCalledTimes(invalidPayloads.length);
});
