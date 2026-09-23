import { expect, test } from 'vitest';
import { locateSourceSpan } from '../src/source-span.ts';

test('reports an unavailable source without accepting a supplied quotation', () => {
  expect(
    locateSourceSpan('case-a', undefined, {
      recordRevision: 1,
      documentVersionId: 'document-version-a',
      documentSha256: 'a'.repeat(64),
      extractionVersion: 'extraction-v1',
      sourceUnitId: 'source-unit-a',
      start: 7,
      end: 19,
      quote: 'Quoted text.',
    }),
  ).toEqual({ status: 'not_located', reason: 'source_unavailable' });
});
