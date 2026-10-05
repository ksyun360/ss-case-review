export type CaseSummary = Readonly<{
  caseId: string;
  label: string;
  recordRevision: number;
}>;

export type SyntheticOriginalReceipt = Readonly<{
  caseId: string;
  documentVersionId: string;
  sha256: string;
  byteLength: number;
}>;

export type SyntheticDocumentProcessing = Readonly<{
  documentVersionId: string;
  extractionVersion: string;
  state: 'queued' | 'processing' | 'published' | 'failed';
  attemptCount: number;
  failureCode:
    | 'original_unavailable'
    | 'unsupported_document_format'
    | 'byte_budget_exceeded'
    | 'page_budget_exceeded'
    | 'extraction_failed'
    | 'publication_rejected'
    | null;
}>;

export type SyntheticTextSource = Readonly<{
  sourceUnitId: string;
  caseId: string;
  documentVersionId: string;
  recordRevision: number;
  documentSha256: string;
  extractionVersion: string;
  pageNumber: number;
  rawText: string;
}>;

export type SyntheticTextSourceReference = Omit<SyntheticTextSource, 'rawText'>;

export type SyntheticTextSpanCandidate = Readonly<{
  recordRevision: number;
  documentVersionId: string;
  documentSha256: string;
  extractionVersion: string;
  sourceUnitId: string;
  start: number;
  end: number;
  quote: string;
}>;

export type SyntheticTextSpan = SyntheticTextSpanCandidate & Readonly<{ caseId: string }>;

const UUID4_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PROCESSING_STATES = new Set(['queued', 'processing', 'published', 'failed']);
const PROCESSING_FAILURE_CODES = new Set([
  'original_unavailable',
  'unsupported_document_format',
  'byte_budget_exceeded',
  'page_budget_exceeded',
  'extraction_failed',
  'publication_rejected',
]);

