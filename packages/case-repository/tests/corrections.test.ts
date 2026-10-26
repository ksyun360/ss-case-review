import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, expect, test } from 'vitest';
import { createCase } from '../src/cases.ts';
import {
  insertCorrectionSuggestionForReviewer,
  listCorrectionSuggestionsForReviewer,
  updateCorrectionSuggestionStatusForReviewer,
} from '../src/corrections.ts';

let database: PGlite;
const reviewerId = '00000000-0000-4000-8000-000000000011';
const caseId = '00000000-0000-4000-8000-000000000001';

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
  await database.exec(
    await readFile(
      new URL('../migrations/202610200001_correction_suggestions.sql', import.meta.url),
      'utf8',
    ).then((migration) => migration.replace(/-- Down Migration[\s\S]*$/, '')),
  );
  await createCase(database, { caseId, reviewerId, label: 'Synthetic correction case' });
});

afterAll(async () => {
  await database.close();
});

test('persists and lists a revision-scoped correction suggestion without changing the case revision', async () => {
  const suggestion = {
    correctionId: '00000000-0000-4000-8000-000000000041',
    caseId,
    artifact: 'medical' as const,
    entryKey: '2024-01-12|North Clinic|follow-up',
    proposedText: 'The provider recorded an improved range of motion.',
    rationale: 'The source page uses the phrase improved range of motion.',
  };

  expect(await insertCorrectionSuggestionForReviewer(database, reviewerId, suggestion)).toEqual({
    ...suggestion,
    recordRevision: 1,
    status: 'pending',
  });
  expect(await listCorrectionSuggestionsForReviewer(database, reviewerId, caseId)).toEqual([
    {
      ...suggestion,
      recordRevision: 1,
      status: 'pending',
    },
  ]);
  expect((await database.query('SELECT record_revision FROM cases')).rows).toEqual([
    { record_revision: 1 },
  ]);
});

test('updates only a pending correction suggestion for the current case member', async () => {
  const suggestion = {
    correctionId: '00000000-0000-4000-8000-000000000042',
    caseId,
    artifact: 'procedural' as const,
    entryKey: 'alj-decision',
    proposedText: 'Use the date printed on the decision cover page.',
    rationale: 'The extracted chronology date needs source confirmation.',
  };
  await insertCorrectionSuggestionForReviewer(database, reviewerId, suggestion);

  expect(
    await updateCorrectionSuggestionStatusForReviewer(
      database,
      reviewerId,
      caseId,
      suggestion.correctionId,
      'accepted',
    ),
  ).toMatchObject({ ...suggestion, recordRevision: 1, status: 'accepted' });
  expect(
    await updateCorrectionSuggestionStatusForReviewer(
      database,
      reviewerId,
      caseId,
      suggestion.correctionId,
      'rejected',
    ),
  ).toBeUndefined();
  expect(await listCorrectionSuggestionsForReviewer(database, reviewerId, caseId)).toMatchObject([
    { correctionId: suggestion.correctionId, status: 'accepted' },
  ]);
});
