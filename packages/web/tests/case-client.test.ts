import { afterEach, expect, test, vi } from 'vitest';
import { createSyntheticCase, getSyntheticCase, listSyntheticCases } from '../src/case-client.ts';

afterEach(() => vi.unstubAllGlobals());

test('requests one reviewer-scoped draft through the same-origin API', async () => {
  const caseId = '00000000-0000-4000-8000-000000000002';
  const saved = { caseId, label: 'Synthetic saved draft', recordRevision: 1 };
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ case: saved }) });
  vi.stubGlobal('fetch', fetch);
  expect(await getSyntheticCase(caseId)).toEqual(saved);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/v1/cases/${caseId}`, {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
});

test('treats an inaccessible case as unavailable without reading its body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 404, ok: false, json }));
  await expect(getSyntheticCase('00000000-0000-4000-8000-000000000099')).resolves.toBeUndefined();
  expect(json).not.toHaveBeenCalled();
});

test('creates a synthetic draft through the guarded same-origin API', async () => {
  const created = {
    caseId: '00000000-0000-4000-8000-000000000002',
    label: 'Synthetic new draft',
    recordRevision: 1,
  };
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ case: created }) });
  vi.stubGlobal('fetch', fetch);
  expect(await createSyntheticCase('Synthetic new draft')).toEqual(created);
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/v1/cases', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-record-review-client': 'synthetic-workspace',
    },
    body: JSON.stringify({ label: 'Synthetic new draft' }),
    cache: 'no-store',
    redirect: 'error',
  });
});

test('rejects a failed draft creation without trusting an error body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json }));
  await expect(createSyntheticCase('Synthetic failed draft')).rejects.toThrow(
    'case_creation_unavailable',
  );
  expect(json).not.toHaveBeenCalled();
});

test('rejects a successful draft response without case metadata', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }));
  await expect(createSyntheticCase('Synthetic missing draft')).rejects.toThrow(
    'case_creation_unavailable',
  );
});

test('rejects a case row with a zero record revision', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [
          {
            caseId: '00000000-0000-4000-8000-000000000001',
            label: 'Synthetic draft',
            recordRevision: 0,
          },
        ],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects a case row with a nonnumeric record revision', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [
          {
            caseId: '00000000-0000-4000-8000-000000000001',
            label: 'Synthetic draft',
            recordRevision: 'unknown',
          },
        ],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects a case row without a usable case identity', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [{ caseId: null, label: 'Synthetic draft', recordRevision: 1 }],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects malformed case rows before the browser displays a list', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [
          {
            caseId: '00000000-0000-4000-8000-000000000001',
            label: 'Synthetic draft',
            recordRevision: 1,
          },
          null,
        ],
      }),
    }),
  );
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects a missing case list instead of treating it as an empty list', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => null }));
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
});

test('rejects an unsuccessful case response without reading its body', async () => {
  const json = vi.fn();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json }));
  await expect(listSyntheticCases()).rejects.toThrow('case_list_unavailable');
  expect(json).not.toHaveBeenCalled();
});

test('requests reviewer-scoped cases through the same-origin development route', async () => {
  const cases = [
    {
      caseId: '00000000-0000-4000-8000-000000000001',
      label: 'Synthetic draft',
      recordRevision: 1,
    },
  ];
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ cases }) });
  vi.stubGlobal('fetch', fetch);
  expect(await listSyntheticCases()).toEqual(cases);
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/v1/cases', {
    headers: { 'x-record-review-client': 'synthetic-workspace' },
    cache: 'no-store',
    redirect: 'error',
  });
});
