import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase, registerOriginalReference } from '../src/cases.ts';
import {
  claimDocumentProcessing,
  completeDocumentProcessing,
  findDocumentProcessingForReviewer,
  reserveDocumentProcessing,
} from '../src/document-processing-attempts.ts';

let database: PGlite;
const caseId = '00000000-0000-4000-8000-000000000201';
const reviewerId = '00000000-0000-4000-8000-000000000211';
const otherReviewerId = '00000000-0000-4000-8000-000000000212';
const documentVersionId = '00000000-0000-4000-8000-000000000221';
const extractionVersion = 'pdfjs-native-v1';

beforeAll(async () => {
  database = await PGlite.create();
});

beforeEach(async () => {
  await database.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  for (const migration of [
    '202609230001_initial_case_metadata.sql',
    '202610010001_document_processing_attempts.sql',
  ]) {
    const sql = await readFile(new URL(`../migrations/${migration}`, import.meta.url), 'utf8');
    await database.exec(sql.replace(/-- Down Migration[\s\S]*$/, ''));
  }
});

afterAll(async () => {
  await database.close();
});

test('leases queued document processing once and safely recovers expired work', async () => {
  await createCase(database, { caseId, reviewerId, label: 'Synthetic processing queue case' });
  await registerOriginalReference(database, reviewerId, {
    caseId,
    documentVersionId,
    sha256: 'a'.repeat(64),
    byteLength: 1024,
  });
  const input = {
    caseId,
    documentVersionId,
    reviewerId,
    extractionVersion,
    maximumBytes: 2048,
    maximumPages: 800,
  };
  expect(await reserveDocumentProcessing(database, { ...input, reviewerId: otherReviewerId })).toBe(
    undefined,
  );
  expect(await reserveDocumentProcessing(database, input)).toEqual({
    ...input,
    state: 'queued',
    attemptCount: 0,
    failureCode: null,
  });
  await expect(reserveDocumentProcessing(database, input)).resolves.toBeUndefined();

  const firstToken = '00000000-0000-4000-8000-000000000231';
  const secondToken = '00000000-0000-4000-8000-000000000232';
  const firstClaim = await claimDocumentProcessing(database, {
    now: new Date('2026-10-01T12:00:00Z'),
    leaseExpiresAt: new Date('2026-10-01T12:05:00Z'),
    leaseToken: firstToken,
  });
  expect(firstClaim).toEqual({
    ...input,
    state: 'processing',
    attemptCount: 1,
    failureCode: null,
    leaseToken: firstToken,
  });
  await expect(
    claimDocumentProcessing(database, {
      now: new Date('2026-10-01T12:04:59Z'),
      leaseExpiresAt: new Date('2026-10-01T12:09:59Z'),
      leaseToken: secondToken,
    }),
  ).resolves.toBeUndefined();
  await expect(
    claimDocumentProcessing(database, {
      now: new Date('2026-10-01T12:05:01Z'),
      leaseExpiresAt: new Date('2026-10-01T12:10:01Z'),
      leaseToken: secondToken,
    }),
  ).resolves.toEqual({
    ...input,
    state: 'processing',
    attemptCount: 2,
    failureCode: null,
    leaseToken: secondToken,
  });

  await expect(
    completeDocumentProcessing(database, {
      caseId,
      documentVersionId,
      extractionVersion,
      leaseToken: firstToken,
    }),
  ).resolves.toBeUndefined();
  await expect(
    completeDocumentProcessing(database, {
      caseId,
      documentVersionId,
      extractionVersion,
      leaseToken: secondToken,
    }),
  ).resolves.toEqual({
    ...input,
    state: 'published',
    attemptCount: 2,
    failureCode: null,
  });
  await expect(
    findDocumentProcessingForReviewer(
      database,
      reviewerId,
      caseId,
      documentVersionId,
      extractionVersion,
    ),
  ).resolves.toEqual({
    ...input,
    state: 'published',
    attemptCount: 2,
    failureCode: null,
  });
  await expect(
    findDocumentProcessingForReviewer(
      database,
      otherReviewerId,
      caseId,
      documentVersionId,
      extractionVersion,
    ),
  ).resolves.toBeUndefined();
  await expect(
    claimDocumentProcessing(database, {
      now: new Date('2026-10-01T12:10:02Z'),
      leaseExpiresAt: new Date('2026-10-01T12:15:02Z'),
      leaseToken: firstToken,
    }),
  ).resolves.toBeUndefined();
});
