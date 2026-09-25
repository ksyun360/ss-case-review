export type CaseSummary = Readonly<{
  caseId: string;
  label: string;
  recordRevision: number;
}>;

export type SyntheticOriginalReceipt = Readonly<{
  caseId: string;
  documentVersionId: string;
  sha256: string;
  byteLength: number;
}>;

export async function getSyntheticUploadCapability(): Promise<boolean> {
  const response = await fetch('/api/v1/capabilities', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('upload_capability_unavailable');
  const payload = (await response.json()) as { syntheticOriginalUpload?: unknown } | null;
  if (typeof payload?.syntheticOriginalUpload !== 'boolean')
    throw new Error('upload_capability_unavailable');
  return payload.syntheticOriginalUpload;
}

export async function uploadSyntheticOriginal(
  caseId: string,
  file: File,
): Promise<SyntheticOriginalReceipt> {
  const response = await fetch(`/api/v1/cases/${caseId}/synthetic-originals`, {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: file,
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 413) throw new Error('original_upload_too_large');
  if (!response.ok) throw new Error('original_upload_unavailable');
  const payload = (await response.json()) as { original?: SyntheticOriginalReceipt } | null;
  const original = payload?.original;
  if (
    !original ||
    original.caseId !== caseId ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      original.documentVersionId,
    ) ||
    !/^[a-f0-9]{64}$/.test(original.sha256) ||
    original.byteLength !== file.size
  )
    throw new Error('original_upload_unavailable');
  return original;
}

export async function getSyntheticCase(caseId: string): Promise<CaseSummary | undefined> {
  const response = await fetch(`/api/v1/cases/${caseId}`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error('case_detail_unavailable');
  const payload = (await response.json()) as { case: CaseSummary };
  if (!payload?.case) throw new Error('case_detail_unavailable');
  return payload.case;
}

export async function listSyntheticOriginals(caseId: string): Promise<SyntheticOriginalReceipt[]> {
  const response = await fetch(`/api/v1/cases/${caseId}/synthetic-originals`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error('original_list_unavailable');
  const payload = (await response.json()) as { originals: SyntheticOriginalReceipt[] };
  return payload.originals;
}

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
  if (!payload?.case) throw new Error('case_creation_unavailable');
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
