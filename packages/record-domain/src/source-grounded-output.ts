import { locateSourceSpan, type SourceSpanCandidate, type SourceUnit } from './source-span.ts';

export type GeneratedClaim = Readonly<{
  claimId: string;
  text: string;
  source: SourceSpanCandidate;
}>;

export type GeneratedClaimValidation =
  | Readonly<{
      status: 'verified';
      claimId: string;
      source: Extract<ReturnType<typeof locateSourceSpan>, { status: 'located' }>['span'];
    }>
  | Readonly<{
      status: 'unverified';
      claimId: string;
      message: "The review system couldn't find this evidence in the authorized case record.";
      reason: 'source_unavailable' | 'source_mismatch' | 'invalid_offsets' | 'quote_mismatch';
    }>;

/**
 * Validate a generated claim against only the source units authorized for the case.
 * An unverified result is deliberately phrased as a search limitation, not as proof
 * that the underlying evidence does not exist.
 */
export function validateGeneratedClaim(
  caseId: string,
  sources: readonly SourceUnit[],
  claim: GeneratedClaim,
): GeneratedClaimValidation {
  const source = sources.find((candidate) => candidate.sourceUnitId === claim.source.sourceUnitId);
  const result = locateSourceSpan(caseId, source, claim.source);
  if (result.status === 'located')
    return { status: 'verified', claimId: claim.claimId, source: result.span };
  return {
    status: 'unverified',
    claimId: claim.claimId,
    message: "The review system couldn't find this evidence in the authorized case record.",
    reason: result.reason,
  };
}
