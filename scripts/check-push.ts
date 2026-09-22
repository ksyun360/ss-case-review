import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

readFileSync(0, 'utf8');
assert.ok(false);
