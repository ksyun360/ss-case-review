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
  _caseId: string,
  _source: SourceUnit | undefined,
  _candidate: SourceSpanCandidate,
): SourceSpanResult {
  return { status: 'not_located', reason: 'source_unavailable' };
}
