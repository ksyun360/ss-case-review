import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

test('runs the synthetic API from a server-only command with an ignored environment file', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../../../package.json', import.meta.url), 'utf8'),
  ) as { scripts: Record<string, string> };
  expect(manifest.scripts['dev:api']).toBe(
    'node --env-file=.env packages/server/src/development-entry.ts',
  );
});
