export type CaseSummary = Readonly<{
  caseId: string;
  label: string;
  recordRevision: number;
}>;

export async function createSyntheticCase(label: string): Promise<CaseSummary> {
  const response = await fetch('/api/v1/cases', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: JSON.stringify({ label }),
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('case_creation_unavailable');
  const payload = (await response.json()) as { case: CaseSummary };
  return payload.case;
}

export async function listSyntheticCases(): Promise<CaseSummary[]> {
  const response = await fetch('/api/v1/cases', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('case_list_unavailable');
  const payload = (await response.json()) as { cases: CaseSummary[] } | null;
  const cases = payload?.cases;
  if (
    !Array.isArray(cases) ||
    !cases.every(
      (item) =>
        typeof item?.label === 'string' &&
        typeof item.caseId === 'string' &&
        Number.isInteger(item.recordRevision) &&
        item.recordRevision > 0,
    )
  )
    throw new Error('case_list_unavailable');
  return cases;
}
