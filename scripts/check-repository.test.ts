import { execFileSync } from 'node:child_process';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));

test('blocks repository verification on main', async () => {
  vi.mocked(execFileSync).mockReturnValue('main\n');
  await expect(import('./check-repository.ts')).rejects.toThrow();
});

afterEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});

test('queries the current Git branch for repository verification', async () => {
  vi.mocked(execFileSync).mockReturnValue('feature/foundation\n');
  await import('./check-repository.ts');
  expect(execFileSync).toHaveBeenCalledWith('git', ['branch', '--show-current'], {
    encoding: 'utf8',
  });
});
