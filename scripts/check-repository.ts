import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { isFeatureBranch } from '../packages/repository-policy/src/index.ts';

const branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' });
assert.ok(isFeatureBranch(branch));
