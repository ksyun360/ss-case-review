import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCommitMessage } from '../packages/repository-policy/src/index.ts';

const message = readFileSync(String(process.argv[2]), 'utf8');
assert.ok(isCommitMessage(message));
