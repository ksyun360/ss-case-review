import { AssertionError } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));

afterEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});

test('rejects untracked files that could change the tested commit contents', async () => {
  vi.mocked(execFileSync).mockReturnValue('scripts/new-test.test.ts\0');
  await expect(import('./check-staging.ts')).rejects.toThrow(AssertionError);
  expect(execFileSync).toHaveBeenCalledWith(
    'git',
    ['ls-files', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' },
  );
});
