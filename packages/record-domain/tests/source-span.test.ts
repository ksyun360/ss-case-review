import { expect, test } from 'vitest';
import { locateSourceSpan, type SourceSpanCandidate, type SourceUnit } from '../src/source-span.ts';

const source: SourceUnit = {
  caseId: 'case-a',
  recordRevision: 1,
  documentVersionId: 'document-version-a',
  documentSha256: 'a'.repeat(64),
  extractionVersion: 'extraction-v1',
  sourceUnitId: 'source-unit-a',
  rawText: 'Before Quoted text. After',
};

const candidate: SourceSpanCandidate = {
  recordRevision: 1,
  documentVersionId: 'document-version-a',
  documentSha256: 'a'.repeat(64),
  extractionVersion: 'extraction-v1',
  sourceUnitId: 'source-unit-a',
  start: 7,
  end: 19,
  quote: 'Quoted text.',
};

test('locates the selected stored text and returns its full source identity', () => {
  expect(locateSourceSpan('case-a', source, candidate)).toEqual({
    status: 'located',
    span: {
      caseId: 'case-a',
      recordRevision: 1,
      documentVersionId: 'document-version-a',
      documentSha256: 'a'.repeat(64),
      extractionVersion: 'extraction-v1',
      sourceUnitId: 'source-unit-a',
      start: 7,
      end: 19,
      quote: 'Quoted text.',
    },
  });
});

test('reports an unavailable source without accepting a supplied quotation', () => {
  expect(locateSourceSpan('case-a', undefined, candidate)).toEqual({
    status: 'not_located',
    reason: 'source_unavailable',
  });
});
