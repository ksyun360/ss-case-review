import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

test('wires the pre-commit gate between staged-snapshot checks', () => {
  expect(readFileSync(new URL('../.husky/pre-commit', import.meta.url), 'utf8')).toBe(
    'set -eu\nnode scripts/check-staging.ts\nnpm run verify:commit\nnode scripts/check-staging.ts\n',
  );
});
