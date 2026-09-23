export type SourceIdentity = Readonly<{
  caseId: string;
  recordRevision: number;
  documentVersionId: string;
  documentSha256: string;
  extractionVersion: string;
  sourceUnitId: string;
}>;

export type SourceUnit = SourceIdentity & Readonly<{ rawText: string }>;

export type SourceSpanCandidate = Omit<SourceIdentity, 'caseId'> &
  Readonly<{ start: number; end: number; quote: string }>;

export type SourceSpanResult =
  | Readonly<{
      status: 'located';
      span: SourceIdentity & Readonly<{ start: number; end: number; quote: string }>;
    }>
  | Readonly<{
      status: 'not_located';
      reason: 'source_unavailable' | 'source_mismatch' | 'invalid_offsets' | 'quote_mismatch';
    }>;

export function locateSourceSpan(
  caseId: string,
  source: SourceUnit | undefined,
  candidate: SourceSpanCandidate,
): SourceSpanResult {
  if (source === undefined) {
    return { status: 'not_located', reason: 'source_unavailable' };
  }

  if (source.caseId !== caseId) {
    return { status: 'not_located', reason: 'source_unavailable' };
  }

  if (source.recordRevision !== candidate.recordRevision) {
    return { status: 'not_located', reason: 'source_mismatch' };
  }

  if (source.documentVersionId !== candidate.documentVersionId) {
    return { status: 'not_located', reason: 'source_mismatch' };
  }

  if (source.documentSha256 !== candidate.documentSha256) {
    return { status: 'not_located', reason: 'source_mismatch' };
  }

  if (source.extractionVersion !== candidate.extractionVersion) {
    return { status: 'not_located', reason: 'source_mismatch' };
  }

  if (source.sourceUnitId !== candidate.sourceUnitId) {
    return { status: 'not_located', reason: 'source_mismatch' };
  }

  if (source.rawText.slice(candidate.start, candidate.end) !== candidate.quote) {
    return { status: 'not_located', reason: 'quote_mismatch' };
  }

  return {
    status: 'located',
    span: {
      caseId: source.caseId,
      recordRevision: source.recordRevision,
      documentVersionId: source.documentVersionId,
      documentSha256: source.documentSha256,
      extractionVersion: source.extractionVersion,
      sourceUnitId: source.sourceUnitId,
      start: candidate.start,
      end: candidate.end,
      quote: source.rawText.slice(candidate.start, candidate.end),
    },
  };
}
