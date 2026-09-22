import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
  encoding: 'utf8',
});
assert.ok(!untracked);
