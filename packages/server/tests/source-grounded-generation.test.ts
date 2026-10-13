import { expect, test } from 'vitest';
import { generateValidatedClaims } from '../src/source-grounded-generation.ts';

const source = {
  caseId: 'case-a',
  recordRevision: 1,
  documentVersionId: 'document-version-a',
  documentSha256: 'a'.repeat(64),
  extractionVersion: 'extraction-v1',
  sourceUnitId: 'source-unit-a',
  rawText: 'The claimant can sit for six hours in an eight-hour workday.',
};

test('parses Gemini claims and validates every citation against authorized source text', async () => {
  const generate = async ({
    prompt,
    maxOutputTokens,
  }: {
    prompt: string;
    maxOutputTokens: number;
  }) => {
    expect(prompt).toContain('Return only a JSON array of claims');
    expect(maxOutputTokens).toBe(2_048);
    return {
      status: 'generated' as const,
      text: JSON.stringify([
        {
          claimId: 'claim-a',
          text: 'The RFC includes six hours of sitting.',
          source: {
            recordRevision: 1,
            documentVersionId: 'document-version-a',
            documentSha256: 'a'.repeat(64),
            extractionVersion: 'extraction-v1',
            sourceUnitId: 'source-unit-a',
            start: 13,
            end: 60,
            quote: 'can sit for six hours in an eight-hour workday.',
          },
        },
      ]),
    };
  };

  await expect(
    generateValidatedClaims(generate, 'Summarize the RFC.', 'case-a', [source]),
  ).resolves.toEqual({
    status: 'validated',
    claims: [
      {
        status: 'verified',
        claimId: 'claim-a',
        source: {
          caseId: 'case-a',
          recordRevision: 1,
          documentVersionId: 'document-version-a',
          documentSha256: 'a'.repeat(64),
          extractionVersion: 'extraction-v1',
          sourceUnitId: 'source-unit-a',
          start: 13,
          end: 60,
          quote: source.rawText.slice(13),
        },
      },
    ],
  });
});

test('preserves a bounded Gemini refusal without parsing model text', async () => {
  const generate = async () => ({ status: 'refused' as const, code: 'safety_refusal' as const });

  await expect(
    generateValidatedClaims(generate, 'Summarize the RFC.', 'case-a', [source]),
  ).resolves.toEqual({ status: 'refused', code: 'safety_refusal' });
});

test('returns invalid_output when Gemini does not return JSON', async () => {
  const generate = async () => ({ status: 'generated' as const, text: 'not-json' });

  await expect(
    generateValidatedClaims(generate, 'Summarize the RFC.', 'case-a', [source]),
  ).resolves.toEqual({ status: 'invalid_output' });
});

test('rejects each malformed claim field before source validation', async () => {
  const valid = {
    claimId: 'claim-a',
    text: 'A grounded claim.',
    source: {
      recordRevision: 1,
      documentVersionId: 'document-version-a',
      documentSha256: 'a'.repeat(64),
      extractionVersion: 'extraction-v1',
      sourceUnitId: 'source-unit-a',
      start: 13,
      end: 60,
      quote: 'can sit for six hours in an eight-hour workday.',
    },
  };
  const malformed = [
    null,
    'claim',
    { ...valid, source: null },
    { ...valid, source: 'source' },
    { ...valid, claimId: 1 },
    { ...valid, claimId: { length: 1 } },
    { ...valid, claimId: '' },
    { ...valid, text: 1 },
    { ...valid, text: { length: 1 } },
    { ...valid, text: '' },
    { ...valid, source: { ...valid.source, recordRevision: 1.5 } },
    { ...valid, source: { ...valid.source, documentVersionId: 1 } },
    { ...valid, source: { ...valid.source, documentSha256: 1 } },
    { ...valid, source: { ...valid.source, extractionVersion: 1 } },
    { ...valid, source: { ...valid.source, sourceUnitId: 1 } },
    { ...valid, source: { ...valid.source, start: 1.5 } },
    { ...valid, source: { ...valid.source, end: 1.5 } },
    { ...valid, source: { ...valid.source, quote: 1 } },
  ];
  for (const claim of malformed) {
    const generate = async () => ({ status: 'generated' as const, text: JSON.stringify([claim]) });
    await expect(
      generateValidatedClaims(generate, 'Summarize the RFC.', 'case-a', [source]),
    ).resolves.toEqual({ status: 'invalid_output' });
  }
});

test('rejects an array containing both a valid and malformed claim', async () => {
  const generate = async () =>
    ({
      status: 'generated' as const,
      text: JSON.stringify([
        {
          claimId: 'claim-a',
          text: 'A grounded claim.',
          source: {
            recordRevision: 1,
            documentVersionId: 'document-version-a',
            documentSha256: 'a'.repeat(64),
            extractionVersion: 'extraction-v1',
            sourceUnitId: 'source-unit-a',
            start: 13,
            end: 60,
            quote: 'can sit for six hours in an eight-hour workday.',
          },
        },
        null,
      ]),
    }) as const;

  await expect(
    generateValidatedClaims(generate, 'Summarize the RFC.', 'case-a', [source]),
  ).resolves.toEqual({ status: 'invalid_output' });
});
