import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase, registerOriginalReference } from '../src/cases.ts';
import { locateSourceSpan } from '../../record-domain/src/source-span.ts';
import { findTextSourceForReviewer, insertTextSourceForReviewer } from '../src/source-units.ts';

let database: PGlite;
const reviewerId = '00000000-0000-4000-8000-000000000011';
const source = {
  sourceUnitId: '00000000-0000-4000-8000-000000000031',
  caseId: '00000000-0000-4000-8000-000000000001',
  documentVersionId: '00000000-0000-4000-8000-000000000021',
  recordRevision: 1,
  documentSha256: 'a'.repeat(64),
  extractionVersion: 'synthetic-native-v1',
  pageNumber: 1,
  rawText: "Synthetic source: A😀B\nQuoted text'; DROP TABLE cases; --",
};

beforeAll(async () => {
  database = await PGlite.create();
});

beforeEach(async () => {
  await database.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await database.exec(
    await readFile(
      new URL('../migrations/202609230001_initial_case_metadata.sql', import.meta.url),
      'utf8',
    ),
  );
  const sourceMigration = await readFile(
    new URL('../migrations/202609280001_text_source_units.sql', import.meta.url),
    'utf8',
  );
  await database.exec(sourceMigration.replace(/-- Down Migration[\s\S]*$/, ''));
  await createCase(database, { caseId: source.caseId, reviewerId, label: 'Synthetic source case' });
  await registerOriginalReference(database, reviewerId, {
    caseId: source.caseId,
    documentVersionId: source.documentVersionId,
    sha256: source.documentSha256,
    byteLength: 100,
  });
});

afterAll(async () => {
  await database.close();
});

test('persists exact page text with original provenance for a case member', async () => {
  expect(await insertTextSourceForReviewer(database, reviewerId, source)).toEqual(source);
  expect((await database.query('SELECT count(*)::integer AS count FROM cases')).rows).toEqual([
    { count: 1 },
  ]);
  expect((await database.query('SELECT raw_text FROM text_source_units')).rows).toEqual([
    { raw_text: source.rawText },
  ]);
});

test('denies source insertion through membership in another case without changing existing text', async () => {
  await insertTextSourceForReviewer(database, reviewerId, source);
  const otherReviewerId = '00000000-0000-4000-8000-000000000012';
  await createCase(database, {
    caseId: '00000000-0000-4000-8000-000000000002',
    reviewerId: otherReviewerId,
    label: 'Synthetic unrelated case',
  });
  expect(
    await insertTextSourceForReviewer(database, otherReviewerId, {
      ...source,
      sourceUnitId: '00000000-0000-4000-8000-000000000032',
      pageNumber: 2,
      rawText: 'Synthetic unauthorized replacement',
    }),
  ).toBeUndefined();
  expect(
    (await database.query('SELECT source_unit_id, raw_text FROM text_source_units')).rows,
  ).toEqual([{ source_unit_id: source.sourceUnitId, raw_text: source.rawText }]);
});

test('loads an exact member source and validates a Unicode quotation against persisted text', async () => {
  await insertTextSourceForReviewer(database, reviewerId, source);
  const found = await findTextSourceForReviewer(
    database,
    reviewerId,
    source.caseId,
    source.sourceUnitId,
  );
  expect(found).toEqual(source);
  const quote = 'A😀B';
  const start = source.rawText.indexOf(quote);
  const candidate = { ...source, start, end: start + quote.length, quote };
  expect(locateSourceSpan(source.caseId, found, candidate)).toEqual({
    status: 'located',
    span: {
      caseId: source.caseId,
      recordRevision: source.recordRevision,
      documentVersionId: source.documentVersionId,
      documentSha256: source.documentSha256,
      extractionVersion: source.extractionVersion,
      sourceUnitId: source.sourceUnitId,
      start,
      end: start + quote.length,
      quote,
    },
  });
});

test('denies retrieval of an existing source through another case membership', async () => {
  await insertTextSourceForReviewer(database, reviewerId, source);
  const otherReviewerId = '00000000-0000-4000-8000-000000000012';
  await createCase(database, {
    caseId: '00000000-0000-4000-8000-000000000002',
    reviewerId: otherReviewerId,
    label: 'Synthetic unrelated source reader',
  });
  expect(
    await findTextSourceForReviewer(database, otherReviewerId, source.caseId, source.sourceUnitId),
  ).toBeUndefined();
  expect(
    await findTextSourceForReviewer(database, reviewerId, source.caseId, source.sourceUnitId),
  ).toEqual(source);
});
