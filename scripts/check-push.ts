import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isFeatureBranch } from '../packages/repository-policy/src/index.ts';

const input = readFileSync(0, 'utf8');
assert.ok(
  input
    .split('\n')
    .filter(Boolean)
    .every((line) => isFeatureBranch(String(line.split(' ')[2]).replace('refs/heads/', ''))),
);
