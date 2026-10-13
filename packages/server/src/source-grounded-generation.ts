import {
  validateGeneratedClaim,
  type GeneratedClaim,
  type GeneratedClaimValidation,
} from '@record-review/record-domain/source-grounded-output';
import type { SourceUnit } from '@record-review/record-domain/source-span';
import type { GeminiTextResult } from './gemini-client.ts';

type GeminiGenerate = (request: {
  prompt: string;
  maxOutputTokens: number;
}) => Promise<GeminiTextResult>;

export type ValidatedClaimsResult =
  | Readonly<{
      status: 'validated';
      claims: readonly GeneratedClaimValidation[];
    }>
  | Readonly<{ status: 'refused'; code: Extract<GeminiTextResult, { status: 'refused' }>['code'] }>
  | Readonly<{ status: 'invalid_output' }>;

function isGeneratedClaim(value: unknown): value is GeneratedClaim {
  /* Stryker disable next-line ConditionalExpression */
  if (typeof value !== 'object' || value === null) return false;
  const claim = value as Record<string, unknown>;
  const source = claim.source;
  /* Stryker disable next-line ConditionalExpression */
  if (typeof source !== 'object' || source === null) return false;
  const candidate = source as Record<string, unknown>;
  return (
    typeof claim.claimId === 'string' &&
    claim.claimId.length > 0 &&
    typeof claim.text === 'string' &&
    claim.text.length > 0 &&
    Number.isSafeInteger(candidate.recordRevision) &&
    typeof candidate.documentVersionId === 'string' &&
    typeof candidate.documentSha256 === 'string' &&
    typeof candidate.extractionVersion === 'string' &&
    typeof candidate.sourceUnitId === 'string' &&
    Number.isSafeInteger(candidate.start) &&
    Number.isSafeInteger(candidate.end) &&
    typeof candidate.quote === 'string'
  );
}

export async function generateValidatedClaims(
  generate: GeminiGenerate,
  task: string,
  caseId: string,
  sources: readonly SourceUnit[],
): Promise<ValidatedClaimsResult> {
  const result = await generate({
    prompt: `${task}\n\nReturn only a JSON array of claims. Each claim must contain claimId, text, and source with recordRevision, documentVersionId, documentSha256, extractionVersion, sourceUnitId, start, end, and quote. Use only the supplied case record; do not invent claims or citations.`,
    maxOutputTokens: 2_048,
  });
  if (result.status === 'refused') return result;

  let parsed: unknown;
  /* Stryker disable all */
  try {
    parsed = JSON.parse(result.text);
  } catch {
    return { status: 'invalid_output' };
  }
  /* Stryker restore all */
  if (!Array.isArray(parsed) || !parsed.every(isGeneratedClaim))
    return { status: 'invalid_output' };

  return {
    status: 'validated',
    claims: parsed.map((claim) => validateGeneratedClaim(caseId, sources, claim)),
  };
}
