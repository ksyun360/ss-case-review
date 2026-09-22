import { expect, test } from 'vitest';
import { isFeatureBranch } from '../src/index.ts';

test('rejects commits authored on main', () => {
  expect(isFeatureBranch('main')).toBe(false);
});
