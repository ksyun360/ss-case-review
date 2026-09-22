import { AssertionError } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));

test('rejects tracked changes that differ from the staged snapshot', async () => {
  vi.mocked(execFileSync).mockImplementation((...args) => {
    if (JSON.stringify(args[1]) === JSON.stringify(['diff', '--exit-code'])) {
      throw new Error('Unstaged tracked changes');
    }
    return '';
  });
  await expect(import('./check-staging.ts')).rejects.toThrow('Unstaged tracked changes');
  expect(execFileSync).toHaveBeenCalledWith('git', ['diff', '--exit-code'], { stdio: 'inherit' });
});

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
