import process from 'node:process';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startDevelopmentServer } from '../src/development-server.ts';

vi.mock('../src/development-server.ts', () => ({ startDevelopmentServer: vi.fn() }));
vi.mock('node:process', () => ({
  default: {
    env: { APP_ENV: 'synthetic-entry-fixture' },
    once: vi.fn(),
    stdout: { write: vi.fn() },
    stderr: { write: vi.fn() },
    exitCode: undefined,
  },
}));

const close = vi.fn();
beforeEach(() => {
  vi.resetAllMocks();
  process.exitCode = undefined;
  close.mockResolvedValue(undefined);
  vi.mocked(startDevelopmentServer).mockResolvedValue({ close } as unknown as Awaited<
    ReturnType<typeof startDevelopmentServer>
  >);
});
afterEach(() => {
  vi.resetModules();
});

test('starts the synthetic entry point and registers graceful termination handlers', async () => {
  await import('../src/development-entry.ts');
  expect(startDevelopmentServer).toHaveBeenCalledExactlyOnceWith(process.env);
  const shutdown = vi.mocked(process.once).mock.calls[0]?.[1];
  expect(shutdown).toBeTypeOf('function');
  expect(process.once).toHaveBeenCalledTimes(2);
  expect(process.once).toHaveBeenNthCalledWith(1, 'SIGINT', shutdown);
  expect(process.once).toHaveBeenNthCalledWith(2, 'SIGTERM', shutdown);
  expect(process.stdout.write).toHaveBeenCalledExactlyOnceWith(
    'Synthetic case API listening at http://127.0.0.1:5176\n',
  );
  expect(close).not.toHaveBeenCalled();
  await shutdown?.();
  expect(close).toHaveBeenCalledExactlyOnceWith();
  expect(process.stderr.write).not.toHaveBeenCalled();
  expect(process.exitCode).toBeUndefined();
});
