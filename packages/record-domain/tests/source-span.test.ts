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

test('rejects a stored source from another case without exposing the passage', () => {
  expect(locateSourceSpan('case-a', { ...source, caseId: 'case-b' }, candidate)).toEqual({
    status: 'not_located',
    reason: 'source_unavailable',
  });
});

test('rejects a candidate tied to another record revision', () => {
  expect(locateSourceSpan('case-a', source, { ...candidate, recordRevision: 2 })).toEqual({
    status: 'not_located',
    reason: 'source_mismatch',
  });
});

test('rejects a candidate tied to another document version', () => {
  expect(
    locateSourceSpan('case-a', source, { ...candidate, documentVersionId: 'document-version-b' }),
  ).toEqual({
    status: 'not_located',
    reason: 'source_mismatch',
  });
});

test('rejects a candidate with another document content hash', () => {
  expect(
    locateSourceSpan('case-a', source, { ...candidate, documentSha256: 'b'.repeat(64) }),
  ).toEqual({
    status: 'not_located',
    reason: 'source_mismatch',
  });
});

test('rejects a candidate from another extraction version', () => {
  expect(
    locateSourceSpan('case-a', source, { ...candidate, extractionVersion: 'extraction-v2' }),
  ).toEqual({
    status: 'not_located',
    reason: 'source_mismatch',
  });
});

test('rejects a candidate for another source unit', () => {
  expect(
    locateSourceSpan('case-a', source, { ...candidate, sourceUnitId: 'source-unit-b' }),
  ).toEqual({
    status: 'not_located',
    reason: 'source_mismatch',
  });
});

test('rejects a supplied quote that changes the stored text', () => {
  expect(locateSourceSpan('case-a', source, { ...candidate, quote: 'Different text.' })).toEqual({
    status: 'not_located',
    reason: 'quote_mismatch',
  });
});

test('accepts a quote covering the entire source unit with an exclusive end offset', () => {
  const wholeUnit = { ...candidate, start: 0, end: source.rawText.length, quote: source.rawText };
  expect(locateSourceSpan('case-a', source, wholeUnit)).toEqual({
    status: 'located',
    span: { caseId: 'case-a', ...wholeUnit },
  });
});

test('rejects a negative start offset even when slicing would find matching text', () => {
  expect(
    locateSourceSpan('case-a', source, {
      ...candidate,
      start: -1,
      end: source.rawText.length,
      quote: source.rawText.slice(-1),
    }),
  ).toEqual({
    status: 'not_located',
    reason: 'invalid_offsets',
  });
});

test('rejects an end beyond the stored text instead of silently truncating the range', () => {
  expect(
    locateSourceSpan('case-a', source, {
      ...candidate,
      start: 0,
      end: source.rawText.length + 1,
      quote: source.rawText,
    }),
  ).toEqual({
    status: 'not_located',
    reason: 'invalid_offsets',
  });
});

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
