import { AssertionError } from 'node:assert';
import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }));
const originalArgv = process.argv;

afterEach(() => {
  process.argv = originalArgv;
  vi.resetModules();
  vi.resetAllMocks();
});

test('rejects an invalid message read from the Git hook argument', async () => {
  process.argv = ['node', 'check-commit-message.ts', '/tmp/commit-message'];
  vi.mocked(readFileSync).mockReturnValue('Implement the guard\n');
  await expect(import('./check-commit-message.ts')).rejects.toThrow(AssertionError);
  expect(readFileSync).toHaveBeenCalledWith('/tmp/commit-message', 'utf8');
});
