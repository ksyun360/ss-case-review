import { expect, test } from 'vitest';
import { validateGeneratedClaim, type GeneratedClaim } from '../src/source-grounded-output.ts';

const source = {
  caseId: 'case-a',
  recordRevision: 1,
  documentVersionId: 'document-version-a',
  documentSha256: 'a'.repeat(64),
  extractionVersion: 'extraction-v1',
  sourceUnitId: 'source-unit-a',
  rawText: 'The claimant can sit for six hours in an eight-hour workday.',
};

test('verifies a generated claim only when its quotation matches the authorized source', () => {
  const claim: GeneratedClaim = {
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
  };

  expect(validateGeneratedClaim('case-a', [source], claim)).toEqual({
    status: 'verified',
    claimId: 'claim-a',
    source: { caseId: 'case-a', ...claim.source },
  });
});

test('flags a claim for investigation when the quotation cannot be matched', () => {
  const claim: GeneratedClaim = {
    claimId: 'claim-unmatched',
    text: 'The record supports a different limitation.',
    source: {
      recordRevision: 1,
      documentVersionId: 'document-version-a',
      documentSha256: 'a'.repeat(64),
      extractionVersion: 'extraction-v1',
      sourceUnitId: 'source-unit-a',
      start: 13,
      end: 60,
      quote: 'The record does not contain this sentence.',
    },
  };

  expect(validateGeneratedClaim('case-a', [source], claim)).toEqual({
    status: 'unverified',
    claimId: 'claim-unmatched',
    message: "The review system couldn't find this evidence in the authorized case record.",
    reason: 'quote_mismatch',
  });
});

test('selects the source unit named by the claim instead of the first available page', () => {
  const claim: GeneratedClaim = {
    claimId: 'claim-specific-source',
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
  };
  const otherSource = { ...source, sourceUnitId: 'source-unit-b', documentSha256: 'b'.repeat(64) };

  expect(validateGeneratedClaim('case-a', [otherSource, source], claim).status).toBe('verified');
});
