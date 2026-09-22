import { readFileSync } from 'node:fs';
import { afterEach, expect, test, vi } from 'vitest';

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }));

afterEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
});

test('rejects a mixed push that targets main even from a feature branch', async () => {
  vi.mocked(readFileSync).mockReturnValue(
    'refs/heads/feature/test aaaa refs/heads/feature/test bbbb\n' +
      'refs/heads/feature/test aaaa refs/heads/main bbbb\n',
  );
  await expect(import('./check-push.ts')).rejects.toThrow();
  expect(readFileSync).toHaveBeenCalledWith(0, 'utf8');
});
