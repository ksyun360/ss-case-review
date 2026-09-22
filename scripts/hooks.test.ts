import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

test('accepts a feature push after running repository checks', () => {
  const result = spawnSync('sh', [fileURLToPath(new URL('../.husky/pre-push', import.meta.url))], {
    encoding: 'utf8',
    input: 'refs/heads/feature/test aaaa refs/heads/feature/test bbbb\n',
  });
  expect(result.status).toBe(0);
  expect(result.stdout + result.stderr).toContain('check:repository');
});

test('runs the pre-push guard against the actual remote destination', () => {
  const result = spawnSync('sh', [fileURLToPath(new URL('../.husky/pre-push', import.meta.url))], {
    encoding: 'utf8',
    input: 'refs/heads/feature/test aaaa refs/heads/main bbbb\n',
  });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('AssertionError');
});

test('runs the commit-message policy with a quoted message-file argument', () => {
  const result = spawnSync(
    'sh',
    [
      fileURLToPath(new URL('../.husky/commit-msg', import.meta.url)),
      fileURLToPath(new URL('./fixtures/invalid commit message.txt', import.meta.url)),
    ],
    { encoding: 'utf8' },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('AssertionError');
});

test('wires the pre-commit gate between staged-snapshot checks', () => {
  expect(readFileSync(new URL('../.husky/pre-commit', import.meta.url), 'utf8')).toBe(
    'set -eu\nnode scripts/check-staging.ts\nnpm run verify:commit\nnode scripts/check-staging.ts\n',
  );
});