export async function getSyntheticDocumentProcessing(
  caseId: string,
  documentVersionId: string,
): Promise<SyntheticDocumentProcessing | undefined> {
  const response = await fetch(`/api/v1/cases/${caseId}/document-processing/${documentVersionId}`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('document_processing_unavailable');
  const payload = (await response.json()) as { processing?: unknown } | null;
  const processing = payload?.processing as SyntheticDocumentProcessing | null | undefined;
  if (
    !processing ||
    processing.documentVersionId !== documentVersionId ||
    !UUID4_PATTERN.test(processing.documentVersionId) ||
    typeof processing.extractionVersion !== 'string' ||
    !/\S/.test(processing.extractionVersion) ||
    processing.extractionVersion.length > 128 ||
    !PROCESSING_STATES.has(processing.state) ||
    !Number.isSafeInteger(processing.attemptCount) ||
    processing.attemptCount < 0 ||
    (processing.failureCode !== null && !PROCESSING_FAILURE_CODES.has(processing.failureCode))
  )
    throw new Error('document_processing_unavailable');
  return processing;
}

function isSyntheticTextSourceReference(
  value: unknown,
  caseId: string,
): value is SyntheticTextSourceReference {
  if (typeof value !== 'object' || value === null) return false;
  const source = value as SyntheticTextSourceReference;
  return (
    UUID4_PATTERN.test(source.sourceUnitId) &&
    source.caseId === caseId &&
    UUID4_PATTERN.test(source.documentVersionId) &&
    Number.isSafeInteger(source.recordRevision) &&
    source.recordRevision >= 1 &&
    SHA256_PATTERN.test(source.documentSha256) &&
    typeof source.extractionVersion === 'string' &&
    source.extractionVersion.length <= 128 &&
    /\S/.test(source.extractionVersion) &&
    Number.isSafeInteger(source.pageNumber) &&
    source.pageNumber >= 1
  );
}

/* Stryker disable all */
function isSyntheticTextSpan(value: unknown, caseId: string): value is SyntheticTextSpan {
  if (typeof value !== 'object' || value === null) return false;
  const span = value as SyntheticTextSpan;
  return (
    span.caseId === caseId &&
    UUID4_PATTERN.test(span.sourceUnitId) &&
    UUID4_PATTERN.test(span.documentVersionId) &&
    Number.isSafeInteger(span.recordRevision) &&
    span.recordRevision >= 1 &&
    SHA256_PATTERN.test(span.documentSha256) &&
    typeof span.extractionVersion === 'string' &&
    span.extractionVersion.length >= 1 &&
    span.extractionVersion.length <= 128 &&
    /\S/.test(span.extractionVersion) &&
    Number.isSafeInteger(span.start) &&
    span.start >= 0 &&
    Number.isSafeInteger(span.end) &&
    span.end > span.start &&
    typeof span.quote === 'string' &&
    span.quote.length > 0
  );
}
/* Stryker restore all */

export async function listSyntheticTextSources(
  caseId: string,
): Promise<SyntheticTextSourceReference[]> {
  const response = await fetch(`/api/v1/cases/${caseId}/text-sources`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('source_inventory_unavailable');
  const payload = (await response.json()) as { sources?: unknown } | null;
  const sources = payload?.sources;
  if (
    !Array.isArray(sources) ||
    !sources.every(
      (source) =>
        isSyntheticTextSourceReference(source, caseId) && !Object.hasOwn(source, 'rawText'),
    )
  )
    throw new Error('source_inventory_unavailable');
  return sources;
}

export async function getSyntheticTextSource(
  caseId: string,
  sourceUnitId: string,
): Promise<SyntheticTextSource | undefined> {
  const response = await fetch(`/api/v1/cases/${caseId}/text-sources/${sourceUnitId}`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('text_source_unavailable');
  const payload = (await response.json()) as { source?: unknown } | null;
  const source = payload?.source as SyntheticTextSource | null | undefined;
  if (
    !isSyntheticTextSourceReference(source, caseId) ||
    source.sourceUnitId !== sourceUnitId ||
    typeof source.rawText !== 'string'
  )
    throw new Error('text_source_unavailable');
  return source;
}

export async function verifySyntheticTextSpan(
  caseId: string,
  sourceUnitId: string,
  candidate: SyntheticTextSpanCandidate,
): Promise<SyntheticTextSpan> {
  const response = await fetch(`/api/v1/cases/${caseId}/text-sources/${sourceUnitId}/spans`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: JSON.stringify(candidate),
    cache: 'no-store',
    redirect: 'error',
  });
  /* Stryker disable all */
  if (!response.ok) {
    if (response.status === 422) {
      const payload = (await response.json()) as { code?: unknown; reason?: unknown } | null;
      /* Stryker disable next-line ConditionalExpression OptionalChaining */
      if (payload?.code === 'source_span_not_located' && typeof payload.reason === 'string')
        throw new Error(`${payload.code}:${payload.reason}`);
    }
    throw new Error('source_span_unavailable');
  }
  const payload = (await response.json()) as { span?: unknown } | null;
  const span = payload?.span as SyntheticTextSpan | null | undefined;
  if (
    !isSyntheticTextSpan(span, caseId) ||
    !span ||
    /* Stryker disable next-line ConditionalExpression */
    span.caseId !== caseId ||
    span.sourceUnitId !== sourceUnitId
  )
    throw new Error('source_span_unavailable');
  /* Stryker restore all */
  return span;
}

export async function getSyntheticUploadCapability(): Promise<boolean> {
  const response = await fetch('/api/v1/capabilities', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('upload_capability_unavailable');
  const payload = (await response.json()) as { syntheticOriginalUpload?: unknown } | null;
  if (typeof payload?.syntheticOriginalUpload !== 'boolean')
    throw new Error('upload_capability_unavailable');
  return payload.syntheticOriginalUpload;
}

export async function uploadSyntheticOriginal(
  caseId: string,
  file: File,
): Promise<SyntheticOriginalReceipt> {
  const response = await fetch(`/api/v1/cases/${caseId}/synthetic-originals`, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: file,
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 413) throw new Error('original_upload_too_large');
  if (!response.ok) throw new Error('original_upload_unavailable');
  const payload = (await response.json()) as { original?: SyntheticOriginalReceipt } | null;
  const original = payload?.original;
  if (
    !original ||
    original.caseId !== caseId ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      original.documentVersionId,
    ) ||
    !/^[a-f0-9]{64}$/.test(original.sha256) ||
    original.byteLength !== file.size
  )
    throw new Error('original_upload_unavailable');
  return original;
}

export async function getSyntheticCase(caseId: string): Promise<CaseSummary | undefined> {
  const response = await fetch(`/api/v1/cases/${caseId}`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('case_detail_unavailable');
  const payload = (await response.json()) as { case: CaseSummary };
  if (!payload?.case) throw new Error('case_detail_unavailable');
  return payload.case;
}

export async function listSyntheticOriginals(caseId: string): Promise<SyntheticOriginalReceipt[]> {
  const response = await fetch(`/api/v1/cases/${caseId}/synthetic-originals`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('original_list_unavailable');
  const payload = (await response.json()) as { originals?: unknown } | null;
  const originals = payload?.originals;
  if (
    !Array.isArray(originals) ||
    !originals.every((item: unknown) => {
      const original = item as SyntheticOriginalReceipt | null;
      return (
        original?.caseId === caseId &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
          original.documentVersionId,
        ) &&
        /^[a-f0-9]{64}$/.test(original.sha256) &&
        Number.isSafeInteger(original.byteLength) &&
        original.byteLength >= 0
      );
    })
  )
    throw new Error('original_list_unavailable');
  return originals as SyntheticOriginalReceipt[];
}

export async function createSyntheticCase(label: string): Promise<CaseSummary> {
  const response = await fetch('/api/v1/cases', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: JSON.stringify({ label }),
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('case_creation_unavailable');
  const payload = (await response.json()) as { case: CaseSummary };
  if (!payload?.case) throw new Error('case_creation_unavailable');
  return payload.case;
}

export async function listSyntheticCases(): Promise<CaseSummary[]> {
  const response = await fetch('/api/v1/cases', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('case_list_unavailable');
  const payload = (await response.json()) as { cases: CaseSummary[] } | null;
  const cases = payload?.cases;
  if (
    !Array.isArray(cases) ||
    !cases.every(
      (item) =>
        typeof item?.label === 'string' &&
        typeof item.caseId === 'string' &&
        Number.isInteger(item.recordRevision) &&
        item.recordRevision > 0,
    )
  )
    throw new Error('case_list_unavailable');
  return cases;
}
