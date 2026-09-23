import { afterEach, expect, test, vi } from 'vitest';
import { listSyntheticCases } from '../src/case-client.ts';

afterEach(() => vi.unstubAllGlobals());

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
