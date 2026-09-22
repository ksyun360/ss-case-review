import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { isFeatureBranch, isPublishablePath } from '../packages/repository-policy/src/index.ts';

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
assert.ok(isFeatureBranch(branch));

const paths = execFileSync('git', ['ls-files', '--cached', '-z'], { encoding: 'utf8' });
assert.ok(paths.split('\0').every(isPublishablePath));

const history = execFileSync('git', ['log', '--all', '--format=', '--name-only', '-z'], {
  encoding: 'utf8',
});
assert.ok(history.split('\0').every(isPublishablePath));
